from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "MarketPulse AI"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    
    # Security
    SECRET_KEY: str = "super-secret-jwt-key"
    ALGORITHM: str = "HS256"
    JWT_ISSUER: str = "marketpulse-api"
    JWT_AUDIENCE: str = "marketpulse-clients"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30
    AUTH_RATE_LIMIT_MAX_REQUESTS: int = 20
    AUTH_RATE_LIMIT_WINDOW_SECONDS: int = 60
    WS_CONNECT_RATE_LIMIT_MAX_REQUESTS: int = 30
    WS_CONNECT_RATE_LIMIT_WINDOW_SECONDS: int = 60
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    
    # DB & Redis
    DATABASE_URL: str = "postgresql://user:pass@localhost:5432/db"
    REDIS_URL: str = "redis://localhost:6379/0"
    SENTRY_DSN: str | None = None
    SENTRY_RELEASE: str | None = None
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1
    BILLING_WEBHOOK_SECRET: str = "change-me-webhook-secret"
    LLM_PROVIDER: str = "none"
    LLM_API_KEY: str | None = None
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_API_BASE_URL: str = "https://api.openai.com/v1"

    # Price Feed
    PRICE_POLL_INTERVAL_SECONDS: int = 5
    PRICE_SCHEDULER_ENABLED: bool = True
    APP_ROLE: str = "all"
    PRICE_HTTP_TIMEOUT_SECONDS: float = 8.0
    PRICE_PROVIDER_MAX_RETRIES: int = 2
    PRICE_PROVIDER_RETRY_BACKOFF_SECONDS: float = 0.4
    PRICE_CACHE_TTL_SECONDS: int = 300
    PRICE_STALE_THRESHOLD_SECONDS: int = 60
    HAREM_API_BASE_URL: str = "https://altinapi.com/api/v1"
    HAREM_API_KEY: str | None = None
    PRICE_SYMBOLS: List[str] = [
        "BTC",
        "ETH",
        "SOL",
        "ADA",
        "XRP",
        "BNB",
        "DOGE",
        "TRX",
        "DOT",
        "MATIC",
        "AVAX",
        "LINK",
        "LTC",
        "BCH",
        "ATOM",
        "ETC",
        "XLM",
        "XMR",
        "FIL",
        "APT",
        "ARB",
        "OP",
        "HBAR",
        "VET",
        "NEAR",
        "ALGO",
        "ICP",
        "AAVE",
        "SAND",
        "MANA",
        "USDTRY",
        "EURUSD",
        "GBPUSD",
        "USDJPY",
        "USDCHF",
        "USDCAD",
        "USDAUD",
        "USDNZD",
        "USDSEK",
        "USDNOK",
        "USDDKK",
        "USDCNH",
        "USDRUB",
        "USDZAR",
        "USDMXN",
        "USDBRL",
        "USDINR",
        "USDKRW",
        "USDHKD",
        "USDSGD",
        "USDPLN",
        "USDCZK",
        "USDHUF",
        "USDILS",
        "USDAED",
        "USDSAR",
        "USDQAR",
        "USDKWD",
        "USDBHD",
        "USDOMR",
        "USDTHB",
        "USDMYR",
        "USDIDR",
        "USDPHP",
        "USDVND",
        "XAU",
        "XAG",
        "XPT",
        "XPD",
    ]

    @field_validator("PRICE_SYMBOLS", mode="before")
    @classmethod
    def parse_price_symbols(cls, value):
        if isinstance(value, str):
            return [item.strip().upper() for item in value.split(",") if item.strip()]
        return value

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
