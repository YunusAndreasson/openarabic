"""Audio caching utilities."""

import functools
import hashlib
import logging

from utils.config_common import get_storage_url
from utils.storage import check_file_exists

logger = logging.getLogger(__name__)


@functools.cache
def get_cache_key(word: str) -> str:
    """Generate a cache key for a word."""
    return hashlib.sha256(word.encode("utf-8")).hexdigest()


def get_cached_audio_url(cache_key: str, label: str | None = None) -> str | None:
    """
    Check if audio is already cached and return the URL.

    Args:
        cache_key: The cache key for the audio
        label: Optional label for the audio (e.g., "arabic", "english")

    Returns:
        The cached audio URL if found, None if not
    """
    try:
        filename = f"{cache_key}.mp3"
        if label:
            # Ensure label is safe for storage - use only ASCII characters
            safe_label = "".join(c for c in label if c.isascii() and c.isalnum())
            if safe_label:
                filename = f"{cache_key}_{safe_label}.mp3"

        # Check if file exists in Supabase storage
        if check_file_exists("audio", filename):
            return get_storage_url(filename)
        return None
    except Exception as e:
        logger.error(f"Error checking cached audio: {e}")
        return None


__all__ = ["get_cache_key", "get_cached_audio_url"]
