"""
Read-only educational content. Backed by a static seed list so we can deploy
lessons without a new database migration; the schema below mirrors what the
next iteration (authoring CMS) will emit, so clients never need to change.

When a DB-backed Academy is added later, swap `_SEED_ARTICLES` for a query
without touching the route or schema.
"""
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field


class AcademyCard(BaseModel):
    heading: str
    body: str


class AcademyArticle(BaseModel):
    slug: str
    locale: str = Field(description="BCP-47 locale, e.g. 'tr' or 'en'.")
    category: str
    title: str
    subtitle: str
    read_time_minutes: int
    hero_color: str
    cards: List[AcademyCard]
    tags: List[str] = Field(default_factory=list)


class AcademyArticleSummary(BaseModel):
    slug: str
    locale: str
    category: str
    title: str
    subtitle: str
    read_time_minutes: int
    hero_color: str
    tags: List[str] = Field(default_factory=list)


_SEED_ARTICLES: List[AcademyArticle] = [
    AcademyArticle(
        slug="dca-101",
        locale="tr",
        category="temel",
        title="DCA nedir, neden işe yarar?",
        subtitle="Düzenli alım stratejisinin matematiksel özü ve duygusal yararları.",
        read_time_minutes=4,
        hero_color="#C8A97E",
        cards=[
            AcademyCard(
                heading="Zamanı yenmeye çalışma, zamana bölüştür",
                body=(
                    "Dollar Cost Averaging (DCA), sabit bir miktarı düzenli aralıklarla "
                    "yatırmaktır. Piyasa düştüğünde otomatik olarak daha fazla adet, "
                    "yükseldiğinde daha az adet alırsın."
                ),
            ),
            AcademyCard(
                heading="Ortalama maliyetin lehine çalışır",
                body=(
                    "Aylık $100 yatırım yapan biri, fiyat 10/20/40 iken ortalama $17.14 "
                    "birim maliyetle pozisyon alır — zirvede tek seferde girenlerden "
                    "matematiksel olarak daha avantajlıdır."
                ),
            ),
            AcademyCard(
                heading="Risk profiline uyarlayabilirsin",
                body=(
                    "Volatilite yüksekse frekansı artır (haftalık), düşükse azalt (aylık). "
                    "MarketPulse alarmları volatilite anında hatırlatır, sen DCA'yı "
                    "bozmazsın."
                ),
            ),
        ],
        tags=["dca", "strateji", "risk"],
    ),
    AcademyArticle(
        slug="dca-101",
        locale="en",
        category="basics",
        title="What is DCA and why does it work?",
        subtitle="The mathematical core of dollar-cost averaging and its emotional payoff.",
        read_time_minutes=4,
        hero_color="#C8A97E",
        cards=[
            AcademyCard(
                heading="Don't time the market — space it out",
                body=(
                    "Dollar Cost Averaging (DCA) means investing a fixed amount at "
                    "regular intervals. You automatically buy more units when the price "
                    "is low and fewer when it's high."
                ),
            ),
            AcademyCard(
                heading="Math works in your favor",
                body=(
                    "Putting $100/month at prices 10/20/40 gives an average cost of "
                    "$17.14 — mathematically better than buying at the peak in one shot."
                ),
            ),
            AcademyCard(
                heading="Tune it to your risk profile",
                body=(
                    "If volatility is high, increase the frequency (weekly). If low, "
                    "relax to monthly. MarketPulse alerts remind you of volatility "
                    "spikes so you don't break the plan."
                ),
            ),
        ],
        tags=["dca", "strategy", "risk"],
    ),
    AcademyArticle(
        slug="gold-reading",
        locale="tr",
        category="metaller",
        title="Kıymetli metali doğru okumak",
        subtitle="Altın fiyatındaki %1'lik bir harekette gerçekte ne oluyor?",
        read_time_minutes=5,
        hero_color="#B98F5F",
        cards=[
            AcademyCard(
                heading="Altın iki para birimine bağlıdır",
                body=(
                    "Türk piyasasında gram altın = USD/ons × USD/TRY × (31.1035 gram) "
                    "formülüyle hesaplanır. Dolar tutar, ons düşerse gram TRY artabilir."
                ),
            ),
            AcademyCard(
                heading="Spread ve işçilik farkı",
                body=(
                    "Çeyrek, yarım, ata altın işlenmiş ürünlerdir. Spread (alış-satış "
                    "farkı) ve işçilik %2-4 gizli maliyet yaratır. Büyük pozisyonlarda "
                    "külçe/gram tercih etmek matematiksel olarak avantajlıdır."
                ),
            ),
            AcademyCard(
                heading="Korelasyon: altın ≠ risk-off",
                body=(
                    "Altın genellikle dolar zayıfladığında değer kazanır. Ama reel "
                    "faiz yükseldiğinde (FED faiz döngüleri) altın düşer; portföyü "
                    "yalnız altına bağlamak güvenli değildir."
                ),
            ),
        ],
        tags=["altin", "metaller", "forex"],
    ),
    AcademyArticle(
        slug="gold-reading",
        locale="en",
        category="metals",
        title="Reading precious metals correctly",
        subtitle="What actually happens when gold moves 1%?",
        read_time_minutes=5,
        hero_color="#B98F5F",
        cards=[
            AcademyCard(
                heading="Gold has two currencies baked in",
                body=(
                    "Local gold ≈ USD/oz × USD/LOCAL × (31.1035 g/oz). The USD leg "
                    "matters: if USD strengthens and oz falls, local gold can still "
                    "rise."
                ),
            ),
            AcademyCard(
                heading="Spreads and workmanship",
                body=(
                    "Coined gold carries workmanship + dealer spread (2-4%). For "
                    "large allocations, grams/bars are mathematically cheaper."
                ),
            ),
            AcademyCard(
                heading="Gold is not always risk-off",
                body=(
                    "Gold usually rises when USD weakens. During Fed hikes (rising "
                    "real rates) gold tends to fall — concentrating only in gold is "
                    "not safe."
                ),
            ),
        ],
        tags=["gold", "metals", "forex"],
    ),
    AcademyArticle(
        slug="volatility-basics",
        locale="tr",
        category="risk",
        title="Volatilite neden dostun?",
        subtitle="Hareket yoksa fırsat da yok.",
        read_time_minutes=3,
        hero_color="#4A5C82",
        cards=[
            AcademyCard(
                heading="Volatilite = fiyat salınımı",
                body=(
                    "Volatilite bir varlığın fiyatının zaman içinde ne kadar oynadığıdır. "
                    "Yüksek volatilite riski artırır, ama aynı zamanda iyi giriş/çıkışlar "
                    "için fırsat yaratır."
                ),
            ),
            AcademyCard(
                heading="Pozisyonunu küçük tut, sık al",
                body=(
                    "Yüksek volatilite dönemlerinde tek seferde büyük pozisyon açmak "
                    "pahalıya mal olur. Bölerek ve alarmlarla girmek kısa vadeli hatalı "
                    "seçimleri yumuşatır."
                ),
            ),
            AcademyCard(
                heading="Volatilite = opsiyon fiyatı",
                body=(
                    "Volatilite arttığında opsiyonlar pahalılaşır. Bu yüzden büyük "
                    "harcama öncesi piyasa 'sakin' tutulur. Kendi stratejinde aynısı "
                    "geçerli: sakin bekle, fırsat olgunlaşsın."
                ),
            ),
        ],
        tags=["volatilite", "risk", "strateji"],
    ),
    AcademyArticle(
        slug="volatility-basics",
        locale="en",
        category="risk",
        title="Why volatility is your friend",
        subtitle="No motion, no opportunity.",
        read_time_minutes=3,
        hero_color="#4A5C82",
        cards=[
            AcademyCard(
                heading="Volatility = price swing",
                body=(
                    "Volatility measures how much an asset's price moves over time. "
                    "High volatility means higher risk but also better entries and exits."
                ),
            ),
            AcademyCard(
                heading="Size down, dollar-in more often",
                body=(
                    "In volatile regimes, one-shot positions are expensive. Splitting "
                    "entries with alerts smooths out short-term errors."
                ),
            ),
            AcademyCard(
                heading="Volatility = option price",
                body=(
                    "Options get expensive when volatility rises. The same logic "
                    "applies to your own strategy: stay calm and let the opportunity "
                    "mature."
                ),
            ),
        ],
        tags=["volatility", "risk", "strategy"],
    ),
    AcademyArticle(
        slug="alerts-setup",
        locale="tr",
        category="pratik",
        title="Doğru fiyat alarmı nasıl kurulur?",
        subtitle="Alarm kurmak kolay, işe yarar alarm kurmak sanat.",
        read_time_minutes=4,
        hero_color="#3BD984",
        cards=[
            AcademyCard(
                heading="Hedef değil, tetik noktaları seç",
                body=(
                    "\"BTC 100k olursa\" iyi bir hedef ama kötü bir alarm. Daha iyisi: "
                    "kritik destek/direnç seviyelerinde alarm koy (örn. 200 günlük "
                    "ortalama kırılımı)."
                ),
            ),
            AcademyCard(
                heading="Yüzdelik kullan, büyük tutarlarda",
                body=(
                    "Sabit fiyat yerine 'son kapanıştan %5 aşağı/yukarı' tipi alarmlar "
                    "volatile piyasalarda daha esnektir. MarketPulse percentage alarmları "
                    "destekler."
                ),
            ),
            AcademyCard(
                heading="3 tane de yeter",
                body=(
                    "Her varlığa 10 alarm koyan kaybolur. Portföydeki en büyük 3 "
                    "pozisyon için 1-2 alarm + bir sistem riski alarmı (USD/TRY gibi) "
                    "yeterlidir."
                ),
            ),
        ],
        tags=["alarm", "strateji", "pratik"],
    ),
    AcademyArticle(
        slug="alerts-setup",
        locale="en",
        category="practical",
        title="Setting up alerts that actually work",
        subtitle="Everyone adds alerts — few do it well.",
        read_time_minutes=4,
        hero_color="#3BD984",
        cards=[
            AcademyCard(
                heading="Pick trigger points, not wishful prices",
                body=(
                    "'BTC at 100k' is a wish, not an alert. Place alerts at key support/"
                    "resistance levels (e.g., 200-day moving average break)."
                ),
            ),
            AcademyCard(
                heading="Use percentages for bigger positions",
                body=(
                    "Percentage alerts (±5% from last close) adapt better to volatile "
                    "assets. MarketPulse natively supports both price and percentage."
                ),
            ),
            AcademyCard(
                heading="Three good alerts beat thirty",
                body=(
                    "One or two alerts for your top three positions plus a system-"
                    "level alert (e.g., USD/TRY) is usually enough."
                ),
            ),
        ],
        tags=["alerts", "strategy", "practical"],
    ),
]


def _filter(locale: Optional[str], category: Optional[str]) -> List[AcademyArticle]:
    items = _SEED_ARTICLES
    if locale:
        items = [a for a in items if a.locale == locale.lower()]
    if category:
        items = [a for a in items if a.category.lower() == category.lower()]
    return items


router = APIRouter()


@router.get("/articles", response_model=List[AcademyArticleSummary])
def list_articles(locale: Optional[str] = None, category: Optional[str] = None):
    """Browse-friendly summaries grouped by locale/category."""
    items = _filter(locale, category)
    return [
        AcademyArticleSummary(
            slug=a.slug,
            locale=a.locale,
            category=a.category,
            title=a.title,
            subtitle=a.subtitle,
            read_time_minutes=a.read_time_minutes,
            hero_color=a.hero_color,
            tags=a.tags,
        )
        for a in items
    ]


@router.get("/articles/{slug}", response_model=AcademyArticle)
def get_article(slug: str, locale: str = "tr"):
    for article in _SEED_ARTICLES:
        if article.slug == slug and article.locale == locale.lower():
            return article
    # Fall back to any locale
    for article in _SEED_ARTICLES:
        if article.slug == slug:
            return article
    raise HTTPException(status_code=404, detail="Article not found")
