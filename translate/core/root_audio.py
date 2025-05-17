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

    # Initialize audio URLs to None to avoid "referenced before assignment" errors
    audio_url = None
    audio_url_en = None

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
        print(f"Using existing audio for {arabic_word}: {audio_url}")
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
                            print(
                                f"Uploaded cache audio for {arabic_word}: {audio_url}"
                            )
                        else:
                            audio_url = None
                            print(f"Failed to get URL for {arabic_word} cache upload")
                except Exception as e:
                    print(f"Cache upload failed for {arabic_word}: {e}")
                    audio_url = None
            else:
                os.remove(cache_path_ar)
                audio_url = None
        except Exception as e:
            print(f"Error with cache file for {arabic_word}: {e}")
            if os.path.exists(cache_path_ar):
                os.remove(cache_path_ar)
            audio_url = None
    else:
        print(f"Generating new audio for Arabic word: {arabic_word}")
        result = generate_arabic_word_audio(arabic_word, cache_key_ar)
        print(f"Result from generate_arabic_word_audio: {result}")
        audio_url = result.get("url") if result else None
        if audio_url:
            print(f"Generated Arabic audio URL: {audio_url}")
            temp_path = os.path.join(root_dir, "audio", cache_key_ar)
            if os.path.exists(temp_path):
                try:
                    import shutil

                    shutil.copy2(temp_path, cache_path_ar)
                    os.remove(temp_path)
                except Exception as e:
                    print(f"Error caching audio file for {arabic_word}: {e}")

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
        print(f"Using existing EN audio for {english_word_to_use}: {audio_url_en}")
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
                            print(
                                f"Uploaded EN cache audio for {english_word_to_use}: {audio_url_en}"
                            )
                        else:
                            audio_url_en = None
                            print(
                                f"Failed to get URL for {english_word_to_use} EN cache upload"
                            )
                except Exception as e:
                    print(f"Cache upload failed (EN) for {english_word_to_use}: {e}")
                    audio_url_en = None
            else:
                os.remove(cache_path_en)
                audio_url_en = None
        except Exception as e:
            print(f"Error with cache file (EN) for {english_word_to_use}: {e}")
            if os.path.exists(cache_path_en):
                os.remove(cache_path_en)
            audio_url_en = None
    else:
        # Pass the English translation to generate English audio
        print(f"Generating new audio for English word: {english_word_to_use}")
        result_en = generate_english_word_audio(english_word_to_use, cache_key_en)
        print(f"Result from generate_english_word_audio: {result_en}")
        audio_url_en = result_en.get("url") if result_en else None
        if audio_url_en:
            print(f"Generated English audio URL: {audio_url_en}")
            temp_path_en = os.path.join(root_dir, "audio", cache_key_en)
            if os.path.exists(temp_path_en):
                try:
                    import shutil

                    shutil.copy2(temp_path_en, cache_path_en)
                    os.remove(temp_path_en)
                except Exception as e:
                    print(
                        f"Error caching English audio file for {english_word_to_use}: {e}"
                    )

    # If we don't have audio URLs but files exist in storage, construct URLs
    if not audio_url and check_file_exists("audio", cache_key_ar):
        audio_url = storage_url_ar
        print(f"Found audio in storage without URL: {audio_url}")

    if not audio_url_en and check_file_exists("audio", cache_key_en):
        audio_url_en = storage_url_en
        print(f"Found EN audio in storage without URL: {audio_url_en}")

    # Return both URLs even if one is None
    return {"audio_url": audio_url, "audio_url_en": audio_url_en}
