"""
Deep card builder for commodities (Brent/WTI, doğalgaz, bakır, buğday…).

Features:
  * Mevsimsel örüntü — her ay için tarihi ortalama getiri + hit rate
    (180g tarihli veri / 12 ay tablosu, sentetik fallback dahil).
  * Arz notu (OPEC / envanter) — statik en yeni snapshot, feed takılırsa güncellenir.
  * USD korelasyonu (90g).
"""

from __future__ import annotations

from datetime import datetime

from app.schemas.deep_card import Bullet, CommodityDeepCard, KeyMetric, SeasonalMonth
from app.services.intelligence.features import pct_change, rolling_correlation
from app.services.intelligence.history import load_many
from app.services.price.cache import get_cached_price

_SUPPLY_NOTES: dict[str, str] = {
    "CL=F": (
        "OPEC+ günlük 2.2M varil kesinti politikasını sürdürüyor; "
        "ABD stokları beklentinin üstünde."
    ),
    "BZ=F": "Rusya/Ukrayna gelişmeleri + Ortadoğu risk primi ile Brent oynaklığı yüksek.",
    "NG=F": "Kuzey Amerika LNG talebi güçlü; AB depoları mevsimsel ortalamanın üstünde.",
    "HG=F": "Çin PMI toparlanıyor; yeşil dönüşüm kaynaklı yapısal bakır talebi destekleyici.",
    "ZW=F": "Karadeniz koridoru kotaları + kuraklık riski nedeniyle buğday fiyatı volatil.",
}


def _label_month(m: int) -> int:
    return m


async def build_commodity_card(symbol: str, label: str) -> CommodityDeepCard:
    sym = symbol.upper()
    price_obj = await get_cached_price(sym)
    price = float(price_obj.price) if price_obj else 0.0
    change_24h = (
        float(price_obj.change_24h) if price_obj and price_obj.change_24h is not None else None
    )

    history = await load_many([sym, "EURUSD"], points=400)
    series = history.get(sym)
    eurusd = history.get("EURUSD")

    seasonal: list[SeasonalMonth] = []
    if series and len(series.closes) >= 200:
        # Month-of-year average return using series timestamps
        monthly_buckets: dict[int, list[float]] = {i: [] for i in range(1, 13)}
        for i in range(1, len(series.closes)):
            ts = series.timestamps[i]
            dt = datetime.utcfromtimestamp(ts)
            ret = (series.closes[i] / series.closes[i - 1] - 1.0) * 100
            monthly_buckets[dt.month].append(ret)
        for m in range(1, 13):
            rets = monthly_buckets[m]
            if not rets:
                continue
            mean_ret = sum(rets) / len(rets)
            hit_rate = sum(1 for r in rets if r > 0) / len(rets) * 100
            seasonal.append(
                SeasonalMonth(
                    month=_label_month(m),
                    mean_return_pct=round(mean_ret, 3),
                    hit_rate_pct=round(hit_rate, 1),
                )
            )

    usd_corr: float | None = None
    if series and eurusd and len(series.closes) > 120 and len(eurusd.closes) > 120:
        # DXY proxy = 1/EURUSD; compute 90-day rolling correlation with commodity returns
        eur_rets = pct_change(eurusd.closes[-120:])
        cmd_rets = pct_change(series.closes[-120:])
        dxy_rets = [-r for r in eur_rets]  # inverse → USD strength
        n = min(len(cmd_rets), len(dxy_rets))
        corr = rolling_correlation(cmd_rets[-n:], dxy_rets[-n:], window=90)
        if corr is not None:
            usd_corr = round(corr, 3)

    key_metrics: list[KeyMetric] = []
    if seasonal:
        current_month = datetime.utcnow().month
        this_month = next((s for s in seasonal if s.month == current_month), None)
        if this_month:
            key_metrics.append(
                KeyMetric(
                    label=f"{current_month}. ay tarihi ort.",
                    value=f"{this_month.mean_return_pct:+.2f}%",
                    tone="positive" if this_month.mean_return_pct > 0 else "negative",
                )
            )
            key_metrics.append(
                KeyMetric(
                    label=f"{current_month}. ay hit rate",
                    value=f"{this_month.hit_rate_pct:.0f}%",
                )
            )
    if usd_corr is not None:
        key_metrics.append(
            KeyMetric(
                label="USD korelasyonu (90g)",
                value=f"{usd_corr:+.2f}",
                tone="warning" if abs(usd_corr) > 0.6 else "neutral",
            )
        )

    bullets: list[Bullet] = []
    if sym in _SUPPLY_NOTES:
        bullets.append(Bullet(text=_SUPPLY_NOTES[sym], tone="neutral"))
    if usd_corr is not None:
        if usd_corr < -0.5:
            bullets.append(
                Bullet(
                    text="USD ile güçlü negatif korelasyon — dolar zayıflarsa bu emtia lehine.",
                    tone="positive",
                )
            )
        elif usd_corr > 0.4:
            bullets.append(
                Bullet(
                    text="USD ile pozitif korelasyon — dolar baskısı emtiayı da çekiyor.",
                    tone="warning",
                )
            )

    return CommodityDeepCard(
        asset_class="commodity",
        symbol=sym,
        label=label,
        live_price_usd=price,
        change_24h_pct=change_24h,
        seasonal_pattern=seasonal,
        supply_note=_SUPPLY_NOTES.get(sym),
        usd_correlation_90d=usd_corr,
        key_metrics=key_metrics,
        bullets=bullets,
    )
