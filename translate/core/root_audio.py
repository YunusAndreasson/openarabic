import os
import re
from typing import Optional
import logging

from translate.core.audio_utils import (
    get_cache_key,
    generate_arabic_word_audio,
    generate_english_word_audio,
    get_cached_audio_url,
)
from translate.core.storage_utils import (
    SUPABASE_URL,
    check_file_exists,
)

logger = logging.getLogger(__name__)


def is_arabic_text(text: str) -> bool:
    """Check if text contains Arabic characters."""
    if not text:
        return False
    arabic_range = re.compile(r"[\u0600-\u06FF]")
    return bool(arabic_range.search(text))


def get_or_generate_root_audio(
    arabic_word: str, english_translation: str = None
) -> Optional[dict]:
    """Get cached audio URLs or generate new ones for a root word (Arabic and English).

    Args:
        arabic_word: The Arabic root word
        english_translation: The English translation of the root word
    """
    cache_key_ar = get_cache_key(arabic_word)
    cache_key_en = cache_key_ar.replace("ar_", "en_")
    root_dir = os.path.abspath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
    )
    cache_path_ar = os.path.join(root_dir, "audio_cache", cache_key_ar)
    cache_path_en = os.path.join(root_dir, "audio_cache", cache_key_en)
    storage_url_ar = f"{SUPABASE_URL}/storage/v1/object/public/audio/{cache_key_ar}"
    storage_url_en = f"{SUPABASE_URL}/storage/v1/object/public/audio/{cache_key_en}"

    audio_url = None
    audio_url_en = None

    audio_url = get_cached_audio_url(cache_key_ar, arabic_word)
    if not audio_url:
        logger.info(f"Generating new audio for Arabic word: {arabic_word}")
        result = generate_arabic_word_audio(arabic_word, cache_key_ar)
        audio_url = result.get("url") if result else None
        if audio_url:
            logger.info(f"Generated Arabic audio URL: {audio_url}")
            temp_path = os.path.join(root_dir, "audio", cache_key_ar)
            if os.path.exists(temp_path):
                try:
                    import shutil

                    shutil.copy2(temp_path, cache_path_ar)
                    os.remove(temp_path)
                except Exception as e:
                    logger.info(
                        f"Error caching audio file for {arabic_word}: {e}"
                    )

    # Validate that english_translation is actually English (not Arabic)
    if english_translation and is_arabic_text(english_translation):
        logger.info(
            f"Warning: Detected Arabic text in English translation: {english_translation}"
        )
        english_translation = None

    english_word_to_use = (
        english_translation
        if english_translation
        else "English translation unavailable"
    )

    audio_url_en = get_cached_audio_url(cache_key_en, english_word_to_use)
    if not audio_url_en:
        logger.info(f"Generating new audio for English word: {english_word_to_use}")
        result_en = generate_english_word_audio(english_word_to_use, cache_key_en)
        audio_url_en = result_en.get("url") if result_en else None
        if audio_url_en:
            logger.info(f"Generated English audio URL: {audio_url_en}")
            temp_path_en = os.path.join(root_dir, "audio", cache_key_en)
            if os.path.exists(temp_path_en):
                try:
                    import shutil

                    shutil.copy2(temp_path_en, cache_path_en)
                    os.remove(temp_path_en)
                except Exception as e:
                    logger.info(
                        f"Error caching English audio file for {english_word_to_use}: {e}"
                    )

    if not audio_url and check_file_exists("audio", cache_key_ar):
        audio_url = storage_url_ar
        logger.info(f"Found audio in storage without URL: {audio_url}")

    if not audio_url_en and check_file_exists("audio", cache_key_en):
        audio_url_en = storage_url_en
        logger.info(f"Found EN audio in storage without URL: {audio_url_en}")

    return {"audio_url": audio_url, "audio_url_en": audio_url_en}
