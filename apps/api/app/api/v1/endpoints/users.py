from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, RoleChecker
from app.schemas.user import User as UserSchema, UserUpdate
from app.models.user import User
from app.core.security import get_password_hash, verify_password
from app.core.config import settings
import hmac

router = APIRouter()

# Allow admins only for bulk user listing
allow_admin = RoleChecker(["admin"])

@router.get("/me", response_model=UserSchema)
def read_user_me(current_user: User = Depends(get_current_user)):
    """Fetch current logged in user"""
    return current_user

@router.put("/me", response_model=UserSchema)
def update_user_me(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user profile"""
    if user_in.first_name is not None:
        current_user.first_name = user_in.first_name
    if user_in.last_name is not None:
        current_user.last_name = user_in.last_name
    if user_in.password is not None:
        if not user_in.current_password or not verify_password(user_in.current_password, current_user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password verification failed")
        if not user_in.step_up_token or not hmac.compare_digest(user_in.step_up_token, settings.ADMIN_STEP_UP_TOKEN):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Step-up challenge failed")
        current_user.hashed_password = get_password_hash(user_in.password)

    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/", response_model=List[UserSchema], dependencies=[Depends(allow_admin)])
def read_users(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    """Get all users. Only accessible by admins."""
    users = db.query(User).offset(skip).limit(limit).all()
    return users
