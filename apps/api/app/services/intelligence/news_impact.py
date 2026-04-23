"""
News → Wallet Impact.

We rank RSS headlines using a keyword → topic classifier, then estimate the
monetary impact on the user's portfolio using a tag→asset sensitivity table
calibrated on typical historical reactions. Values are *estimates*, clearly
flagged as such via the schema's disclaimers.
"""
from __future__ import annotations

import hashlib
import logging
from collections.abc import Iterable
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.portfolio import Portfolio, Transaction, TransactionTypeEnum
from app.models.user import User
from app.schemas.intelligence import NewsAssetImpact, NewsImpactItem, NewsImpactSection
from app.services.intelligence.features import clamp
from app.services.market.rss_news import NewsItem, fetch_market_headlines
from app.services.price.cache import get_all_cached_prices

logger = logging.getLogger(__name__)

# Keyword → (topic tag list, severity) mapping. The heuristic is intentionally
# simple and deterministic so it works without an LLM. The full AI refinement
# can be added as a second pass.
_KEYWORDS: list[tuple[tuple[str, ...], list[str], str]] = [
    (
        ("fed", "federal reserve", "powell", "rate cut", "rate hike", "fomc"),
        ["fed", "rates"],
        "warning",
    ),
    (
        ("tcmb", "merkez bankası", "faiz", "türkiye cumhuriyet merkez"),
        ["tcmb", "rates", "turkey"],
        "warning",
    ),
    (("ecb", "european central bank", "lagarde"), ["ecb", "rates"], "warning"),
    (("cpi", "inflation", "enflasyon"), ["inflation"], "warning"),
    (
        ("war", "attack", "invasion", "sanction", "geopolitical", "iran", "russia"),
        ["geopolitics"],
        "warning",
    ),
    (
        ("bitcoin etf", "etf flow", "spot btc", "blackrock", "grayscale"),
        ["crypto", "etf"],
        "positive",
    ),
    (("bitcoin", "btc", "ethereum", "eth", "crypto", "altcoin"), ["crypto"], "neutral"),
    (("gold", "altın", "lbma", "xau", "silver", "gümüş", "xag"), ["metals"], "neutral"),
    (("opec", "oil", "petrol", "wti", "brent"), ["oil"], "neutral"),
    (("stock", "equities", "s&p", "nasdaq", "bist"), ["equities"], "neutral"),
]


# Sensitivity (in percent move) of each asset type to each tag for a 1-unit shock.
# Positive = asset benefits when the headline is "positive" sentiment, negative = hurts.
_SENSITIVITY: dict[str, dict[str, float]] = {
    "crypto": {
        "fed": -1.8, "rates": -1.4, "inflation": 0.5, "crypto": 2.4, "etf": 1.2,
        "geopolitics": -1.0, "metals": 0.2, "tcmb": -0.4, "ecb": -0.7, "equities": 0.9,
    },
    "metal": {
        "fed": -0.6, "rates": -0.7, "inflation": 1.4, "crypto": -0.2, "etf": 0.2,
        "geopolitics": 1.2, "metals": 1.5, "tcmb": 0.2, "ecb": -0.2, "equities": -0.2,
    },
    "fiat": {
        "fed": 0.8, "rates": 0.6, "inflation": 0.7, "crypto": -0.1, "etf": -0.1,
        "geopolitics": 0.5, "metals": -0.1, "tcmb": 1.1, "turkey": 1.0, "ecb": 0.4,
        "equities": -0.2,
    },
}


def _classify(title: str) -> tuple[list[str], str]:
    lower = title.lower()
    tags: list[str] = []
    severity = "neutral"
    for keywords, topic_tags, sev in _KEYWORDS:
        if any(k in lower for k in keywords):
            tags.extend(topic_tags)
            if sev == "warning":
                severity = "warning"
            elif severity != "warning" and sev == "positive":
                severity = "positive"
    unique_tags = list(dict.fromkeys(tags))
    return unique_tags, severity


_CRYPTO_PREFIXES: tuple[str, ...] = (
    "BTC", "ETH", "SOL", "ADA", "XRP", "BNB",
    "DOGE", "AVAX", "LTC", "DOT", "MATIC", "LINK",
)
_METAL_PREFIXES: tuple[str, ...] = (
    "XAU", "XAG", "XPT", "XPD", "GRAM", "ONS", "CEYREK", "YARIM",
    "TAMYENI", "TAMESKI", "ATA", "GREMSE", "AYAR", "GUMUS",
    "PLATIN", "PALADYUM", "HASALTIN",
)


