"""
Share card payload builder. Generates platform-agnostic metadata the mobile
renderer consumes to produce pixel-identical cards on iOS/Android.

The renderer handles ViewShot → PNG export client-side; backend returns only
the structured data + colors/metrics.
"""

from __future__ import annotations

import secrets
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.social import (
    ShareCardMetric,
    ShareCardPayload,
    ShareCardRequest,
    ShareCardTheme,
)
from app.services.deep_card.classifier import classify
from app.services.portfolio.access import get_or_create_default_portfolio
from app.services.portfolio.summary import build_portfolio_summary
from app.services.price.cache import get_cached_price

_CLASS_THEMES: dict[str, ShareCardTheme] = {
    "metal_gold": ShareCardTheme(
        primary="#FFB800", accent="#FFD66B", background="#14100B", text="#FFFFFF",
    ),
    "metal_silver": ShareCardTheme(
        primary="#C0C0C0", accent="#E5E5E5", background="#0E0E0E", text="#FFFFFF",
    ),
    "metal_platinum": ShareCardTheme(
        primary="#D1D5DB", accent="#E5E7EB", background="#0A0A0E", text="#FFFFFF",
    ),
    "crypto_major": ShareCardTheme(
        primary="#F7931A", accent="#FFB24D", background="#0F1220", text="#FFFFFF",
    ),
    "crypto_alt": ShareCardTheme(
        primary="#7C6CFF", accent="#AEA3FF", background="#120F20", text="#FFFFFF",
    ),
    "fx": ShareCardTheme(
        primary="#10B981", accent="#34D399", background="#071512", text="#FFFFFF",
    ),
    "equity": ShareCardTheme(
        primary="#3B82F6", accent="#60A5FA", background="#091122", text="#FFFFFF",
    ),
    "commodity": ShareCardTheme(
        primary="#B45309", accent="#F59E0B", background="#180F06", text="#FFFFFF",
    ),
    "index": ShareCardTheme(
        primary="#06B6D4", accent="#22D3EE", background="#061418", text="#FFFFFF",
    ),
    "etf": ShareCardTheme(
        primary="#0EA5E9", accent="#38BDF8", background="#061418", text="#FFFFFF",
    ),
}
_DEFAULT_THEME = ShareCardTheme(
    primary="#818CF8", accent="#A5B4FC", background="#0B0F1F", text="#FFFFFF",
)


def _display_name(user: User) -> str:
    first = getattr(user, "first_name", "") or ""
    last = getattr(user, "last_name", "") or ""
    full = (first + " " + last).strip()
    if full:
        return full
    email = getattr(user, "email", "") or ""
    return (email.split("@")[0] if email else "Trader") or "Trader"


def _tone(value: float) -> str:
    if value > 0:
        return "positive"
    if value < 0:
        return "negative"
    return "neutral"


