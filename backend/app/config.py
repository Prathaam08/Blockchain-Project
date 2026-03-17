"""
config.py — Application settings loaded from environment variables.

Uses Pydantic Settings for type-safe configuration management.
All secrets are loaded from .env files, never hardcoded.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── Database ──
    DATABASE_URL: str = "postgresql://user:pass@localhost:5432/ngotrack"

    # ── Redis ──
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Blockchain ──
    WEB3_PROVIDER_URL: str = "http://localhost:8545"
    DEPLOYER_PRIVATE_KEY: str = ""

    # ── Contract Addresses ──
    NGO_REGISTRY_ADDRESS: str = ""
    DONATION_TRACKER_ADDRESS: str = ""
    MILESTONE_VAULT_ADDRESS: str = ""

    # ── IPFS ──
    IPFS_TOKEN: str = ""

    # ── App ──
    APP_NAME: str = "NGO Donation Tracker"
    DEBUG: bool = False
    TESTING: bool = False

    model_config = {
        "env_file": "../.env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore"
    }


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance.

    Returns:
        Settings: Application settings singleton.
    """
    return Settings()
