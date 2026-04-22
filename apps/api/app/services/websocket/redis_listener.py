import asyncio
import json
import logging
from app.db.redis import get_redis_client
from app.services.websocket.manager import ConnectionManager

logger = logging.getLogger(__name__)

class RedisWebSocketBridge:
    """
    Background Task Class: Listens to Redis pub/sub. 
    Decoupled from global state. Requires injected ConnectionManager.
    """
    def __init__(self, manager: ConnectionManager, channel: str = "channel:price_updates"):
        self.manager = manager
        self.channel = channel
        self.is_running = False
        self._task = None

    async def _listener_loop(self):
        redis = get_redis_client()
        pubsub = redis.pubsub()
        await pubsub.subscribe(self.channel)
        
        logger.info(f"Redis PubSub Listener started on channel: {self.channel}")
        
        try:
            while self.is_running:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message:
                    try:
                        payload = json.loads(message['data'])
                        symbol = payload.get("symbol")
                        if symbol:
                            await self.manager.broadcast_price_update(symbol, payload)
                    except json.JSONDecodeError:
                        logger.error("Failed to decode pubsub message payload as JSON.")
                    except Exception as e:
                        logger.error(f"Failed to process pubsub message: {e}")
                
                await asyncio.sleep(0.01) # Yield execution for concurrent threads
        except asyncio.CancelledError:
            pass # Task was intentionally cancelled
        finally:
            logger.info("Redis PubSub Listener shutting down.")
            await pubsub.unsubscribe(self.channel)
            await pubsub.close()

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._listener_loop())

    async def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
