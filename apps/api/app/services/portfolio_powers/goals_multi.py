"""
Multi-asset goal engine.

Given a multi-asset target composition (e.g. {"CEYREKYENI": 50, "BTC": 1.0,
"USDTRY": 10_000}), compute:
  * progress per leg
  * gap in USD
  * tempo label (ahead / on_pace / behind) based on time to due date and user's
    monthly contribution.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.portfolio import Portfolio
from app.models.portfolio_powers import PortfolioGoal
from app.models.user import User
from app.schemas.portfolio_powers import (
    GoalProgressItem,
    GoalTargetItem,
    MultiAssetGoalPayload,
    MultiAssetGoalView,
)
from app.services.portfolio.access import get_or_create_default_portfolio
from app.services.portfolio.summary import build_portfolio_summary
from app.services.price.cache import get_all_cached_prices

TROY_OUNCE_IN_GRAMS = 31.1034768


async def _current_holdings_map(db: Session, user: User, portfolio: Portfolio) -> dict[str, float]:
    summary = await build_portfolio_summary(db, portfolio)
    out: dict[str, float] = {}
    for p in summary.positions:
        out[p.symbol.upper()] = float(p.quantity_held or 0)
    return out


async def build_goal_view(
    db: Session,
    user: User,
    goal: PortfolioGoal,
) -> MultiAssetGoalView:
    portfolio = None
    if goal.portfolio_id is not None:
        portfolio = db.query(Portfolio).filter(Portfolio.id == goal.portfolio_id).first()
    portfolio = portfolio or get_or_create_default_portfolio(db, user.id)

    current = await _current_holdings_map(db, user, portfolio)
    symbols = list((goal.target_composition or {}).keys())
    prices = await get_all_cached_prices(symbols + ["USDTRY"]) if symbols else {}

    progress: list[GoalProgressItem] = []
    usdtry = prices.get("USDTRY")
    total_gap_usd = 0.0
    for sym, target_qty in (goal.target_composition or {}).items():
        sym_u = sym.upper()
        tgt = float(target_qty)
        cur = current.get(sym_u, 0.0)
        progress_pct = (min(1.0, cur / tgt) * 100) if tgt > 0 else 0.0
        live = prices.get(sym_u)
        unit_price_usd: float = 0.0
        if live:
            unit_price_usd = float(live.price)
        elif sym_u == "USDTRY":
            unit_price_usd = (
                (1.0 / float(usdtry.price)) if (usdtry and float(usdtry.price) > 0) else 0.0
            )
        remaining = max(0.0, tgt - cur)
        gap_usd = remaining * unit_price_usd
        total_gap_usd += gap_usd
        progress.append(
            GoalProgressItem(
                symbol=sym_u,
                target_quantity=tgt,
                current_quantity=cur,
                progress_pct=round(progress_pct, 2),
                gap_value_usd=round(gap_usd, 2),
            )
        )

    # Tempo label
    monthly = float(goal.monthly_contribution or 0)
    due = goal.due_date
    months_left = None
    if due is not None:
        months_left = max(0, int(((due - datetime.now(UTC)).days) / 30))
    monthly_usd: float = monthly
    if goal.contribution_currency == "TRY" and usdtry and float(usdtry.price) > 0:
        monthly_usd = monthly / float(usdtry.price)

    required_monthly_usd = 0.0
    if months_left and months_left > 0:
        required_monthly_usd = total_gap_usd / months_left

    if monthly_usd <= 0 or required_monthly_usd <= 0:
        tempo: str = "on_pace"
    elif monthly_usd >= required_monthly_usd * 1.1:
        tempo = "ahead"
    elif monthly_usd < required_monthly_usd * 0.9:
        tempo = "behind"
    else:
        tempo = "on_pace"

    return MultiAssetGoalView(
        id=str(goal.id),
        title=goal.title,
        due_date=goal.due_date.date().isoformat() if goal.due_date else None,
        risk_mode=goal.risk_mode.value if hasattr(goal.risk_mode, "value") else str(goal.risk_mode),
        monthly_contribution=float(goal.monthly_contribution)
        if goal.monthly_contribution
        else None,
        contribution_currency=goal.contribution_currency,
        target_composition=[
            GoalTargetItem(symbol=k, quantity=float(v))
            for k, v in (goal.target_composition or {}).items()
        ],
        progress=progress,
        on_track=tempo in ("ahead", "on_pace"),
        required_monthly_usd=round(required_monthly_usd, 2),
        tempo_label=tempo,  # type: ignore[arg-type]
        created_at=goal.created_at,
    )


def _parse_due_date(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s).replace(tzinfo=UTC)
    except Exception:  # noqa: BLE001
        return None


def create_goal(
    db: Session,
    user: User,
    payload: MultiAssetGoalPayload,
    portfolio: Portfolio | None = None,
) -> PortfolioGoal:
    from app.models.portfolio_powers import PortfolioGoalRiskMode

    portfolio = portfolio or get_or_create_default_portfolio(db, user.id)
    goal = PortfolioGoal(
        user_id=user.id,
        portfolio_id=portfolio.id,
        title=payload.title,
        due_date=_parse_due_date(payload.due_date),
        risk_mode=PortfolioGoalRiskMode(payload.risk_mode),
        target_composition={
            item.symbol.upper(): float(item.quantity) for item in payload.target_composition
        },
        monthly_contribution=payload.monthly_contribution,
        contribution_currency=payload.contribution_currency,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal
