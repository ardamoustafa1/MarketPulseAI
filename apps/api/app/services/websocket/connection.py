from typing import Protocol, Any
from fastapi import WebSocket

class IConnection(Protocol):
    """
    Abstract interface for a client connection.
    Guarantees the domain logic relies on abstractions, not framework-specific implementations like FastAPI.
    """
    async def send_json(self, data: Any) -> None:
        ...

    async def close(self) -> None:
        ...

class FastAPIWebSocketConnection(IConnection):
    """
    Adapter implementing IConnection using FastAPI/Starlette WebSockets.
    """
    def __init__(self, websocket: WebSocket):
        self._websocket = websocket

    async def send_json(self, data: Any) -> None:
        await self._websocket.send_json(data)

    async def close(self) -> None:
        await self._websocket.close()

    def get_raw_socket(self) -> WebSocket:
        return self._websocket
    
    # Enable hashing and equality checks to use this in Sets and Dicts natively
    def __hash__(self) -> int:
        return hash(self._websocket)
        
    def __eq__(self, other: object) -> bool:
        if isinstance(other, FastAPIWebSocketConnection):
            return self._websocket == other._websocket
        return False
