import logging
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from audio.audio_utils import (
    generate_arabic_word_audio,
    generate_english_word_audio,
    get_cache_key,
    get_cached_audio_url,
)
from data.config import AUDIO_CACHE_DIR, AUDIO_TEMP_DIR, SUPABASE_URL
from utils.config_common import get_storage_url
from utils.storage_utils import check_file_exists

logger = logging.getLogger(__name__)


def is_arabic_text(text: str) -> bool:
    """Check if text contains Arabic characters."""
    if not text:
        return False
    arabic_range = re.compile(r"[\u0600-\u06FF]")
    return bool(arabic_range.search(text))


def get_or_generate_root_audio(
    arabic_word: str, english_translation: str | None = None
) -> dict[str, str | None] | None:
    """Get cached audio URLs or generate new ones for a root word (Arabic and English).

    Args:
        arabic_word: The Arabic root word
        english_translation: The English translation of the root word
    """
    # Generate separate cache keys for Arabic and English
    cache_key_ar = get_cache_key(arabic_word)
    cache_key_en = get_cache_key(english_translation) if english_translation else None

    cache_path_ar = os.path.join(AUDIO_CACHE_DIR, cache_key_ar)
    cache_path_en = (
        os.path.join(AUDIO_CACHE_DIR, cache_key_en) if cache_key_en else None
    )
    storage_url_ar = get_storage_url(cache_key_ar)
    storage_url_en = get_storage_url(cache_key_en) if cache_key_en else None

    audio_url: str | None = None
    audio_url_en: str | None = None

    # Generate Arabic audio
    audio_url = get_cached_audio_url(cache_key_ar, "arabic")
    if not audio_url:
        logger.info(f"Generating new audio for Arabic word: {arabic_word}")
        result = generate_arabic_word_audio(arabic_word, cache_key_ar)
        audio_url = result.get("url") if result else None
        if audio_url:
            logger.info(f"Generated Arabic audio URL: {audio_url}")
            temp_path = os.path.join(AUDIO_TEMP_DIR, cache_key_ar)
            if os.path.exists(temp_path):
                try:
                    import shutil

                    shutil.copy2(temp_path, cache_path_ar)
                    os.remove(temp_path)
                except Exception as e:
                    logger.info(f"Error caching audio file for {arabic_word}: {e}")

    # Generate English audio if we have a valid English translation
    if english_translation:
        audio_url_en = get_cached_audio_url(cache_key_en, "english")
        if not audio_url_en:
            logger.info(f"Generating new audio for English word: {english_translation}")
            result_en = generate_english_word_audio(english_translation, cache_key_en)
            audio_url_en = result_en.get("url") if result_en else None
            if audio_url_en:
                logger.info(f"Generated English audio URL: {audio_url_en}")
                temp_path_en = os.path.join(AUDIO_TEMP_DIR, cache_key_en)
                if os.path.exists(temp_path_en) and cache_path_en:
                    try:
                        import shutil

                        shutil.copy2(temp_path_en, cache_path_en)
                        os.remove(temp_path_en)
                    except Exception as e:
                        logger.info(
                            f"Error caching English audio file for {english_translation}: {e}"
                        )

    if not audio_url and check_file_exists("audio", cache_key_ar):
        audio_url = storage_url_ar
        logger.info(f"Found audio in storage without URL: {audio_url}")

    if not audio_url_en and cache_key_en and check_file_exists("audio", cache_key_en):
        audio_url_en = storage_url_en
        logger.info(f"Found EN audio in storage without URL: {audio_url_en}")

    return {"audio_url": audio_url, "audio_url_en": audio_url_en}
