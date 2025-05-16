import os
from typing import Optional

from translate.core.audio_utils import (
    AUDIO_CACHE_DIR,
    validate_mp3,
    get_cache_key,
    generate_arabic_word_audio,
)
from translate.core.storage_utils import (
    supabase,
    SUPABASE_URL,
    check_file_exists,
    upload_to_storage,
)


def get_or_generate_root_audio(word: str) -> Optional[str]:
    """Get cached audio URL or generate new one for a root word."""
    cache_key = get_cache_key(word)
    cache_path = os.path.join(AUDIO_CACHE_DIR, cache_key)
    storage_url = f"{SUPABASE_URL}/storage/v1/object/public/audio/{cache_key}"

    # First check if file exists in storage
    if check_file_exists("audio", cache_key):
        # If already in storage, just check if we have local cache
        if not os.path.exists(cache_path):
            # Try to download and save to local cache for future use
            try:
                response = supabase.storage.from_("audio").download(cache_key)
                if response:
                    with open(cache_path, "wb") as f:
                        f.write(response)
            except Exception:
                # If download fails, just continue - we know it's on the server
                pass
        return storage_url

    # Check if file exists in local cache but not on server
    if os.path.exists(cache_path):
        try:
            # Verify the cached file is valid
            with open(cache_path, "rb") as f:
                file_content = f.read()

            # Use more lenient validation for cached files
            if validate_mp3(file_content, is_cached_file=True):
                # Upload to storage
                try:
                    with open(cache_path, "rb") as f:
                        result_url = upload_to_storage("audio", cache_key, f)
                        if result_url:
                            return result_url
                except Exception as e:
                    print(f"Cache upload failed: {str(e)}")
            else:
                # Invalid cache file, remove it
                os.remove(cache_path)
        except Exception as e:
            print(f"Error with cache file: {str(e)}")
            if os.path.exists(cache_path):
                os.remove(cache_path)

    # If we reach here, we need to generate new audio
    result = generate_arabic_word_audio(word, cache_key)

    if result and result.get("url"):
        # Save to cache
        temp_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "audio", cache_key
        )
        if os.path.exists(temp_path):
            try:
                import shutil

                shutil.copy2(temp_path, cache_path)
                # Only remove temp file if successfully copied to cache
                os.remove(temp_path)
            except Exception as e:
                print(f"Error caching audio file: {str(e)}")
        return result["url"]

    return None
