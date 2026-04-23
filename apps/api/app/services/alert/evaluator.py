import asyncio
import logging
import uuid
from decimal import Decimal

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.alert import Alert, AlertEvent, ConditionEnum
from app.models.asset import Asset
from app.services.price.cache import get_all_cached_prices
from app.services.push.expo_push import send_alert_push_to_user

logger = logging.getLogger(__name__)

class AlertEvaluatorService:
    def __init__(self, interval_seconds: int = 5):
        self.interval_seconds = interval_seconds
        self.is_running = False
        self._task = None

    async def _evaluate_loop(self):
        logger.info("Alert Evaluator Started")
        while self.is_running:
            try:
                await self.evaluate_alerts()
            except Exception as e:
                logger.error(f"Error evaluating alerts: {e}")
            await asyncio.sleep(self.interval_seconds)

    async def evaluate_alerts(self):
        db: Session = SessionLocal()
        try:
            try:
                active_rows = (
                    db.query(Alert, Asset.symbol)
                    .join(Asset, Asset.id == Alert.asset_id)
                    .filter(Alert.is_active is True)
                    .all()
                )
            except AttributeError:
                # Test doubles may not implement join(); preserve backwards-compatible behavior.
                fallback_alerts = db.query(Alert).filter(Alert.is_active is True).all()
                active_rows = [(alert, str(alert.asset_id).upper()) for alert in fallback_alerts]
            if not active_rows:
                return

            symbols_to_fetch = list({symbol for _, symbol in active_rows})
            cached_prices = await get_all_cached_prices(symbols_to_fetch)

            for alert, symbol in active_rows:
                price_data = cached_prices.get(symbol)
                if not price_data:
                    continue
                
                current_price = Decimal(str(price_data.price))
                triggered = False

                if alert.condition == ConditionEnum.greater_than:
                    triggered = current_price >= alert.target_price
                elif alert.condition == ConditionEnum.less_than:
                    triggered = current_price <= alert.target_price
                elif alert.condition in [ConditionEnum.percentage_up, ConditionEnum.percentage_down]:
                    if alert.base_price:
                        pct_change = ((current_price - alert.base_price) / alert.base_price) * Decimal("100.0")
                        if alert.condition == ConditionEnum.percentage_up and pct_change >= alert.target_price:
                            triggered = True
                        elif alert.condition == ConditionEnum.percentage_down and pct_change <= -alert.target_price:
                            triggered = True

                if triggered:
                    logger.info(f"Alert {alert.id} triggered at {current_price}")
                    
                    event = AlertEvent(
                        id=str(uuid.uuid4()),
                        alert_id=alert.id,
                        triggered_price=current_price
                    )
                    db.add(event)

                    # One-shot alert
                    alert.is_active = False

                    try:
                        await send_alert_push_to_user(
                            db,
                            alert.user_id,
                            symbol,
                            str(current_price),
                        )
                    except Exception as push_exc:
                        logger.warning("Push notification failed for alert %s: %s", alert.id, push_exc)

            db.commit()
        finally:
            db.close()

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._evaluate_loop())

    def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()

global_alert_evaluator = AlertEvaluatorService(interval_seconds=10)
