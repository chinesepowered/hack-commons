import httpx
from src.core.config import settings

async def unbrowse_resolve(intent: str, url: str | None = None) -> dict:
    """Resolve an intent via Unbrowse. Falls back to raising an exception if unavailable."""
    async with httpx.AsyncClient(timeout=30) as client:
        payload = {
            "intent": intent,
            "params": {},
        }
        if url:
            payload["params"]["url"] = url
            payload["context"] = {"url": url}

        response = await client.post(
            f"{settings.unbrowse_url}/v1/intent/resolve",
            json=payload,
        )
        response.raise_for_status()
        return response.json()