async def build_share_card(
    db: Session,
    user: User,
    payload: ShareCardRequest,
) -> ShareCardPayload:
    symbol = (payload.symbol or "BTC").upper()
    cls = classify(symbol)
    theme = _CLASS_THEMES.get(cls, _DEFAULT_THEME)
    watermark = f"@{_display_name(user)} • MarketPulse"
    token = secrets.token_urlsafe(8)
    card_id = f"{payload.kind}-{token}"
    deep_link = f"https://marketpulse.app/share/{card_id}"
    now = datetime.now(UTC)

    if payload.kind == "asset_snapshot":
        live = await get_cached_price(symbol)
        price = float(live.price) if live else 0.0
        change = float(getattr(live, "change_pct_24h", 0) or 0) if live else 0.0
        return ShareCardPayload(
            id=card_id,
            kind=payload.kind,
            title=symbol,
            subtitle=cls.replace("_", " ").title(),
            headline=f"{price:,.2f}",
            subline=f"24 sa: {change:+.2f}%",
            badge="CANLI",
            asset_symbol=symbol,
            asset_class=cls,
            theme=theme,
            metrics=[
                ShareCardMetric(
                    label="24h değişim",
                    value=f"{change:+.2f}%",
                    tone=_tone(change),
                ),
                ShareCardMetric(label="Sınıf", value=cls.replace("_", " ").title()),
                ShareCardMetric(label="Kaynak", value="MarketPulse"),
            ],
            watermark_text=watermark,
            deep_link=deep_link,
            generated_at=now,
        )

    if payload.kind == "decision":
        decision = (payload.decision or "hold").upper()
        tone = {"BUY": "positive", "SELL": "negative"}.get(decision, "neutral")
        return ShareCardPayload(
            id=card_id,
            kind=payload.kind,
            title="Bugünkü kararım",
            subtitle=symbol,
            headline=decision,
            subline=payload.note or "MarketPulse AI destekli karar",
            badge="KARAR",
            asset_symbol=symbol,
            asset_class=cls,
            theme=theme,
            metrics=[
                ShareCardMetric(label="Karar", value=decision, tone=tone),  # type: ignore[arg-type]
                ShareCardMetric(label="Varlık", value=symbol),
            ],
            watermark_text=watermark,
            deep_link=deep_link,
            generated_at=now,
        )

    if payload.kind == "compare":
        symbols = [symbol] + [s.upper() for s in payload.extra_symbols[:3]]
        metrics: list[ShareCardMetric] = []
        for s in symbols:
            p = await get_cached_price(s)
            ch = float(getattr(p, "change_pct_24h", 0) or 0) if p else 0.0
            metrics.append(ShareCardMetric(label=s, value=f"{ch:+.2f}%", tone=_tone(ch)))
        return ShareCardPayload(
            id=card_id,
            kind=payload.kind,
            title="Karşılaştırma",
            subtitle=" vs ".join(symbols),
            headline=symbols[0],
            subline="24 saatlik göreli performans",
            badge="KARŞILAŞTIR",
            theme=theme,
            metrics=metrics,
            watermark_text=watermark,
            deep_link=deep_link,
            generated_at=now,
        )

    if payload.kind == "portfolio_wrapped":
        portfolio = get_or_create_default_portfolio(db, user.id)
        summary = await build_portfolio_summary(db, portfolio)
        total = float(summary.total_current_value or 0)
        pnl_pct = float(summary.total_unrealized_pnl_percent or 0)
        return ShareCardPayload(
            id=card_id,
            kind=payload.kind,
            title="Bu ay portföyüm",
            subtitle="MarketPulse Wrapped",
            headline=f"₺{total:,.0f}",
            subline=f"Net kâr/zarar: {pnl_pct:+.2f}%",
            badge="WRAPPED",
            theme=_DEFAULT_THEME,
            metrics=[
                ShareCardMetric(label="Değer", value=f"₺{total:,.0f}"),
                ShareCardMetric(label="Getiri", value=f"{pnl_pct:+.2f}%", tone=_tone(pnl_pct)),
                ShareCardMetric(label="Pozisyon", value=str(len(summary.positions or []))),
            ],
            watermark_text=watermark,
            deep_link=deep_link,
            generated_at=now,
        )

    if payload.kind == "dca_result":
        return ShareCardPayload(
            id=card_id,
            kind=payload.kind,
            title="DCA Simülasyonu",
            subtitle=symbol,
            headline=payload.note or "Aylık DCA",
            subline="Son 3 yıl, aynı varlıkta, aynı disiplin",
            badge="DCA",
            asset_symbol=symbol,
            asset_class=cls,
            theme=theme,
            metrics=[
                ShareCardMetric(label="Varlık", value=symbol),
                ShareCardMetric(label="Period", value="36 ay"),
            ],
            watermark_text=watermark,
            deep_link=deep_link,
            generated_at=now,
        )

    if payload.kind == "streak":
        return ShareCardPayload(
            id=card_id,
            kind=payload.kind,
            title="Seri günüm",
            subtitle=_display_name(user),
            headline=payload.note or "7 gün",
            subline="Her gün portföyümü güncellediğim seri",
            badge="STREAK",
            theme=_DEFAULT_THEME,
            metrics=[ShareCardMetric(label="Seri", value=payload.note or "7 gün")],
            watermark_text=watermark,
            deep_link=deep_link,
            generated_at=now,
        )

    # goal_progress
    return ShareCardPayload(
        id=card_id,
        kind=payload.kind,
        title="Hedefime gidiyorum",
        subtitle=payload.note or "",
        headline=payload.note or "Hedef",
        subline="MarketPulse çok-varlıklı hedef motoru",
        badge="HEDEF",
        theme=theme,
        metrics=[
            ShareCardMetric(label="Ana varlık", value=symbol),
        ],
        watermark_text=watermark,
        deep_link=deep_link,
        generated_at=now,
    )


# Only used for type alignment
_ = Decimal
