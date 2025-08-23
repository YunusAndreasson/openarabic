"""Common configuration utilities to eliminate code duplication."""

import os
from typing import Any

from data.config import (
    ARABIC_VOICE_ID,
)
from supabase import create_client


def get_voice_config(voice_type: str) -> dict[str, Any]:
    """Get consistent voice configuration for different types."""
    voice_configs = {
        "arabic_sentence": {
            "voice_id": ARABIC_VOICE_ID,
            "is_arabic": True,
            "speed": 0.8,
        },
    }

    return voice_configs.get(voice_type, voice_configs["arabic_sentence"])


def get_storage_url(filename: str, bucket: str = "audio") -> str:
    """Return filename - we reconstruct full URLs in the mobile app."""
    return filename


def get_environment_config() -> dict[str, str]:
    """Get consistent environment configuration."""
    return {
        "ELEVENLABS_API_KEY": os.getenv("ELEVENLABS_API_KEY", ""),
        "SUPABASE_URL": os.getenv("SUPABASE_URL", ""),
        "SUPABASE_KEY": os.getenv("SUPABASE_KEY", ""),
        "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY", ""),
        "OPENAI_ORG_ID": os.getenv("OPENAI_ORG_ID", ""),
    }


def validate_required_config(required_keys: list[str]) -> bool:
    """Validate that required configuration keys are present."""
    config = get_environment_config()
    missing_keys = [key for key in required_keys if not config.get(key)]

    if missing_keys:
        raise ValueError(f"Missing required configuration: {', '.join(missing_keys)}")

    return True


def get_audio_config() -> dict[str, Any]:
    """Get consistent audio configuration."""
    return {
        "voice_configs": {
            "arabic_sentence": get_voice_config("arabic_sentence"),
        },
        "storage": {
            "bucket": "audio",
            "content_type": "audio/mpeg",
        },
        "validation": {
            "min_file_size": 1000,  # 1KB minimum
            "max_file_size": 10 * 1024 * 1024,  # 10MB maximum
        },
    }


_supabase_client = None


def get_supabase_client() -> Any:
    """Get the Supabase client instance."""
    global _supabase_client
    if _supabase_client is None:
        # Check environment variables directly since config might be imported before keys are loaded
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")

        if not all([supabase_url, supabase_key]):
            raise OSError(
                "Missing required environment variables. Please ensure SUPABASE_URL and SUPABASE_KEY are set."
            )
        # At this point, we know both are not None due to the check above
        assert supabase_url is not None and supabase_key is not None
        _supabase_client = create_client(supabase_url, supabase_key)
    return _supabase_client
