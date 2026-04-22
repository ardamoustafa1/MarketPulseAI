from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from jose import JWTError
from app.models.user import User, RefreshToken as RefreshTokenModel
from app.schemas.user import UserCreate
from app.schemas.auth import Token
from app.core.security import (
    create_password_reset_token,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    hash_refresh_token,
    is_password_strong,
    verify_password,
)
from app.core.config import settings
from app.db.redis import get_redis_client
import logging

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.redis = get_redis_client()

    async def _check_brute_force(self, email: str) -> None:
        """Redis-based simple brute force protection for login."""
        key = f"bruteforce:login:{email}"
        attempts = await self.redis.get(key)
        if attempts and int(attempts) >= 5:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed login attempts. Please try again in 5 minutes."
            )

    async def _register_failed_attempt(self, email: str) -> None:
        key = f"bruteforce:login:{email}"
        await self.redis.incr(key)
        await self.redis.expire(key, 300) # Lock for 5 mins

    async def _clear_failed_attempts(self, email: str) -> None:
        key = f"bruteforce:login:{email}"
        await self.redis.delete(key)

    async def authenticate(self, email: str, password: str) -> User:
        await self._check_brute_force(email)
        
        user = self.db.query(User).filter(User.email == email).first()
        if not user or not verify_password(password, user.hashed_password):
            await self._register_failed_attempt(email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )
            
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")
            
        await self._clear_failed_attempts(email)
        return user

    def create_user(self, user_in: UserCreate) -> User:
        if not is_password_strong(user_in.password):
            raise HTTPException(
                status_code=400,
                detail="Password does not meet security policy requirements.",
            )

        user_exists = self.db.query(User).filter(User.email == user_in.email).first()
        if user_exists:
            raise HTTPException(status_code=400, detail="Email already registered")
            
        db_user = User(
            email=user_in.email,
            hashed_password=get_password_hash(user_in.password),
            first_name=user_in.first_name,
            last_name=user_in.last_name,
        )
        self.db.add(db_user)
        # Assuming an Audit Log feature is built, we'd fire an event here.
        # For now, standard commit
        self.db.commit()
        self.db.refresh(db_user)
        logger.info(f"New user registered: {db_user.email}")
        return db_user

    def generate_tokens(self, user: User) -> Token:
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            subject=str(user.id), expires_delta=access_token_expires
        )

        refresh_token_str = create_refresh_token(subject=str(user.id))
        rt_expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        db_rt = RefreshTokenModel(
            user_id=user.id,
            token_hash=hash_refresh_token(refresh_token_str),
            expires_at=rt_expires
        )
        self.db.add(db_rt)
        self.db.commit()
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token_str,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            refresh_expires_in_days=settings.REFRESH_TOKEN_EXPIRE_DAYS,
            refresh_rotation=True,
        )
        
    def refresh_access_token(self, refresh_token: str) -> tuple[User, Token]:
        try:
            decoded = decode_token(refresh_token)
            if decoded.get("type") != "refresh":
                raise HTTPException(status_code=401, detail="Invalid refresh token type")
        except JWTError as exc:
            raise HTTPException(status_code=401, detail="Invalid or expired refresh token") from exc

        db_rt = self.db.query(RefreshTokenModel).filter(
            RefreshTokenModel.token_hash == hash_refresh_token(refresh_token),
            RefreshTokenModel.revoked == False
        ).first()
        
        if not db_rt or db_rt.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
            
        user = self.db.query(User).filter(User.id == db_rt.user_id).first()
        if not user or not user.is_active:
             raise HTTPException(status_code=401, detail="Invalid user state")
             
        # Revoke old refresh token for rotating security
        db_rt.revoked = True
        self.db.commit()
        
        return user, self.generate_tokens(user)
        
    def revoke_token(self, refresh_token: str) -> None:
        db_rt = self.db.query(RefreshTokenModel).filter(
            RefreshTokenModel.token_hash == hash_refresh_token(refresh_token)
        ).first()
        if db_rt:
            db_rt.revoked = True
            self.db.commit()

    async def request_password_reset(self, email: str) -> str | None:
        user = self.db.query(User).filter(User.email == email, User.is_active == True).first()
        if not user:
            return None

        reset_token = create_password_reset_token(subject=str(user.id))
        token_hash = hash_refresh_token(reset_token)
        key = f"password_reset:{token_hash}"
        await self.redis.set(key, str(user.id))
        await self.redis.expire(key, settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES * 60)
        return reset_token

    async def reset_password_with_token(self, token: str, new_password: str) -> None:
        if not is_password_strong(new_password):
            raise HTTPException(
                status_code=400,
                detail="Password does not meet security policy requirements.",
            )

        try:
            decoded = decode_token(token)
        except JWTError as exc:
            raise HTTPException(status_code=401, detail="Invalid or expired reset token") from exc

        if decoded.get("type") != "password_reset":
            raise HTTPException(status_code=401, detail="Invalid reset token type")

        user_id = str(decoded.get("sub"))
        token_hash = hash_refresh_token(token)
        key = f"password_reset:{token_hash}"
        stored_user_id = await self.redis.get(key)
        if not stored_user_id or stored_user_id != user_id:
            raise HTTPException(status_code=401, detail="Invalid or expired reset token")

        user = self.db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.hashed_password = get_password_hash(new_password)
        self.db.query(RefreshTokenModel).filter(RefreshTokenModel.user_id == user.id).update(
            {RefreshTokenModel.revoked: True}
        )
        self.db.commit()
        await self.redis.delete(key)

