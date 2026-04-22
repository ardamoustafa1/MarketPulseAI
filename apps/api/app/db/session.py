from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# In a production environment, connection pooling is critical.
# For FastAPI handling lots of sockets/requests, pool_size and max_overflow prevent db connection exhaustion.
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True, # Validates connection before usage (resiliency)
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
