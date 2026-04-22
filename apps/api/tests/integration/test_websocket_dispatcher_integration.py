import pytest

from app.schemas.websocket import WSActionEnum, WSMessageIn
from app.services.websocket.dispatcher import WebSocketDispatcher
from app.services.websocket.manager import ConnectionManager


class DummyConnection:
    def __init__(self):
        self.messages = []

    async def send_json(self, data):
        self.messages.append(data)

    async def close(self):
        return None


@pytest.mark.asyncio
async def test_dispatcher_ping_flow_integration():
    manager = ConnectionManager()
    dispatcher = WebSocketDispatcher(manager)
    conn = DummyConnection()

    message = WSMessageIn(action=WSActionEnum.ping, payload={})
    await dispatcher.dispatch(conn, message)

    assert conn.messages[-1]['event'] == 'pong'
    assert conn.messages[-1]['payload']['message'] == 'pong'


@pytest.mark.asyncio
async def test_dispatcher_subscribe_then_broadcast_integration():
    manager = ConnectionManager()
    dispatcher = WebSocketDispatcher(manager)
    conn = DummyConnection()

    subscribe_msg = WSMessageIn(action=WSActionEnum.subscribe, payload={'assets': ['btc']})
    await dispatcher.dispatch(conn, subscribe_msg)

    await manager.broadcast_price_update('BTC', {'symbol': 'BTC', 'price': '123'})

    events = [m['event'] for m in conn.messages]
    assert 'pong' in events
    assert 'price_update' in events
