"""Audio validation utilities."""

import io
import logging

from mutagen.mp3 import MP3

logger = logging.getLogger(__name__)


def validate_mp3(audio_data: bytes, is_cached_file: bool = False) -> bool:
    """
    Validate that the audio data is a valid MP3 file.

    Args:
        audio_data: The MP3 data to validate
        is_cached_file: Whether this is a cached file (for different validation)

    Returns:
        True if valid MP3, False otherwise
    """
    try:
        if is_cached_file:
            # For cached files, just check if it's not empty
            return len(audio_data) > 0

        # For fresh API responses, validate MP3 structure
        with io.BytesIO(audio_data) as audio_stream:
            audio = MP3(audio_stream)
            # Check if info is present and duration is reasonable
            if audio.info is None:
                logger.warning("Invalid audio: no info available")
                return False
            if audio.info.length <= 0 or audio.info.length > 3600:  # 1 hour max
                logger.warning(f"Invalid audio duration: {audio.info.length}")
                return False
            return True
    except Exception as e:
        logger.error(f"MP3 validation failed: {e}")
        return False


__all__ = ["validate_mp3"]
