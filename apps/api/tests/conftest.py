import pytest


class FakeRedis:
    def __init__(self):
        self.store: dict[str, int] = {}

    async def get(self, key: str):
        value = self.store.get(key)
        return str(value) if value is not None else None

    async def incr(self, key: str):
        self.store[key] = self.store.get(key, 0) + 1

    async def expire(self, key: str, _ttl: int):
        return None

    async def delete(self, key: str):
        self.store.pop(key, None)


@pytest.fixture
def fake_redis() -> FakeRedis:
    return FakeRedis()
