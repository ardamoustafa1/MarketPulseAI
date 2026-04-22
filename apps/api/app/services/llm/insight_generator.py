import json
import logging
import uuid
from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.alert import AiInsight, Watchlist, WatchlistItem
from app.models.asset import Asset
from app.models.portfolio import Portfolio, Transaction, TransactionTypeEnum
from app.models.user import User
from app.schemas.insights import InsightCard, InsightResponse
from app.services.portfolio.calculator import PortfolioCalculationEngine, TransactionDTO, TransactionType
from app.services.price.cache import get_all_cached_prices

logger = logging.getLogger(__name__)
MAX_CARDS = 10


def _format_currency(value: Decimal) -> str:
    return f"${value:,.2f}"


async def _build_cards(db: Session, user: User, include_portfolio: bool, include_watchlist: bool) -> list[InsightCard]:
    cards: list[InsightCard] = []

    portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.user_id == user.id, Portfolio.is_default == True, Portfolio.deleted_at.is_(None))
        .first()
    )

    if include_portfolio and portfolio:
        tx_rows = (
            db.query(Transaction, Asset.symbol)
            .join(Asset, Asset.id == Transaction.asset_id)
            .filter(
                Transaction.portfolio_id == portfolio.id,
                Transaction.type.in_([TransactionTypeEnum.buy, TransactionTypeEnum.sell]),
            )
            .order_by(Transaction.transaction_date.asc(), Transaction.created_at.asc())
            .all()
        )

        tx_by_symbol: dict[str, list[TransactionDTO]] = defaultdict(list)
        for tx, symbol in tx_rows:
            tx_type = TransactionType.buy if tx.type == TransactionTypeEnum.buy else TransactionType.sell
            tx_by_symbol[symbol].append(
                TransactionDTO(
                    symbol=symbol,
                    type=tx_type,
                    quantity=tx.quantity,
                    price=tx.price or Decimal("0"),
                )
            )

        symbols = list(tx_by_symbol.keys())
        if symbols:
            cached_prices = await get_all_cached_prices(symbols)
            positions = []
            for symbol in symbols:
                cached = cached_prices.get(symbol)
                current_price = Decimal(str(cached.price)) if cached and not cached.is_stale else None
                positions.append(
                    PortfolioCalculationEngine.calculate_asset_position(
                        symbol=symbol,
                        transactions=tx_by_symbol[symbol],
                        current_price=current_price,
                    )
                )
            summary = PortfolioCalculationEngine.calculate_portfolio_summary(positions)

            cards.append(
                InsightCard(
                    category="portfolio",
                    title="Portfolio Snapshot",
                    content=(
                        f"Current value {_format_currency(summary.total_current_value)} | "
                        f"Unrealized PnL {_format_currency(summary.total_unrealized_pnl)} "
                        f"({summary.total_unrealized_pnl_percent:.2f}%)."
                    ),
                    severity="positive" if summary.total_unrealized_pnl >= 0 else "warning",
                    source_quality="high",
                    last_updated_at=datetime.utcnow(),
                    evidence=["portfolio_positions", "cached_prices"],
                )
            )

            if summary.allocation:
                top = summary.allocation[0]
                cards.append(
                    InsightCard(
                        category="portfolio",
                        title="Top Allocation",
                        content=f"{top.symbol} is your largest allocation at {top.percentage:.2f}%.",
                        severity="neutral",
                        source_quality="high",
                        last_updated_at=datetime.utcnow(),
                        evidence=["allocation_breakdown"],
                    )
                )

    if include_watchlist:
        watchlist = db.query(Watchlist).filter(Watchlist.user_id == user.id).first()
        if watchlist:
            watchlist_symbols = [
                row[0]
                for row in db.query(Asset.symbol)
                .join(WatchlistItem, WatchlistItem.asset_id == Asset.id)
                .filter(WatchlistItem.watchlist_id == watchlist.id)
                .all()
            ]
            if watchlist_symbols:
                cached_prices = await get_all_cached_prices(watchlist_symbols)
                movers = sorted(
                    [p for p in cached_prices.values() if p.change_24h is not None],
                    key=lambda p: abs(p.change_24h),
                    reverse=True,
                )
                if movers:
                    top_mover = movers[0]
                    direction = "up" if top_mover.change_24h >= 0 else "down"
                    cards.append(
                        InsightCard(
                            category="watchlist",
                            title="Watchlist Momentum",
                            content=(
                                f"{top_mover.symbol} is moving the most ({direction} "
                                f"{abs(top_mover.change_24h):.2f}% in 24h)."
                            ),
                            severity="positive" if top_mover.change_24h >= 0 else "warning",
                            source_quality="medium",
                            last_updated_at=datetime.utcnow(),
                            evidence=["watchlist_price_change_24h"],
                        )
                    )
                else:
                    cards.append(
                        InsightCard(
                            category="watchlist",
                            title="Watchlist Coverage",
                            content=f"Watchlist contains {len(watchlist_symbols)} tracked assets.",
                            severity="neutral",
                            source_quality="medium",
                            last_updated_at=datetime.utcnow(),
                            evidence=["watchlist_assets_count"],
                        )
                    )

    if not cards:
        cards.append(
            InsightCard(
                category="market",
                title="No Insight Data Yet",
                content="Add transactions or watchlist assets to generate personalized analytics.",
                severity="neutral",
                source_quality="low",
                last_updated_at=datetime.utcnow(),
                evidence=["insufficient_user_data"],
            )
        )

    return cards[:MAX_CARDS]


