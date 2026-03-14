from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    solana_rpc_url: str = "https://api.devnet.solana.com"
    solana_ws_url: str = "wss://api.devnet.solana.com"
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    elevenlabs_api_key: Optional[str] = None
    kalibr_api_key: Optional[str] = None
    unbrowse_url: str = "http://localhost:6969"
    human_passport_enabled: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
