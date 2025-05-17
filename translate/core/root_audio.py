import os
import re
from typing import Optional

from translate.core.audio_utils import (
    AUDIO_CACHE_DIR,
    validate_mp3,
    get_cache_key,
    generate_arabic_word_audio,
    generate_english_word_audio,
)
from translate.core.storage_utils import (
    supabase,
    SUPABASE_URL,
    check_file_exists,
    upload_to_storage,
)


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
    cache_key_en = cache_key_ar.replace(
        "ar_", "en_"
    )  # Use a similar pattern for English
    # Get the root directory (translate/) for all file storage
    root_dir = os.path.abspath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
    )
    cache_path_ar = os.path.join(root_dir, "audio_cache", cache_key_ar)
    cache_path_en = os.path.join(root_dir, "audio_cache", cache_key_en)
    storage_url_ar = f"{SUPABASE_URL}/storage/v1/object/public/audio/{cache_key_ar}"
    storage_url_en = f"{SUPABASE_URL}/storage/v1/object/public/audio/{cache_key_en}"

    # --- Arabic audio ---
    if check_file_exists("audio", cache_key_ar):
        if not os.path.exists(cache_path_ar):
            try:
                response = supabase.storage.from_("audio").download(cache_key_ar)
                if response:
                    with open(cache_path_ar, "wb") as f:
                        f.write(response)
            except Exception:
                pass
        audio_url = storage_url_ar
    elif os.path.exists(cache_path_ar):
        try:
            with open(cache_path_ar, "rb") as f:
                file_content = f.read()
            if validate_mp3(file_content, is_cached_file=True):
                try:
                    with open(cache_path_ar, "rb") as f:
                        result_url = upload_to_storage("audio", cache_key_ar, f)
                        if result_url:
                            audio_url = result_url
                        else:
                            audio_url = None
                except Exception as e:
                    print("Cache upload failed")
                    audio_url = None
            else:
                os.remove(cache_path_ar)
                audio_url = None
        except Exception as e:
            print("Error with cache file")
            if os.path.exists(cache_path_ar):
                os.remove(cache_path_ar)
            audio_url = None
    else:
        result = generate_arabic_word_audio(arabic_word, cache_key_ar)
        audio_url = getattr(result, "url", None) if result else None
        if audio_url:
            temp_path = os.path.join(root_dir, "audio", cache_key_ar)
            if os.path.exists(temp_path):
                try:
                    import shutil

                    shutil.copy2(temp_path, cache_path_ar)
                    os.remove(temp_path)
                except Exception as e:
                    print("Error caching audio file")

    # --- English audio ---
    # Validate that english_translation is actually English (not Arabic)
    if english_translation and is_arabic_text(english_translation):
        print(
            f"Warning: Detected Arabic text in English translation: {english_translation}"
        )
        english_translation = None

    # If no English translation provided, use default fallback
    english_word_to_use = (
        english_translation
        if english_translation
        else "English translation unavailable"
    )

    if check_file_exists("audio", cache_key_en):
        if not os.path.exists(cache_path_en):
            try:
                response = supabase.storage.from_("audio").download(cache_key_en)
                if response:
                    with open(cache_path_en, "wb") as f:
                        f.write(response)
            except Exception:
                pass
        audio_url_en = storage_url_en
    elif os.path.exists(cache_path_en):
        try:
            with open(cache_path_en, "rb") as f:
                file_content = f.read()
            if validate_mp3(file_content, is_cached_file=True):
                try:
                    with open(cache_path_en, "rb") as f:
                        result_url = upload_to_storage("audio", cache_key_en, f)
                        if result_url:
                            audio_url_en = result_url
                        else:
                            audio_url_en = None
                except Exception as e:
                    print("Cache upload failed (EN)")
                    audio_url_en = None
            else:
                os.remove(cache_path_en)
                audio_url_en = None
        except Exception as e:
            print("Error with cache file (EN)")
            if os.path.exists(cache_path_en):
                os.remove(cache_path_en)
            audio_url_en = None
    else:
        # Pass the English translation to generate English audio
        result_en = generate_english_word_audio(english_word_to_use, cache_key_en)
        audio_url_en = getattr(result_en, "url", None) if result_en else None
        if audio_url_en:
            temp_path_en = os.path.join(root_dir, "audio", cache_key_en)
            if os.path.exists(temp_path_en):
                try:
                    import shutil

                    shutil.copy2(temp_path_en, cache_path_en)
                    os.remove(temp_path_en)
                except Exception as e:
                    print("Error caching English audio file")

    if audio_url or audio_url_en:
        return {"audio_url": audio_url, "audio_url_en": audio_url_en}
    return None
