from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# In a production environment, connection pooling is critical.
# For FastAPI handling lots of sockets/requests, pool_size and max_overflow prevent db connection exhaustion.
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True, # Validates connection before usage (resiliency)
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
