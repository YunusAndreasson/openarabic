"""Common audio utilities to eliminate code duplication."""

import logging
import os
from typing import Any, Dict, Optional

from elevenlabs import VoiceSettings

from data.config import AUDIO_TEMP_DIR, DEFAULT_VOICE_SETTINGS, SUPABASE_URL
from utils.storage_utils import get_supabase_client

logger = logging.getLogger(__name__)


def create_voice_settings(speed: float = 0.8) -> VoiceSettings:
    """Create voice settings with consistent defaults."""
    return VoiceSettings(
        **DEFAULT_VOICE_SETTINGS.dict(),
        speed=speed,
    )


def save_and_upload_audio(
    audio_response: bytes, filename: str, temp_audio_path: str, context: str = "audio"
) -> Optional[Dict[str, str]]:
    """Common function to save audio to temp file and upload to storage."""
    try:
        # Save audio to temporary file
        with open(temp_audio_path, "wb") as f:
            f.write(audio_response)

        # Upload to storage
        with open(temp_audio_path, "rb") as f:
            get_supabase_client().storage.from_("audio").upload(
                filename,
                f,
                file_options={"content-type": "audio/mpeg"},
            )
            final_url = f"{SUPABASE_URL}/storage/v1/object/public/audio/{filename}"
            return {"url": final_url}
    except Exception as e:
        logger.error(f"Upload failed for {context} '{filename}': {str(e)}")
        return None


def cleanup_temp_file(temp_path: str, context: str = "audio") -> None:
    """Common function to clean up temporary audio files."""
    if os.path.exists(temp_path):
        try:
            os.remove(temp_path)
        except Exception as e:
            logger.warning(f"Failed to clean up temp file {temp_path}: {e}")


def handle_audio_generation_error(
    error: Exception, context: str, item_name: str
) -> None:
    """Common error handling for audio generation failures."""
    logger.error(f"Error generating {context} for '{item_name}': {str(error)}")


def validate_audio_response(
    audio_response: Optional[bytes], context: str, item_name: str
) -> bool:
    """Common validation for audio API responses."""
    if not audio_response:
        logger.error(
            f"Error: Empty audio response from ElevenLabs API for {context} '{item_name}'"
        )
        return False
    return True


def get_temp_audio_path(filename: str) -> str:
    """Get temporary audio file path."""
    return os.path.join(AUDIO_TEMP_DIR, filename)


def get_storage_url(filename: str, bucket: str = "audio") -> str:
    """Generate consistent storage URLs."""
    return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{filename}"
