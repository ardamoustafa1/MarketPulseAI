from fastapi import APIRouter, Query

from app.schemas.market_news import MarketNewsItem
from app.services.market.rss_news import fetch_market_headlines

router = APIRouter()


@router.get("/", response_model=list[MarketNewsItem])
async def list_market_news(limit: int = Query(25, ge=1, le=50)):
    """Headlines from free RSS feeds (crypto + macro). Not investment advice."""
    items = await fetch_market_headlines(limit=limit)
    return [
        MarketNewsItem(title=i.title, link=i.link, source=i.source, published=i.published)
        for i in items
    ]
