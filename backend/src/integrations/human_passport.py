from src.core.config import settings

async def verify_human(wallet_address: str) -> bool:
    """Verify a wallet address is a verified human via Human Passport.
    Falls back to True if Human Passport is not configured."""
    if not settings.human_passport_enabled:
        return True

    # TODO: Integrate Human Passport API when docs are available
    return True
