"""
Deep card builder for indices and ETFs.

Serves:
  * İlk 10 ağırlık (statik seed, replace ettir)
  * Sektör ısı haritası (30g momentum)
  * Yıllıklandırılmış getiri (180g)
"""

from __future__ import annotations

from app.schemas.deep_card import (
    Bullet,
    HoldingEntry,
    IndexEtfDeepCard,
    KeyMetric,
    SectorWeight,
)
from app.services.intelligence.features import momentum, pct_change, safe_mean
from app.services.intelligence.history import load_many
from app.services.price.cache import get_cached_price

_TOP_HOLDINGS: dict[str, list[HoldingEntry]] = {
    "SPY": [
        HoldingEntry(symbol="AAPL", name="Apple", weight_pct=7.1),
        HoldingEntry(symbol="MSFT", name="Microsoft", weight_pct=6.8),
        HoldingEntry(symbol="NVDA", name="Nvidia", weight_pct=6.2),
        HoldingEntry(symbol="AMZN", name="Amazon", weight_pct=3.6),
        HoldingEntry(symbol="META", name="Meta", weight_pct=2.4),
        HoldingEntry(symbol="GOOGL", name="Alphabet A", weight_pct=2.1),
        HoldingEntry(symbol="GOOG", name="Alphabet C", weight_pct=1.8),
        HoldingEntry(symbol="BRK.B", name="Berkshire", weight_pct=1.7),
        HoldingEntry(symbol="LLY", name="Eli Lilly", weight_pct=1.5),
        HoldingEntry(symbol="AVGO", name="Broadcom", weight_pct=1.4),
    ],
    "QQQ": [
        HoldingEntry(symbol="AAPL", name="Apple", weight_pct=8.8),
        HoldingEntry(symbol="MSFT", name="Microsoft", weight_pct=8.2),
        HoldingEntry(symbol="NVDA", name="Nvidia", weight_pct=7.6),
        HoldingEntry(symbol="AMZN", name="Amazon", weight_pct=5.0),
        HoldingEntry(symbol="META", name="Meta", weight_pct=4.1),
        HoldingEntry(symbol="AVGO", name="Broadcom", weight_pct=3.8),
        HoldingEntry(symbol="COST", name="Costco", weight_pct=2.6),
        HoldingEntry(symbol="GOOGL", name="Alphabet A", weight_pct=2.5),
        HoldingEntry(symbol="TSLA", name="Tesla", weight_pct=2.3),
        HoldingEntry(symbol="NFLX", name="Netflix", weight_pct=2.1),
    ],
    "XU100": [
        HoldingEntry(symbol="AKBNK.IS", name="Akbank", weight_pct=6.2),
        HoldingEntry(symbol="GARAN.IS", name="Garanti", weight_pct=6.0),
        HoldingEntry(symbol="KCHOL.IS", name="Koç Hld.", weight_pct=5.1),
        HoldingEntry(symbol="THYAO.IS", name="THY", weight_pct=4.8),
        HoldingEntry(symbol="ASELS.IS", name="Aselsan", weight_pct=3.9),
        HoldingEntry(symbol="EREGL.IS", name="Ereğli", weight_pct=3.2),
        HoldingEntry(symbol="YKBNK.IS", name="Yapı Kredi", weight_pct=2.9),
        HoldingEntry(symbol="TUPRS.IS", name="Tüpraş", weight_pct=2.7),
        HoldingEntry(symbol="SASA.IS", name="SASA", weight_pct=2.3),
        HoldingEntry(symbol="BIMAS.IS", name="Bim", weight_pct=2.1),
    ],
}

