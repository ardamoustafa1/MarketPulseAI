"""
Curated + user-authored community basket management.

Seed lists are inserted on demand (idempotent) so a clean install gets eight
editorial baskets that make the feature feel populated from day zero.
"""

from __future__ import annotations

import re
import secrets
from collections.abc import Iterable
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.social import (
    CommunityList,
    CommunityListCategory,
    CommunityListItem,
    CommunityListTheme,
)
from app.models.user import User
from app.schemas.social import (
    CommunityListCreate,
    CommunityListItemView,
    CommunityListView,
)

_SEED_LISTS: list[dict] = [
    {
        "slug": "ai-innovators",
        "title": "AI İnovatörleri",
        "subtitle": "Yapay zeka altyapısı + uygulama katmanı",
        "emoji": "🤖",
        "theme": CommunityListTheme.ai,
        "hero_color": "#7C6CFF",
        "items": [
            ("NVDA", 30), ("MSFT", 20), ("AMZN", 15), ("GOOGL", 15),
            ("META", 10), ("AMD", 10),
        ],
    },
    {
        "slug": "emekli-dostu",
        "title": "Emekli Dostu",
        "subtitle": "Düşük volatilite + kupon / temettü ağırlıklı",
        "emoji": "🪙",
        "theme": CommunityListTheme.income,
        "hero_color": "#FFB800",
        "items": [
            ("GRAMALTIN", 35), ("USDTRY", 20), ("EURTRY", 15),
            ("SPY", 15), ("TUPRS.IS", 10), ("AKBNK.IS", 5),
        ],
    },
    {
        "slug": "tr-hisse-altin-karma",
        "title": "TR Hisse + Altın Karma",
        "subtitle": "BIST30 çekirdeği + altın kalkanı",
        "emoji": "🏛️",
        "theme": CommunityListTheme.turkey_mix,
        "hero_color": "#E63946",
        "items": [
            ("XU030.IS", 30), ("GRAMALTIN", 25), ("ATAYENI", 15),
            ("GARAN.IS", 10), ("ASELS.IS", 10), ("KCHOL.IS", 10),
        ],
    },
    {
        "slug": "meme-coin-arenasi",
        "title": "Meme Coin Arenası",
        "subtitle": "Yüksek volatilite, yüksek adrenalin — sadece paper",
        "emoji": "🎭",
        "theme": CommunityListTheme.meme,
        "hero_color": "#FF3E6C",
        "items": [
            ("DOGE", 30), ("SHIB", 25), ("PEPE", 20),
            ("WIF", 15), ("BONK", 10),
        ],
    },
    {
        "slug": "halving-hazirligi",
        "title": "Halving Hazırlığı",
        "subtitle": "BTC merkezli + Layer 2 + altcoin yelpazesi",
        "emoji": "⚡",
        "theme": CommunityListTheme.halving,
        "hero_color": "#F7931A",
        "items": [
            ("BTC", 45), ("ETH", 25), ("SOL", 15),
            ("ARB", 8), ("MATIC", 7),
        ],
    },
    {
        "slug": "enflasyon-kalkani",
        "title": "Enflasyon Kalkanı",
        "subtitle": "Değerli madenler, emtia ve dövizli varlık sepeti",
        "emoji": "🛡️",
        "theme": CommunityListTheme.inflation_shield,
        "hero_color": "#06B6D4",
        "items": [
            ("GRAMALTIN", 40), ("SILVER", 20), ("BRENT", 15),
            ("COPPER", 10), ("USDTRY", 10), ("EURTRY", 5),
        ],
    },
    {
        "slug": "dovizle-buyuyenler",
        "title": "Dövizle Büyüyenler",
        "subtitle": "TRY dışı varlıklarla korunma + büyüme",
        "emoji": "💶",
        "theme": CommunityListTheme.fx,
        "hero_color": "#10B981",
        "items": [
            ("USDTRY", 30), ("EURTRY", 20), ("SPY", 20),
            ("QQQ", 15), ("BTC", 10), ("GRAMALTIN", 5),
        ],
    },
    {
        "slug": "komoditeler",
        "title": "Komoditeler Sepeti",
        "subtitle": "Brent, bakır, buğday, doğalgaz çeşitliliği",
        "emoji": "🛢️",
        "theme": CommunityListTheme.commodities,
        "hero_color": "#B45309",
        "items": [
            ("BRENT", 30), ("WTI", 20), ("NATGAS", 15),
            ("COPPER", 15), ("WHEAT", 10), ("CORN", 10),
        ],
    },
]


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return slug[:110] or secrets.token_urlsafe(6)


