from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

SubscriptionTier = Literal["free", "pro"]


class SubscriptionStatusResponse(BaseModel):
    user_id: str
    subscription_tier: SubscriptionTier
    updated_at: datetime


class SubscriptionUpdateRequest(BaseModel):
    subscription_tier: SubscriptionTier


class BillingWebhookEvent(BaseModel):
    event_id: str = Field(min_length=8, max_length=128)
    event: Literal["subscription.created", "subscription.updated", "subscription.canceled"]
    user_email: EmailStr
    subscription_tier: SubscriptionTier | None = None


class EntitlementResponse(BaseModel):
    user_id: str
    subscription_tier: SubscriptionTier
    max_alerts: int
    insight_cooldown_seconds: int
