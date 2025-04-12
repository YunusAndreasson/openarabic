import json
from supabase import create_client
from typing import Dict, List, Optional
import os
import shutil
from datetime import datetime, UTC
import uuid
import hashlib
import base64
from elevenlabs.client import ElevenLabs
from elevenlabs import VoiceSettings
from mutagen.mp3 import MP3
import io
import time
import functools


# Execute set_keys.py to set environment variables
set_keys_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "set_keys.py")
exec(open(set_keys_path).read())

# Supabase configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# ElevenLabs configuration
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY, ELEVENLABS_API_KEY]):
    raise EnvironmentError(
        "Missing required environment variables. Please ensure SUPABASE_URL, SUPABASE_KEY, and ELEVENLABS_API_KEY are set."
    )

# Initialize clients
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
eleven_labs = ElevenLabs(api_key=ELEVENLABS_API_KEY)

# Word type mapping from POS to word_types table
WORD_TYPE_MAPPING = {
    "verb": 1,
    "noun": 2,
    "particle": 3,
    "adjective": 4,
    "pronoun": 5,
    "adverb": 6,
    "preposition": 7,
    "conjunction": 8,
    "interjection": 9,
    "numeral": 56,
}

# Constants for voice IDs
ARABIC_VOICE_ID = "nPczCjzI2devNBz1zQrb"  # Voice ID for Arabic
ENGLISH_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Voice ID for English (Rachel)

# Add after other constants
AUDIO_CACHE_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "audio_cache"
)
os.makedirs(AUDIO_CACHE_DIR, exist_ok=True)

# Ensure audio directory exists for temporary files
AUDIO_TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio")
os.makedirs(AUDIO_TEMP_DIR, exist_ok=True)


# Add the retry function near the top of the file
def retry_operation(max_attempts=3, delay=1, backoff=2):
    """Retry decorator for network operations."""

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            attempts = 0
            current_delay = delay
            while attempts < max_attempts:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    attempts += 1
                    if attempts == max_attempts:
                        print(f"Failed after {max_attempts} attempts: {str(e)}")
                        raise
                    print(
                        f"Attempt {attempts} failed: {str(e)}. Retrying in {current_delay}s..."
                    )
                    time.sleep(current_delay)
                    current_delay *= backoff
            return None

        return wrapper

    return decorator


# Apply retry to Supabase and ElevenLabs operations
@retry_operation(max_attempts=3, delay=1, backoff=2)
def upload_to_storage(
    bucket: str, file_path: str, file_data, content_type: str = "audio/mpeg"
):
    """Upload a file to Supabase storage with retries."""
    try:
        supabase.storage.from_(bucket).upload(
            file_path, file_data, file_options={"content-type": content_type}
        )
        return True
    except Exception as e:
        # If error is 409 (already exists), that's fine
        if hasattr(e, "statusCode") and e.statusCode == 409:
            print("File already exists in storage, using existing URL")
            return True
        # Otherwise, propagate the exception to trigger retry
        raise


@retry_operation(max_attempts=3, delay=1, backoff=2)
def generate_speech(text: str, voice_id: str, speed: float = 1.0):
    """Generate speech using ElevenLabs API with retries."""
    audio_generator = eleven_labs.text_to_speech.convert(
        text=text,
        voice_id=voice_id,
        model_id="eleven_multilingual_v2",
        output_format="mp3_44100_128",
        voice_settings=VoiceSettings(
            stability=0.8,
            similarity_boost=0.9,
            style=0.0,
            use_speaker_boost=True,
            speed=speed,
        ),
    )

    if not audio_generator:
        raise ValueError("Empty audio response from ElevenLabs API")

    audio_chunks = []
    for chunk in audio_generator:
        if isinstance(chunk, bytes):
            audio_chunks.append(chunk)
    audio_response = b"".join(audio_chunks)

    if not audio_response:
        raise ValueError("No audio data generated")

    return audio_response


@retry_operation(max_attempts=3, delay=1, backoff=2)
def generate_speech_with_timestamps(text: str, voice_id: str, speed: float = 0.8):
    """Generate speech with timestamps using ElevenLabs API with retries."""
    audio_response = eleven_labs.text_to_speech.convert_with_timestamps(
        text=text,
        voice_id=voice_id,
        model_id="eleven_multilingual_v2",
        output_format="mp3_44100_128",
        voice_settings=VoiceSettings(
            stability=0.8,
            similarity_boost=0.9,
            style=0.0,
            use_speaker_boost=True,
            speed=speed,
        ),
    )

    if not audio_response:
        raise ValueError("Empty audio response from ElevenLabs API")

    return audio_response


