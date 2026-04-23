"""
Cross-Asset Intelligence Hub endpoints.

Exposes:
  * GET /api/v1/intelligence/hub            — full aggregated payload
  * GET /api/v1/intelligence/today          — today's signals only
  * GET /api/v1/intelligence/regime         — regime section only
  * GET /api/v1/intelligence/ratios         — ratio radar only
  * GET /api/v1/intelligence/correlations   — heatmap only
  * GET /api/v1/intelligence/news-impact    — news → wallet
  * GET /api/v1/intelligence/macro-calendar — upcoming macro events
  * GET /api/v1/intelligence/onchain        — crypto pulse
  * GET /api/v1/intelligence/bazaar         — LBMA / Kapalıçarşı spread
  * GET /api/v1/intelligence/fx-carry       — FX carry scores
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.intelligence import (
    BazaarSpreadSection,
    CorrelationSection,
    FxCarrySection,
    IntelligenceHubResponse,
    MacroCalendarSection,
    NewsImpactSection,
    OnchainSection,
    RatiosSection,
    RegimeSection,
    TodaySignalSection,
)
from app.services.intelligence.bazaar_spread import build_bazaar
from app.services.intelligence.correlations import build_correlations
from app.services.intelligence.fx_carry import build_fx_carry
from app.services.intelligence.hub import build_intelligence_hub
from app.services.intelligence.macro_calendar import build_macro_calendar
from app.services.intelligence.news_impact import build_news_impact
from app.services.intelligence.onchain import build_onchain
from app.services.intelligence.ratios import build_ratios
from app.services.intelligence.regime import build_regime
from app.services.intelligence.signals import build_today_signals

router = APIRouter()


@router.get("/hub", response_model=IntelligenceHubResponse)
async def get_hub(
    locale: str = Query("tr", pattern="^(tr|en)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await build_intelligence_hub(db, current_user, locale=locale)


@router.get("/today", response_model=TodaySignalSection)
async def get_today(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await build_today_signals(db, current_user)


@router.get("/regime", response_model=RegimeSection)
async def get_regime(current_user: User = Depends(get_current_user)):
    return await build_regime()


@router.get("/ratios", response_model=RatiosSection)
async def get_ratios(current_user: User = Depends(get_current_user)):
    return await build_ratios()


@router.get("/correlations", response_model=CorrelationSection)
async def get_correlations(
    window: int = Query(90, ge=30, le=180),
    current_user: User = Depends(get_current_user),
):
    return await build_correlations(window=window)


@router.get("/news-impact", response_model=NewsImpactSection)
async def get_news_impact(
    limit: int = Query(8, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await build_news_impact(db, current_user, limit=limit)


@router.get("/macro-calendar", response_model=MacroCalendarSection)
async def get_macro_calendar(
    window_days: int = Query(30, ge=7, le=120),
    current_user: User = Depends(get_current_user),
):
    return await build_macro_calendar(window_days=window_days)


@router.get("/onchain", response_model=OnchainSection)
async def get_onchain(current_user: User = Depends(get_current_user)):
    return await build_onchain()


@router.get("/bazaar", response_model=BazaarSpreadSection)
async def get_bazaar(current_user: User = Depends(get_current_user)):
    return await build_bazaar()


@router.get("/fx-carry", response_model=FxCarrySection)
async def get_fx_carry(current_user: User = Depends(get_current_user)):
    return await build_fx_carry()
