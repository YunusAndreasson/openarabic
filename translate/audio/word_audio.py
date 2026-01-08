"""Word-level audio generation using Google Cloud TTS."""

import logging
import os
from typing import Literal

from audio.caching import get_cache_key, get_cached_audio_url
from audio.google_tts import get_tts_service
from data.config import AUDIO_TEMP_DIR
from utils.config_common import get_storage_url
from utils.storage import check_file_exists, get_supabase_client

logger = logging.getLogger(__name__)

Language = Literal["arabic", "english"]


def _generate_word_audio(
    word: str,
    filename: str,
    language: Language,
    voice_name: str = "Enceladus",
    force: bool = False,
) -> dict | None:
    """
    Generate audio for a word using Google Cloud TTS.

    Args:
        word: The word to generate audio for
        filename: The filename to save the audio as
        language: Either "arabic" or "english"
        voice_name: The Chirp 3: HD voice name (default: 'Enceladus')
        force: If True, skip cache check and regenerate audio

    Returns:
        Dictionary with audio URL and metadata, or None if failed
    """
    try:
        # Skip cache check if force regeneration is requested
        if not force:
            # Check if audio already exists in storage using the actual filename
            if check_file_exists("audio", filename):
                url = get_storage_url(filename)
                return {"url": url, "cached": True}

            # Check cache first (fallback)
            cache_key = get_cache_key(word)
            cached_url = get_cached_audio_url(cache_key, language)
            if cached_url:
                return {"url": cached_url, "cached": True}

        # Use singleton TTS service
        tts_service = get_tts_service()

        # Generate new audio using Google TTS
        if language == "arabic":
            result = tts_service.generate_arabic_word_audio(word, voice_name)
        else:
            result = tts_service.generate_english_word_audio(word, voice_name)

        if not result or not result.get("audio"):
            logger.error(f"Failed to generate audio for {language} word: {word}")
            return None

        # Save to temporary file
        temp_audio_path = os.path.join(AUDIO_TEMP_DIR, filename)
        with open(temp_audio_path, "wb") as f:
            f.write(result["audio"])

        # Upload to Supabase storage
        client = get_supabase_client()
        if force:
            # Force upload: use upsert to replace existing file
            with open(temp_audio_path, "rb") as f:
                client.storage.from_("audio").upload(
                    filename,
                    f,
                    file_options={"content-type": "audio/mpeg", "upsert": "true"},
                )
            logger.info(f"Force uploaded new {language} audio file: {filename}")
        elif not check_file_exists("audio", filename):
            # Normal upload: check if file exists first
            with open(temp_audio_path, "rb") as f:
                client.storage.from_("audio").upload(
                    filename,
                    f,
                    file_options={"content-type": "audio/mpeg"},
                )
        else:
            logger.info(
                f"{language.capitalize()} audio file {filename} already exists, skipping upload"
            )

        # Clean up temporary file
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

        url = get_storage_url(filename)
        return {"url": url, "cached": False}

    except Exception as e:
        logger.error(f"Error generating {language} word audio: {str(e)}")
        return None


def generate_arabic_word_audio(
    word: str, filename: str, voice_name: str = "Enceladus", force: bool = False
) -> dict | None:
    """
    Generate audio for an Arabic word using Google Cloud TTS.

    Args:
        word: The Arabic word to generate audio for
        filename: The filename to save the audio as
        voice_name: The Chirp 3: HD voice name (default: 'Enceladus')
        force: If True, skip cache check and regenerate audio

    Returns:
        Dictionary with audio URL and metadata, or None if failed
    """
    return _generate_word_audio(word, filename, "arabic", voice_name, force)


def generate_english_word_audio(
    word: str, filename: str, voice_name: str = "Enceladus", force: bool = False
) -> dict | None:
    """
    Generate audio for an English word using Google Cloud TTS.

    Args:
        word: The English word to generate audio for
        filename: The filename to save the audio as
        voice_name: The Chirp 3: HD voice name (default: 'Enceladus')
        force: If True, skip cache check and regenerate audio

    Returns:
        Dictionary with audio URL and metadata, or None if failed
    """
    return _generate_word_audio(word, filename, "english", voice_name, force)


__all__ = ["generate_arabic_word_audio", "generate_english_word_audio"]
