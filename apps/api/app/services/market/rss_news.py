"""
Aggregate free RSS headlines for a lightweight "why is it moving?" layer.
"""
from __future__ import annotations

import logging
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import List

import httpx

logger = logging.getLogger(__name__)

FEEDS = (
    ("CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/"),
    ("Investing.com Forex", "https://www.investing.com/rss/news_301.rss"),
)


@dataclass
class NewsItem:
    title: str
    link: str | None
    source: str
    published: str | None


def _text(el: ET.Element | None) -> str:
    if el is None or el.text is None:
        return ""
    return (el.text or "").strip()


def _parse_rss(xml_bytes: bytes, source: str) -> List[NewsItem]:
    items: List[NewsItem] = []
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError as e:
        logger.warning("RSS parse error from %s: %s", source, e)
        return items

    channel = root.find("channel")
    if channel is not None:
        for item in channel.findall("item"):
            title = _text(item.find("title"))
            link_el = item.find("link")
            link = _text(link_el) if link_el is not None else None
            pub = item.find("pubDate")
            published = _text(pub) if pub is not None else None
            if title:
                items.append(NewsItem(title=title, link=link or None, source=source, published=published))
        return items

    # Atom fallback
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    for entry in root.findall("atom:entry", ns):
        title_el = entry.find("atom:title", ns)
        title = _text(title_el)
        link_el = entry.find("atom:link", ns)
        link = link_el.get("href") if link_el is not None else None
        updated = entry.find("atom:updated", ns)
        published = _text(updated) if updated is not None else None
        if title:
            items.append(NewsItem(title=title, link=link, source=source, published=published))

    return items


async def fetch_market_headlines(limit: int = 30) -> List[NewsItem]:
    out: List[NewsItem] = []
    async with httpx.AsyncClient(timeout=15.0) as client:
        for source_name, url in FEEDS:
            try:
                r = await client.get(url, headers={"User-Agent": "MarketPulseAI/1.0"})
                r.raise_for_status()
                out.extend(_parse_rss(r.content, source_name))
            except Exception as e:
                logger.warning("RSS fetch failed %s: %s", url, e)

    return out[:limit]
