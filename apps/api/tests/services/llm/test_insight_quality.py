from app.schemas.insights import InsightCard
from app.services.llm.insight_generator import _quality_score


def test_quality_score_stays_in_bounds():
    cards = [
        InsightCard(
            category="portfolio",
            title="Portfolio Snapshot",
            content="Diversified exposure and moderate volatility profile.",
            severity="positive",
        ),
        InsightCard(
            category="watchlist",
            title="Watchlist Momentum",
            content="BTC momentum increased with elevated intraday swings.",
            severity="warning",
        ),
    ]
    score = _quality_score(cards, "openai:gpt-4o-mini")
    assert 0.0 <= score <= 1.0
    assert score > 0.6
