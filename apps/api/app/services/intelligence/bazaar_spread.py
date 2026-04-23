"""
LBMA ↔ Kapalıçarşı spread intelligence.

We treat LBMA USD gram as the fair reference and compare each TR-denominated
derived instrument against its theoretical conversion through USDTRY. The
output flags whether local bazaar pricing is rich / fair / cheap plus a
"reasonable" bid-ask range for the day.
"""
from __future__ import annotations

from app.schemas.intelligence import BazaarInstrument, BazaarSpreadSection
from app.services.intelligence.features import safe_std
from app.services.intelligence.history import load_many
from app.services.price.cache import get_all_cached_prices

TROY_OUNCE_IN_GRAMS = 31.1034768

# Static, well-known physical premia for each Turkish gold instrument
# relative to a fair 24-ayar gram. Kept conservative.
_STANDARD_PREMIUMS = {
    "GRAMALTIN": 1.000,
    "HASALTIN": 1.005,
    "CEYREKYENI": 1.6065,
    "CEYREKESKI": 1.6065 * 0.993,
    "ATAYENI": 6.614,
    "ATAESKI": 6.614 * 0.993,
    "YARIMYENI": 1.6065 * 2,
    "YARIMESKI": 1.6065 * 2 * 0.993,
    "TAMYENI": 1.6065 * 4,
    "TAMESKI": 1.6065 * 4 * 0.993,
    "GREMSEYENI": 1.6065 * 10,
    "GREMSEESKI": 1.6065 * 10 * 0.993,
}

_INSTRUMENT_LABELS = {
    "GRAMALTIN": "Gram Altın",
    "HASALTIN": "Has Altın",
    "CEYREKYENI": "Yeni Çeyrek",
    "CEYREKESKI": "Eski Çeyrek",
    "ATAYENI": "Yeni Ata",
    "ATAESKI": "Eski Ata",
    "YARIMYENI": "Yeni Yarım",
    "YARIMESKI": "Eski Yarım",
    "TAMYENI": "Yeni Tam",
    "TAMESKI": "Eski Tam",
    "GREMSEYENI": "Yeni Gremse",
    "GREMSEESKI": "Eski Gremse",
}


async def build_bazaar() -> BazaarSpreadSection:
    symbols = ["XAU", "USDTRY", *list(_STANDARD_PREMIUMS.keys())]
    live = await get_all_cached_prices(symbols)

    xau = live.get("XAU")
    usdtry = live.get("USDTRY")
    if xau is None or usdtry is None or float(usdtry.price) == 0:
        return BazaarSpreadSection(
            lbma_reference_usd=0.0,
            usdtry=0.0,
            gram_fair_try=0.0,
            reasonable_bid_ask_pct=0.0,
            narrative="Canlı veri hazır olduğunda bu modül otomatik dolacak.",
            instruments=[],
        )

    xau_usd = float(xau.price)
    usdtry_rate = float(usdtry.price)
    gram_fair_try = (xau_usd * usdtry_rate) / TROY_OUNCE_IN_GRAMS

    # Reasonable daily bid-ask ≈ 2·stdev(usdtry daily returns over 30d) * 100
    history = await load_many(["USDTRY"], points=60)
    usdtry_hist = history.get("USDTRY")
    reasonable = 1.2  # default 1.2%
    if usdtry_hist is not None and len(usdtry_hist.closes) > 20:
        from app.services.intelligence.features import pct_change
        rets = pct_change(usdtry_hist.closes)[-30:]
        reasonable = max(0.4, min(3.5, safe_std(rets) * 2 * 100))

    instruments: list[BazaarInstrument] = []
    for key, multiplier in _STANDARD_PREMIUMS.items():
        bazaar_price = live.get(key)
        if bazaar_price is None:
            continue
        fair_value = gram_fair_try * multiplier
        premium_pct = (
            (float(bazaar_price.price) / fair_value - 1.0) * 100
            if fair_value > 0
            else 0.0
        )
        if premium_pct > 2.5:
            verdict = "rich"
        elif premium_pct < -1.5:
            verdict = "cheap"
        else:
            verdict = "fair"
        instruments.append(
            BazaarInstrument(
                symbol=key,
                label=_INSTRUMENT_LABELS.get(key, key),
                bazaar_price=round(float(bazaar_price.price), 2),
                fair_value=round(fair_value, 2),
                premium_pct=round(premium_pct, 3),
                verdict=verdict,  # type: ignore[arg-type]
            )
        )

    # Headline narrative picks the ata and çeyrek primi as the marker the user
    # actually feels at the kuyumcu counter.
    marker = next((i for i in instruments if i.symbol == "CEYREKYENI"), None)
    if marker:
        narrative = (
            f"Kapalıçarşı'da çeyreğin primi {marker.premium_pct:+.2f}%. "
            f"LBMA referansıyla mantıklı al-sat farkı bugün ≈ {reasonable:.2f}%."
        )
    else:
        narrative = f"LBMA referansıyla bugünün makul spread aralığı ≈ {reasonable:.2f}%."

    return BazaarSpreadSection(
        lbma_reference_usd=round(xau_usd, 2),
        usdtry=round(usdtry_rate, 4),
        gram_fair_try=round(gram_fair_try, 2),
        reasonable_bid_ask_pct=round(reasonable, 3),
        narrative=narrative,
        instruments=instruments,
    )
