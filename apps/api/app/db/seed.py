from datetime import UTC, datetime
from decimal import Decimal

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.asset import Asset, AssetCategory, AssetTypeEnum
from app.models.portfolio import Portfolio, Transaction, TransactionTypeEnum
from app.models.user import RoleEnum, User


def _get_or_create_category(db, slug: str, name: str) -> AssetCategory:
    existing = db.query(AssetCategory).filter(AssetCategory.slug == slug).first()
    if existing:
        return existing
    category = AssetCategory(slug=slug, name=name)
    db.add(category)
    db.flush()
    return category


def _get_or_create_asset(db, symbol: str, name: str, asset_type: AssetTypeEnum, category: AssetCategory) -> Asset:
    existing = db.query(Asset).filter(Asset.symbol == symbol).first()
    if existing:
        return existing
    asset = Asset(
        symbol=symbol,
        name=name,
        type=asset_type,
        category_id=category.id,
        is_active=True,
    )
    db.add(asset)
    db.flush()
    return asset


def _get_or_create_user(db, email: str, first_name: str, last_name: str, role: RoleEnum, password: str) -> User:
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return existing
    user = User(
        email=email,
        hashed_password=get_password_hash(password),
        first_name=first_name,
        last_name=last_name,
        role=role,
        is_active=True,
        subscription_tier="pro" if role == RoleEnum.admin else "free",
    )
    db.add(user)
    db.flush()
    return user


def _get_or_create_portfolio(db, user: User, name: str, is_default: bool = True) -> Portfolio:
    existing = db.query(Portfolio).filter(Portfolio.user_id == user.id, Portfolio.name == name).first()
    if existing:
        return existing
    portfolio = Portfolio(user_id=user.id, name=name, is_default=is_default)
    db.add(portfolio)
    db.flush()
    return portfolio


def _create_demo_transactions_if_empty(db, portfolio: Portfolio, assets: dict[str, Asset]) -> int:
    tx_count = db.query(Transaction).filter(Transaction.portfolio_id == portfolio.id).count()
    if tx_count > 0:
        return 0

    now = datetime.now(UTC)
    demo_rows = [
        Transaction(
            portfolio_id=portfolio.id,
            asset_id=assets["BTC"].id,
            type=TransactionTypeEnum.buy,
            price=Decimal("62000"),
            quantity=Decimal("0.08"),
            transaction_date=now,
            notes="Demo seed buy BTC",
        ),
        Transaction(
            portfolio_id=portfolio.id,
            asset_id=assets["ETH"].id,
            type=TransactionTypeEnum.buy,
            price=Decimal("3200"),
            quantity=Decimal("0.9"),
            transaction_date=now,
            notes="Demo seed buy ETH",
        ),
        Transaction(
            portfolio_id=portfolio.id,
            asset_id=assets["XAU"].id,
            type=TransactionTypeEnum.buy,
            price=Decimal("2350"),
            quantity=Decimal("1.2"),
            transaction_date=now,
            notes="Demo seed buy Gold",
        ),
    ]
    db.add_all(demo_rows)
    return len(demo_rows)


def seed_data() -> None:
    """
    Idempotent local seed for demo/dev environments.
    Run with: python -m app.db.seed
    """
    db = SessionLocal()
    try:
        crypto = _get_or_create_category(db, "crypto", "Cryptocurrency")
        fiat = _get_or_create_category(db, "fiat", "Fiat Currency")
        metal = _get_or_create_category(db, "metal", "Precious Metals")

        assets = {
            "BTC": _get_or_create_asset(db, "BTC", "Bitcoin", AssetTypeEnum.crypto, crypto),
            "ETH": _get_or_create_asset(db, "ETH", "Ethereum", AssetTypeEnum.crypto, crypto),
            "USDTRY": _get_or_create_asset(db, "USDTRY", "US Dollar / Turkish Lira", AssetTypeEnum.fiat, fiat),
            "EURUSD": _get_or_create_asset(db, "EURUSD", "Euro / US Dollar", AssetTypeEnum.fiat, fiat),
            "XAU": _get_or_create_asset(db, "XAU", "Gold Ounce", AssetTypeEnum.metal, metal),
        }

        _get_or_create_user(
            db,
            email="admin@marketpulse.ai",
            first_name="Super",
            last_name="Admin",
            role=RoleEnum.admin,
            password="Admin123!",
        )
        demo_user = _get_or_create_user(
            db,
            email="demo@marketpulse.ai",
            first_name="Demo",
            last_name="User",
            role=RoleEnum.user,
            password="Demo12345!",
        )
        demo_portfolio = _get_or_create_portfolio(db, demo_user, name="Main Portfolio", is_default=True)
        seeded_tx_count = _create_demo_transactions_if_empty(db, demo_portfolio, assets)

        db.commit()
        print("Seed completed successfully.")
        print("Admin login: admin@marketpulse.ai / Admin123!")
        print("Demo login : demo@marketpulse.ai / Demo12345!")
        print(f"Seeded demo transactions: {seeded_tx_count}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