def _remove_final_haraka(word: str) -> str:
    """
    Remove the last short vowel (haraka) or tanween
    from an Arabic word, if present.
    """
    # Set of diacritics we want to remove from the end
    final_diacritics = {"َ", "ُ", "ِ", "ْ", "ً", "ٌ", "ٍ"}

    # Convert to a list of characters for easy popping
    chars = list(word)

    # Remove diacritics while the last character is in our set
    while chars and chars[-1] in final_diacritics:
        chars.pop()

    # Reconstruct the word after stripping final diacritics
    return "".join(chars)


def generate_content_hash(data: Dict) -> str:
    """Generate a unique hash for the article content."""
    content = json.dumps(data, sort_keys=True)
    return hashlib.sha256(content.encode()).hexdigest()


def check_article_exists(content_hash: str) -> tuple[Optional[int], Optional[str]]:
    """Check if an article with this content hash already exists and return its ID and audio_url."""
    try:
        result = (
            supabase.table("articles")
            .select("id, audio_url")
            .eq("content_hash", content_hash)
            .execute()
        )
        if result.data:
            return result.data[0]["id"], result.data[0].get("audio_url")
        return None, None
    except Exception as e:
        if "content_hash" in str(e):
            # Column doesn't exist yet, so no duplicates possible
            return None, None
        raise e


def generate_audio_filename() -> str:
    """Generate a unique filename for the audio file."""
    return f"{uuid.uuid4()}.mp3"


def validate_mp3(audio_data: bytes) -> bool:
    """Validate that the audio data is a valid MP3 file."""
    try:
        # Create a BytesIO object to read the audio data
        audio_file = io.BytesIO(audio_data)

        # Try to load it as an MP3
        mp3 = MP3(audio_file)

        # Check if it has basic MP3 attributes
        if mp3.info.length > 0 and mp3.info.bitrate > 0:
            print(
                f"✅ Valid MP3: Length={mp3.info.length:.2f}s, Bitrate={mp3.info.bitrate / 1000:.0f}kbps"
            )
            return True
        else:
            print("❌ Invalid MP3: Missing audio properties")
            return False
    except Exception as e:
        print(f"❌ Invalid MP3: {str(e)}")
        return False


def get_cache_key(word: str, is_arabic: bool) -> str:
    """Generate a unique cache key for a word."""
    # Create a hash of the word to use as filename
    word_hash = hashlib.sha256(word.encode()).hexdigest()[:12]
    prefix = "ar" if is_arabic else "en"
    return f"{prefix}_{word_hash}.mp3"


def get_or_generate_word_audio(word: str, is_arabic: bool) -> Optional[str]:
    """Get cached audio URL or generate new one for a word."""
    cache_key = get_cache_key(word, is_arabic)
    cache_path = os.path.join(AUDIO_CACHE_DIR, cache_key)
    storage_url = f"{SUPABASE_URL}/storage/v1/object/public/audio/{cache_key}"

    # Check if file exists in cache
    cache_valid = False
    if os.path.exists(cache_path):
        try:
            # Verify the cached file is valid
            if validate_mp3(open(cache_path, "rb").read()):
                # Try to upload with retries
                try:
                    with open(cache_path, "rb") as f:
                        upload_to_storage("audio", cache_key, f)
                except Exception as e:
                    print(f"Warning: Cache upload failed despite retries: {str(e)}")
                    # Continue anyway - we have the file locally
                cache_valid = True
                return storage_url
            else:
                # Invalid cache file, remove it
                os.remove(cache_path)
                print(f"Removed invalid cache file for word: {word}")
        except Exception as e:
            print(f"Error with cache file: {str(e)}")
            if os.path.exists(cache_path):
                os.remove(cache_path)
                print(f"Removed problematic cache file for word: {word}")

    # If we reach here, we need to generate new audio
    if not cache_valid:
        print(f"Generating new audio for word: {word}")
        if is_arabic:
            result = generate_arabic_word_audio(word, cache_key)
        else:
            result = generate_english_word_audio(word, cache_key)

        if result and result.get("url"):
            # Save to cache
            temp_path = os.path.join(AUDIO_TEMP_DIR, cache_key)
            if os.path.exists(temp_path):
                try:
                    shutil.copy2(temp_path, cache_path)
                    print(
                        f"✅ Cached audio for {'Arabic' if is_arabic else 'English'} word: {word}"
                    )
                    # Only remove temp file if successfully copied to cache
                    os.remove(temp_path)
                except Exception as e:
                    print(f"Error caching audio file: {str(e)}")
                    # Don't remove temp file if copying failed - we can use it directly
            return result["url"]

    return None


