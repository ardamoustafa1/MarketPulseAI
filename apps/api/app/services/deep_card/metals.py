"""
Deep card builder for the metals family (gold, silver, platinum/palladium).

Highlights vs competitors like Harem Altın:
  * Kapalıçarşı fair-value premia for every TR gold instrument.
  * Gram vs bank spread estimation using USDTRY volatility.
  * LBMA AM/PM fix schedule (informational, not live).
  * Inflation-shield score (how much real-TRY purchasing-power gold has saved
    over the last 12M vs USDTRY depreciation).
  * "Target engine" → months-to-goal given a user monthly contribution.
"""

from __future__ import annotations

from datetime import UTC, datetime

from app.schemas.deep_card import AssetClass as _AssetClass
from app.schemas.deep_card import (
    Bullet,
    KeyMetric,
    LbmaFix,
    MetalsDeepCard,
    MetalsPremium,
    MetalsSpreadBucket,
    TargetProjection,
)
from app.services.intelligence.bazaar_spread import (
    _INSTRUMENT_LABELS,
    _STANDARD_PREMIUMS,
)
from app.services.intelligence.features import pct_change, safe_std
from app.services.intelligence.history import load_many
from app.services.price.cache import get_all_cached_prices

TROY_OUNCE_IN_GRAMS = 31.1034768

_LBMA_FIXES: list[LbmaFix] = [
    LbmaFix(label="Londra AM Fix", time_utc="10:30", note="Güney Afrika ile Londra açık"),
    LbmaFix(label="Londra PM Fix", time_utc="15:00", note="NY piyasası açılır açılmaz"),
]

_SILVER_FIXES: list[LbmaFix] = [
    LbmaFix(label="LBMA Silver Fix", time_utc="12:00", note="IBA gümüş referans fix"),
]

_PLATINUM_FIXES: list[LbmaFix] = [
    LbmaFix(label="LPPM Platinum AM", time_utc="09:45"),
    LbmaFix(label="LPPM Platinum PM", time_utc="14:00"),
]


def _bank_spread_pct(usdtry_vol: float) -> float:
    """Typical retail banka spread + dealer mark-up ≈ 0.8% base + 1.5·σ_usdtry."""
    return round(max(0.5, 0.8 + 1.5 * usdtry_vol * 100), 3)


def _bazaar_vs_bank(premium_pct: float, bank_spread_pct: float) -> float:
    """Kapalıçarşı primini bankanın tipik komisyonundan düşer."""
    return round(premium_pct - bank_spread_pct, 3)


