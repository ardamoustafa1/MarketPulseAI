import logging
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

from app.models.push_device import PushDevice

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_expo_push(
    tokens: list[str],
    title: str,
    body: str,
    data: dict | None = None,
) -> None:
    """Send notifications via Expo Push API (works with Expo push tokens from expo-notifications)."""
    if not tokens:
        return
    messages = [
        {
            "to": t,
            "title": title,
            "body": body,
            "sound": "default",
            "priority": "high",
            "channelId": "default",
            **({"data": data} if data else {}),
        }
        for t in tokens
    ]
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(EXPO_PUSH_URL, json=messages)
            response.raise_for_status()
            payload = response.json()
            if isinstance(payload, dict) and payload.get("errors"):
                logger.warning("Expo push partial errors: %s", payload.get("errors"))
    except Exception as exc:
        logger.warning("Expo push failed: %s", exc)


async def send_alert_push_to_user(
    db: Session,
    user_id: UUID,
    symbol: str,
    triggered_price: str,
) -> None:
    rows = db.query(PushDevice).filter(PushDevice.user_id == user_id).all()
    tokens = [r.token for r in rows if r.token]
    await send_expo_push(
        tokens,
        title="Price alert",
        body=f"{symbol} hit your target at {triggered_price}",
        data={"type": "alert", "symbol": symbol},
    )