def generate_arabic_word_audio(word: str, filename: str) -> Optional[Dict]:
    """Generate audio file for an Arabic word using ElevenLabs API."""
    temp_audio_path = None
    try:
        print(f"\nGenerating Arabic audio for word: '{word}'")

        try:
            audio_response = generate_speech(word, ARABIC_VOICE_ID, speed=0.8)
        except Exception as e:
            print(f"Error generating Arabic speech: {str(e)}")
            return None

        # Validate the MP3 data
        if not validate_mp3(audio_response):
            print(f"Skipping upload of invalid MP3 file for word '{word}'")
            return None

        # Save and upload the audio file
        temp_audio_path = os.path.join(AUDIO_TEMP_DIR, filename)

        print(f"Saving temp file to: {temp_audio_path}")
        with open(temp_audio_path, "wb") as f:
            f.write(audio_response)

        print("Uploading to Supabase storage...")
        try:
            with open(temp_audio_path, "rb") as f:
                upload_to_storage("audio", filename, f)
        except Exception as e:
            print(f"Upload failed despite retries: {str(e)}")
            return None

        # Don't remove the temp file - it will be used for caching in get_or_generate_word_audio
        url = f"{SUPABASE_URL}/storage/v1/object/public/audio/{filename}"
        print(f"✅ Successfully generated and uploaded Arabic audio. URL: {url}")
        return {"url": url}

    except Exception as e:
        print(f"❌ Error generating/uploading Arabic word audio for '{word}': {str(e)}")
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        return None


def generate_english_word_audio(word: str, filename: str) -> Optional[Dict]:
    """Generate audio file for an English word using ElevenLabs API."""
    temp_audio_path = None
    try:
        print(f"\nGenerating English audio for word: '{word}'")

        try:
            audio_response = generate_speech(word, ENGLISH_VOICE_ID, speed=1.0)
        except Exception as e:
            print(f"Error generating English speech: {str(e)}")
            return None

        # Validate the MP3 data
        if not validate_mp3(audio_response):
            print(f"Skipping upload of invalid MP3 file for word '{word}'")
            return None

        # Save and upload the audio file
        temp_audio_path = os.path.join(AUDIO_TEMP_DIR, filename)

        print(f"Saving temp file to: {temp_audio_path}")
        with open(temp_audio_path, "wb") as f:
            f.write(audio_response)

        print("Uploading to Supabase storage...")
        try:
            with open(temp_audio_path, "rb") as f:
                upload_to_storage("audio", filename, f)
        except Exception as e:
            print(f"Upload failed despite retries: {str(e)}")
            return None

        # Don't remove the temp file - it will be used for caching in get_or_generate_word_audio
        url = f"{SUPABASE_URL}/storage/v1/object/public/audio/{filename}"
        print(f"✅ Successfully generated and uploaded English audio. URL: {url}")
        return {"url": url}

    except Exception as e:
        print(
            f"❌ Error generating/uploading English word audio for '{word}': {str(e)}"
        )
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        return None


