import logging
from collections.abc import Awaitable, Callable

from app.schemas.websocket import WSActionEnum, WSMessageIn
from app.services.websocket.connection import IConnection
from app.services.websocket.manager import ConnectionManager

logger = logging.getLogger(__name__)

# Type alias for our event handlers
# Signature: async def handler(manager: ConnectionManager, connection: IConnection, payload: dict)
EventHandler = Callable[[ConnectionManager, IConnection, dict], Awaitable[None]]

class WebSocketDispatcher:
    """
    Handles routing of incoming WebSocket messages (Strategy Pattern).
    Separates the routing logic from the actual connection layer.
    """
    def __init__(self, manager: ConnectionManager):
        self.manager = manager
        self._handlers: dict[WSActionEnum, EventHandler] = {
            WSActionEnum.ping: self._handle_ping,
            WSActionEnum.subscribe: self._handle_subscribe,
            WSActionEnum.unsubscribe: self._handle_unsubscribe,
        }

    async def dispatch(self, connection: IConnection, message: WSMessageIn) -> None:
        handler = self._handlers.get(message.action)
        if handler:
            await handler(self.manager, connection, message.payload)
        else:
            logger.warning(f"No handler registered for action: {message.action}")
            await self.manager.send_error(connection, "Unknown or unsupported action.")

    # ---------------------------------------------------------
    # Handlers 
    # ---------------------------------------------------------
    async def _handle_ping(self, manager: ConnectionManager, connection: IConnection, payload: dict) -> None:
        await manager.send_system_message(connection, "pong")

    async def _handle_subscribe(self, manager: ConnectionManager, connection: IConnection, payload: dict) -> None:
        symbols = payload.get("assets", [])
        if symbols:
            await manager.subscribe(connection, symbols)
        else:
            await manager.send_error(connection, "No assets provided for subscription.")

    async def _handle_unsubscribe(self, manager: ConnectionManager, connection: IConnection, payload: dict) -> None:
        symbols = payload.get("assets", [])
        if symbols:
            await manager.unsubscribe(connection, symbols)
