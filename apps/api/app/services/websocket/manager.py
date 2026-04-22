import logging
from typing import Dict, Set
from datetime import datetime
from app.schemas.websocket import WSMessageOut, WSActionEnum
from app.services.websocket.connection import IConnection

logger = logging.getLogger(__name__)

class ConnectionManager:
    """
    Core state holder for active WebSocket connections.
    Instantiated once per application lifecycle (Singleton via DI).
    """
    def __init__(self):
        self._active_connections: Dict[IConnection, str] = {}
        self._subscriptions: Dict[str, Set[IConnection]] = {}

    def connect(self, connection: IConnection, user_id: str):
        # Socket acceptance is handled outside, manager just registers state
        self._active_connections[connection] = user_id
        logger.debug(f"User {user_id} connected to WS. Total connections: {len(self._active_connections)}")

    async def disconnect(self, connection: IConnection):
        """Removes the socket from state. Tries to explicitly close to prevent Zombie OS connections."""
        if connection in self._active_connections:
            user_id = self._active_connections.pop(connection)
            self._remove_from_all_subscriptions(connection)
            try:
                await connection.close()
            except Exception:
                pass # Usually implies client already closed the TCP handshake
            logger.debug(f"User {user_id} disconnected from WS.")

    def _remove_from_all_subscriptions(self, connection: IConnection) -> None:
        """Helper to cleanly detach a socket from all its subscribed topic channels."""
        empty_channels = []
        for symbol, connections in self._subscriptions.items():
            if connection in connections:
                connections.remove(connection)
                if not connections:
                    empty_channels.append(symbol)
                    
        # Clean up memory completely
        for symbol in empty_channels:
            del self._subscriptions[symbol]

    async def subscribe(self, connection: IConnection, symbols: list[str]):
        """Subscribe a single connection to multiple asset topics"""
        for sym in symbols:
            upper_sym = sym.upper()
            if upper_sym not in self._subscriptions:
                self._subscriptions[upper_sym] = set()
            self._subscriptions[upper_sym].add(connection)
            
        await self.send_system_message(connection, f"Subscribed to {symbols}")

    async def unsubscribe(self, connection: IConnection, symbols: list[str]):
        """Unsubscribe from multiple topics"""
        for sym in symbols:
            upper_sym = sym.upper()
            if upper_sym in self._subscriptions and connection in self._subscriptions[upper_sym]:
                self._subscriptions[upper_sym].remove(connection)
                # Cleanup if empty
                if not self._subscriptions[upper_sym]:
                    del self._subscriptions[upper_sym]
                    
        await self.send_system_message(connection, f"Unsubscribed from {symbols}")

    async def send_system_message(self, connection: IConnection, message: str):
        msg = WSMessageOut(
            event=WSActionEnum.pong,
            payload={"message": message},
            timestamp=datetime.utcnow().isoformat()
        )
        await connection.send_json(msg.model_dump())

    async def send_error(self, connection: IConnection, error_message: str):
        msg = WSMessageOut(
            event=WSActionEnum.error,
            payload={"message": error_message},
            timestamp=datetime.utcnow().isoformat()
        )
        await connection.send_json(msg.model_dump())

    async def broadcast_price_update(self, asset_symbol: str, price_payload: dict):
        """
        Takes a new price update and pushes it ONLY to clients who have subscribed to this topic.
        Robustly handles dead connections.
        """
        msg = WSMessageOut(
            event=WSActionEnum.price_update,
            payload=price_payload,
            timestamp=datetime.utcnow().isoformat()
        )
        
        target_sockets = self._subscriptions.get(asset_symbol.upper(), set())
        if not target_sockets:
            return # Skip encoding/sending if no one is listening

        encoded_json = msg.model_dump()
        dead_sockets = set()
        
        for conn in target_sockets:
            try:
                await conn.send_json(encoded_json)
            except RuntimeError as re:
                # Connection was dropped midway
                logger.warning(f"RuntimeError while broadcasting: {re}")
                dead_sockets.add(conn)
            except Exception as e:
                logger.error(f"Unexpected error broadcasting to connection: {e}")
                dead_sockets.add(conn)
                
        # Clean up dead sockets dynamically (Garbage Collection)
        for conn in dead_sockets:
            await self.disconnect(conn)
