import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from audio.caching import get_cache_key, get_cached_audio_url
from audio.word_audio import generate_arabic_word_audio, generate_english_word_audio
from utils.config_common import get_storage_url
from utils.storage import check_file_exists

logger = logging.getLogger(__name__)


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

    storage_url_ar = get_storage_url(cache_key_ar)
    storage_url_en = get_storage_url(cache_key_en) if cache_key_en else None

    audio_url: str | None = None
    audio_url_en: str | None = None

    # Generate Arabic audio
    audio_url = get_cached_audio_url(cache_key_ar, "arabic")
    if not audio_url:
        result = generate_arabic_word_audio(arabic_word, f"{cache_key_ar}.mp3")
        audio_url = result.get("url") if result else None

    # Generate English audio if we have a valid English translation
    if english_translation and cache_key_en:
        audio_url_en = get_cached_audio_url(cache_key_en, "english")
        if not audio_url_en:
            result_en = generate_english_word_audio(
                english_translation, f"{cache_key_en}.mp3"
            )
            audio_url_en = result_en.get("url") if result_en else None

    if not audio_url and check_file_exists("audio", cache_key_ar):
        audio_url = storage_url_ar

    if not audio_url_en and cache_key_en and check_file_exists("audio", cache_key_en):
        audio_url_en = storage_url_en

    return {"audio_url": audio_url, "audio_url_en": audio_url_en}
