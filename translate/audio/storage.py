"""Audio storage utilities for downloading, uploading, and managing audio files."""

import logging
import os
import uuid

import requests

from utils.config_common import get_supabase_client

logger = logging.getLogger(__name__)


def generate_audio_filename() -> str:
    """Generate a unique filename for audio files."""
    return f"{uuid.uuid4()}.mp3"


def download_audio_from_url(audio_url: str) -> bytes | None:
    """
    Download audio file from Supabase storage URL.

    Args:
        audio_url: The audio URL (can be relative path or full URL)

    Returns:
        Audio data as bytes, or None if download failed
    """
    try:
        if not audio_url.startswith("http"):
            supabase_url = os.getenv("SUPABASE_URL")
            if not supabase_url:
                raise ValueError("SUPABASE_URL environment variable not set")
            audio_url = f"{supabase_url}/storage/v1/object/public/audio/{audio_url}"

        response = requests.get(audio_url, timeout=30)
        response.raise_for_status()
        return response.content
    except Exception as e:
        logger.error(f"Failed to download audio from {audio_url}: {e}")
        return None


def upload_audio_to_storage(audio_data: bytes, filename: str) -> str | None:
    """
    Upload audio data to Supabase storage.

    Args:
        audio_data: The audio data bytes to upload
        filename: The filename to save as

    Returns:
        The filename if successful, or None if upload failed
    """
    try:
        client = get_supabase_client()
        client.storage.from_("audio").upload(
            filename, audio_data, file_options={"content-type": "audio/mpeg"}
        )
        logger.info(f"Uploaded audio: {filename}")
        return filename
    except Exception as e:
        logger.error(f"Failed to upload audio {filename}: {e}")
        return None
