"""
Personal recaps — weekly summary and Spotify-Wrapped style monthly story.

These endpoints aggregate the user's activity in the last 7/30 days into a
short, pre-formatted narrative the mobile client renders as story cards.
All heavy lifting stays server-side so the client can be dumb + fast.
"""
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.asset import Asset
from app.models.portfolio import Transaction, TransactionTypeEnum
from app.models.user import User
from app.services.portfolio.access import resolve_portfolio
from app.services.price.cache import get_all_cached_prices


router = APIRouter()


class RecapHighlight(BaseModel):
    label: str
    value: str
    delta: Optional[str] = None


class RecapAssetLine(BaseModel):
    symbol: str
    quantity: str
    realized_pnl: str
    pct_change: str


class WeeklyRecap(BaseModel):
    period_start: datetime
    period_end: datetime
    headline: str
    narrative: str
    highlights: List[RecapHighlight]
    top_assets: List[RecapAssetLine]
    actions_count: int


class MonthlyWrappedCard(BaseModel):
    """A single story-style card rendered full-screen on the client."""
    kind: str
    eyebrow: str
    title: str
    body: str
    accent_color: str
    stat: Optional[str] = None
    support_stat: Optional[str] = None


class MonthlyWrapped(BaseModel):
    period_start: datetime
    period_end: datetime
    cards: List[MonthlyWrappedCard]


def _fetch_user_transactions(
    db: Session, portfolio_id: UUID, since: datetime
) -> list[tuple[Transaction, str]]:
    return (
        db.query(Transaction, Asset.symbol)
        .join(Asset, Asset.id == Transaction.asset_id)
        .filter(Transaction.portfolio_id == portfolio_id)
        .filter(Transaction.transaction_date >= since)
        .order_by(Transaction.transaction_date.asc())
        .all()
    )


async def _build_recap(
    db: Session,
    user: User,
    portfolio_id: Optional[UUID],
    days: int,
) -> tuple[list[tuple[Transaction, str]], dict[str, Decimal], datetime, datetime]:
    portfolio = resolve_portfolio(db, user.id, portfolio_id)
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)
    rows = _fetch_user_transactions(db, portfolio.id, start)

    symbols = sorted({s for _, s in rows})
    cached_prices = await get_all_cached_prices(symbols)
    live: dict[str, Decimal] = {}
    for s in symbols:
        cached = cached_prices.get(s)
        if cached is not None and not cached.is_stale:
            live[s] = Decimal(str(cached.price))
    return rows, live, start, end


def _asset_stats(
    rows: list[tuple[Transaction, str]],
    live_prices: dict[str, Decimal],
) -> dict[str, dict[str, Decimal]]:
    stats: dict[str, dict[str, Decimal]] = {}
    for tx, symbol in rows:
        s = stats.setdefault(
            symbol,
            {"qty_buy": Decimal("0"), "qty_sell": Decimal("0"), "cost": Decimal("0"), "revenue": Decimal("0")},
        )
        qty = tx.quantity or Decimal("0")
        price = tx.price or Decimal("0")
        if tx.type == TransactionTypeEnum.buy:
            s["qty_buy"] += qty
            s["cost"] += qty * price
        elif tx.type == TransactionTypeEnum.sell:
            s["qty_sell"] += qty
            s["revenue"] += qty * price
    for symbol, s in stats.items():
        net_qty = s["qty_buy"] - s["qty_sell"]
        avg_cost = (s["cost"] / s["qty_buy"]) if s["qty_buy"] > 0 else Decimal("0")
        mark = live_prices.get(symbol, avg_cost)
        s["net_qty"] = net_qty
        s["avg_cost"] = avg_cost
        s["mark"] = mark
        # Simple realized pnl: revenue - sold_qty * avg_cost
        sold_basis = s["qty_sell"] * avg_cost if s["qty_sell"] > 0 else Decimal("0")
        s["realized_pnl"] = s["revenue"] - sold_basis
        if avg_cost > 0:
            s["pct_change"] = ((mark - avg_cost) / avg_cost) * Decimal("100")
        else:
            s["pct_change"] = Decimal("0")
    return stats


