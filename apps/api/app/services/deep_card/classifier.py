"""
Map a symbol to a specific `AssetClass`.

The DB only carries three types (`crypto`, `fiat`, `metal`). Deep cards
need finer granularity (gold vs silver vs platinum, major vs alt crypto,
equity, commodity, index, etf) so we resolve here using pattern matching.
"""

from __future__ import annotations

from app.schemas.deep_card import AssetClass

_GOLD_PREFIXES = (
    "XAU",
    "GRAMALTIN",
    "HASALTIN",
    "ATAYENI",
    "ATAESKI",
    "CEYREKYENI",
    "CEYREKESKI",
    "YARIMYENI",
    "YARIMESKI",
    "TAMYENI",
    "TAMESKI",
    "GREMSEYENI",
    "GREMSEESKI",
    "AYAR22",
    "AYAR14",
)
_SILVER_PREFIXES = ("XAG", "GUMUS", "ALTINGUMUS")
_PLATINUM_PREFIXES = ("XPT", "XPD", "PLATIN", "PALADYUM")

_CRYPTO_MAJORS = {
    "BTC",
    "ETH",
    "BNB",
    "SOL",
    "XRP",
    "ADA",
    "DOGE",
    "AVAX",
    "LTC",
    "DOT",
    "TRX",
    "LINK",
    "BCH",
    "TON",
    "UNI",
}
_CRYPTO_ALT = {
    "MATIC",
    "ATOM",
    "FIL",
    "ALGO",
    "AAVE",
    "ICP",
    "NEAR",
    "FTM",
    "XLM",
    "ETC",
    "HBAR",
    "APT",
    "ARB",
    "OP",
    "SUI",
    "INJ",
    "SAND",
    "MANA",
}

_FX_PAIRS = {
    "USDTRY",
    "EURUSD",
    "EURTRY",
    "GBPUSD",
    "USDJPY",
    "USDCHF",
    "AUDUSD",
    "USDCAD",
    "USDCNH",
    "NZDUSD",
    "USDMXN",
    "USDZAR",
    "USDPLN",
    "USDHUF",
    "USDILS",
    "USDSEK",
    "USDNOK",
    "USDDKK",
    "USDSGD",
    "USDHKD",
    "USDKRW",
    "USDINR",
    "USDIDR",
    "USDTHB",
    "USDPHP",
    "USDMYR",
    "USDBRL",
    "USDARS",
    "USDCOP",
    "USDCLP",
    "USDRUB",
    "USDVND",
}

_COMMODITY_SYMBOLS = {
    "CL=F",
    "BZ=F",
    "NG=F",
    "HG=F",
    "ZW=F",
    "ZC=F",
    "ZS=F",
    "BRENT",
    "WTI",
    "NATGAS",
    "COPPER",
    "WHEAT",
    "CORN",
    "SOY",
}

_INDEX_SYMBOLS = {
    "^GSPC",
    "^IXIC",
    "^DJI",
    "^RUT",
    "^VIX",
    "XU100",
    "XU100.IS",
    "BIST100",
    "^XU100",
    "^FTSE",
    "^GDAXI",
    "^N225",
    "^HSI",
    "^FCHI",
    "^STOXX50E",
}

_ETF_SYMBOLS = {
    "SPY",
    "QQQ",
    "DIA",
    "IWM",
    "GLD",
    "SLV",
    "USO",
    "TLT",
    "VOO",
    "VTI",
    "EEM",
    "EFA",
    "ARKK",
    "XLE",
    "XLF",
    "XLK",
}


_CRYPTO_QUOTE_SUFFIXES = ("USDT", "USDC", "BUSD", "DAI", "FDUSD", "TUSD", "USD", "TRY", "EUR")
_COMMODITY_ALIASES = {
    "WTIUSD": "WTI",
    "BRENTUSD": "BRENT",
    "NATGASUSD": "NATGAS",
    "COPPERUSD": "COPPER",
    "WHEATUSD": "WHEAT",
    "CORNUSD": "CORN",
    "SOYUSD": "SOY",
}


def _strip_crypto_quote(sym: str) -> str:
    """Strip common stable-coin / fiat quote suffixes for crypto pairs."""
    for suffix in _CRYPTO_QUOTE_SUFFIXES:
        if sym.endswith(suffix) and len(sym) > len(suffix):
            base = sym[: -len(suffix)]
            if base.isalpha():
                return base
    return sym


def classify(symbol: str) -> AssetClass:
    """Best-effort classification. Always returns a known class; falls back to
    crypto_alt / fx / equity according to simple heuristics when unknown.
    """
    s = symbol.upper().strip()

    if s in _INDEX_SYMBOLS or s.startswith("^"):
        return "index"
    if s in _ETF_SYMBOLS:
        return "etf"
    if s in _COMMODITY_SYMBOLS or s.endswith("=F") or s in _COMMODITY_ALIASES:
        return "commodity"

    if s.startswith(_GOLD_PREFIXES):
        return "metal_gold"
    if s.startswith(_SILVER_PREFIXES):
        return "metal_silver"
    if s.startswith(_PLATINUM_PREFIXES):
        return "metal_platinum"

    # Crypto pairs (e.g. BTCUSDT, ETHUSDC, SOLUSD) resolve by stripping suffix.
    base = _strip_crypto_quote(s)
    if base in _CRYPTO_MAJORS or s in _CRYPTO_MAJORS:
        return "crypto_major"
    if base in _CRYPTO_ALT or s in _CRYPTO_ALT:
        return "crypto_alt"

    if s in _FX_PAIRS or (len(s) == 6 and s.isalpha()):
        # 6-letter alpha pairs (e.g. EURJPY) treated as FX
        return "fx"

    # Fallback heuristics: 1-5 letter alpha symbol → equity; otherwise alt crypto
    if 1 <= len(s) <= 5 and s.isalpha():
        return "equity"
    return "crypto_alt"