def ensure_seed_lists(db: Session) -> None:
    for payload in _SEED_LISTS:
        row = db.query(CommunityList).filter(CommunityList.slug == payload["slug"]).first()
        if row is not None:
            continue
        row = CommunityList(
            title=payload["title"],
            subtitle=payload.get("subtitle"),
            slug=payload["slug"],
            emoji=payload.get("emoji"),
            hero_color=payload.get("hero_color"),
            category=CommunityListCategory.curated,
            theme=payload.get("theme"),
            is_public=True,
            is_featured=True,
        )
        db.add(row)
        db.flush()
        for idx, (symbol, weight) in enumerate(payload["items"]):
            db.add(CommunityListItem(
                list_id=row.id,
                asset_symbol=symbol,
                suggested_weight_pct=Decimal(str(weight)),
                position=idx,
            ))
    db.commit()


def _display_name(user: User | None) -> str | None:
    if user is None:
        return None
    first = getattr(user, "first_name", None) or ""
    last = getattr(user, "last_name", None) or ""
    full = (first + " " + last).strip()
    if full:
        return full
    email = getattr(user, "email", "") or ""
    return email.split("@")[0] if email else None


def _view(
    row: CommunityList,
    items: Iterable[CommunityListItem],
    curator: User | None,
    origin: str,
) -> CommunityListView:
    ordered = sorted(items, key=lambda i: i.position)
    return CommunityListView(
        id=str(row.id),
        title=row.title,
        subtitle=row.subtitle,
        description=row.description,
        slug=row.slug,
        emoji=row.emoji,
        hero_color=row.hero_color,
        category=row.category.value if hasattr(row.category, "value") else str(row.category),
        theme=row.theme.value if (row.theme and hasattr(row.theme, "value")) else None,
        curator_display_name=_display_name(curator),
        is_featured=bool(row.is_featured),
        follower_count=int(row.follower_count or 0),
        item_count=len(ordered),
        items=[
            CommunityListItemView(
                symbol=i.asset_symbol,
                suggested_weight_pct=(
                    float(i.suggested_weight_pct)
                    if i.suggested_weight_pct is not None
                    else None
                ),
                position=int(i.position or 0),
            )
            for i in ordered
        ],
        share_url=f"{origin.rstrip('/')}/l/{row.slug}",
    )


def list_public(db: Session, origin: str = "https://marketpulse.app") -> list[CommunityListView]:
    ensure_seed_lists(db)
    rows = (
        db.query(CommunityList)
        .filter(CommunityList.is_public.is_(True))
        .order_by(
            CommunityList.is_featured.desc(),
            CommunityList.follower_count.desc(),
            CommunityList.created_at.desc(),
        )
        .all()
    )
    out: list[CommunityListView] = []
    for r in rows:
        items = db.query(CommunityListItem).filter(CommunityListItem.list_id == r.id).all()
        curator: User | None = None
        if r.curator_user_id:
            curator = db.query(User).filter(User.id == r.curator_user_id).first()
        out.append(_view(r, items, curator, origin))
    return out


def get_by_slug(
    db: Session,
    slug: str,
    origin: str = "https://marketpulse.app",
) -> CommunityListView | None:
    row = db.query(CommunityList).filter(CommunityList.slug == slug).first()
    if row is None:
        return None
    items = db.query(CommunityListItem).filter(CommunityListItem.list_id == row.id).all()
    curator = (
        db.query(User).filter(User.id == row.curator_user_id).first()
        if row.curator_user_id else None
    )
    return _view(row, items, curator, origin)


def create_user_list(
    db: Session,
    user: User,
    payload: CommunityListCreate,
    origin: str = "https://marketpulse.app",
) -> CommunityListView:
    slug_base = _slugify(payload.title)
    candidate = slug_base
    counter = 1
    while db.query(CommunityList).filter(CommunityList.slug == candidate).first() is not None:
        counter += 1
        candidate = f"{slug_base}-{counter}"

    row = CommunityList(
        title=payload.title,
        subtitle=payload.subtitle,
        description=payload.description,
        slug=candidate,
        emoji=payload.emoji,
        hero_color=payload.hero_color,
        category=CommunityListCategory.user,
        theme=CommunityListTheme(payload.theme) if payload.theme else None,
        curator_user_id=user.id,
        is_public=True,
    )
    db.add(row)
    db.flush()

    for idx, item in enumerate(payload.items):
        db.add(CommunityListItem(
            list_id=row.id,
            asset_symbol=item.symbol.upper(),
            suggested_weight_pct=(
                Decimal(str(item.suggested_weight_pct))
                if item.suggested_weight_pct is not None else None
            ),
            position=idx,
        ))

    db.commit()
    db.refresh(row)
    items = db.query(CommunityListItem).filter(CommunityListItem.list_id == row.id).all()
    return _view(row, items, user, origin)
