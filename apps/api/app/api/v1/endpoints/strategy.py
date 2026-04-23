from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_user, get_db
from app.api.v1.endpoints.portfolio import _build_summary_for_portfolio
from app.core.config import settings
from app.models.alert import Alert
from app.models.audit import AuditLog
from app.models.billing import PublicPortfolioSnapshot
from app.models.portfolio import Portfolio, Transaction
from app.models.push_device import PushDevice
from app.models.user import User
from app.services.audit_service import AuditService
from app.services.portfolio.access import resolve_portfolio

router = APIRouter()
EVENT_NAME_REGEX = re.compile(r"^[a-z0-9]+(?:[._-][a-z0-9]+){0,9}$")


class StrategyAction(BaseModel):
    id: str
    title: str
    description: str
    cta: str
    status: str
    reason: str
    expected_impact: str
    confidence_score: Decimal
    metadata: dict[str, Any] = Field(default_factory=dict)


class CoachLoopResponse(BaseModel):
    daily_summary: str
    weekly_summary: str
    actions: list[StrategyAction]
    ranking_model: str = "behavior_risk_v1"


class GoalItem(BaseModel):
    title: str
    target_value: Decimal
    due_date: str
    risk_mode: str = "balanced"


class GoalsPayload(BaseModel):
    goals: list[GoalItem]


class RiskReportResponse(BaseModel):
    volatility_score: Decimal
    concentration_score: Decimal
    drawdown_risk_score: Decimal
    guidance: list[str]


class PublicSnapshotCreateResponse(BaseModel):
    share_token: str
    share_url: str
    expires_at: datetime
    compare_badge: str
    challenge_link: str


class AnalyticsEventIn(BaseModel):
    name: str
    params: dict[str, Any] = Field(default_factory=dict)


class PublicSnapshotRevokeResponse(BaseModel):
    status: str
    share_token: str


class PublicSnapshotRotateResponse(BaseModel):
    revoked_tokens: int
    new_share_token: str
    new_share_url: str
    expires_at: datetime


class WhatIfRequest(BaseModel):
    target_allocations: dict[str, Decimal] = Field(default_factory=dict)
    rebalance_budget: Decimal = Decimal("0")


class WhatIfResponse(BaseModel):
    current_concentration_score: Decimal
    projected_concentration_score: Decimal
    current_volatility_score: Decimal
    projected_volatility_score: Decimal
    rebalance_cost_estimate: Decimal
    expected_impact_summary: str


def _fetch_latest_goals(db: Session, user_id: UUID) -> list[GoalItem]:
    row = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == user_id, AuditLog.action == "strategy.goals.updated")
        .order_by(AuditLog.created_at.desc())
        .first()
    )
    raw = row.details.get("goals", []) if row and isinstance(row.details, dict) else []
    parsed: list[GoalItem] = []
    for item in raw:
        try:
            parsed.append(
                GoalItem(
                    title=str(item.get("title", "Goal")),
                    target_value=Decimal(str(item.get("target_value", "0"))),
                    due_date=str(item.get("due_date", "")),
                    risk_mode=str(item.get("risk_mode", "balanced")),
                )
            )
        except Exception:
            continue
    return parsed


def _estimate_risk_scores(summary: Any) -> tuple[Decimal, Decimal]:
    positions = getattr(summary, "positions", None) or []
    if not positions:
        return Decimal("0"), Decimal("0")
    pnl_values = [abs(Decimal(str(p.unrealized_pnl_percent))) for p in positions]
    volatility = (sum(pnl_values) / Decimal(len(pnl_values))).quantize(Decimal("0.01"))
    allocation = getattr(summary, "allocation", None) or []
    max_alloc = max((Decimal(str(a.percentage)) for a in allocation), default=Decimal("0"))
    concentration = max_alloc.quantize(Decimal("0.01"))
    return volatility, concentration