@router.get("/weekly-recap", response_model=WeeklyRecap)
async def weekly_recap(
    portfolio_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows, live, start, end = await _build_recap(db, current_user, portfolio_id, days=7)
    stats = _asset_stats(rows, live)

    if not stats:
        return WeeklyRecap(
            period_start=start,
            period_end=end,
            headline="Sessiz bir hafta",
            narrative=(
                "Bu hafta portföyünde işlem yok. Düzenli DCA alışkanlığı kaybı değil, "
                "kasıtlı bir duruş: piyasayı izlemeye devam et, fırsat geldiğinde alarmın tetiklesin."
            ),
            highlights=[
                RecapHighlight(label="İşlem", value="0"),
                RecapHighlight(label="Aktif alarmlar", value="—"),
            ],
            top_assets=[],
            actions_count=0,
        )

    sorted_by_pnl = sorted(stats.items(), key=lambda kv: kv[1]["realized_pnl"], reverse=True)
    best_symbol, best = sorted_by_pnl[0]
    worst_symbol, worst = sorted_by_pnl[-1]
    total_actions = len(rows)
    total_realized = sum((s["realized_pnl"] for s in stats.values()), Decimal("0"))
    sign = "+" if total_realized >= 0 else "-"

    headline = f"Bu hafta {total_actions} işlem, {sign}${abs(total_realized):,.2f} gerçekleşmiş P&L"
    narrative = (
        f"En iyi: {best_symbol} ({best['pct_change']:+.2f}%). "
        f"En zayıf: {worst_symbol} ({worst['pct_change']:+.2f}%). "
        "Önümüzdeki hafta makro takvimini gözden geçir: FED faiz açıklamaları "
        "ve kritik enflasyon rakamları yüksek volatilite üretebilir."
    )

    top_assets = [
        RecapAssetLine(
            symbol=sym,
            quantity=f"{s['net_qty']:.4f}",
            realized_pnl=f"{s['realized_pnl']:+.2f}",
            pct_change=f"{s['pct_change']:+.2f}%",
        )
        for sym, s in sorted_by_pnl[:3]
    ]

    highlights = [
        RecapHighlight(
            label="Toplam P&L",
            value=f"{sign}${abs(total_realized):,.2f}",
            delta=f"{(total_realized / (abs(total_realized) or Decimal('1'))) * 100:+.0f}%",
        ),
        RecapHighlight(label="İşlem sayısı", value=str(total_actions)),
        RecapHighlight(label="En güçlü varlık", value=best_symbol),
    ]

    return WeeklyRecap(
        period_start=start,
        period_end=end,
        headline=headline,
        narrative=narrative,
        highlights=highlights,
        top_assets=top_assets,
        actions_count=total_actions,
    )


@router.get("/monthly-wrapped", response_model=MonthlyWrapped)
async def monthly_wrapped(
    portfolio_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows, live, start, end = await _build_recap(db, current_user, portfolio_id, days=30)
    stats = _asset_stats(rows, live)

    cards: list[MonthlyWrappedCard] = []
    cards.append(
        MonthlyWrappedCard(
            kind="cover",
            eyebrow=end.strftime("%B %Y").upper(),
            title="Senin MarketPulse ayın",
            body="30 gün, bir bakışta. Hazırsan devam et.",
            accent_color="#C8A97E",
        )
    )

    total_actions = len(rows)
    cards.append(
        MonthlyWrappedCard(
            kind="activity",
            eyebrow="Aktivite",
            title=f"{total_actions} işlem",
            body=(
                "Ortalama kullanıcı ayda 6 işlem yapıyor. "
                f"{'Disiplinli bir aydı.' if total_actions >= 6 else 'Sabırlı bir aydı.'}"
            ),
            accent_color="#4A5C82",
            stat=str(total_actions),
            support_stat="işlem",
        )
    )

    if stats:
        best_symbol, best = max(stats.items(), key=lambda kv: kv[1]["pct_change"])
        worst_symbol, worst = min(stats.items(), key=lambda kv: kv[1]["pct_change"])
        cards.append(
            MonthlyWrappedCard(
                kind="hero",
                eyebrow="Parıldayan",
                title=best_symbol,
                body=f"{best['pct_change']:+.2f}% ile bu ayın yıldızı. Bu ivmeyi ne sağladı, hafıza kartında saklı.",
                accent_color="#3BD984",
                stat=f"{best['pct_change']:+.2f}%",
                support_stat=best_symbol,
            )
        )
        cards.append(
            MonthlyWrappedCard(
                kind="low",
                eyebrow="Ders",
                title=worst_symbol,
                body=f"{worst['pct_change']:+.2f}% ile zayıf kalan pozisyon. Stop-loss kurgunu yeniden gözden geçir.",
                accent_color="#EF4444",
                stat=f"{worst['pct_change']:+.2f}%",
                support_stat=worst_symbol,
            )
        )

    total_realized = sum((s["realized_pnl"] for s in stats.values()), Decimal("0"))
    sign = "+" if total_realized >= 0 else "-"
    cards.append(
        MonthlyWrappedCard(
            kind="pnl",
            eyebrow="Gerçekleşmiş",
            title=f"{sign}${abs(total_realized):,.2f}",
            body="Gerçekleşmiş kâr/zarar — yalnızca kapanan pozisyonlardan. Tutulan pozisyonların beklentisi önde.",
            accent_color="#C8A97E",
            stat=f"{sign}${abs(total_realized):,.2f}",
            support_stat="gerçekleşmiş P&L",
        )
    )

    cards.append(
        MonthlyWrappedCard(
            kind="outro",
            eyebrow="Sırada",
            title="Önümüzdeki ay",
            body=(
                "Haftalık DCA planını koru, top 3 varlığına 1-2 alarm kur, ayda bir "
                "FIFO özetini kontrol et. MarketPulse sana hatırlatır."
            ),
            accent_color="#4A5C82",
        )
    )

    return MonthlyWrapped(period_start=start, period_end=end, cards=cards)


class WidgetAsset(BaseModel):
    symbol: str
    name: str
    price_usd: str
    change_24h_pct: str


class WidgetSnapshot(BaseModel):
    total_value_usd: str
    daily_change_pct: str
    featured_asset: Optional[WidgetAsset] = None
    generated_at: datetime


@router.get("/widget-snapshot", response_model=WidgetSnapshot)
async def widget_snapshot(
    portfolio_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lightweight payload for the iOS/Android home-screen widget."""
    portfolio = resolve_portfolio(db, current_user.id, portfolio_id)
    rows = (
        db.query(Transaction, Asset)
        .join(Asset, Asset.id == Transaction.asset_id)
        .filter(Transaction.portfolio_id == portfolio.id)
        .all()
    )
    agg: dict[str, dict] = {}
    for tx, asset in rows:
        a = agg.setdefault(
            asset.symbol,
            {"name": asset.name, "qty": Decimal("0"), "cost": Decimal("0")},
        )
        qty = tx.quantity or Decimal("0")
        price = tx.price or Decimal("0")
        if tx.type == TransactionTypeEnum.buy:
            a["qty"] += qty
            a["cost"] += qty * price
        elif tx.type == TransactionTypeEnum.sell:
            a["qty"] -= qty

    symbols = list(agg.keys())
    cached = await get_all_cached_prices(symbols)
    total_value = Decimal("0")
    total_cost = Decimal("0")
    best_symbol: Optional[str] = None
    best_change = Decimal("-1e9")
    for symbol, entry in agg.items():
        price_entry = cached.get(symbol)
        mark = Decimal(str(price_entry.price)) if price_entry else Decimal("0")
        total_value += entry["qty"] * mark
        total_cost += entry["cost"]
        pct = getattr(price_entry, "change_24h", None) if price_entry else None
        pct_decimal = Decimal(str(pct)) if pct is not None else Decimal("0")
        if pct_decimal > best_change:
            best_change = pct_decimal
            best_symbol = symbol

    featured: Optional[WidgetAsset] = None
    if best_symbol and cached.get(best_symbol):
        ce = cached[best_symbol]
        ce_change = getattr(ce, "change_24h", None) or Decimal("0")
        featured = WidgetAsset(
            symbol=best_symbol,
            name=agg[best_symbol]["name"],
            price_usd=f"{Decimal(str(ce.price)):.2f}",
            change_24h_pct=f"{Decimal(str(ce_change)):+.2f}",
        )

    if total_cost > 0:
        daily_pct = ((total_value - total_cost) / total_cost) * Decimal("100")
    else:
        daily_pct = Decimal("0")

    return WidgetSnapshot(
        total_value_usd=f"{total_value:.2f}",
        daily_change_pct=f"{daily_pct:+.2f}",
        featured_asset=featured,
        generated_at=datetime.now(timezone.utc),
    )
