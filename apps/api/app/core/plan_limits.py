"""
Product tiers: feature caps (alerts, insight cooldown). Extend for billing integration.
"""

from datetime import timedelta

FREE_MAX_ALERTS = 5
PRO_MAX_ALERTS = 500

FREE_INSIGHT_COOLDOWN = timedelta(minutes=15)
PRO_INSIGHT_COOLDOWN = timedelta(minutes=2)


def is_pro_tier(tier: str | None) -> bool:
    return (tier or "").lower() == "pro"


def max_alerts_for_user(tier: str | None) -> int:
    return PRO_MAX_ALERTS if is_pro_tier(tier) else FREE_MAX_ALERTS


def insight_cooldown_for_user(tier: str | None) -> timedelta:
    return PRO_INSIGHT_COOLDOWN if is_pro_tier(tier) else FREE_INSIGHT_COOLDOWN