def _cards_to_prompt(cards: list[InsightCard]) -> str:
    return json.dumps([card.model_dump() for card in cards], ensure_ascii=False)


def _safe_severity(value: str) -> str:
    allowed = {"positive", "negative", "neutral", "warning"}
    return value if value in allowed else "neutral"


def _safe_category(value: str) -> str:
    allowed = {"portfolio", "market", "watchlist"}
    return value if value in allowed else "market"


def _quality_score(cards: list[InsightCard], model_used: str) -> float:
    if not cards:
        return 0.0
    base = 0.55 if model_used == "deterministic" else 0.72
    severity_bonus = sum(0.02 for c in cards if c.severity in {"positive", "warning", "negative"})
    diversity_bonus = min(0.08, len({c.category for c in cards}) * 0.03)
    length_bonus = min(0.1, sum(min(1.0, len(c.content) / 400) for c in cards) / len(cards) * 0.1)
    score = base + severity_bonus + diversity_bonus + length_bonus
    return float(max(0.0, min(1.0, round(score, 3))))


async def _refine_cards_with_openai(cards: list[InsightCard]) -> tuple[list[InsightCard], str]:
    if not settings.LLM_API_KEY:
        return cards, "deterministic"

    prompt = (
        "You are a financial insights editor. Improve clarity and concision without giving financial advice.\n"
        "Keep same number of cards and preserve factual content.\n"
        "Return strict JSON array with fields: category,title,content,severity.\n"
        "Input cards JSON:\n"
        f"{_cards_to_prompt(cards)}"
    )
    payload: dict[str, Any] = {
        "model": settings.LLM_MODEL,
        "messages": [
            {"role": "system", "content": "Return only valid JSON."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {settings.LLM_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            f"{settings.LLM_API_BASE_URL}/chat/completions",
            json=payload,
            headers=headers,
        )
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]
    parsed = json.loads(content)
    raw_cards = parsed.get("cards", parsed if isinstance(parsed, list) else [])
    if not isinstance(raw_cards, list) or not raw_cards:
        return cards, "deterministic"

    refined: list[InsightCard] = []
    for row in raw_cards[:MAX_CARDS]:
        if not isinstance(row, dict):
            continue
        refined.append(
            InsightCard(
                category=_safe_category(str(row.get("category", "market"))),
                title=str(row.get("title", "Market Update"))[:200],
                content=str(row.get("content", ""))[:2000],
                severity=_safe_severity(str(row.get("severity", "neutral"))),
            )
        )
    if not refined:
        return cards, "deterministic"
    return refined, f"openai:{settings.LLM_MODEL}"


async def _refine_cards(cards: list[InsightCard]) -> tuple[list[InsightCard], str]:
    provider = (settings.LLM_PROVIDER or "none").lower().strip()
    if provider == "openai":
        try:
            return await _refine_cards_with_openai(cards)
        except Exception as exc:
            logger.warning("OpenAI refine failed, fallback deterministic: %s", exc)
            return cards, "deterministic"
    return cards, "deterministic"


async def generate_insights_for_user(
    db: Session,
    user: User,
    include_portfolio: bool = True,
    include_watchlist: bool = True,
) -> InsightResponse:
    base_cards = await _build_cards(db, user, include_portfolio=include_portfolio, include_watchlist=include_watchlist)
    cards, model_used = await _refine_cards(base_cards)

    insight_record = AiInsight(
        id=uuid.uuid4(),
        user_id=user.id, 
        insight_type=model_used,
        content=json.dumps([c.model_dump() for c in cards]),
        data_snapshot={
            "include_portfolio": include_portfolio,
            "include_watchlist": include_watchlist,
            "card_count": len(cards),
            "llm_provider": settings.LLM_PROVIDER,
            "llm_model": settings.LLM_MODEL,
        },
    )
    db.add(insight_record)
    db.commit()
    db.refresh(insight_record)

    quality_score = _quality_score(cards, model_used)
    return InsightResponse(
        id=str(insight_record.id),
        created_at=insight_record.created_at,
        model_used=model_used,
        quality_score=quality_score,
        cards=cards,
    )


async def get_latest_insight(db: Session, user: User) -> InsightResponse:
    record = (
        db.query(AiInsight)
        .filter(AiInsight.user_id == user.id)
        .order_by(AiInsight.created_at.desc())
        .first()
    )

    if not record:
        raise LookupError("No insight generated yet.")

    try:
        cards_data = json.loads(record.content)
        if not isinstance(cards_data, list):
            raise ValueError("Expected list of cards")
        cards = [InsightCard(**c) for c in cards_data]
    except Exception as exc:
        logger.warning("Failed to parse insight record %s: %s", record.id, exc)
        return InsightResponse(
            id=str(record.id),
            created_at=record.created_at,
            cards=[],
        )

    model_used = record.insight_type or "deterministic"
    return InsightResponse(
        id=str(record.id),
        created_at=record.created_at,
        model_used=model_used,
        quality_score=_quality_score(cards, model_used),
        cards=cards,
    )