def generate_sentence_audio(text: str, filename: str) -> Optional[Dict]:
    """Generate audio file for an Arabic sentence using ElevenLabs API with word timings."""
    temp_audio_path = None
    try:
        print(f"\nGenerating sentence audio with timestamps for: '{text}'")

        try:
            audio_response = generate_speech_with_timestamps(text, ARABIC_VOICE_ID)
        except Exception as e:
            print(f"Error generating sentence audio: {str(e)}")
            return None

        # Extract audio data according to API documentation
        if hasattr(audio_response, "dict"):
            # Handle Pydantic model response
            response_dict = audio_response.dict()
            audio_base64 = response_dict.get("audio_base64")
            if not audio_base64:
                print("Error: No audio_base64 found in response")
                print("Response structure:", response_dict.keys())
                return None
            audio_data = base64.b64decode(audio_base64)
        elif isinstance(audio_response, dict):
            # Handle direct dictionary response
            audio_base64 = audio_response.get("audio_base64")
            if not audio_base64:
                print("Error: No audio_base64 found in response")
                print("Response structure:", audio_response.keys())
                return None
            audio_data = base64.b64decode(audio_base64)
        else:
            print(f"Unexpected response type: {type(audio_response)}")
            print("Available attributes:", dir(audio_response))
            return None

        # Validate the MP3 data
        if not validate_mp3(audio_data):
            print("Skipping upload of invalid MP3 file")
            return None

        # Save and upload the audio file using consistent path handling
        temp_audio_path = os.path.join(AUDIO_TEMP_DIR, filename)

        with open(temp_audio_path, "wb") as f:
            f.write(audio_data)

        try:
            with open(temp_audio_path, "rb") as f:
                upload_to_storage("audio", filename, f)
        except Exception as e:
            print(f"Upload failed despite retries: {str(e)}")
            return None

        os.remove(temp_audio_path)
        storage_url = f"{SUPABASE_URL}/storage/v1/object/public/audio/{filename}"

        # Process word timings from the alignment data
        word_timings = []
        alignment = None

        if hasattr(audio_response, "dict"):
            response_dict = audio_response.dict()
            alignment = response_dict.get("alignment")
        elif isinstance(audio_response, dict):
            alignment = audio_response.get("alignment")

        if not alignment:
            print("❌ No alignment data found in response")
            print("Response type:", type(audio_response))
            if hasattr(audio_response, "dict"):
                print("Response keys:", audio_response.dict().keys())
            elif isinstance(audio_response, dict):
                print("Response keys:", audio_response.keys())
            else:
                print("Available attributes:", dir(audio_response))
            raise ValueError("Missing alignment data in API response")

        print("Found alignment data")
        chars = alignment.get("characters", [])
        start_times = alignment.get("character_start_times_seconds", [])
        end_times = alignment.get("character_end_times_seconds", [])

        if not (
            chars
            and start_times
            and end_times
            and len(chars) == len(start_times) == len(end_times)
        ):
            print("❌ Invalid alignment data structure:")
            print(f"Characters: {len(chars)}")
            print(f"Start times: {len(start_times)}")
            print(f"End times: {len(end_times)}")
            raise ValueError("Invalid or missing timing data in API response")

        print(f"Processing {len(chars)} characters for timing extraction")

        current_word = ""
        current_word_start_time = None

        for i, char in enumerate(chars):
            is_word_boundary = char == " " or i == len(chars) - 1

            if is_word_boundary:
                if i == len(chars) - 1 and char != " ":
                    current_word += char

                if current_word:
                    word_end_idx = i if char == " " else i + 1
                    word_end_time = end_times[word_end_idx - 1]

                    if (
                        current_word_start_time is not None
                        and current_word_start_time < word_end_time
                    ):
                        word_timings.append(
                            {
                                "word": current_word,
                                "start_time": str(current_word_start_time),
                                "end_time": str(word_end_time),
                            }
                        )
                        print(
                            f"Added timing for word: {current_word} ({current_word_start_time:.2f}s - {word_end_time:.2f}s)"
                        )

                current_word = ""
                current_word_start_time = None
            else:
                if not current_word:
                    current_word_start_time = start_times[i]
                current_word += char

        if not word_timings:
            raise ValueError("Failed to extract any word timings from the response")

        print(f"\n✅ Successfully extracted {len(word_timings)} word timings")
        print("First few word timings:")
        for timing in word_timings[:3]:
            print(
                f"  {timing['word']}: {timing['start_time']}s - {timing['end_time']}s"
            )

        return {"url": storage_url, "word_timings": word_timings}

    except Exception as e:
        print(f"\n❌ Error generating/uploading sentence audio: {str(e)}")
        import traceback

        traceback.print_exc()
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        return None


