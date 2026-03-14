import asyncio
import json
from datetime import datetime, timezone
from typing import Any
from collections.abc import AsyncGenerator


def solana_explorer_url(signature: str) -> str:
    """Generate Solana devnet explorer URL for a transaction."""
    return f"https://explorer.solana.com/tx/{signature}?cluster=devnet"


class EventBus:
    def __init__(self):
        self._subscribers: list[asyncio.Queue] = []

    async def publish(self, event_type: str, data: dict[str, Any]):
        event = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        for queue in self._subscribers:
            await queue.put(event)

    async def subscribe(self) -> AsyncGenerator[str, None]:
        queue: asyncio.Queue = asyncio.Queue()
        self._subscribers.append(queue)
        try:
            while True:
                event = await queue.get()
                yield f"data: {json.dumps(event)}\n\n"
        finally:
            self._subscribers.remove(queue)

event_bus = EventBus()