_SECTOR_WEIGHTS: dict[str, list[SectorWeight]] = {
    "SPY": [
        SectorWeight(sector="Teknoloji", weight_pct=31.0),
        SectorWeight(sector="Sağlık", weight_pct=12.5),
        SectorWeight(sector="Finans", weight_pct=12.9),
        SectorWeight(sector="Tüketici", weight_pct=10.2),
        SectorWeight(sector="İletişim", weight_pct=8.8),
        SectorWeight(sector="Sanayi", weight_pct=8.3),
        SectorWeight(sector="Enerji", weight_pct=3.6),
        SectorWeight(sector="Malzeme", weight_pct=2.4),
        SectorWeight(sector="Emlak", weight_pct=2.4),
        SectorWeight(sector="Kamu hizmeti", weight_pct=2.3),
    ],
    "QQQ": [
        SectorWeight(sector="Teknoloji", weight_pct=59.5),
        SectorWeight(sector="İletişim", weight_pct=15.3),
        SectorWeight(sector="Tüketici", weight_pct=11.8),
        SectorWeight(sector="Sağlık", weight_pct=6.0),
        SectorWeight(sector="Sanayi", weight_pct=4.8),
        SectorWeight(sector="Emlak", weight_pct=0.3),
    ],
    "XU100": [
        SectorWeight(sector="Bankalar", weight_pct=27.5),
        SectorWeight(sector="Holding", weight_pct=10.4),
        SectorWeight(sector="Metal/Sanayi", weight_pct=12.1),
        SectorWeight(sector="Savunma", weight_pct=7.2),
        SectorWeight(sector="Havacılık", weight_pct=5.1),
        SectorWeight(sector="Perakende", weight_pct=6.8),
        SectorWeight(sector="Enerji", weight_pct=5.9),
        SectorWeight(sector="Teknoloji", weight_pct=3.2),
        SectorWeight(sector="Gayrimenkul", weight_pct=2.7),
    ],
}


async def build_index_etf_card(symbol: str, label: str) -> IndexEtfDeepCard:
    sym = symbol.upper()
    price_obj = await get_cached_price(sym)
    price = float(price_obj.price) if price_obj else 0.0
    change_24h = (
        float(price_obj.change_24h) if price_obj and price_obj.change_24h is not None else None
    )

    history = await load_many([sym], points=260)
    series = history.get(sym)

    ann_return: float | None = None
    if series and len(series.closes) >= 200:
        daily_rets = pct_change(series.closes)
        mean_daily = safe_mean(daily_rets)
        ann_return = round(((1 + mean_daily) ** 252 - 1.0) * 100, 2)

    holdings = _TOP_HOLDINGS.get(sym, [])
    sectors = _SECTOR_WEIGHTS.get(sym, [])

    # 30-gün momentum → sektör ısı haritasına enjekte et
    if series and sectors:
        mom30 = momentum(series.closes, 30) * 100
        for s in sectors:
            s.change_30d_pct = round(mom30, 2)

    key_metrics: list[KeyMetric] = []
    if ann_return is not None:
        key_metrics.append(
            KeyMetric(
                label="Yıllık getiri (proxy)",
                value=f"{ann_return:+.1f}%",
                tone="positive" if ann_return > 0 else "negative",
            )
        )
    if holdings:
        top = holdings[0]
        key_metrics.append(
            KeyMetric(label="En büyük ağırlık", value=f"{top.symbol} %{top.weight_pct:.1f}")
        )
    if sectors:
        dominant = max(sectors, key=lambda s: s.weight_pct)
        key_metrics.append(
            KeyMetric(
                label="Dominant sektör", value=f"{dominant.sector} %{dominant.weight_pct:.1f}"
            )
        )

    bullets: list[Bullet] = []
    if holdings and sum(h.weight_pct for h in holdings[:5]) > 30:
        bullets.append(
            Bullet(
                text=(
                    f"İlk 5 ağırlık toplamı "
                    f"%{sum(h.weight_pct for h in holdings[:5]):.1f} — "
                    "konsantrasyon yüksek."
                ),
                tone="warning",
            )
        )
    if ann_return is not None and ann_return < 0:
        bullets.append(
            Bullet(text="Son 12 ay proxy getiri negatif — dikkatli giriş.", tone="negative")
        )

    asset_cls = (
        "etf"
        if sym in {"SPY", "QQQ", "DIA", "IWM", "GLD", "SLV", "USO", "TLT", "VOO", "VTI", "EEM"}
        else "index"
    )
    return IndexEtfDeepCard(
        asset_class=asset_cls,  # type: ignore[arg-type]
        symbol=sym,
        label=label,
        live_price=price,
        change_24h_pct=change_24h,
        annualized_return_pct=ann_return,
        top_holdings=holdings,
        sector_weights=sectors,
        key_metrics=key_metrics,
        bullets=bullets,
    )