def _rank_actions_for_user(
    db: Session,
    user_id: UUID,
    actions: list[StrategyAction],
    volatility: Decimal,
    concentration: Decimal,
) -> list[StrategyAction]:
    if not actions:
        return actions
    seven_days_ago = datetime.now(UTC) - timedelta(days=7)
    try:
        recent_events = (
            db.query(AuditLog.action, AuditLog.created_at)
            .filter(AuditLog.user_id == user_id, AuditLog.created_at >= seven_days_ago)
            .all()
        )
    except TypeError:
        # Test doubles may only support a single query model argument.
        try:
            recent_events = (
                db.query(AuditLog)
                .filter(AuditLog.user_id == user_id, AuditLog.created_at >= seven_days_ago)
                .all()
            )
        except Exception:
            recent_events = []
    except Exception:
        recent_events = []
    event_set = {row[0] for row in recent_events if row and row[0]}

    def score(action: StrategyAction) -> tuple[Decimal, Decimal]:
        s = Decimal(str(action.confidence_score))
        target = str(action.metadata.get("target", "")).lower()
        if target == "risk":
            s += Decimal("0.15") if volatility >= Decimal("12") or concentration >= Decimal("45") else Decimal("0.03")
        if target == "alerts" and "alerts.create" not in event_set:
            s += Decimal("0.08")
        if target == "addtransaction" and "analytics.mobile.strategy_coach_action_applied" not in event_set:
            s += Decimal("0.06")
        if target == "goals" and "strategy.goals.updated" not in event_set:
            s += Decimal("0.07")
        return (s, Decimal(str(action.confidence_score)))

    return sorted(actions, key=score, reverse=True)


