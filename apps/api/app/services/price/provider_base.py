from abc import ABC, abstractmethod
from typing import List
from app.schemas.price import NormalizedPrice

class BasePriceProvider(ABC):
    """
    Abstract interface for any live data provider (e.g. CoinGecko, Binance, Yahoo).
    Bütün provider'lar bu kalıtımı alıp standart bir liste dönmek zorundadır.
    """
    
    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    async def fetch_prices(self, symbols: List[str]) -> List[NormalizedPrice]:
        """
        Belirtilen varlıkların ilgili kaynaktan fiyatlarını çeker.
        Normalize modele mapleyip listeler.
        """
        pass
    
    @abstractmethod
    async def is_healthy(self) -> bool:
        """Rate limit veya source down durumu testi için."""
        pass