def _normalize_arabic_word(word: str) -> str:
    """
    Normalize an Arabic word by removing all diacritics and normalizing characters.
    This is more thorough than _remove_final_haraka as it handles all positions.
    """
    # All diacritics/tashkeel
    diacritics = {
        "َ",
        "ً",
        "ُ",
        "ٌ",
        "ِ",
        "ٍ",
        "ّ",
        "ْ",  # Basic diacritics
        "ٰ",
        "ٓ",
        "ٔ",
        "ٕ",
        "ٖ",
        "ٗ",
        "٨",
        "٩",
        "ٚ",
        "ٛ",
        "ٜ",
        "ٝ",
        "ٞ",
        "ٟ",  # Extended diacritics
    }

    # Normalize characters (e.g., different forms of alef)
    char_map = {
        "أ": "ا",
        "إ": "ا",
        "آ": "ا",
        "ٱ": "ا",  # Alef forms
        "ى": "ي",  # Yeh forms
        "ة": "ه",  # Teh marbuta to heh
    }

    # Remove all diacritics
    chars = [c for c in word if c not in diacritics]

    # Normalize characters
    chars = [char_map.get(c, c) for c in chars]

    return "".join(chars)


def insert_sentence_words(
    sentence_id: int, translation: Dict, word_timings: List[Dict] = None
) -> None:
    """Insert words from a sentence with their roots and relationships."""
    word_by_word = translation.get("word_by_word", [])

    # Create a mapping of both normalized words and positions to their timings
    word_timing_map = {}
    position_timing_map = {}
    if word_timings:
        print("\nProcessing word timings:")
        for idx, timing in enumerate(word_timings):
            word = timing["word"]
            normalized_word = _normalize_arabic_word(word)
            word_timing_map[normalized_word] = {
                "start_time": timing["start_time"],
                "end_time": timing["end_time"],
            }
            position_timing_map[idx] = {
                "word": word,
                "normalized": normalized_word,
                "start_time": timing["start_time"],
                "end_time": timing["end_time"],
            }

    print(f"\nProcessing {len(word_by_word)} words for sentence...")
    for position, word in enumerate(word_by_word):
        # Extract root information
        root_letters, root_meaning = extract_root_info(word)
        root_id = get_or_create_root(root_letters, root_meaning)
        word_type_id = get_word_type_id(word.get("pos", "noun"))

        # Get or generate word audio URLs using cache
        arabic_audio_url = get_or_generate_word_audio(word["arabic"], is_arabic=True)
        english_audio_url = get_or_generate_word_audio(word["english"], is_arabic=False)

        # Clean and normalize the word form
        original_word = word["arabic"]
        cleaned_word_form = _remove_final_haraka(original_word)
        normalized_word = _normalize_arabic_word(original_word)

        # Get timing information from sentence audio if available
        timing_info = {}
        if word_timings:  # Only try to match timings if we have sentence audio
            timing_info = word_timing_map.get(normalized_word, {})
            if not timing_info and position in position_timing_map:
                timing_info = {
                    "start_time": position_timing_map[position]["start_time"],
                    "end_time": position_timing_map[position]["end_time"],
                }

        word_data = {
            "sentence_id": sentence_id,
            "position": position,
            "word_form": cleaned_word_form,
            "english": word["english"],
            "word_type_id": word_type_id,
            "root_id": root_id,
            "difficulty_level": 1,
            "grammar_note": word.get("notes"),
            "arabic_audio_url": arabic_audio_url,
            "english_audio_url": english_audio_url,
            "audio_start": timing_info.get("start_time"),
            "audio_end": timing_info.get("end_time"),
        }

        try:
            supabase.table("sentence_words").insert(word_data).execute()
            print("  ✅ Inserted into database")
        except Exception as e:
            print(f"  ❌ Error inserting into database: {str(e)}")
            raise


def insert_article_sentences(article_id: int, translations: List[Dict]) -> None:
    """Insert article sentences into the database."""
    for idx, translation in enumerate(translations):
        print(f"\nProcessing sentence {idx}: {translation['original'][:50]}...")

        # Generate audio for this individual sentence with timestamps
        audio_filename = generate_audio_filename()
        audio_result = generate_sentence_audio(translation["original"], audio_filename)
        storage_url = None
        word_timings = []

        if audio_result is not None:
            storage_url = audio_result.get("url")
            word_timings = audio_result.get("word_timings", [])

            if word_timings:
                print(f"✅ Got {len(word_timings)} word timings for sentence {idx}")
                print("Sample timings:")
                for timing in word_timings[:2]:
                    print(
                        f"  {timing['word']}: {timing['start_time']}s - {timing['end_time']}s"
                    )
            else:
                print(f"⚠️ No word timings found for sentence {idx}")

        # Insert sentence with audio URL
        sentence_data = {
            "article_id": article_id,
            "position": idx,
            "arabic": translation["original"],
            "english": translation["full_translation"],
            "audio_url": storage_url,
        }
        result = supabase.table("article_sentences").insert(sentence_data).execute()
        sentence_id = result.data[0]["id"]

        # Insert words with their individual audio and timing information from sentence audio
        insert_sentence_words(sentence_id, translation, word_timings)


