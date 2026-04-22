import asyncio
import json
import logging
import uuid
from collections.abc import Awaitable, Callable
from datetime import datetime, timezone
from typing import Any

from app.db.redis import get_redis_client

logger = logging.getLogger(__name__)

JOB_QUEUE_KEY = "jobs:queue:default"
JOB_RESULT_PREFIX = "jobs:result:"
JOB_RESULT_TTL_SECONDS = 3600

JobHandler = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]
_handlers: dict[str, JobHandler] = {}


def register_job_handler(job_type: str, handler: JobHandler) -> None:
    _handlers[job_type] = handler


async def enqueue_job(job_type: str, payload: dict[str, Any]) -> str:
    redis = get_redis_client()
    job_id = str(uuid.uuid4())
    envelope = {
        "id": job_id,
        "type": job_type,
        "payload": payload,
        "enqueued_at": datetime.now(timezone.utc).isoformat(),
    }
    await redis.rpush(JOB_QUEUE_KEY, json.dumps(envelope))
    return job_id


async def get_job_result(job_id: str, owner_user_id: str | None = None) -> dict[str, Any] | None:
    redis = get_redis_client()
    raw = await redis.get(f"{JOB_RESULT_PREFIX}{job_id}")
    if not raw:
        return None
    parsed = json.loads(raw)
    if owner_user_id:
        result_owner = str(parsed.get("owner_user_id", ""))
        if result_owner and result_owner != owner_user_id:
            return None
    return parsed


class RedisJobWorker:
    def __init__(self) -> None:
        self._task: asyncio.Task | None = None
        self._running = False

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._runner())

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def _runner(self) -> None:
        redis = get_redis_client()
        while self._running:
            item = await redis.blpop(JOB_QUEUE_KEY, timeout=2)
            if not item:
                continue
            _, raw = item
            try:
                envelope = json.loads(raw)
                job_id = envelope["id"]
                job_type = envelope["type"]
                payload = envelope["payload"]
                handler = _handlers.get(job_type)
                if not handler:
                    result = {"status": "failed", "error": f"No handler for {job_type}"}
                else:
                    output = await handler(payload)
                    result = {"status": "completed", "output": output}
                if isinstance(payload, dict) and payload.get("user_id"):
                    result["owner_user_id"] = str(payload["user_id"])
            except Exception as exc:
                logger.exception("Job processing failed: %s", exc)
                job_id = envelope.get("id", "unknown") if "envelope" in locals() else "unknown"
                result = {"status": "failed", "error": str(exc)}
            await redis.set(
                f"{JOB_RESULT_PREFIX}{job_id}",
                json.dumps(result),
                ex=JOB_RESULT_TTL_SECONDS,
            )


global_job_worker = RedisJobWorker()