async def build_metals_card(
    symbol: str,
    asset_class: _AssetClass,
    label: str,
) -> MetalsDeepCard:
    sym = symbol.upper()

    # 1. Live prices
    metal_symbols = ["XAU", "XAG", "XPT", "XPD", "USDTRY", *list(_STANDARD_PREMIUMS.keys())]
    live = await get_all_cached_prices(metal_symbols + [sym])

    xau = live.get("XAU")
    xag = live.get("XAG")
    xpt = live.get("XPT")
    usdtry = live.get("USDTRY")

    # 2. Historical USDTRY volatility (for bank spread)
    history = await load_many(["USDTRY", "XAU", "XAG", "XPT"], points=400)
    usdtry_hist = history.get("USDTRY")
    bank_spread = 1.2
    if usdtry_hist is not None and len(usdtry_hist.closes) > 30:
        rets = pct_change(usdtry_hist.closes)[-30:]
        bank_spread = _bank_spread_pct(safe_std(rets))

    gram_fair_try: float | None = None
    if xau is not None and usdtry is not None and float(usdtry.price) > 0:
        gram_fair_try = (float(xau.price) * float(usdtry.price)) / TROY_OUNCE_IN_GRAMS

    # 3. Premiums (only for gold family)
    premiums: list[MetalsPremium] = []
    if asset_class == "metal_gold" and gram_fair_try:
        for key, mult in _STANDARD_PREMIUMS.items():
            bp = live.get(key)
            if bp is None:
                continue
            fair = gram_fair_try * mult
            premium_pct = (float(bp.price) / fair - 1.0) * 100 if fair > 0 else 0.0
            verdict: str = (
                "rich" if premium_pct > 2.5 else "cheap" if premium_pct < -1.5 else "fair"
            )
            premiums.append(
                MetalsPremium(
                    symbol=key,
                    label=_INSTRUMENT_LABELS.get(key, key),
                    bazaar_price=round(float(bp.price), 2),
                    fair_value=round(fair, 2),
                    premium_pct=round(premium_pct, 3),
                    verdict=verdict,  # type: ignore[arg-type]
                )
            )

    # 4. Spreads (Kapalıçarşı vs banka)
    spreads: list[MetalsSpreadBucket] = []
    if asset_class == "metal_gold" and premiums:
        ceyrek = next((p for p in premiums if p.symbol == "CEYREKYENI"), None)
        gram = next((p for p in premiums if p.symbol == "GRAMALTIN"), None)
        if ceyrek:
            diff = _bazaar_vs_bank(ceyrek.premium_pct, bank_spread)
            spreads.append(
                MetalsSpreadBucket(
                    label="Çeyrek Kapalıçarşı vs banka",
                    difference_pct=diff,
                    note=(
                        "Kapalıçarşı daha cazip"
                        if diff > 0
                        else "Banka daha cazip"
                        if diff < 0
                        else "Nötr"
                    ),
                )
            )
        if gram:
            diff = _bazaar_vs_bank(gram.premium_pct, bank_spread)
            spreads.append(
                MetalsSpreadBucket(
                    label="Gram Kapalıçarşı vs banka",
                    difference_pct=diff,
                    note="Kapalıçarşı primi + banka spread farkı",
                )
            )

    # 5. Inflation shield score — gold_try_return_12m vs usdtry_depreciation_12m
    shield_score: float | None = None
    shield_narrative: str | None = None
    xau_hist = history.get("XAU")
    if (
        xau_hist is not None
        and usdtry_hist is not None
        and len(xau_hist.closes) > 200
        and len(usdtry_hist.closes) > 200
    ):
        xau_return = (xau_hist.closes[-1] / xau_hist.closes[-250] - 1.0) * 100
        try_depr = (usdtry_hist.closes[-1] / usdtry_hist.closes[-250] - 1.0) * 100
        gold_try_return = (
            (xau_hist.closes[-1] * usdtry_hist.closes[-1])
            / (xau_hist.closes[-250] * usdtry_hist.closes[-250])
            - 1.0
        ) * 100
        shield_score = round(min(100, max(-100, gold_try_return - try_depr)), 2)
        shield_narrative = (
            f"Son 12 ayda TL altın %{gold_try_return:+.1f}, "
            f"USDTRY %{try_depr:+.1f}. Reel kalkan puanı: {shield_score:+.1f}. "
            f"XAU/USD getiri %{xau_return:+.1f}."
        )

    # 6. Target engine — naive run-rate toward "Düğüne 50 çeyrek" etc.
    target_engine: TargetProjection | None = None
    if asset_class == "metal_gold" and premiums:
        ceyrek = next((p for p in premiums if p.symbol == "CEYREKYENI"), None)
        if ceyrek and ceyrek.bazaar_price > 0:
            monthly_contrib = 5_000.0  # default: kullanıcı ayda 5k TL ayırıyor varsayımı
            per_month_pieces = monthly_contrib / ceyrek.bazaar_price
            target_qty = 50.0
            months = target_qty / per_month_pieces if per_month_pieces > 0 else None
            target_engine = TargetProjection(
                target_label="50 Çeyrek Altın",
                target_quantity=target_qty,
                monthly_addition=monthly_contrib,
                months_to_target=round(months, 1) if months else None,
                note=(
                    f"Ayda {monthly_contrib:,.0f}₺ ile "
                    f"ayda ≈ {per_month_pieces:.2f} çeyrek alabilirsin. "
                    f"Mevcut hızla hedefe ≈ {months:.1f} ay."
                ),
            )

    # 7. Metrics & bullets
    key_metrics: list[KeyMetric] = []
    if gram_fair_try:
        key_metrics.append(
            KeyMetric(
                label="Fair gram (LBMA)",
                value=f"{gram_fair_try:,.2f} ₺",
                tone="neutral",
            )
        )
    if bank_spread:
        key_metrics.append(
            KeyMetric(
                label="Banka spread tipik",
                value=f"{bank_spread:.2f}%",
                tone="warning" if bank_spread > 2.0 else "neutral",
            )
        )
    if shield_score is not None:
        key_metrics.append(
            KeyMetric(
                label="Enflasyon kalkanı",
                value=f"{shield_score:+.1f}",
                tone="positive" if shield_score > 0 else "negative",
            )
        )

    bullets: list[Bullet] = []
    if premiums:
        rich = [p for p in premiums if p.verdict == "rich"]
        cheap = [p for p in premiums if p.verdict == "cheap"]
        if rich:
            names = ", ".join(p.label for p in rich[:3])
            bullets.append(
                Bullet(
                    text=f"Bugün Kapalıçarşı'da {names} fair değerin üstünde — "
                    "profit taking için uygun pencere.",
                    tone="warning",
                )
            )
        if cheap:
            names = ", ".join(p.label for p in cheap[:3])
            bullets.append(
                Bullet(
                    text=f"{names} fair değerin altında — alım lehine spread.",
                    tone="positive",
                )
            )
    if shield_narrative:
        bullets.append(Bullet(text=shield_narrative, tone="neutral"))

    # 8. Live prices (metal-level for consistency across silver/platinum)
    live_price_usd: float | None = None
    live_price_gram_try: float | None = None
    class_live = live.get(sym) if sym in live else None
    if class_live:
        live_price_usd = float(class_live.price)

    if asset_class == "metal_gold" and xau:
        live_price_usd = float(xau.price)
        live_price_gram_try = gram_fair_try
    elif asset_class == "metal_silver" and xag and usdtry:
        live_price_usd = float(xag.price)
        live_price_gram_try = (float(xag.price) * float(usdtry.price)) / TROY_OUNCE_IN_GRAMS
    elif asset_class == "metal_platinum" and xpt and usdtry:
        live_price_usd = float(xpt.price)
        live_price_gram_try = (float(xpt.price) * float(usdtry.price)) / TROY_OUNCE_IN_GRAMS

    # 9. LBMA fix schedule (asset-class specific)
    lbma_fixes: list[LbmaFix]
    if asset_class == "metal_silver":
        lbma_fixes = _SILVER_FIXES
    elif asset_class == "metal_platinum":
        lbma_fixes = _PLATINUM_FIXES
    else:
        lbma_fixes = _LBMA_FIXES

    return MetalsDeepCard(
        asset_class=asset_class,  # type: ignore[arg-type]
        symbol=sym,
        label=label,
        live_price_try=float(class_live.price)
        if (class_live and asset_class == "metal_gold" and sym.startswith("GRAMALTIN"))
        else None,
        live_price_usd=live_price_usd,
        live_price_gram_try=live_price_gram_try,
        premiums=premiums,
        spreads=spreads,
        lbma_fixes=lbma_fixes,
        inflation_shield_score=shield_score,
        shield_narrative=shield_narrative,
        target_engine=target_engine,
        key_metrics=key_metrics,
        bullets=bullets,
    )


def _now_utc() -> datetime:
    return datetime.now(UTC)