def validate_article_data(data: Dict) -> None:
    """
    Validate article data before processing. Raises ValueError with detailed message if validation fails.
    """
    # 1. Check required metadata fields
    required_metadata = ["title", "summary", "difficulty_level"]
    missing_fields = [
        field for field in required_metadata if not data.get("metadata", {}).get(field)
    ]
    if missing_fields:
        raise ValueError(
            f"Missing required metadata fields: {', '.join(missing_fields)}"
        )

    # 2. Check translations array exists and is not empty
    if (
        not data.get("translations")
        or not isinstance(data["translations"], list)
        or len(data["translations"]) == 0
    ):
        raise ValueError("Article must contain at least one translation")

    # 3. Validate each translation entry
    for idx, translation in enumerate(data["translations"]):
        if not translation.get("original"):
            raise ValueError(f"Missing Arabic text in translation at position {idx}")
        if not translation.get("full_translation"):
            raise ValueError(f"Missing English translation at position {idx}")

        # 4. Validate word-by-word translations if present
        if "word_by_word" in translation:
            if not isinstance(translation["word_by_word"], list):
                raise ValueError(
                    f"word_by_word must be a list in translation at position {idx}"
                )

            for word_idx, word in enumerate(translation["word_by_word"]):
                if not word.get("arabic"):
                    raise ValueError(
                        f"Missing Arabic word in word_by_word at translation {idx}, word {word_idx}"
                    )
                if not word.get("english"):
                    raise ValueError(
                        f"Missing English translation in word_by_word at translation {idx}, word {word_idx}"
                    )

    # 5. Check difficulty level is within valid range
    difficulty = data["metadata"]["difficulty_level"]
    if not isinstance(difficulty, int) or difficulty < 1 or difficulty > 5:
        raise ValueError("Difficulty level must be an integer between 1 and 5")


def process_json_file(file_path: str) -> None:
    """Process the JSON file and insert data into Supabase."""
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Validate data before processing
    validate_article_data(data)

    # Generate content hash for idempotency
    content_hash = generate_content_hash(data)

    # Check if article already exists
    existing_article_id, existing_audio_url = check_article_exists(content_hash)

    if existing_article_id:
        print(f"Article already exists with ID: {existing_article_id}")
        # If article exists but has no audio, generate it
        if not existing_audio_url:
            print("Generating missing audio for existing article...")
            full_arabic_text = " ".join(t["original"] for t in data["translations"])
            audio_filename = generate_audio_filename()
            audio_result = generate_sentence_audio(full_arabic_text, audio_filename)
            if audio_result:
                storage_url = audio_result.get("url")
                supabase.table("articles").update({"audio_url": storage_url}).eq(
                    "id", existing_article_id
                ).execute()
                print(f"Added audio to existing article: {storage_url}")

        # Move files to archive even for existing articles
        archive_files(file_path, existing_article_id)
        return existing_article_id

    # Get category and author IDs
    category_id = get_category_id("aqeedah")  # Using aqeedah as default category
    author_id = get_author_id("Ibn Kathir")  # Using Ibn Kathir as default author

    # Prepare article data
    article_data = {
        "title": data["metadata"]["title"],
        "summary": data["metadata"]["summary"],
        "difficulty_level": data["metadata"]["difficulty_level"],
        "category_id": category_id,
        "author_id": author_id,
        "created_at": datetime.now(UTC).isoformat(),
    }

    # Only add content_hash if the column exists
    try:
        article_data["content_hash"] = content_hash
    except Exception as e:
        if "content_hash" not in str(e):
            raise e
        print("Note: content_hash column not available, skipping idempotency check")

    # Insert article
    result = supabase.table("articles").insert(article_data).execute()
    article_id = result.data[0]["id"]

    # Insert sentences and their words
    insert_article_sentences(article_id, data["translations"])

    # Move files to archive with new article ID
    archive_files(file_path, article_id)

    print(f"Successfully inserted article with ID: {article_id}")
    return article_id


