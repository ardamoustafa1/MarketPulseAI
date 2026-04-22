from pydantic import BaseModel, Field


class HistoryPoint(BaseModel):
    t: int = Field(..., description="Unix timestamp (seconds)")
    close: float


class PriceHistoryResponse(BaseModel):
    symbol: str
    range: str
    source: str = "yahoo_finance_chart"
    yahoo_ticker: str
    points: list[HistoryPoint]


class CompareSeries(BaseModel):
    symbol: str
    yahoo_ticker: str
    points: list[HistoryPoint]


class CompareResponse(BaseModel):
    range: str
    source: str = "yahoo_finance_chart"
    series: list[CompareSeries]
