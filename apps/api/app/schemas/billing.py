from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr


SubscriptionTier = Literal["free", "pro"]


class SubscriptionStatusResponse(BaseModel):
    user_id: str
    subscription_tier: SubscriptionTier
    updated_at: datetime


class SubscriptionUpdateRequest(BaseModel):
    subscription_tier: SubscriptionTier


class BillingWebhookEvent(BaseModel):
    event: Literal["subscription.created", "subscription.updated", "subscription.canceled"]
    user_email: EmailStr
    subscription_tier: SubscriptionTier | None = None
