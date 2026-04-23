"""
Friend-referral programme (virtual bonuses only — no real monetary value).
"""

from __future__ import annotations

import secrets
import string
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.social import ReferralBonusKind, ReferralClaim, ReferralCode
from app.models.user import User
from app.schemas.social import (
    ReferralClaimPayload,
    ReferralClaimResult,
    ReferralCodeView,
)

_CODE_ALPHABET = string.ascii_uppercase + string.digits
_DEFAULT_BONUS: dict[ReferralBonusKind, Decimal] = {
    ReferralBonusKind.silver_grams: Decimal("0.1"),
    ReferralBonusKind.usdt_points: Decimal("1"),
    ReferralBonusKind.gold_quarter: Decimal("0.04"),   # ≈ 10 çeyrek puan
}


def _generate_code(db: Session) -> str:
    while True:
        candidate = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(8))
        exists = db.query(ReferralCode).filter(ReferralCode.code == candidate).first()
        if exists is None:
            return candidate


def get_or_create_code(
    db: Session,
    user: User,
    bonus_kind: ReferralBonusKind = ReferralBonusKind.silver_grams,
    origin: str = "https://marketpulse.app",
) -> ReferralCodeView:
    row = db.query(ReferralCode).filter(ReferralCode.owner_user_id == user.id).first()
    if row is None:
        row = ReferralCode(
            owner_user_id=user.id,
            code=_generate_code(db),
            bonus_kind=bonus_kind,
            bonus_amount=_DEFAULT_BONUS[bonus_kind],
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    kind_value = (
        row.bonus_kind.value if hasattr(row.bonus_kind, "value") else str(row.bonus_kind)
    )
    return ReferralCodeView(
        code=row.code,
        bonus_kind=kind_value,
        bonus_amount=float(row.bonus_amount),
        claimed_count=int(row.claimed_count or 0),
        share_url=f"{origin.rstrip('/')}/r/{row.code}",
    )


def claim(db: Session, user: User, payload: ReferralClaimPayload) -> ReferralClaimResult:
    code = payload.code.strip().upper()
    row = db.query(ReferralCode).filter(ReferralCode.code == code).first()
    if row is None:
        raise ValueError("Kod geçersiz.")
    if str(row.owner_user_id) == str(user.id):
        raise ValueError("Kendi kodunu kullanamazsın.")

    existing = db.query(ReferralClaim).filter(
        ReferralClaim.claimer_user_id == user.id,
    ).first()
    if existing is not None:
        raise ValueError("Zaten bir referansı kullandın.")

    claim_row = ReferralClaim(
        code=row.code,
        claimer_user_id=user.id,
        owner_user_id=row.owner_user_id,
        bonus_awarded=row.bonus_amount,
    )
    db.add(claim_row)
    row.claimed_count = int(row.claimed_count or 0) + 1
    db.commit()

    owner = db.query(User).filter(User.id == row.owner_user_id).first()
    owner_name = None
    if owner is not None:
        first = getattr(owner, "first_name", "") or ""
        last = getattr(owner, "last_name", "") or ""
        fallback = (
            owner.email.split("@")[0] if getattr(owner, "email", None) else None
        )
        owner_name = (first + " " + last).strip() or fallback

    kind_value = (
        row.bonus_kind.value if hasattr(row.bonus_kind, "value") else str(row.bonus_kind)
    )
    return ReferralClaimResult(
        accepted=True,
        bonus_kind=kind_value,
        bonus_awarded=float(row.bonus_amount),
        owner_display_name=owner_name,
    )
