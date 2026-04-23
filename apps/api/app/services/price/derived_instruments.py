from datetime import UTC, datetime
from decimal import Decimal

from app.schemas.price import NormalizedPrice

TROY_OUNCE_IN_GRAMS = Decimal("31.1034768")
TROY_OUNCE_IN_KILOGRAM = Decimal("32.1507466")


def _to_map(prices: list[NormalizedPrice]) -> dict[str, NormalizedPrice]:
    return {p.symbol.upper(): p for p in prices}


def _as_decimal(value: Decimal | None) -> Decimal:
    return value if value is not None else Decimal("0")


def _build(
    symbol: str,
    price: Decimal,
    change_24h: Decimal | None,
    asset_type: str = "metal",
    source: str = "derived_tr",
) -> NormalizedPrice:
    return NormalizedPrice(
        symbol=symbol,
        price=price,
        change_24h=change_24h,
        asset_type=asset_type,
        last_updated_at=datetime.now(UTC),
        source=source,
        is_stale=False,
    )


def build_derived_prices(base_prices: list[NormalizedPrice]) -> list[NormalizedPrice]:
    by_symbol = _to_map(base_prices)
    xau = by_symbol.get("XAU")
    xag = by_symbol.get("XAG")
    usdtry = by_symbol.get("USDTRY")
    eurusd = by_symbol.get("EURUSD")
    xpt = by_symbol.get("XPT")
    xpd = by_symbol.get("XPD")

    if not xau:
        return []

    derived: list[NormalizedPrice] = []
    xau_change = _as_decimal(xau.change_24h)
    usdtry_change = _as_decimal(usdtry.change_24h if usdtry else Decimal("0"))

    # Global base instruments
    derived.append(_build("ONS", xau.price, xau.change_24h))
    usd_kg = xau.price * TROY_OUNCE_IN_KILOGRAM
    derived.append(_build("USDKG", usd_kg, xau.change_24h))

    if eurusd and eurusd.price > 0:
        eur_kg = usd_kg / eurusd.price
        eur_kg_change = xau_change - _as_decimal(eurusd.change_24h)
        derived.append(_build("EURKG", eur_kg, eur_kg_change))

    # TRY-denominated gold derivatives
    if usdtry and usdtry.price > 0:
        gram_altin = (xau.price * usdtry.price) / TROY_OUNCE_IN_GRAMS
        gram_change = xau_change + usdtry_change

        derived.append(_build("GRAMALTIN", gram_altin, gram_change))
        derived.append(_build("HASALTIN", gram_altin * Decimal("1.005"), gram_change))
        derived.append(_build("AYAR22", gram_altin * Decimal("22") / Decimal("24"), gram_change))
        derived.append(_build("AYAR14", gram_altin * Decimal("14") / Decimal("24"), gram_change))

        ceyrek_yeni = gram_altin * Decimal("1.6065")
        ceyrek_eski = ceyrek_yeni * Decimal("0.993")
        yarim_yeni = ceyrek_yeni * Decimal("2")
        yarim_eski = ceyrek_eski * Decimal("2")
        tam_yeni = ceyrek_yeni * Decimal("4")
        tam_eski = ceyrek_eski * Decimal("4")
        ata_yeni = gram_altin * Decimal("6.614")
        ata_eski = ata_yeni * Decimal("0.993")
        ata5_yeni = ata_yeni * Decimal("5")
        ata5_eski = ata_eski * Decimal("5")
        gremse_yeni = ceyrek_yeni * Decimal("10")
        gremse_eski = ceyrek_eski * Decimal("10")

        derived.extend(
            [
                _build("CEYREKYENI", ceyrek_yeni, gram_change),
                _build("CEYREKESKI", ceyrek_eski, gram_change),
                _build("YARIMYENI", yarim_yeni, gram_change),
                _build("YARIMESKI", yarim_eski, gram_change),
                _build("TAMYENI", tam_yeni, gram_change),
                _build("TAMESKI", tam_eski, gram_change),
                _build("ATAYENI", ata_yeni, gram_change),
                _build("ATAESKI", ata_eski, gram_change),
                _build("ATA5YENI", ata5_yeni, gram_change),
                _build("ATA5ESKI", ata5_eski, gram_change),
                _build("GREMSEYENI", gremse_yeni, gram_change),
                _build("GREMSEESKI", gremse_eski, gram_change),
            ]
        )

    if xag:
        silver_change = _as_decimal(xag.change_24h)
        derived.append(_build("GUMUSONS", xag.price, xag.change_24h))
        derived.append(_build("GUMUSUSD", xag.price * TROY_OUNCE_IN_KILOGRAM, silver_change))
        if usdtry and usdtry.price > 0:
            gumus_tl = (xag.price * usdtry.price) / TROY_OUNCE_IN_GRAMS
            derived.append(_build("GUMUSTL", gumus_tl, silver_change + usdtry_change))

    if xau and xag and xag.price > 0:
        ratio = xau.price / xag.price
        ratio_change = _as_decimal(xau.change_24h) - _as_decimal(xag.change_24h)
        derived.append(_build("ALTINGUMUS", ratio, ratio_change))

    if xpt:
        derived.append(_build("PLATINONS", xpt.price, xpt.change_24h))
        derived.append(_build("PLATINUSD", xpt.price * TROY_OUNCE_IN_KILOGRAM, _as_decimal(xpt.change_24h)))

    if xpd:
        derived.append(_build("PALADYUMONS", xpd.price, xpd.change_24h))
        derived.append(_build("PALADYUMUSD", xpd.price * TROY_OUNCE_IN_KILOGRAM, _as_decimal(xpd.change_24h)))

    return derived
