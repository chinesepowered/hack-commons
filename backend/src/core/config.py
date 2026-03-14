from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    solana_rpc_url: str = "https://api.devnet.solana.com"
    solana_ws_url: str = "wss://api.devnet.solana.com"
    llm_api_key: Optional[str] = None
    llm_model: str = "gpt-4o"
    llm_base_url: str = "https://api.openai.com/v1"
    elevenlabs_api_key: Optional[str] = None
    kalibr_api_key: Optional[str] = None
    unbrowse_url: str = "http://localhost:6969"
    human_passport_enabled: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
