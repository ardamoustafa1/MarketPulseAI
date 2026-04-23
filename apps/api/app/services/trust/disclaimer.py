"""
Localised investment-advice disclaimer.

Returns the copy plus an `effective_at` + `version` field so the mobile app can
track whether the user has already acknowledged the latest edition.
"""

from __future__ import annotations

from datetime import UTC, datetime

from app.schemas.trust import DisclaimerView

_DISCLAIMERS: dict[str, dict[str, str]] = {
    "tr": {
        "title": "MarketPulse yatırım danışmanlığı değildir",
        "body": (
            "Uygulamadaki fiyatlar, analizler, sinyaller ve portföy simülasyonları yalnızca "
            "bilgilendirme ve eğitim amaçlıdır; herhangi bir varlığın alım, satım veya "
            "elde tutulmasına yönelik bir tavsiye, teklif ya da garanti içermez. "
            "Yatırım kararlarınızı, kişisel mali durumunuzu ve yetkili danışmanlarınızı "
            "göz önünde bulundurarak siz verirsiniz."
        ),
        "acknowledgement_cta": "Anladım, devam et",
    },
    "en": {
        "title": "MarketPulse is not investment advice",
        "body": (
            "All prices, analyses, signals and portfolio simulations shown in the app are "
            "informational and educational only; they do not constitute a recommendation, "
            "offer, or guarantee to buy, sell or hold any asset. You make investment "
            "decisions yourself based on your own financial situation and licensed advisors."
        ),
        "acknowledgement_cta": "Got it, continue",
    },
}


def build_disclaimer(locale: str = "tr") -> DisclaimerView:
    key = (locale or "tr").lower()[:2]
    copy = _DISCLAIMERS.get(key) or _DISCLAIMERS["tr"]
    return DisclaimerView(
        locale=key,
        title=copy["title"],
        body=copy["body"],
        acknowledgement_cta=copy["acknowledgement_cta"],
        version="2026.04.23",
        effective_at=datetime(2026, 4, 23, tzinfo=UTC),
    )
