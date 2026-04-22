from fastapi import APIRouter, Body, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.push_device import PushDevice
from app.schemas.notifications import PushTokenRegister, PushTokenUnregister

router = APIRouter()


@router.post("/push-token", status_code=status.HTTP_204_NO_CONTENT)
def register_push_token(
    body: PushTokenRegister,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register or replace push token for the current user (Expo / FCM token string)."""
    existing = db.query(PushDevice).filter(PushDevice.token == body.token).first()
    if existing:
        existing.user_id = current_user.id
        existing.platform = body.platform or "unknown"
    else:
        db.add(
            PushDevice(
                user_id=current_user.id,
                token=body.token,
                platform=body.platform or "unknown",
            )
        )
    db.commit()
    return None


@router.delete("/push-token", status_code=status.HTTP_204_NO_CONTENT)
def unregister_push_token(
    body: PushTokenUnregister = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = (
        db.query(PushDevice)
        .filter(PushDevice.token == body.token, PushDevice.user_id == current_user.id)
        .first()
    )
    if row:
        db.delete(row)
        db.commit()
    return None
