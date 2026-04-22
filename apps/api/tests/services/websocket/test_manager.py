import pytest

from app.services.websocket.manager import ConnectionManager


class DummyConnection:
    def __init__(self):
        self.messages = []
        self.closed = False

    async def send_json(self, data):
        self.messages.append(data)

    async def close(self):
        self.closed = True


class FailingConnection(DummyConnection):
    async def send_json(self, data):
        if data.get('event') == 'price_update':
            raise RuntimeError('socket dropped')
        self.messages.append(data)


@pytest.mark.asyncio
async def test_subscribe_normalizes_symbols_and_sends_ack():
    manager = ConnectionManager()
    conn = DummyConnection()

    await manager.subscribe(conn, ['btc', 'Eth'])

    assert 'BTC' in manager._subscriptions
    assert 'ETH' in manager._subscriptions
    assert conn in manager._subscriptions['BTC']
    assert conn.messages[-1]['event'] == 'pong'


@pytest.mark.asyncio
async def test_unsubscribe_removes_empty_channels():
    manager = ConnectionManager()
    conn = DummyConnection()
    await manager.subscribe(conn, ['btc'])

    await manager.unsubscribe(conn, ['btc'])

    assert 'BTC' not in manager._subscriptions


@pytest.mark.asyncio
async def test_broadcast_cleans_dead_connections():
    manager = ConnectionManager()
    healthy = DummyConnection()
    dead = FailingConnection()

    manager.connect(healthy, 'u1')
    manager.connect(dead, 'u2')
    await manager.subscribe(healthy, ['btc'])
    await manager.subscribe(dead, ['btc'])

    await manager.broadcast_price_update('BTC', {'price': '100'})

    assert len(healthy.messages) >= 2
    assert dead.closed is True
    assert dead not in manager._active_connections
