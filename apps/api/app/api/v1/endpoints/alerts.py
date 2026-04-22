from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_current_user, get_db
from app.core.plan_limits import max_alerts_for_user
from app.models.user import User
from app.models.alert import Alert, AlertEvent
from app.schemas.alert import AlertCreate, AlertUpdate, AlertResponse, AlertEventResponse
import uuid

router = APIRouter()

@router.get("/", response_model=List[AlertResponse])
def get_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List all alerts for the current user."""
    alerts = db.query(Alert).filter(Alert.user_id == current_user.id).all()
    return alerts

@router.post("/", response_model=AlertResponse)
def create_alert(
    alert_in: AlertCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Create a new price alert."""
    cap = max_alerts_for_user(getattr(current_user, "subscription_tier", None))
    existing = db.query(Alert).filter(Alert.user_id == current_user.id).count()
    if existing >= cap:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Alert limit reached ({cap}) for your plan. Upgrade to Pro for more alerts.",
        )

    new_alert = Alert(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        **alert_in.model_dump()
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    return new_alert

@router.get("/history", response_model=List[AlertEventResponse])
def get_alert_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get history of triggered alerts for the user."""
    # Join alerts to get only events for the current user's alerts
    events = db.query(AlertEvent).join(Alert).filter(Alert.user_id == current_user.id).order_by(AlertEvent.id.desc()).all()
    return events

@router.patch("/{alert_id}", response_model=AlertResponse)
def update_alert(
    alert_id: str,
    alert_update: AlertUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update or toggle an alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
        
    update_data = alert_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(alert, field, value)
        
    db.commit()
    db.refresh(alert)
    return alert

@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
        
    db.delete(alert)
    db.commit()
    return None
