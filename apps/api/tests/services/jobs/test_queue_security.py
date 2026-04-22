import json

import pytest

from app.services.jobs import queue


class _FakeRedis:
    def __init__(self, payload: dict[str, str] | None = None):
        self.payload = payload or {}

    async def get(self, key: str):
        return self.payload.get(key)


@pytest.mark.asyncio
async def test_get_job_result_rejects_foreign_owner(monkeypatch):
    job_id = "job-1"
    stored = {
        f"{queue.JOB_RESULT_PREFIX}{job_id}": json.dumps(
            {"status": "completed", "owner_user_id": "user-a", "output": {"ok": True}}
        )
    }
    monkeypatch.setattr(queue, "get_redis_client", lambda: _FakeRedis(stored))

    result = await queue.get_job_result(job_id, owner_user_id="user-b")

    assert result is None


@pytest.mark.asyncio
async def test_get_job_result_accepts_owner(monkeypatch):
    job_id = "job-2"
    stored = {
        f"{queue.JOB_RESULT_PREFIX}{job_id}": json.dumps(
            {"status": "completed", "owner_user_id": "user-a", "output": {"ok": True}}
        )
    }
    monkeypatch.setattr(queue, "get_redis_client", lambda: _FakeRedis(stored))

    result = await queue.get_job_result(job_id, owner_user_id="user-a")

    assert result is not None
    assert result["status"] == "completed"
