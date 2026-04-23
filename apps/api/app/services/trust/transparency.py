"""
Static-but-maintained registry of data providers & policy links.

Kept server-side (rather than in a mobile JSON) so the legal team can update
this in one place and have every client — mobile, web, API docs — pull the
latest list without shipping a new build.
"""

from __future__ import annotations

from datetime import UTC, datetime

from app.schemas.trust import ProviderEntry, TransparencyView

_PROVIDERS: list[ProviderEntry] = [
    ProviderEntry(
        code="binance",
        name="Binance",
        category="market_data",
        description=(
            "Kripto fiyatları, 24s hacim ve emir defteri verisi. "
            "Spot ve vadeli ürünler için temel kaynağımız."
        ),
        coverage=["BTC", "ETH", "USDT", "MAJOR KRIPTOLAR"],
        website_url="https://www.binance.com",
        terms_url="https://www.binance.com/en/terms",
    ),
    ProviderEntry(
        code="yahoo_finance",
        name="Yahoo Finance",
        category="market_data",
        description=(
            "Hisse senedi kapanışları ve geçmiş mum verileri için "
            "yedek piyasa veri sağlayıcımız."
        ),
        coverage=["BIST", "NASDAQ", "NYSE"],
        website_url="https://finance.yahoo.com",
        terms_url="https://policies.yahoo.com/us/en/yahoo/terms/index.htm",
    ),
    ProviderEntry(
        code="stooq",
        name="Stooq",
        category="market_data",
        description="Geçmiş kapanışlar ve endeks seviyeleri için yedek kaynak.",
        coverage=["BIST", "Emtia", "Endeksler"],
        website_url="https://stooq.com",
        terms_url=None,
    ),
    ProviderEntry(
        code="frankfurter",
        name="Frankfurter (ECB)",
        category="fx",
        description="Avrupa Merkez Bankası resmi kurlarından türetilmiş döviz verisi.",
        coverage=["USDTRY", "EURTRY", "EURUSD"],
        website_url="https://www.frankfurter.app",
        terms_url="https://www.frankfurter.app/#about",
    ),
    ProviderEntry(
        code="exchange_rate_host",
        name="ExchangeRate.host",
        category="fx",
        description="Yedek ücretsiz döviz kuru API'si.",
        coverage=["FX"],
        website_url="https://exchangerate.host",
        terms_url="https://exchangerate.host/#/docs",
    ),
    ProviderEntry(
        code="gold_api",
        name="Gold API",
        category="commodity",
        description="Altın, gümüş, platin ons fiyatları ve LBMA fix'i.",
        coverage=["XAU", "XAG", "XPT", "XPD"],
        website_url="https://www.goldapi.io",
        terms_url="https://www.goldapi.io/terms",
    ),
    ProviderEntry(
        code="kapalicarsi",
        name="Kapalıçarşı Panel",
        category="commodity",
        description=(
            "Yerel kuyumcu serbest piyasa fiyatları — altın ve döviz için "
            "kullanıcı arabirimi referansı."
        ),
        coverage=["Gram Altın", "Çeyrek", "Ata"],
        website_url=None,
        terms_url=None,
    ),
    ProviderEntry(
        code="rss_newsroom",
        name="RSS Newsroom Agregatörü",
        category="news",
        description=(
            "Bloomberg HT, Anadolu Ajansı, Reuters, Yahoo Finance "
            "kaynaklarından haber başlıkları."
        ),
        coverage=["TR Ekonomi", "Global Piyasa"],
        website_url=None,
        terms_url=None,
    ),
    ProviderEntry(
        code="sentry",
        name="Sentry",
        category="security",
        description=(
            "Çökme ve hata raporlama. Kullanıcı kimliği hash'lenerek "
            "gönderilir, PII toplanmaz."
        ),
        coverage=["Mobil", "API"],
        website_url="https://sentry.io",
        terms_url="https://sentry.io/terms/",
    ),
]


_POLICIES = [
    {
        "code": "privacy",
        "title": "Gizlilik Politikası",
        "url": "https://marketpulse.app/legal/privacy",
    },
    {
        "code": "terms",
        "title": "Kullanım Koşulları",
        "url": "https://marketpulse.app/legal/terms",
    },
    {
        "code": "kvkk",
        "title": "KVKK Aydınlatma Metni",
        "url": "https://marketpulse.app/legal/kvkk",
    },
    {
        "code": "investment",
        "title": "Yatırım Danışmanlığı Uyarısı",
        "url": "https://marketpulse.app/legal/investment-disclosure",
    },
]


def build_transparency_view() -> TransparencyView:
    return TransparencyView(
        providers=_PROVIDERS,
        policies=_POLICIES,
        last_reviewed_at=datetime.now(UTC),
    )
