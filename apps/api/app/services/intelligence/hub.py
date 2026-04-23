"""
Aggregator that produces a complete Intelligence Hub payload.

The hub is composed of nine independent sections. Each section is executed
concurrently; failures are isolated so a single flaky sub-service never
breaks the entire response.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime

from sqlalchemy.orm import Session

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
from app.services.intelligence.macro_calendar import build_macro_calendar
from app.services.intelligence.news_impact import build_news_impact
from app.services.intelligence.onchain import build_onchain
from app.services.intelligence.ratios import build_ratios
from app.services.intelligence.regime import build_regime
from app.services.intelligence.signals import build_today_signals

logger = logging.getLogger(__name__)


_DEFAULT_DISCLAIMERS = [
    "Bu ekrandaki içerikler yatırım tavsiyesi değildir.",
    "Sinyaller geçmiş verilerden türetilmiş istatistiksel tahminlerdir; kesinlik garantisi vermez.",
    "Kararlarınızdan siz sorumlusunuz — her işlemden önce profesyonel destek almayı düşünün.",
]


def _empty_today() -> TodaySignalSection:
    return TodaySignalSection(generated_at=datetime.now(UTC), portfolio=None, assets=[])


def _empty_regime() -> RegimeSection:
    return RegimeSection(
        regime="neutral",
        score=0.0,
        confidence=0.3,
        headline="Dengede",
        narrative="Rejim verisi yüklenemedi.",
        winners=[],
        losers=[],
        components=[],
    )


def _empty_ratios() -> RatiosSection:
    return RatiosSection(generated_at=datetime.now(UTC), entries=[])


def _empty_correlations() -> CorrelationSection:
    return CorrelationSection(window_days=90, symbols=[], matrix=[], cells=[], highlights=[])


def _empty_news() -> NewsImpactSection:
    return NewsImpactSection(generated_at=datetime.now(UTC), items=[])


def _empty_macro() -> MacroCalendarSection:
    return MacroCalendarSection(window_days=30, events=[])


def _empty_onchain() -> OnchainSection:
    return OnchainSection(generated_at=datetime.now(UTC), assets=[])


def _empty_bazaar() -> BazaarSpreadSection:
    return BazaarSpreadSection(
        lbma_reference_usd=0.0,
        usdtry=0.0,
        gram_fair_try=0.0,
        reasonable_bid_ask_pct=0.0,
        narrative="",
        instruments=[],
    )


def _empty_carry() -> FxCarrySection:
    return FxCarrySection(generated_at=datetime.now(UTC), reference_currency="USD", pairs=[])


async def _safe(coro, fallback):
    try:
        return await coro
    except Exception as exc:  # noqa: BLE001 — isolate every section
        logger.warning("intelligence.hub section failed: %s (%s)", coro, exc)
        return fallback


async def build_intelligence_hub(
    db: Session,
    user: User,
    locale: str = "tr",
) -> IntelligenceHubResponse:
    (
        today,
        regime,
        ratios,
        correlations,
        news,
        macro,
        onchain,
        bazaar,
        fx,
    ) = await asyncio.gather(
        _safe(build_today_signals(db, user), _empty_today()),
        _safe(build_regime(), _empty_regime()),
        _safe(build_ratios(), _empty_ratios()),
        _safe(build_correlations(), _empty_correlations()),
        _safe(build_news_impact(db, user), _empty_news()),
        _safe(build_macro_calendar(), _empty_macro()),
        _safe(build_onchain(), _empty_onchain()),
        _safe(build_bazaar(), _empty_bazaar()),
        _safe(build_fx_carry(), _empty_carry()),
    )

    return IntelligenceHubResponse(
        generated_at=datetime.now(UTC),
        locale=locale,
        today_signals=today,
        regime=regime,
        ratios=ratios,
        correlations=correlations,
        news_impact=news,
        macro_calendar=macro,
        onchain=onchain,
        bazaar=bazaar,
        fx_carry=fx,
        disclaimers=list(_DEFAULT_DISCLAIMERS),
    )