def _guess_asset_type(symbol: str) -> str:
    s = symbol.upper()
    if s.startswith(_CRYPTO_PREFIXES):
        return "crypto"
    if s.startswith(_METAL_PREFIXES):
        return "metal"
    return "fiat"


def _hash_id(*parts: str) -> str:
    return hashlib.sha1("|".join(parts).encode()).hexdigest()[:12]


async def build_news_impact(
    db: Session,
    user: User,
    limit: int = 8,
) -> NewsImpactSection:
    # 1. Pull headlines (already cached in rss_news).
    try:
        headlines: list[NewsItem] = await fetch_market_headlines(limit=30)
    except Exception as exc:  # noqa: BLE001
        logger.warning("news_impact: RSS fetch failed: %s", exc)
        headlines = []

    # 2. Gather the user's holdings.
    portfolio = (
        db.query(Portfolio)
        .filter(
            Portfolio.user_id == user.id,
            Portfolio.is_default.is_(True),
            Portfolio.deleted_at.is_(None),
        )
        .first()
    )
    holdings_value: dict[str, float] = {}
    if portfolio is not None:
        rows = (
            db.query(Transaction, Asset.symbol)
            .join(Asset, Asset.id == Transaction.asset_id)
            .filter(
                Transaction.portfolio_id == portfolio.id,
                Transaction.type.in_([TransactionTypeEnum.buy, TransactionTypeEnum.sell]),
            )
            .all()
        )
        qty_map: dict[str, Decimal] = {}
        for tx, sym in rows:
            qty = tx.quantity or Decimal("0")
            if tx.type == TransactionTypeEnum.buy:
                qty_map[sym] = qty_map.get(sym, Decimal("0")) + qty
            else:
                qty_map[sym] = qty_map.get(sym, Decimal("0")) - qty
        symbols = [sym for sym, qty in qty_map.items() if qty > 0]
        live = await get_all_cached_prices(symbols) if symbols else {}
        for sym, qty in qty_map.items():
            price = live.get(sym)
            if price is None or qty <= 0:
                continue
            holdings_value[sym] = float(qty) * float(price.price)

    total_value = sum(holdings_value.values()) or 0.0

    # 3. For each headline, compute per-asset shock and monetary impact.
    items: list[NewsImpactItem] = []
    for news in headlines[:limit]:
        tags, severity = _classify(news.title)
        if not tags:
            continue

        per_asset: list[NewsAssetImpact] = []
        portfolio_impact_usd = 0.0
        for sym, value in holdings_value.items():
            asset_type = _guess_asset_type(sym)
            coeffs = _SENSITIVITY.get(asset_type, {})
            move_pct = 0.0
            for tag in tags:
                move_pct += coeffs.get(tag, 0.0)
            if severity == "warning":
                move_pct *= -1.0  # warnings imply risk-off direction for each sensitivity
            move_pct = clamp(move_pct, -3.5, 3.5)
            if abs(move_pct) < 0.05:
                continue
            monetary = value * move_pct / 100.0
            direction = "up" if move_pct > 0 else "down"
            per_asset.append(
                NewsAssetImpact(
                    symbol=sym,
                    expected_move_pct=round(move_pct, 3),
                    monetary_impact=round(monetary, 2),
                    direction=direction,  # type: ignore[arg-type]
                )
            )
            portfolio_impact_usd += monetary

        items.append(
            NewsImpactItem(
                id=_hash_id(news.title, news.source),
                title=news.title,
                source=news.source,
                link=news.link,
                published_at=news.published,
                severity=severity,  # type: ignore[arg-type]
                portfolio_impact=round(portfolio_impact_usd, 2),
                impact_currency="USD",
                tags=tags,
                assets=per_asset,
                summary=_summarize(news.title, tags, portfolio_impact_usd, total_value),
            )
        )

    return NewsImpactSection(generated_at=datetime.now(UTC), items=items)


def _summarize(title: str, tags: Iterable[str], impact: float, total_value: float) -> str:
    tag_str = ", ".join(list(tags)[:3]) or "macro"
    if total_value == 0:
        return (
            f"Bu haber {tag_str} konularıyla ilgili — "
            "portföyün boş olduğu için parasal etki sıfır."
        )
    relative = impact / total_value * 100 if total_value else 0.0
    direction = "+" if impact >= 0 else ""
    return (
        f"Tahmini etki portföyünde {direction}${impact:,.2f} "
        f"(≈ {relative:+.2f}%) — konular: {tag_str}."
    )