@router.get("/coach-loop", response_model=CoachLoopResponse)
async def coach_loop(
    portfolio_id: UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    portfolio = resolve_portfolio(db, current_user.id, portfolio_id)
    summary = await _build_summary_for_portfolio(db, portfolio)
    active_alerts = (
        db.query(Alert)
        .filter(Alert.user_id == current_user.id, Alert.is_active is True)
        .count()
    )
    goals = _fetch_latest_goals(db, current_user.id)
    volatility, concentration = _estimate_risk_scores(summary)
    actions: list[StrategyAction] = []

    if summary.total_current_value <= 0:
        actions.append(
            StrategyAction(
                id="first_tx",
                title="Ilk islemini olustur",
                description="Portfoy takibi ve AI karar dongusunu baslatmak icin ilk islemi ekle.",
                cta="Islem ekle",
                status="pending",
                reason="Portfoyde maliyet bazli veri yok; tum ileri analizler ilk isleme bagli.",
                expected_impact="Ilk 24 saatte aktivasyon tamamlama olasiligi artar.",
                confidence_score=Decimal("0.93"),
                metadata={"target": "AddTransaction"},
            )
        )
    if active_alerts == 0:
        actions.append(
            StrategyAction(
                id="first_alert",
                title="Proaktif alarm kur",
                description="Fiyat hareketlerini kacirmamak icin en az bir alarm ekle.",
                cta="Alarm kur",
                status="pending",
                reason="Kullanicinin geri donus trigger'i yok; fiyat oynakligi bosa gidiyor.",
                expected_impact="7 gunluk geri donus oraninda artis beklenir.",
                confidence_score=Decimal("0.88"),
                metadata={"target": "Alerts"},
            )
        )
    if not goals:
        actions.append(
            StrategyAction(
                id="set_goal",
                title="Hedef belirle",
                description="Neden yatirim yaptigini hedefleyerek ilerleme takibini ac.",
                cta="Hedef belirle",
                status="pending",
                reason="Hedefsiz portfoyde karar kalitesi ve sadakat dusuyor.",
                expected_impact="Haftalik aksiyon tamamlama oranini artirir.",
                confidence_score=Decimal("0.84"),
                metadata={"target": "Goals"},
            )
        )

    if not actions:
        actions.append(
            StrategyAction(
                id="optimize",
                title="Risk profilini optimize et",
                description="Dagilim ve oynaklik sinyallerine gore pozisyonlarini dengele.",
                cta="Risk raporunu ac",
                status="ready",
                reason="Portfoy artik optimize edilebilir olgunlukta.",
                expected_impact="Drawdown ve konsantrasyon riski azaltilir.",
                confidence_score=Decimal("0.79"),
                metadata={"target": "Risk"},
            )
        )

    actions = _rank_actions_for_user(db, current_user.id, actions, volatility=volatility, concentration=concentration)

    daily_summary = (
        f"Bugun toplam portfoy degeri {summary.total_current_value} ve gerceklesmemis getiri "
        f"{summary.total_unrealized_pnl_percent}% seviyesinde."
    )
    weekly_summary = (
        f"Bu hafta icin odak: {len(actions)} aksiyon adimi. "
        f"Aktif alarm sayin: {active_alerts}, hedef sayin: {len(goals)}."
    )
    return CoachLoopResponse(daily_summary=daily_summary, weekly_summary=weekly_summary, actions=actions)


@router.post("/coach-actions/{action_id}")
def apply_coach_action(
    action_id: str,
    payload: dict[str, Any] | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    details = {"action_id": action_id, "payload": payload or {}, "applied_at": datetime.now(UTC).isoformat()}
    AuditService(db).log(
        action="strategy.coach_action.applied",
        entity_table="users",
        entity_id=str(current_user.id),
        details=details,
        actor=current_user,
    )
    db.commit()
    return {"status": "ok", "action_id": action_id}


@router.get("/goals", response_model=GoalsPayload)
def list_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return GoalsPayload(goals=_fetch_latest_goals(db, current_user.id))


@router.post("/events", status_code=status.HTTP_202_ACCEPTED)
def ingest_analytics_event(
    payload: AnalyticsEventIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    candidate = payload.name.strip().lower()
    if len(candidate) > 80 or not EVENT_NAME_REGEX.match(candidate):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid event name.")
    safe_name = candidate
    AuditService(db).log(
        action=f"analytics.mobile.{safe_name}",
        entity_table="users",
        entity_id=str(current_user.id),
        details={"name": safe_name, "params": payload.params},
        actor=current_user,
    )
    db.commit()
    return {"status": "accepted"}


@router.post("/goals", response_model=GoalsPayload)
def upsert_goals(
    payload: GoalsPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    AuditService(db).log(
        action="strategy.goals.updated",
        entity_table="users",
        entity_id=str(current_user.id),
        details={"goals": [g.model_dump(mode="json") for g in payload.goals]},
        actor=current_user,
    )
    db.commit()
    return payload


@router.get("/risk-report", response_model=RiskReportResponse)
async def risk_report(
    portfolio_id: UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    portfolio = resolve_portfolio(db, current_user.id, portfolio_id)
    summary = await _build_summary_for_portfolio(db, portfolio)
    positions = summary.positions or []
    if not positions:
        return RiskReportResponse(
            volatility_score=Decimal("0"),
            concentration_score=Decimal("0"),
            drawdown_risk_score=Decimal("0"),
            guidance=["Risk hesaplamak icin once portfoye islem ekleyin."],
        )

    pnl_values = [abs(Decimal(str(p.unrealized_pnl_percent))) for p in positions]
    volatility = (sum(pnl_values) / Decimal(len(pnl_values))).quantize(Decimal("0.01"))
    max_alloc = max((Decimal(str(a.percentage)) for a in summary.allocation), default=Decimal("0"))
    concentration = max_alloc.quantize(Decimal("0.01"))
    worst_pnl = min((Decimal(str(p.unrealized_pnl_percent)) for p in positions), default=Decimal("0"))
    drawdown_proxy = abs(worst_pnl).quantize(Decimal("0.01"))

    guidance: list[str] = []
    if concentration >= Decimal("45"):
        guidance.append("Konsantrasyon riski yuksek: tek varliga bagimliligi azaltin.")
    if volatility >= Decimal("12"):
        guidance.append("Portfoy oynakligi yuksek: daha dengeli dagilim dusunun.")
    if drawdown_proxy >= Decimal("15"):
        guidance.append("Derin geri cekilme sinyali: zarar-kes ve pozisyon boyutu politikasini gozden gecirin.")
    if not guidance:
        guidance.append("Risk gorunumu dengeli. Mevcut stratejiyi disiplinle surdurun.")

    return RiskReportResponse(
        volatility_score=volatility,
        concentration_score=concentration,
        drawdown_risk_score=drawdown_proxy,
        guidance=guidance,
    )


@router.post("/public-snapshot/create", response_model=PublicSnapshotCreateResponse)
def create_public_snapshot(
    portfolio_id: UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    portfolio = resolve_portfolio(db, current_user.id, portfolio_id)
    token = str(uuid4())
    expires_at = datetime.now(UTC) + timedelta(hours=settings.PUBLIC_SNAPSHOT_EXPIRE_HOURS)
    snapshot = PublicPortfolioSnapshot(
        share_token=token,
        user_id=current_user.id,
        portfolio_id=portfolio.id,
        expires_at=expires_at,
        revoked_at=None,
    )
    db.add(snapshot)
    AuditService(db).log(
        action="strategy.public_snapshot.created",
        entity_table="portfolios",
        entity_id=str(portfolio.id),
        details={"share_token": token, "user_id": str(current_user.id)},
        actor=current_user,
    )
    db.commit()
    return PublicSnapshotCreateResponse(
        share_token=token,
        share_url=f"/api/v1/strategy/public-snapshot/{token}",
        expires_at=expires_at,
        compare_badge="marketpulse_challenger",
        challenge_link=f"/app/challenge/{token}",
    )


@router.get("/public-snapshot/{share_token}")
async def read_public_snapshot(share_token: str, db: Session = Depends(get_db)):
    snapshot = (
        db.query(PublicPortfolioSnapshot)
        .filter(PublicPortfolioSnapshot.share_token == share_token)
        .first()
    )
    now = datetime.now(UTC)
    if not snapshot or snapshot.revoked_at is not None or snapshot.expires_at < now:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snapshot not found.")

    portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.id == snapshot.portfolio_id, Portfolio.deleted_at.is_(None))
        .first()
    )
    if not portfolio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found.")
    summary = await _build_summary_for_portfolio(db, portfolio)
    return {
        "portfolio_name": portfolio.name,
        "snapshot_created_at": snapshot.created_at,
        "snapshot_expires_at": snapshot.expires_at,
        "total_current_value": summary.total_current_value,
        "total_unrealized_pnl_percent": summary.total_unrealized_pnl_percent,
        "allocation": [a.model_dump(mode="json") for a in summary.allocation],
    }


@router.post("/public-snapshot/{share_token}/revoke", response_model=PublicSnapshotRevokeResponse)
def revoke_public_snapshot(
    share_token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    snapshot = (
        db.query(PublicPortfolioSnapshot)
        .filter(
            PublicPortfolioSnapshot.share_token == share_token,
            PublicPortfolioSnapshot.user_id == current_user.id,
            PublicPortfolioSnapshot.revoked_at.is_(None),
        )
        .first()
    )
    if not snapshot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snapshot not found.")
    snapshot.revoked_at = datetime.now(UTC)
    db.add(snapshot)
    AuditService(db).log(
        action="strategy.public_snapshot.revoked",
        entity_table="public_portfolio_snapshots",
        entity_id=str(snapshot.id),
        details={"share_token": share_token},
        actor=current_user,
    )
    db.commit()
    return PublicSnapshotRevokeResponse(status="revoked", share_token=share_token)


@router.post("/public-snapshot/rotate", response_model=PublicSnapshotRotateResponse)
def rotate_public_snapshot(
    portfolio_id: UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    portfolio = resolve_portfolio(db, current_user.id, portfolio_id)
    now = datetime.now(UTC)
    active_rows = (
        db.query(PublicPortfolioSnapshot)
        .filter(
            PublicPortfolioSnapshot.user_id == current_user.id,
            PublicPortfolioSnapshot.portfolio_id == portfolio.id,
            PublicPortfolioSnapshot.revoked_at.is_(None),
            PublicPortfolioSnapshot.expires_at >= now,
        )
        .all()
    )
    for row in active_rows:
        row.revoked_at = now
        db.add(row)
    token = str(uuid4())
    expires_at = now + timedelta(hours=settings.PUBLIC_SNAPSHOT_EXPIRE_HOURS)
    snapshot = PublicPortfolioSnapshot(
        share_token=token,
        user_id=current_user.id,
        portfolio_id=portfolio.id,
        expires_at=expires_at,
    )
    db.add(snapshot)
    db.commit()
    return PublicSnapshotRotateResponse(
        revoked_tokens=len(active_rows),
        new_share_token=token,
        new_share_url=f"/api/v1/strategy/public-snapshot/{token}",
        expires_at=expires_at,
    )


@router.post("/what-if", response_model=WhatIfResponse)
async def what_if_simulation(
    payload: WhatIfRequest,
    portfolio_id: UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    portfolio = resolve_portfolio(db, current_user.id, portfolio_id)
    summary = await _build_summary_for_portfolio(db, portfolio)
    current_volatility, current_concentration = _estimate_risk_scores(summary)
    target_values = [Decimal(str(v)) for v in payload.target_allocations.values() if Decimal(str(v)) >= 0]
    if not target_values:
        projected_concentration = current_concentration
        projected_volatility = current_volatility
    else:
        total = sum(target_values)
        max_target = (
            (max(target_values) / total * Decimal("100")).quantize(Decimal("0.01"))
            if total > 0
            else Decimal("0")
        )
        projected_concentration = max_target
        concentration_delta = (current_concentration - projected_concentration) / Decimal("4")
        projected_volatility = max(Decimal("0"), (current_volatility - concentration_delta)).quantize(Decimal("0.01"))
    rebalance_cost = (payload.rebalance_budget * Decimal("0.0025")).quantize(Decimal("0.01"))
    impact = (
        f"Konsantrasyonun {current_concentration}% -> {projected_concentration}% araligina inebilir. "
        f"Oynaklik skoru {current_volatility} -> {projected_volatility} projekte edildi."
    )
    return WhatIfResponse(
        current_concentration_score=current_concentration,
        projected_concentration_score=projected_concentration,
        current_volatility_score=current_volatility,
        projected_volatility_score=projected_volatility,
        rebalance_cost_estimate=rebalance_cost,
        expected_impact_summary=impact,
    )


@router.get("/north-star")
def north_star_metrics(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    _ = current_admin
    now = datetime.now(UTC)
    last_7 = now - timedelta(days=7)
    last_30 = now - timedelta(days=30)

    total_users = db.query(User).filter(User.is_active is True).count()
    activated_users = (
        db.query(Portfolio.user_id)
        .join(Transaction, Transaction.portfolio_id == Portfolio.id)
        .distinct()
        .count()
    )
    retained_users = (
        db.query(AuditLog.user_id)
        .filter(AuditLog.user_id.isnot(None), AuditLog.created_at >= last_30)
        .distinct()
        .count()
    )
    weekly_active = (
        db.query(AuditLog.user_id)
        .filter(AuditLog.user_id.isnot(None), AuditLog.created_at >= last_7)
        .distinct()
        .count()
    )
    push_reachable = db.query(PushDevice.user_id).distinct().count()

    activation_rate = round((activated_users / total_users) * 100, 2) if total_users else 0
    retention_proxy = round((retained_users / total_users) * 100, 2) if total_users else 0
    wa_ratio = round((weekly_active / total_users) * 100, 2) if total_users else 0
    coach_open_users = (
        db.query(AuditLog.user_id)
        .filter(
            AuditLog.user_id.isnot(None),
            AuditLog.created_at >= last_7,
            AuditLog.action == "analytics.mobile.strategy_hub_opened",
        )
        .distinct()
        .count()
    )
    coach_action_users = (
        db.query(AuditLog.user_id)
        .filter(
            AuditLog.user_id.isnot(None),
            AuditLog.created_at >= last_7,
            AuditLog.action == "analytics.mobile.strategy_coach_action_applied",
        )
        .distinct()
        .count()
    )
    funnel_conversion = round((coach_action_users / coach_open_users) * 100, 2) if coach_open_users else 0

    cohort_rows = db.query(User).filter(User.is_active is True).all()
    cohort_metrics: dict[str, dict[str, float | int]] = {}
    for user in cohort_rows:
        created_at = user.created_at.replace(tzinfo=UTC) if user.created_at.tzinfo is None else user.created_at
        cohort_key = f"{created_at.year}-W{created_at.isocalendar().week:02d}"
        if cohort_key not in cohort_metrics:
            cohort_metrics[cohort_key] = {
                "users": 0,
                "retained_7d": 0,
                "retained_30d": 0,
            }
        cohort_metrics[cohort_key]["users"] += 1

        first_7d_end = created_at + timedelta(days=7)
        first_30d_end = created_at + timedelta(days=30)

        retained_7d = (
            db.query(AuditLog.id)
            .filter(
                AuditLog.user_id == user.id,
                AuditLog.created_at >= first_7d_end,
                AuditLog.created_at <= first_7d_end + timedelta(days=7),
            )
            .first()
            is not None
        )
        retained_30d = (
            db.query(AuditLog.id)
            .filter(
                AuditLog.user_id == user.id,
                AuditLog.created_at >= first_30d_end,
                AuditLog.created_at <= first_30d_end + timedelta(days=7),
            )
            .first()
            is not None
        )
        if retained_7d:
            cohort_metrics[cohort_key]["retained_7d"] += 1
        if retained_30d:
            cohort_metrics[cohort_key]["retained_30d"] += 1

    cohort_summary: list[dict[str, float | int | str]] = []
    for cohort_key, row in sorted(cohort_metrics.items(), key=lambda kv: kv[0], reverse=True)[:8]:
        users = int(row["users"])
        retained_7d = int(row["retained_7d"])
        retained_30d = int(row["retained_30d"])
        cohort_summary.append(
            {
                "cohort": cohort_key,
                "users": users,
                "retention_7d_percent": round((retained_7d / users) * 100, 2) if users else 0,
                "retention_30d_percent": round((retained_30d / users) * 100, 2) if users else 0,
            }
        )

    return {
        "total_users": total_users,
        "activated_users": activated_users,
        "activation_rate_percent": activation_rate,
        "retention_proxy_percent": retention_proxy,
        "weekly_active_ratio_percent": wa_ratio,
        "push_reachable_users": push_reachable,
        "coach_hub_open_users_7d": coach_open_users,
        "coach_action_users_7d": coach_action_users,
        "coach_action_conversion_percent_7d": funnel_conversion,
        "cohort_retention": cohort_summary,
    }
