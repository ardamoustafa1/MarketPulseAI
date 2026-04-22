from pydantic import BaseModel


class MarketNewsItem(BaseModel):
    title: str
    link: str | None = None
    source: str
    published: str | None = None
