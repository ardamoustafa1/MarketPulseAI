"""Deep card dispatcher — selects the correct builder based on asset class."""

from __future__ import annotations

from datetime import UTC, datetime

from app.schemas.deep_card import DeepCardResponse
from app.services.deep_card.classifier import classify
from app.services.deep_card.commodity import build_commodity_card
from app.services.deep_card.crypto_alt import build_crypto_alt_card
from app.services.deep_card.crypto_major import build_crypto_major_card
from app.services.deep_card.equity import build_equity_card
from app.services.deep_card.fx import build_fx_card
from app.services.deep_card.index_etf import build_index_etf_card
from app.services.deep_card.metals import build_metals_card

_DISCLAIMERS = [
    "Deep Card içerikleri eğitim amaçlıdır; yatırım tavsiyesi niteliği taşımaz.",
    "Kapalıçarşı primleri piyasa saatleri dışında gecikmeli olabilir.",
    "Fundamental göstergeler, 3. parti feed takılmadıkça doğrulanmış son snapshot'tan üretilir.",
]


async def build_deep_card(symbol: str, display_label: str | None = None) -> DeepCardResponse:
    sym = symbol.upper().strip()
    asset_class = classify(sym)
    label = display_label or sym

    response = DeepCardResponse(
        symbol=sym,
        asset_class=asset_class,
        generated_at=datetime.now(UTC),
        disclaimers=_DISCLAIMERS,
    )

    try:
        if asset_class in ("metal_gold", "metal_silver", "metal_platinum"):
            response.metals = await build_metals_card(sym, asset_class, label)
        elif asset_class == "crypto_major":
            response.crypto_major = await build_crypto_major_card(sym, label)
        elif asset_class == "crypto_alt":
            response.crypto_alt = await build_crypto_alt_card(sym, label)
        elif asset_class == "fx":
            response.fx = await build_fx_card(sym, label)
        elif asset_class == "equity":
            response.equity = await build_equity_card(sym, label)
        elif asset_class == "commodity":
            response.commodity = await build_commodity_card(sym, label)
        elif asset_class in ("index", "etf"):
            response.index_etf = await build_index_etf_card(sym, label)
    except Exception:  # noqa: BLE001
        # Graceful partial response — mobile will fall back to generic price view.
        pass

    return response
