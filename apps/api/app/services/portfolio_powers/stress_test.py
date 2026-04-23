"""
Portfolio stress-test engine.

We apply curated historical shock vectors per asset-class to the user's actual
positions, then report the overall portfolio impact + worst/best contributors.

Scenarios (deterministic — source: documented crash magnitudes):
  - gfc_2008        : 2008 Global Financial Crisis
  - covid_2020      : Mar-2020 COVID shock
  - fed_hike_2022   : 2022 Fed hike cycle + crypto winter
  - dot_com_2000    : 2000-02 dot-com collapse
  - try_crisis_2018 : TRY kur krizi

Per-class shock (total return of the crisis window):
Format: { scenario_id: { asset_class: shock_pct_decimal } }
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.portfolio import Portfolio
from app.models.user import User
from app.schemas.portfolio_powers import (
    StressImpact,
    StressResult,
    StressScenarioId,
    StressTestResponse,
)
from app.services.deep_card.classifier import classify
from app.services.portfolio.access import get_or_create_default_portfolio
from app.services.portfolio.summary import build_portfolio_summary

_SHOCK_TABLE: dict[str, dict[str, float]] = {
    "gfc_2008": {
        "equity": -0.51,
        "index": -0.49,
        "etf": -0.46,
        "commodity": -0.56,
        "crypto_major": -0.30,  # BTC didn't exist; proxy aggressive asset
        "crypto_alt": -0.40,
        "fx": -0.05,
        "metal_gold": 0.25,
        "metal_silver": 0.05,
        "metal_platinum": -0.45,
    },
    "covid_2020": {
        "equity": -0.34,
        "index": -0.33,
        "etf": -0.30,
        "commodity": -0.38,
        "crypto_major": -0.50,
        "crypto_alt": -0.60,
        "fx": -0.12,
        "metal_gold": -0.03,
        "metal_silver": -0.35,
        "metal_platinum": -0.32,
    },
    "fed_hike_2022": {
        "equity": -0.22,
        "index": -0.21,
        "etf": -0.19,
        "commodity": 0.15,
        "crypto_major": -0.65,
        "crypto_alt": -0.80,
        "fx": -0.25,
        "metal_gold": -0.02,
        "metal_silver": -0.08,
        "metal_platinum": 0.05,
    },
    "dot_com_2000": {
        "equity": -0.49,
        "index": -0.45,
        "etf": -0.40,
        "commodity": -0.10,
        "crypto_major": -0.20,
        "crypto_alt": -0.25,
        "fx": 0.04,
        "metal_gold": 0.12,
        "metal_silver": 0.05,
        "metal_platinum": -0.28,
    },
    "try_crisis_2018": {
        "equity": -0.18,
        "index": -0.17,
        "etf": -0.15,
        "commodity": -0.08,
        "crypto_major": -0.30,
        "crypto_alt": -0.40,
        "fx": -0.55,  # USDTRY jumped ≈ 40-50% ⇒ TRY holdings shocked
        "metal_gold": 0.40,  # TL gold soared
        "metal_silver": 0.35,
        "metal_platinum": -0.15,
    },
}

_LABELS = {
    "gfc_2008": "2008 Global Finans Krizi",
    "covid_2020": "Mart 2020 COVID Şoku",
    "fed_hike_2022": "2022 FED Faiz Döngüsü",
    "dot_com_2000": "Dot-com Çöküşü",
    "try_crisis_2018": "2018 TRY Kur Krizi",
}

_NARRATIVES = {
    "gfc_2008": (
        "Lehman sonrası 6 aylık pencere — hisse ve kredi sert düştü, " "altın güvenli liman."
    ),
    "covid_2020": (
        "Mart 2020 10 haftalık pencere — tüm riskli varlıklarda panik satışı, "
        "hızlı toparlanma izledi."
    ),
    "fed_hike_2022": (
        "2022 boyunca FED +500bps faiz artışı — yüksek duration varlıklar "
        "ezildi, dolar güçlendi."
    ),
    "dot_com_2000": "Nasdaq köpüğünün çözülmesi (2000-2002) — büyüme hisseleri ezildi.",
    "try_crisis_2018": "Ağustos 2018 TL krizi — USDTRY 40%+ sıçradı, TL gold rally yaptı.",
}


def _class_shock(scenario: str, symbol: str) -> float:
    table = _SHOCK_TABLE.get(scenario, {})
    cls = classify(symbol)
    return table.get(cls, -0.10)


async def build_stress_test(
    db: Session,
    user: User,
    portfolio: Portfolio | None = None,
    scenarios: list[StressScenarioId] | None = None,
) -> StressTestResponse:
    portfolio = portfolio or get_or_create_default_portfolio(db, user.id)
    summary = await build_portfolio_summary(db, portfolio)
    total_value = float(summary.total_current_value or 0)

    active_scenarios: list[StressScenarioId] = scenarios or [
        "gfc_2008",
        "covid_2020",
        "fed_hike_2022",
        "dot_com_2000",
        "try_crisis_2018",
    ]

    results: list[StressResult] = []
    for scenario in active_scenarios:
        impacts: list[StressImpact] = []
        total_after = 0.0
        for p in summary.positions:
            weight_pct = (
                (float(p.current_value or 0) / total_value * 100) if total_value > 0 else 0.0
            )
            shock = _class_shock(scenario, p.symbol)
            usd_impact = float(p.current_value or 0) * shock
            total_after += float(p.current_value or 0) + usd_impact
            impacts.append(
                StressImpact(
                    symbol=p.symbol,
                    weight_pct=round(weight_pct, 2),
                    shock_pct=round(shock * 100, 2),
                    usd_impact=round(usd_impact, 2),
                )
            )
        change_pct = ((total_after / total_value) - 1.0) * 100 if total_value > 0 else 0.0
        worst = min(impacts, key=lambda i: i.usd_impact) if impacts else None
        best = max(impacts, key=lambda i: i.usd_impact) if impacts else None

        results.append(
            StressResult(
                scenario_id=scenario,
                scenario_label=_LABELS.get(scenario, scenario),
                narrative=_NARRATIVES.get(scenario, ""),
                portfolio_value_usd_before=round(total_value, 2),
                portfolio_value_usd_after=round(total_after, 2),
                portfolio_change_pct=round(change_pct, 2),
                max_drawdown_pct=round(min(change_pct, 0.0), 2),
                worst_impact=worst,
                best_impact=best,
                impacts=impacts,
            )
        )

    return StressTestResponse(generated_at=datetime.now(UTC), results=results)
