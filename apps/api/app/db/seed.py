import asyncio
# from sqlalchemy.ext.asyncio import AsyncSession
# from app.db.session import SessionLocal
from app.models.user import User, RoleEnum
from app.models.asset import AssetCategory, Asset, AssetTypeEnum
from app.core.security import get_password_hash

async def seed_data():
    """
    Kritik temel verilerin sisteme basılmasını sağlar.
    Kullanım: fastapi çalışmadan önce veya izole bir CLI aracı olarak.
    """
    print("Seeding database...")
    
    # Fake db session creation
    # async with SessionLocal() as db:
    
    # 1. Seed Admin User
    admin_password = get_password_hash("Admin123!")
    admin_user = User(
        email="admin@marketpulse.ai",
        hashed_password=admin_password,
        first_name="Super",
        last_name="Admin",
        role=RoleEnum.admin
    )
    
    # 2. Seed Asset Categories
    crypto_cat = AssetCategory(name="Cryptocurrency", slug="crypto")
    fiat_cat = AssetCategory(name="Fiat Currency", slug="fiat")
    metal_cat = AssetCategory(name="Precious Metals", slug="metal")
    
    # 3. Seed Basic Assets
    btc = Asset(symbol="BTC", name="Bitcoin", type=AssetTypeEnum.crypto, category=crypto_cat)
    eth = Asset(symbol="ETH", name="Ethereum", type=AssetTypeEnum.crypto, category=crypto_cat)
    usdtry = Asset(symbol="USDTRY", name="US Dollar / Turkish Lira", type=AssetTypeEnum.fiat, category=fiat_cat)
    xau = Asset(symbol="XAU", name="Gold Ounce", type=AssetTypeEnum.metal, category=metal_cat)
    
    # db.add_all([admin_user, crypto_cat, fiat_cat, metal_cat, btc, eth, usdtry, xau])
    # db.commit()
    print("Seed completed.")

if __name__ == "__main__":
    asyncio.run(seed_data())