def archive_files(json_path: str, article_id: int) -> None:
    """Move input and output files to archive directory with article ID as name."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    archive_dir = os.path.join(script_dir, "archive")
    os.makedirs(archive_dir, exist_ok=True)

    # Get the article directory path
    article_dir = os.path.dirname(json_path)

    # Define source and destination paths
    input_file = os.path.join(article_dir, "input.txt")
    output_file = json_path  # This is output.json

    # Define new paths in archive
    archived_input = os.path.join(archive_dir, f"{article_id}_input.txt")
    archived_output = os.path.join(archive_dir, f"{article_id}_output.json")

    # Move files if they exist
    if os.path.exists(input_file):
        shutil.move(input_file, archived_input)
        print(f"Moved input file to {archived_input}")

    if os.path.exists(output_file):
        shutil.move(output_file, archived_output)
        print(f"Moved output file to {archived_output}")


def get_category_id(name: str = "aqeedah") -> int:
    """Get category ID by name."""
    result = supabase.table("categories").select("id").eq("name", name).execute()
    if not result.data:
        raise ValueError(f"Category '{name}' not found")
    return result.data[0]["id"]


def get_author_id(name: str = "Ibn Kathir") -> int:
    """Get author ID by name."""
    result = supabase.table("authors").select("id").eq("name", name).execute()
    if not result.data:
        raise ValueError(f"Author '{name}' not found")
    return result.data[0]["id"]


def get_or_create_root(letters: str, meaning: Optional[str] = None) -> int:
    """Get existing root or create a new one."""
    # Clean up letters (remove extra spaces)
    letters = " ".join(letters.split())

    # Check if root exists
    result = supabase.table("roots").select("id").eq("letters", letters).execute()
    if result.data:
        return result.data[0]["id"]

    # Create new root
    root_data = {"letters": letters, "meaning": meaning}
    result = supabase.table("roots").insert(root_data).execute()
    return result.data[0]["id"]


def get_word_type_id(pos: str) -> int:
    """Get word type ID from POS."""
    word_type_id = WORD_TYPE_MAPPING.get(pos.lower())
    if word_type_id is None:
        # Default to noun if POS not found
        return WORD_TYPE_MAPPING["noun"]
    return word_type_id


def extract_root_info(word: Dict) -> tuple[str, Optional[str]]:
    """Extract root information from a word."""
    # If root is directly specified, use it
    if word.get("root"):
        return word["root"], word.get("notes")

    # If no root is specified, create one based on the word form
    # For Arabic words, we'll use the word form itself as the root
    # This is a simplification but ensures we meet the not-null constraint
    return word["arabic"], f"Auto-generated root for: {word['english']}"


def main():
    """Main function to run the script."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    articles_dir = os.path.join(script_dir, "article")

    if not os.path.exists(articles_dir):
        print(f"Error: Could not find articles directory at {articles_dir}")
        return

    # Get all json files in the articles directory
    json_files = []

    # Check for output.json directly in the articles directory
    direct_output_json = os.path.join(articles_dir, "output.json")
    if os.path.exists(direct_output_json):
        json_files.append(direct_output_json)

    # Also check subdirectories
    for item in os.listdir(articles_dir):
        item_path = os.path.join(articles_dir, item)
        if os.path.isdir(item_path):  # If it's a directory
            output_json = os.path.join(item_path, "output.json")
            if os.path.exists(output_json):
                json_files.append(output_json)

    if not json_files:
        print("No article output.json files found in the articles directory")
        return

    success_count = 0
    error_count = 0

    for json_path in json_files:
        try:
            print(f"\nProcessing {json_path}...")
            process_json_file(json_path)
            success_count += 1
            print(f"Successfully processed {json_path}")
        except Exception as e:
            error_count += 1
            print(f"Error processing {json_path}: {str(e)}")

    print("\nProcessing complete!")
    print(f"Successfully processed: {success_count} articles")
    if error_count > 0:
        print(f"Failed to process: {error_count} articles")


if __name__ == "__main__":
    main()
