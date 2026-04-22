from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List
from urllib.parse import urlparse

class Settings(BaseSettings):
    PROJECT_NAME: str = "MarketPulse AI"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    
    # Security
    SECRET_KEY: str = ""
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
    TRUST_PROXY_HEADERS: bool = False
    TRUSTED_PROXY_HOPS: int = 1
    TRUSTED_PROXY_CIDRS: List[str] = []
    ADMIN_STEP_UP_TOKEN: str = ""
    ADMIN_STEP_UP_TOTP_SECRET: str = ""
    PUBLIC_SNAPSHOT_EXPIRE_HOURS: int = 168
    AUTH_COOKIE_NAME: str = "mp_access_token"
    REFRESH_COOKIE_NAME: str = "mp_refresh_token"
    CSRF_COOKIE_NAME: str = "mp_csrf_token"
    COOKIE_SECURE: bool = True
    COOKIE_SAMESITE: str = "lax"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    
    # DB & Redis
    DATABASE_URL: str = "postgresql://user:pass@localhost:5432/db"
    REDIS_URL: str = "redis://localhost:6379/0"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    SENTRY_DSN: str | None = None
    SENTRY_RELEASE: str | None = None
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1
    BILLING_WEBHOOK_SECRET: str = ""
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

    @field_validator("TRUSTED_PROXY_CIDRS", mode="before")
    @classmethod
    def parse_proxy_cidrs(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("ENVIRONMENT", mode="before")
    @classmethod
    def normalize_environment(cls, value):
        env = str(value).strip().lower()
        allowed = {"development", "staging", "production", "test"}
        if env not in allowed:
            raise ValueError(f"ENVIRONMENT must be one of {sorted(allowed)}")
        return env

    @field_validator("APP_ROLE", mode="before")
    @classmethod
    def normalize_app_role(cls, value):
        role = str(value).strip().lower()
        allowed = {"all", "api", "worker"}
        if role not in allowed:
            raise ValueError(f"APP_ROLE must be one of {sorted(allowed)}")
        return role

    @field_validator("BACKEND_CORS_ORIGINS")
    @classmethod
    def validate_cors_by_environment(cls, value, info):
        env = info.data.get("ENVIRONMENT", "development")
        for origin in value:
            parsed = urlparse(origin)
            if not parsed.scheme or not parsed.netloc:
                raise ValueError(f"Invalid CORS origin: {origin}")
            if env in {"staging", "production"} and parsed.scheme != "https":
                raise ValueError(
                    f"CORS origin must use https in {env}: {origin}"
                )
            if env in {"development", "test"} and parsed.hostname not in {"localhost", "127.0.0.1"}:
                raise ValueError(
                    f"CORS origin must be localhost/127.0.0.1 in {env}: {origin}"
                )
        return value

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
