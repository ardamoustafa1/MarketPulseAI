"""
Cross-asset spread & ratio radar.

Each entry looks at the *current* value of a headline ratio and compares it
against its own 180-day distribution to flag "normal / low / extreme_low …"
states. Used by the mobile radar rail.
"""
from __future__ import annotations

from datetime import UTC, datetime

from app.schemas.intelligence import RatioSignal, RatiosSection
from app.services.intelligence.features import percentile_rank, zscore
from app.services.intelligence.history import CloseSeries, load_many

_RATIO_SYMBOLS = [
    "XAU", "XAG", "BTC", "ETH", "EURUSD", "USDTRY", "GRAMALTIN", "CEYREKYENI",
]


def _series_ratio(a: CloseSeries, b: CloseSeries) -> list[float]:
    n = min(len(a.closes), len(b.closes))
    if n == 0:
        return []
    return [ac / bc if bc else 0.0 for ac, bc in zip(a.closes[-n:], b.closes[-n:], strict=False)]


def _inverse_series(series: CloseSeries) -> list[float]:
    return [(1.0 / x) if x else 0.0 for x in series.closes]


def _direction(percentile: float) -> str:
    if percentile >= 95:
        return "extreme_high"
    if percentile >= 75:
        return "high"
    if percentile <= 5:
        return "extreme_low"
    if percentile <= 25:
        return "low"
    return "normal"


def _reaction_blurb(key: str, direction: str) -> str | None:
    """
    Return a one-liner describing historical tendency when a ratio reaches the
    flagged direction. Kept deterministic / non-predictive.
    """
    if direction == "normal":
        return None
    table = {
        "gold_silver": {
            "extreme_high": "Tarihsel olarak gümüşün relative rally yapma eğilimi görülür.",
            "high": "Gümüş altının gerisinde — rotasyon fırsatı olabilir.",
            "low": "Altın gümüşe göre daha ucuz — metaller senkron alım baskısında.",
            "extreme_low": "Altın gümüşe göre belirgin ucuz — dikkatli takip edilmeli.",
        },
        "eth_btc": {
            "extreme_low": "ETH/BTC tarihsel dip bölgesinde — tarihsel olarak ETH için lehte.",
            "low": "ETH zayıf; BTC dominance yükseliyor.",
            "high": "ETH, BTC üzerine relative güç kazanıyor.",
            "extreme_high": "ETH aşırı lider — rotasyon riski yükselir.",
        },
        "dxy_proxy": {
            "extreme_high": "EURUSD çok zayıf, dolar güçlü — EM varlıklar için baskı.",
            "high": "Dolar yukarı yönlü; risk iştahına negatif baskı.",
            "low": "Dolar zayıf; EM + emtia için destekleyici.",
            "extreme_low": "Dolar aşırı zayıf — kısa vadeli geri çekilme olasılığı artar.",
        },
        "ceyrek_premium": {
            "extreme_high": "Çeyrek primi rekor seviyelerde — kuyumcu spread'i açık.",
            "high": "Çeyrek primi yüksek — gram altına geçiş düşünülebilir.",
            "low": "Çeyrek primi düşük — çeyrek almak görece avantajlı.",
            "extreme_low": "Çeyrek primi çok düşük — kuyumcuda güçlü alım fırsatı.",
        },
        "gold_btc": {
            "high": "Altın/BTC yüksek — BTC görece zayıf.",
            "extreme_high": "Altın tarihsel olarak BTC'ye karşı rekor — rotasyon riski.",
            "low": "BTC altına karşı güçleniyor — risk iştahı yukarı.",
            "extreme_low": "BTC altına karşı aşırı lider — kısa vadeli konsolidasyon riski.",
        },
        "usdtry_z": {
            "extreme_high": "USDTRY tarihsel yüksek bölgesinde — ani oynaklık riski.",
            "high": "USDTRY yukarı momentum sürüyor.",
            "low": "USDTRY görece sakin — pozisyon hedging'i için uygun ortam.",
            "extreme_low": "USDTRY tarihsel düşük bölgesinde — dikkatli takip.",
        },
        "gold_usdtry": {
            "high": "TL bazlı altın rekor yakınında — cazibe sürüyor ama oynaklık yüksek.",
            "extreme_high": "TL bazlı altın aşırı ısınmış — profit-taking baskısı.",
            "low": "TL altın tarihsel göreceli düşük — alım fırsatı arayanlar için bakılabilir.",
            "extreme_low": "TL altın belirgin düşük — tarihsel olarak alım baskısı oluşmuş.",
        },
    }
    return (table.get(key) or {}).get(direction)


async def build_ratios() -> RatiosSection:
    history = await load_many(_RATIO_SYMBOLS, points=180)
    entries: list[RatioSignal] = []

    def _add(key: str, label: str, values: list[float], unit: str | None = None) -> None:
        if len(values) < 30:
            return
        current = values[-1]
        ref = values[-180:]
        z = zscore(current, ref)
        pct = percentile_rank(current, ref)
        direction = _direction(pct)
        entries.append(
            RatioSignal(
                key=key,
                label=label,
                value=round(current, 6),
                z_score=round(z, 3),
                percentile=round(pct, 2),
                direction=direction,  # type: ignore[arg-type]
                historical_reaction=_reaction_blurb(key, direction),
                unit=unit,
            )
        )

    xau = history.get("XAU")
    xag = history.get("XAG")
    if xau and xag:
        _add("gold_silver", "Altın / Gümüş Oranı", _series_ratio(xau, xag))

    btc = history.get("BTC")
    eth = history.get("ETH")
    if btc and eth:
        _add("eth_btc", "ETH / BTC", _series_ratio(eth, btc))
    if btc and xau:
        _add("gold_btc", "Altın / BTC Oranı", _series_ratio(xau, btc))

    eurusd = history.get("EURUSD")
    if eurusd:
        _add("dxy_proxy", "DXY Proxy (1 / EURUSD)", _inverse_series(eurusd))

    usdtry = history.get("USDTRY")
    if usdtry:
        _add("usdtry_z", "USDTRY", usdtry.closes, unit="TRY")
        if xau:
            n = min(len(xau.closes), len(usdtry.closes))
            tl_gold = [xau.closes[-n:][i] * usdtry.closes[-n:][i] / 31.1034768 for i in range(n)]
            _add("gold_usdtry", "TL Gram Altın Seviyesi", tl_gold, unit="TRY")

    gram = history.get("GRAMALTIN")
    ceyrek = history.get("CEYREKYENI")
    if gram and ceyrek and gram.closes and ceyrek.closes:
        n = min(len(gram.closes), len(ceyrek.closes))
        premiums = [
            (ceyrek.closes[-n:][i] / (gram.closes[-n:][i] * 1.6065) - 1.0) * 100
            for i in range(n)
        ]
        _add("ceyrek_premium", "Çeyrek Primi (%)", premiums, unit="%")

    return RatiosSection(generated_at=datetime.now(UTC), entries=entries)
