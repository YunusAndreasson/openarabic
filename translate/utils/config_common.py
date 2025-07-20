"""Common configuration utilities to eliminate code duplication."""

import os
from typing import Any, Dict, Optional

from data.config import (
    ARABIC_VOICE_ID,
    ARABIC_WORD_VOICE_ID,
    ENGLISH_WORD_VOICE_ID,
    SUPABASE_URL,
)


def get_voice_config(voice_type: str) -> Dict[str, Any]:
    """Get consistent voice configuration for different types."""
    voice_configs = {
        "arabic_sentence": {
            "voice_id": ARABIC_VOICE_ID,
            "is_arabic": True,
            "speed": 0.8,
        },
        "arabic_word": {
            "voice_id": ARABIC_WORD_VOICE_ID,
            "is_arabic": True,
            "speed": 0.8,
        },
        "english_word": {
            "voice_id": ENGLISH_WORD_VOICE_ID,
            "is_arabic": False,
            "speed": 0.8,
        },
    }

    return voice_configs.get(voice_type, voice_configs["arabic_sentence"])


def get_storage_url(filename: str, bucket: str = "audio") -> str:
    """Generate consistent storage URLs."""
    return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{filename}"


def get_environment_config() -> Dict[str, str]:
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


def get_audio_config() -> Dict[str, Any]:
    """Get consistent audio configuration."""
    return {
        "voice_configs": {
            "arabic_sentence": get_voice_config("arabic_sentence"),
            "arabic_word": get_voice_config("arabic_word"),
            "english_word": get_voice_config("english_word"),
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
