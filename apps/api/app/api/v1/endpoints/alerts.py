import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.plan_limits import max_alerts_for_user
from app.models.alert import Alert, AlertEvent
from app.models.asset import Asset
from app.models.portfolio import Portfolio, Transaction, TransactionTypeEnum
from app.models.user import User
from app.schemas.alert import (
    AlertCreate,
    AlertEventResponse,
    AlertResponse,
    AlertSuggestion,
    AlertUpdate,
)
from app.services.price.cache import get_all_cached_prices

router = APIRouter()

@router.get("/", response_model=list[AlertResponse])
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

@router.get("/history", response_model=list[AlertEventResponse])
def get_alert_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get history of triggered alerts for the user."""
    # Join alerts to get only events for the current user's alerts
    events = (
        db.query(AlertEvent)
        .join(Alert)
        .filter(Alert.user_id == current_user.id)
        .order_by(AlertEvent.id.desc())
        .all()
    )
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


@router.get("/suggestions", response_model=list[AlertSuggestion])
async def get_alert_suggestions(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    safe_limit = max(1, min(limit, 20))
    default_portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.user_id == current_user.id, Portfolio.is_default is True, Portfolio.deleted_at.is_(None))
        .first()
    )
    if not default_portfolio:
        return []
    symbols = [
        row[0]
        for row in (
            db.query(Asset.symbol)
            .join(Transaction, Transaction.asset_id == Asset.id)
            .filter(
                Transaction.portfolio_id == default_portfolio.id,
                Transaction.type.in_([TransactionTypeEnum.buy, TransactionTypeEnum.sell]),
            )
            .distinct()
            .limit(50)
            .all()
        )
    ]
    prices = await get_all_cached_prices(symbols)
    suggestions: list[AlertSuggestion] = []
    for symbol in symbols[:safe_limit]:
        price = prices.get(symbol)
        if not price or price.change_24h is None:
            continue
        baseline = price.price
        pct = abs(price.change_24h)
        if pct >= 4:
            condition = "pct_down"
            multiplier = 0.97
            rationale = "High 24h volatility detected; downside protection alert suggested."
        elif pct >= 2:
            condition = "pct_up"
            multiplier = 1.03
            rationale = "Moderate momentum detected; breakout alert suggested."
        else:
            condition = "gt"
            multiplier = 1.02
            rationale = "Stable asset; conservative upside alert suggested."
        suggestions.append(
            AlertSuggestion(
                asset_symbol=symbol,
                condition=condition,  # type: ignore[arg-type]
                suggested_target_price=(baseline * multiplier).quantize(baseline),
                rationale=rationale,
            )
        )
    return suggestions
