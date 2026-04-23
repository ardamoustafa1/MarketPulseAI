"""
Pydantic schemas for trust-and-compliance surfaces:

  * "Canlı Veri" badge — per-symbol live data provenance
  * Transparency page — full provider list + policy links
  * Investment-advice disclaimer — localized, signed payload
  * "Çelik Hesap" badge — security posture scoring
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class DataSourceBadge(BaseModel):
    symbol: str
    source_label: str
    source_code: str
    last_updated_at: datetime | None
    age_seconds: int | None
    freshness: Literal["live", "recent", "stale"]
    badge_tone: Literal["positive", "neutral", "warning"]
    disclosure: str


class ProviderEntry(BaseModel):
    code: str
    name: str
    category: Literal["market_data", "macro", "fx", "commodity", "news", "security"]
    description: str
    coverage: list[str]
    website_url: str | None
    terms_url: str | None


class TransparencyView(BaseModel):
    providers: list[ProviderEntry]
    policies: list[dict]
    last_reviewed_at: datetime


class DisclaimerView(BaseModel):
    locale: str
    title: str
    body: str
    acknowledgement_cta: str
    version: str
    effective_at: datetime


class SecurityControl(BaseModel):
    code: Literal[
        "email_verified",
        "two_factor_totp",
        "biometric_app_lock",
        "strong_password",
        "recovery_email",
        "push_confirmation",
    ]
    label: str
    enabled: bool
    weight: int
    tip: str | None


class SteelAccountView(BaseModel):
    score: int
    max_score: int
    tier: Literal["starter", "shielded", "steel", "titanium"]
    is_steel: bool
    controls: list[SecurityControl]
    next_action: str | None
    badge_updated_at: datetime
