"""
ElevenLabs voice integration with text fallback.
When ELEVENLABS_API_KEY is set: full voice I/O
When not set: text chat works identically, just without audio
"""

import httpx
from typing import Optional
from src.core.config import settings


async def text_to_speech(text: str, voice_id: str = "21m00Tcm4TlvDq8ikWAM") -> Optional[bytes]:
    """Convert text to speech via ElevenLabs. Returns audio bytes or None if unavailable."""
    if not settings.elevenlabs_api_key:
        return None

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={
                    "xi-api-key": settings.elevenlabs_api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "text": text[:5000],  # ElevenLabs limit
                    "model_id": "eleven_monolingual_v1",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75,
                    },
                },
            )
            response.raise_for_status()
            return response.content
    except Exception as e:
        print(f"ElevenLabs TTS failed: {e}")
        return None


async def speech_to_text(audio_bytes: bytes) -> Optional[str]:
    """Transcribe audio via ElevenLabs Speech-to-Text. Returns text or None."""
    if not settings.elevenlabs_api_key:
        return None

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.elevenlabs.io/v1/speech-to-text",
                headers={
                    "xi-api-key": settings.elevenlabs_api_key,
                },
                files={
                    "file": ("audio.webm", audio_bytes, "audio/webm"),
                },
                data={
                    "model_id": "scribe_v1",
                },
            )
            response.raise_for_status()
            result = response.json()
            return result.get("text", "")
    except Exception as e:
        print(f"ElevenLabs STT failed: {e}")
        return None


def is_voice_available() -> bool:
    """Check if ElevenLabs voice is configured."""
    return bool(settings.elevenlabs_api_key)
