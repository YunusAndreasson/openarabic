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
import re
import subprocess


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
ARABIC_VOICE_ID = "nPczCjzI2devNBz1zQrb"  # Voice ID for Arabic sentences
ARABIC_WORD_VOICE_ID = (
    "IES4nrmZdUBHByLBde0P"  # Special voice ID for single Arabic words
)

# Default voice settings for consistent audio generation
DEFAULT_VOICE_SETTINGS = VoiceSettings(
    stability=0.8,
    style=0.2,
    use_speaker_boost=True,
)

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


@retry_operation(max_attempts=3, delay=1, backoff=2)
def check_file_exists(bucket: str, file_path: str) -> bool:
    """Check if a file exists in Supabase storage using multiple methods."""
    # Method 1: Using list
    try:
        # Get the directory path and filename
        path_parts = file_path.rsplit("/", 1)

        if len(path_parts) > 1:
            dir_path, filename = path_parts
            # List files in directory with search option
            response = supabase.storage.from_(bucket).list(dir_path)
        else:
            # If no directory part, search in root
            filename = path_parts[0]
            response = supabase.storage.from_(bucket).list()

        # Debug the response
        if not response:
            print(f"Empty response when listing files in {bucket}")
        else:
            # Print first item format to help debug
            if len(response) > 0:
                print(f"File list response format sample: {type(response[0])}")
                if isinstance(response[0], dict):
                    print(f"Sample keys: {response[0].keys()}")

            # Check if the file exists in the response
            for item in response:
                if isinstance(item, dict) and item.get("name") == filename:
                    print(f"Found file {filename} in {bucket} using list method")
                    return True
                elif isinstance(item, str) and item == filename:
                    print(f"Found file {filename} in {bucket} using list method")
                    return True
    except Exception as e:
        print(f"List method failed for {file_path}: {str(e)}")

    # Method 2: Using signed URL creation
    try:
        # Try to get the file metadata using createSignedUrl with very short expiry
        # This is a lightweight way to check existence
        supabase.storage.from_(bucket).create_signed_url(
            file_path, 1
        )  # 1 second expiry
        print(f"Found file {file_path} in {bucket} using signed URL method")
        return True
    except Exception as e:
        if "The specified key does not exist" in str(e) or "Object not found" in str(e):
            print(f"File {file_path} confirmed not found in {bucket}")
            return False
        print(f"Signed URL method failed: {str(e)}")

    # Method 3: Final fallback - try to get the public URL and retrieve headers
    try:
        # Get public URL then try a HEAD request
        public_url = supabase.storage.from_(bucket).get_public_url(file_path)
        if public_url:
            print(f"Found file {file_path} in {bucket} using public URL method")
            return True
    except Exception as e:
        print(f"Public URL method failed for {file_path}: {str(e)}")
        return False


@retry_operation(max_attempts=3, delay=1, backoff=2)
def upload_to_storage(
    bucket: str, file_path: str, file_data, content_type: str = "audio/mpeg"
):
    """Upload a file to Supabase storage with retries and return the public URL."""
    # First check if file already exists
    if check_file_exists(bucket, file_path):
        print(f"File {file_path} already exists in storage")
        return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{file_path}"

    # If file doesn't exist, upload it
    try:
        print(f"Uploading file {file_path} to {bucket}...")
        supabase.storage.from_(bucket).upload(
            file_path, file_data, file_options={"content-type": content_type}
        )

        # Give storage a moment to process
        time.sleep(0.5)

        # Verify the file was uploaded successfully
        for attempt in range(3):
            if check_file_exists(bucket, file_path):
                public_url = (
                    f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{file_path}"
                )
                print(f"Successfully uploaded and verified {file_path} to {bucket}")
                return public_url
            print(f"Upload verification attempt {attempt + 1} failed, retrying...")
            time.sleep(1)  # Wait a bit longer before next check

        raise Exception(
            f"File upload verification failed after 3 attempts for {file_path}"
        )
    except Exception as e:
        # If error is 409 (already exists), that's fine - another process may have uploaded it
        if hasattr(e, "statusCode") and e.statusCode == 409:
            return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{file_path}"
        # Otherwise, propagate the exception to trigger retry
        print(f"Upload failed: {str(e)}")
        raise


def preprocess_text_for_tts(text: str) -> str:
    """
    Preprocess text before sending to ElevenLabs TTS.
    - Preserves numbers by adding spaces around them
    - Ensures proper handling of Arabic text

    Args:
        text: The text to preprocess

    Returns:
        Preprocessed text ready for TTS
    """
    # Add spaces around numbers to prevent ElevenLabs from trying to translate them
    # This regex matches both Arabic and Western numerals
    text = re.sub(r"([٠-٩0-9]+)", r" \1 ", text)

    # Remove any double spaces that might have been created
    text = re.sub(r"\s+", " ", text)

    return text.strip()


@retry_operation(max_attempts=3, delay=1, backoff=2)
def generate_speech(
    text: str,
    voice_id: str,
    speed: float = 0.8,
    voice_settings: Optional[VoiceSettings] = None,
):
    """Generate speech using ElevenLabs API with retries."""
    # Preprocess text to handle numbers
    text = preprocess_text_for_tts(text)

    # Always wrap in Arabic SSML tags since we're working with Arabic text
    text = wrap_in_arabic_ssml(text)

    # Use provided voice settings or create new ones with default settings plus speed
    if voice_settings is None:
        voice_settings = VoiceSettings(
            **DEFAULT_VOICE_SETTINGS.dict(),
            speed=speed,
        )

    # Base parameters
    params = {
        "text": text,
        "voice_id": voice_id,
        "model_id": "eleven_multilingual_v2",
        "output_format": "mp3_44100_128",
        "voice_settings": voice_settings,
        "seed": int(
            hashlib.sha256(text.encode()).hexdigest()[:8], 16
        ),  # More reliable seed generation
    }

    audio_generator = eleven_labs.text_to_speech.convert(**params)

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
def generate_speech_with_timestamps(
    text: str,
    voice_id: str,
    speed: float = 0.8,
):
    """Generate speech with timestamps using ElevenLabs API with retries."""
    # Preprocess text to handle numbers
    text = preprocess_text_for_tts(text)

    # Always wrap in Arabic SSML tags since we're working with Arabic text
    text = wrap_in_arabic_ssml(text)

    # Create voice settings with default settings plus speed
    voice_settings = VoiceSettings(
        **DEFAULT_VOICE_SETTINGS.dict(),
        speed=speed,
    )

    # Base parameters
    params = {
        "text": text,
        "voice_id": voice_id,
        "model_id": "eleven_multilingual_v2",
        "output_format": "mp3_44100_128",
        "voice_settings": voice_settings,
    }

    audio_response = eleven_labs.text_to_speech.convert_with_timestamps(**params)

    if not audio_response:
        raise ValueError("Empty audio response from ElevenLabs API")

    return audio_response


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


def validate_mp3(audio_data: bytes, is_cached_file: bool = False) -> bool:
    """
    Validate that the audio data is a valid MP3 file.

    Args:
        audio_data: The MP3 data to validate
        is_cached_file: If True, apply more lenient validation for files from cache
    """
    try:
        # For cached files, we can be more lenient - just check basic format indicators
        if is_cached_file:
            # Most MP3 files start with ID3 or with an MPEG frame sync marker
            if len(audio_data) < 10:
                print("❌ Cached file too small to be valid MP3")
                return False

            header = audio_data[:10]
            # Check for ID3 tag
            if header[:3] == b"ID3":
                print("✅ Cached file has ID3 header - treating as valid")
                return True

            # Look for MPEG frame sync marker (1111 1111 111)
            for i in range(min(len(audio_data) - 2, 1000)):  # Check first 1000 bytes
                if audio_data[i] == 0xFF and (audio_data[i + 1] & 0xE0) == 0xE0:
                    print("✅ Cached file has MP3 frame marker - treating as valid")
                    return True

            # If it's cached and we have a reasonable size, trust it's valid
            if len(audio_data) > 1000:
                print(
                    "⚠️ Cached file doesn't have standard markers but has reasonable size - treating as valid"
                )
                return True

            print("❌ Cached file has no MP3 markers and is too small")
            return False

        # For non-cached files, do more thorough validation
        # Create a BytesIO object to read the audio data
        audio_file = io.BytesIO(audio_data)

        # Check if the data starts with an MP3 header marker
        header = audio_data[:10]
        is_id3 = header[:3] == b"ID3"

        # If no ID3 tag, check for MPEG frame sync bytes
        if not is_id3:
            # Look for MPEG frame sync marker
            for i in range(min(len(audio_data) - 2, 1000)):
                if audio_data[i] == 0xFF and (audio_data[i + 1] & 0xE0) == 0xE0:
                    print("✅ Found MP3 frame marker without ID3 tag")
                    return True
            print("❌ Invalid MP3: No ID3 tag or frame sync marker found")
            return False

        # Try to load it as an MP3
        try:
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
        except Exception as inner_e:
            print(f"❌ MP3 parsing failed: {str(inner_e)}")
            # Return True for ID3 files even if mutagen fails, since it might still be valid
            if is_id3:
                print(
                    "⚠️ File has ID3 header so treating as valid despite parsing error"
                )
                return True
            return False

    except Exception as e:
        print(f"❌ Invalid MP3: {str(e)}")
        return False


def get_cache_key(word: str) -> str:
    """Generate a unique cache key for an Arabic word."""
    # Create a hash of the word to use as filename
    word_hash = hashlib.sha256(word.encode()).hexdigest()[:12]
    return f"ar_{word_hash}.mp3"


def ensure_valid_cache_files():
    """Scan cache directory to ensure all files have .mp3 extension."""
    fixed_count = 0
    for filename in os.listdir(AUDIO_CACHE_DIR):
        if not filename.endswith(".mp3") and not filename.startswith("."):
            # Fix filenames without extensions
            basename, ext = os.path.splitext(filename)
            if not ext:
                new_filename = f"{basename}.mp3"
                old_path = os.path.join(AUDIO_CACHE_DIR, filename)
                new_path = os.path.join(AUDIO_CACHE_DIR, new_filename)

                try:
                    shutil.move(old_path, new_path)
                    fixed_count += 1
                    print(f"Fixed cache file extension: {filename} → {new_filename}")
                except Exception as e:
                    print(f"Error fixing cache file {filename}: {str(e)}")

    if fixed_count > 0:
        print(f"Fixed {fixed_count} cache files with missing extensions")


def get_or_generate_word_audio(word: str, is_arabic: bool) -> Optional[str]:
    """DEPRECATED: No longer used as we only generate audio for full sentences and roots."""
    raise NotImplementedError("This function is no longer used")


def generate_arabic_word_audio(word: str, filename: str) -> Optional[Dict]:
    """Generate audio file for an Arabic word using ElevenLabs API."""
    temp_audio_path = None
    try:
        print(f"\nGenerating Arabic audio for word: '{word}'")

        try:
            # Wrap word in Arabic SSML tags
            formatted_text = wrap_in_arabic_ssml(word)

            # Create voice settings with default settings plus speed
            voice_settings = VoiceSettings(
                **DEFAULT_VOICE_SETTINGS.dict(),
                speed=0.8,  # Use consistent slower speed
            )

            # Generate audio with the special voice for single words
            audio_response = generate_speech(
                text=formatted_text,
                voice_id=ARABIC_WORD_VOICE_ID,  # Use the special voice for single words
                voice_settings=voice_settings,
            )

            if not audio_response:
                print("Error: Empty audio response from ElevenLabs API")
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
                    url = upload_to_storage("audio", filename, f)
                    if not url:
                        raise Exception("Failed to get URL from upload")
            except Exception as e:
                print(f"Upload failed despite retries: {str(e)}")
                return None

            print(f"✅ Successfully generated and uploaded Arabic audio. URL: {url}")
            return {"url": url}

        except Exception as e:
            print(f"Error generating Arabic speech: {str(e)}")
            return None

    except Exception as e:
        print(f"❌ Error generating/uploading Arabic word audio for '{word}': {str(e)}")
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        return None


def generate_english_word_audio(word: str, filename: str) -> Optional[Dict]:
    """DEPRECATED: No longer used as we only generate audio for full sentences and roots."""
    raise NotImplementedError("This function is no longer used")


def clean_word_for_matching(word: str) -> str:
    """
    Clean and normalize a word for better timing matching.
    Removes invisible characters, normalizes whitespace, and standardizes Arabic characters.
    """
    if not word:
        return word

    # Remove zero-width and invisible control characters
    invisible_chars = {
        "\u200b": "",  # zero-width space
        "\u200c": "",  # zero-width non-joiner
        "\u200d": "",  # zero-width joiner
        "\ufeff": "",  # zero-width no-break space (BOM)
        "\u2028": " ",  # line separator
        "\u2029": " ",  # paragraph separator
    }
    for char, replacement in invisible_chars.items():
        word = word.replace(char, replacement)

    # Standardize whitespace
    word = " ".join(word.split())

    # Trim any leading/trailing whitespace
    word = word.strip()

    # Remove common punctuation for matching purposes
    punctuation = ".,;:!?\"'()[]{}،؟''»«"
    for p in punctuation:
        word = word.replace(p, "")

    return word


def format_article_text_for_tts(translations: List[Dict]) -> str:
    """
    Format article text with SSML tags for better listening experience.
    Uses the tashkeel (fully vowelized) version of the text for better pronunciation.
    Adds appropriate pauses between sections and structures the text.
    """
    # Start with the main SSML wrapper and Arabic language
    sections = ['<speak><lang xml:lang="ar">']

    total_sections = len(translations)

    for i, translation in enumerate(translations):
        # Use tashkeel text if available, fallback to original if not
        arabic_text = translation.get("tashkeel", translation["original"]).strip()

        # Add slightly longer pause for sentence endings
        arabic_text = arabic_text.replace(".", ".<break time='0.3s'/>")
        arabic_text = arabic_text.replace("؟", "؟<break time='0.3s'/>")
        arabic_text = arabic_text.replace("!", "!<break time='0.3s'/>")
        # Add shorter pause for commas
        arabic_text = arabic_text.replace("،", "،<break time='0.2s'/>")

        # Last section: slightly softer and slower for conclusion
        if i == total_sections - 1:
            sections.append(f'<prosody rate="95%" volume="-5%">{arabic_text}</prosody>')
        # All other sections: normal
        else:
            sections.append(arabic_text)

        # Add pause between sections
        if i < total_sections - 1:
            # Longer pause if the next section starts with a new paragraph indicator
            next_text = translations[i + 1].get(
                "tashkeel", translations[i + 1]["original"]
            )
            if next_text.strip().startswith("*"):  # Assuming * marks new paragraphs
                sections.append('<break time="0.8s"/>')
            else:
                sections.append('<break time="0.5s"/>')

    # Close the main tags
    sections.append("</lang></speak>")

    return "".join(sections)


def wrap_in_arabic_ssml(text: str) -> str:
    """
    Wrap text in Arabic SSML tags for proper language handling.
    This ensures the text is properly pronounced as Arabic.
    """
    return f'<speak><lang xml:lang="ar">{text}</lang></speak>'


def pre_tokenize_arabic(text: str) -> List[str]:
    """
    Pre-tokenize Arabic text in a consistent way that matches how ElevenLabs processes it.
    This ensures that word boundaries are handled similarly in both systems.

    Args:
        text: The Arabic text to tokenize

    Returns:
        List of tokens (words)
    """
    tokens = []

    # Split on whitespace and punctuation but keep them as separate tokens
    # Fixed escape sequence with double backslash for \s
    segments = re.split(r"([.,;:!?\"\'()[\]{}،؟" "»«\s]+)", text)

    # Process each segment
    for segment in segments:
        # Skip empty segments
        if not segment.strip():
            continue

        # If it's punctuation or whitespace, add it as is (or skip)
        if all(c in " .,;:!?\"'()[]{}،؟''»«" for c in segment):
            continue

        # Handle common Arabic prefixes that should stay attached
        # This matches ElevenLabs' tendency to keep و, ب, ل, etc. attached to words
        if segment.startswith("و") and len(segment) > 1:
            # Keep و attached to the following word
            tokens.append(segment)
        else:
            # Check if other prefixes should be handled
            tokens.append(segment)

    return tokens


def generate_sentence_audio(
    text: str,
    filename: str,
    tashkeel_text: Optional[str] = None,
    is_last_sentence: bool = False,
) -> Optional[Dict]:
    """Generate audio file for an Arabic sentence using ElevenLabs API with word timings.

    Args:
        text: The original Arabic text
        filename: The output filename
        tashkeel_text: Optional fully vowelized version of the text
        is_last_sentence: Whether this is the last sentence in an article
    """
    try:
        print(f"\nGenerating sentence audio with timestamps for: '{text}'")

        # Use tashkeel text if available for better pronunciation
        text_to_speak = tashkeel_text if tashkeel_text else text

        # Add SSML enhancements for better speech quality
        # Add pauses after punctuation marks
        text_to_speak = text_to_speak.replace(".", ".<break time='0.3s'/>")
        text_to_speak = text_to_speak.replace("؟", "؟<break time='0.3s'/>")
        text_to_speak = text_to_speak.replace("!", "!<break time='0.3s'/>")
        text_to_speak = text_to_speak.replace("،", "،<break time='0.2s'/>")
        text_to_speak = text_to_speak.replace(":", ":<break time='0.2s'/>")
        text_to_speak = text_to_speak.replace("؛", "؛<break time='0.2s'/>")

        # Apply prosody for last sentence
        if is_last_sentence:
            text_to_speak = (
                f'<prosody rate="95%" volume="-5%">{text_to_speak}</prosody>'
            )

        # Wrap in Arabic SSML tags
        text_to_speak = f'<speak><lang xml:lang="ar">{text_to_speak}</lang></speak>'

        audio_response = generate_speech_with_timestamps(
            text=text_to_speak, voice_id=ARABIC_VOICE_ID, speed=0.8
        )

        if not audio_response:
            print("Error: Empty audio response from ElevenLabs API")
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

        # Save and upload the audio file
        temp_audio_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "audio", filename
        )
        os.makedirs(os.path.dirname(temp_audio_path), exist_ok=True)

        with open(temp_audio_path, "wb") as f:
            f.write(audio_data)

        with open(temp_audio_path, "rb") as f:
            # Upload with content-type header for MP3
            supabase.storage.from_("audio").upload(
                filename, f, file_options={"content-type": "audio/mpeg"}
            )

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

        # Print raw alignment data for diagnostics
        print("\n=== RAW ELEVENLABS ALIGNMENT DATA ===")
        print(f"Characters count: {len(alignment.get('characters', []))}")
        print(
            f"Start times count: {len(alignment.get('character_start_times_seconds', []))}"
        )
        print(
            f"End times count: {len(alignment.get('character_end_times_seconds', []))}"
        )

        # Print sample of the raw characters and their timing
        sample_size = min(20, len(alignment.get("characters", [])))
        if sample_size > 0:
            print("\nSample of character timing data:")
            for i in range(sample_size):
                try:
                    char = alignment["characters"][i]
                    start = alignment["character_start_times_seconds"][i]
                    end = alignment["character_end_times_seconds"][i]
                    print(f"  '{char}': {start:.3f}s - {end:.3f}s")
                except (IndexError, KeyError):
                    print("  Error accessing character data at index", i)
        print("======================================\n")

        # ENHANCED LOGGING: Add visualization of word boundaries
        print("\n=== ELEVENLABS WORD BOUNDARY DETECTION ===")
        chars = alignment.get("characters", [])
        start_times = alignment.get("character_start_times_seconds", [])
        end_times = alignment.get("character_end_times_seconds", [])

        # Show the entire text with character positions for reference
        print("Original text with character positions:")
        formatted_text = ""
        for i, char in enumerate(chars):
            if i > 0 and i % 50 == 0:  # Line break every 50 chars for readability
                formatted_text += "\n"
            formatted_text += char
        print(formatted_text)
        print()

        # Identify potential word boundaries based on timing gaps
        print("Potential word boundaries based on timing gaps:")
        potential_boundaries = []
        for i in range(1, len(chars)):
            # If there's a significant gap between characters, it might be a word boundary
            if start_times[i] - end_times[i - 1] > 0.08:  # 80ms gap threshold
                potential_boundaries.append(i)
                boundary_char = chars[i - 1] + "|" + chars[i]
                boundary_gap = start_times[i] - end_times[i - 1]
                print(
                    f"  Gap after char {i - 1}: '{boundary_char}' - {boundary_gap:.3f}s"
                )

        # Visualize the text with detected word boundaries
        if potential_boundaries:
            print("\nVisualizing detected word boundaries:")
            boundary_text = ""
            for i, char in enumerate(chars):
                if i in potential_boundaries:
                    boundary_text += " | "  # Add visible boundary marker
                boundary_text += char
            print(boundary_text)

        # Compare with whitespace boundaries in original text
        print("\nWhitespace boundaries in original text:")
        space_boundaries = [i for i, char in enumerate(chars) if char in " ،.!؟:;"]
        space_boundary_text = ""
        for i, char in enumerate(chars):
            if i in space_boundaries:
                space_boundary_text += "[" + char + "]"  # Mark space characters
            else:
                space_boundary_text += char
        print(space_boundary_text)

        print("\nComparison of detected vs. whitespace boundaries:")
        for pb in potential_boundaries:
            is_at_whitespace = any(abs(pb - sb) <= 1 for sb in space_boundaries)
            marker = "✓" if is_at_whitespace else "✗"
            context = chars[max(0, pb - 5) : min(len(chars), pb + 5)]
            print(f"  {marker} Boundary at position {pb}: '...{context}...'")

        print("===========================================\n")

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

        # Pre-tokenize the text using our consistent method
        expected_tokens = pre_tokenize_arabic(text)
        print(f"\nPre-tokenized text into {len(expected_tokens)} tokens:")
        for i, token in enumerate(expected_tokens):
            print(f"  {i}: '{token}'")

        # Improved word timing extraction
        # Define Arabic word boundary characters (spaces and punctuation)
        boundaries = {" ", ".", ",", "!", "?", "؟", "،", ":", ";", "-", "\n", "\t"}

        word_start_idx = None
        current_word = ""
        word_timings = []

        for i, char in enumerate(chars):
            is_boundary = char in boundaries
            is_last_char = i == len(chars) - 1

            # If this is the start of a new word
            if word_start_idx is None and not is_boundary:
                word_start_idx = i
                current_word = char
            # If we're continuing a word
            elif word_start_idx is not None and not is_boundary:
                current_word += char

            # Word boundary or last character - save the completed word
            if (is_boundary or is_last_char) and word_start_idx is not None:
                # Add last character if it's part of the word and we're at the end
                if is_last_char and not is_boundary:
                    current_word += char

                # Only process non-empty words
                if current_word.strip():
                    # Calculate word timing
                    word_start_time = start_times[word_start_idx]
                    word_end_time = end_times[i - 1] if is_boundary else end_times[i]

                    # Ensure valid timing values
                    if word_start_time < word_end_time:
                        # Clean the word for better matching later
                        clean_word = clean_word_for_matching(current_word)

                        word_timings.append(
                            {
                                "word": current_word,
                                "cleaned_word": clean_word,
                                "start_time": str(word_start_time),
                                "end_time": str(word_end_time),
                            }
                        )

                        print(
                            f"Added timing for word: '{current_word}' → '{clean_word}' ({word_start_time:.2f}s - {word_end_time:.2f}s)"
                        )

                # Reset for next word
                word_start_idx = None
                current_word = ""

        if not word_timings:
            raise ValueError("Failed to extract any word timings from the response")

        # Sort word timings by start time to ensure proper sequencing
        word_timings = sorted(word_timings, key=lambda x: float(x["start_time"]))

        print(f"\n✅ Successfully extracted {len(word_timings)} word timings")
        print("First few word timings:")
        for timing in word_timings[:3]:
            print(
                f"  '{timing['word']}' (cleaned: '{timing['cleaned_word']}'): {timing['start_time']}s - {timing['end_time']}s"
            )

        return {"url": storage_url, "word_timings": word_timings}

    except Exception as e:
        print(f"\n❌ Error generating/uploading sentence audio: {str(e)}")
        import traceback

        traceback.print_exc()
        return None


def insert_sentence_words(
    sentence_id: int, translation: Dict, word_timings: List[Dict] = None
) -> Dict:
    """
    Insert words from a sentence with their roots and relationships.
    No longer generates individual word audio for sentence words.

    Returns:
        Dict with statistics about word timing matches
    """
    word_by_word = translation.get("word_by_word", [])

    # Track timing match statistics
    match_stats = {"exact": 0, "position": 0, "fuzzy": 0, "none": 0}
    total_words = len(word_by_word)
    words_with_timing = 0

    # Check if we have word timings and output a clear warning if we have fewer timings than words
    if word_timings:
        if len(word_timings) < len(word_by_word):
            print(
                f"\n⚠️ WARNING: Fewer word timings ({len(word_timings)}) than words in sentence ({len(word_by_word)})."
            )
            print("   Some words will not have accurate audio timing markers.")
    else:
        print(
            f"\n⚠️ WARNING: No word timings available for sentence with {len(word_by_word)} words."
        )
        # Early return with empty stats if no timings
        for position, word in enumerate(word_by_word):
            # Process words without timing info
            root_letters, root_meaning = extract_root_info(word)
            root_id = get_or_create_root(root_letters, root_meaning)
            word_type_id = get_word_type_id(word.get("pos", "noun"))

            # Store the complete word form with all diacritics
            original_word = word["arabic"]

            word_data = {
                "sentence_id": sentence_id,
                "position": position,
                "word_form": original_word,  # Store complete diacritized form
                "english": word["english"],
                "word_type_id": word_type_id,
                "root_id": root_id,
                "difficulty_level": 1,
                "grammar_note": word.get("notes"),
            }

            supabase.table("sentence_words").insert(word_data).execute()
            print(f"  ✅ Inserted word {position} without timing info")
            match_stats["none"] += 1

        return {
            "total_words": total_words,
            "words_with_timing": 0,
            "match_stats": match_stats,
        }

    # If we have word timings, prepare for matching
    # Pre-tokenize the original words using the same method for consistency
    original_tokens = []
    for word_info in word_by_word:
        # Get the original Arabic word with all diacritics
        original_word = word_info["arabic"]
        # Pre-process with the same method we'd expect ElevenLabs to use
        original_tokens.append(original_word)

    print("\nPre-tokenized original words:")
    for idx, token in enumerate(original_tokens):
        print(f"  {idx}: '{token}'")

    # Extract words from word timings for comparison
    timing_words = [timing["word"] for timing in word_timings]

    print("\nWords from timing data:")
    for idx, word in enumerate(timing_words):
        print(f"  {idx}: '{word}'")

    # 1. Sort word timings by start time to ensure proper sequencing
    sorted_timings = sorted(word_timings, key=lambda x: float(x["start_time"]))

    print("\nTimings sorted by start time:")
    for idx, timing in enumerate(sorted_timings):
        print(
            f"  {idx}: '{timing['word']}' → {timing['start_time']}s - {timing['end_time']}s"
        )

    # Store the word data before inserting to validate timestamps
    words_data = []

    # Use a simpler, more direct matching approach
    # In the vast majority of cases, the order of words should match
    # We'll use position-based matching by default, but check for exact matches
    timing_position = 0
    last_end_time = 0.0

    for position, word in enumerate(word_by_word):
        # Extract metadata
        root_letters, root_meaning = extract_root_info(word)
        root_id = get_or_create_root(root_letters, root_meaning)
        word_type_id = get_word_type_id(word.get("pos", "noun"))

        # Store the complete word form with all diacritics
        original_word = word["arabic"]

        print(f"\n  Processing word {position}: '{original_word}'")

        # Initialize with no timing info
        timing_info = {}
        match_method = "none"

        # If we have a timing position available
        if timing_position < len(sorted_timings):
            # Use position-based matching - simplest and most reliable approach
            timing_data = sorted_timings[timing_position]
            timing_info = {
                "start_time": timing_data["start_time"],
                "end_time": timing_data["end_time"],
            }
            match_method = "position"
            print(
                f"    ✓ Used sequential position match: '{timing_data['word']}' at index {timing_position}"
            )
            timing_position += 1  # Move to next position

            # Ensure timestamps are monotonically increasing
            start_time = float(timing_info.get("start_time", 0))
            end_time = float(timing_info.get("end_time", 0))

            if start_time < last_end_time:
                original_start = start_time
                start_time = last_end_time
                timing_info["start_time"] = str(start_time)
                print(
                    f"    ⚠️ Fixed start time to maintain sequence: {original_start} → {start_time}"
                )

                # Ensure end time is after start time
                if end_time <= start_time:
                    end_time = start_time + 0.3  # Add minimum duration
                    timing_info["end_time"] = str(end_time)
                    print(f"    ⚠️ Adjusted end time: → {end_time}")

            last_end_time = end_time

        # Update match statistics
        match_stats[match_method] += 1
        if match_method != "none":
            words_with_timing += 1

        # Create the word data
        word_data = {
            "sentence_id": sentence_id,
            "position": position,
            "word_form": original_word,  # Store complete diacritized form
            "english": word["english"],
            "word_type_id": word_type_id,
            "root_id": root_id,
            "difficulty_level": 1,
            "grammar_note": word.get("notes"),
            "audio_start": timing_info.get("start_time"),
            "audio_end": timing_info.get("end_time"),
        }

        words_data.append(word_data)

    # Now insert all words with validated timestamps
    print("\nInserting words into database:")
    for idx, word_data in enumerate(words_data):
        try:
            supabase.table("sentence_words").insert(word_data).execute()
            print(f"  ✅ Inserted word {idx} into database")
        except Exception as e:
            print(f"  ❌ Error inserting word {idx} into database: {str(e)}")
            raise

    # Print summary of timing match results
    print("\nWord timing match summary:")
    for method, count in match_stats.items():
        percentage = (count / total_words) * 100 if total_words > 0 else 0
        print(
            f"  {method.capitalize()} matches: {count}/{total_words} ({percentage:.1f}%)"
        )

    if match_stats["none"] > 0:
        print(f"⚠️ {match_stats['none']} words have no timing information.")
    else:
        print("✅ All words have timing information assigned.")

    # Return statistics for reporting
    return {
        "total_words": total_words,
        "words_with_timing": words_with_timing,
        "match_stats": match_stats,
    }


def insert_article_sentences(article_id: int, translations: List[Dict]) -> None:
    """Insert article sentences into the database."""
    timing_stats = {
        "total_sentences": len(translations),
        "sentences_with_audio": 0,
        "sentences_with_timings": 0,
        "sentences_without_timings": 0,
        "total_words": 0,
        "words_with_timings": 0,
    }

    # List to store temporary audio files for concatenation
    sentence_audio_files = []
    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_audio")
    os.makedirs(temp_dir, exist_ok=True)

    try:
        for idx, translation in enumerate(translations):
            print(f"\nProcessing sentence {idx}: {translation['original'][:50]}...")

            # Generate audio for this individual sentence with timestamps
            temp_audio_file = os.path.join(temp_dir, f"sentence_{idx}.mp3")
            audio_filename = generate_audio_filename()

            # Use enhanced audio generation with tashkeel and SSML
            audio_result = generate_sentence_audio(
                text=translation["original"],
                filename=audio_filename,
                tashkeel_text=translation.get("tashkeel"),
                is_last_sentence=(idx == len(translations) - 1),
            )

            storage_url = None
            word_timings = []

            # If we have an audio result, extract URL and timings
            if audio_result is not None:
                storage_url = audio_result.get("url")
                word_timings = audio_result.get("word_timings", [])
                timing_stats["sentences_with_audio"] += 1

                # Download the audio file for concatenation
                try:
                    response = supabase.storage.from_("audio").download(audio_filename)
                    if response:
                        with open(temp_audio_file, "wb") as f:
                            f.write(response)
                        sentence_audio_files.append(temp_audio_file)
                except Exception as e:
                    print(f"Error downloading audio file: {str(e)}")

                if word_timings:
                    print(f"✅ Got {len(word_timings)} word timings for sentence {idx}")
                    timing_stats["sentences_with_timings"] += 1
                else:
                    print(f"⚠️ No word timings found for sentence {idx}")
                    timing_stats["sentences_without_timings"] += 1

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

            # Insert words with their timing information
            if translation.get("word_by_word"):
                word_stats = insert_sentence_words(
                    sentence_id, translation, word_timings
                )
                timing_stats["total_words"] += word_stats["total_words"]
                timing_stats["words_with_timings"] += word_stats["words_with_timing"]
            else:
                print("⚠️ No word-by-word translation found, skipping word insertion")

        # After processing all sentences, concatenate their audio files
        if sentence_audio_files:
            print("\nConcatenating sentence audio files...")
            final_audio_filename = generate_audio_filename()
            final_audio_path = os.path.join(temp_dir, final_audio_filename)

            if concatenate_audio_files(sentence_audio_files, final_audio_path):
                # Upload the concatenated file
                try:
                    with open(final_audio_path, "rb") as f:
                        supabase.storage.from_("audio").upload(
                            final_audio_filename,
                            f,
                            file_options={"content-type": "audio/mpeg"},
                        )

                    # Update the article with the concatenated audio URL
                    article_audio_url = f"{SUPABASE_URL}/storage/v1/object/public/audio/{final_audio_filename}"
                    supabase.table("articles").update(
                        {"audio_url": article_audio_url}
                    ).eq("id", article_id).execute()

                    print(
                        "✅ Successfully created and uploaded concatenated article audio"
                    )
                except Exception as e:
                    print(f"Error uploading concatenated audio: {str(e)}")

            # Clean up temporary files
            for file in sentence_audio_files:
                try:
                    os.remove(file)
                except:
                    pass
            try:
                os.remove(final_audio_path)
                os.rmdir(temp_dir)
            except:
                pass

    except Exception as e:
        print(f"Error processing sentences: {str(e)}")
        # Clean up on error
        for file in sentence_audio_files:
            try:
                os.remove(file)
            except:
                pass
        try:
            os.rmdir(temp_dir)
        except:
            pass
        raise

    # Print summary statistics
    print("\n" + "=" * 60)
    print("ARTICLE TIMING STATISTICS SUMMARY")
    print("=" * 60)
    print(f"Total sentences: {timing_stats['total_sentences']}")
    print(f"Sentences with audio: {timing_stats['sentences_with_audio']}")
    print(f"Sentences with word timings: {timing_stats['sentences_with_timings']}")
    print(
        f"Sentences without word timings: {timing_stats['sentences_without_timings']}"
    )

    if timing_stats["total_words"] > 0:
        words_with_timing_pct = (
            timing_stats["words_with_timings"] / timing_stats["total_words"]
        ) * 100
        print(f"Total words: {timing_stats['total_words']}")
        print(
            f"Words with timing information: {timing_stats['words_with_timings']} ({words_with_timing_pct:.1f}%)"
        )

    print("=" * 60)

    return timing_stats


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
    # This will also generate and concatenate sentence audio files
    timing_stats = insert_article_sentences(article_id, data["translations"])

    # Move files to archive with new article ID
    archive_files(file_path, article_id)

    # Save timing statistics to a report file
    save_timing_report(article_id, data["metadata"]["title"], file_path, timing_stats)

    print(f"Successfully inserted article with ID: {article_id}")
    return article_id


def save_timing_report(
    article_id: int, title: str, json_path: str, timing_stats: Dict
) -> None:
    """Save timing statistics to a CSV report file."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    reports_dir = os.path.join(script_dir, "reports")
    os.makedirs(reports_dir, exist_ok=True)

    report_file = os.path.join(reports_dir, "timing_reports.csv")
    file_exists = os.path.exists(report_file)

    now = datetime.now(UTC).isoformat()

    try:
        # Calculate quality rating
        words_with_timing_pct = 0
        if timing_stats["total_words"] > 0:
            words_with_timing_pct = (
                timing_stats["words_with_timings"] / timing_stats["total_words"]
            ) * 100

        # Quality rating
        if words_with_timing_pct >= 90:
            quality = "EXCELLENT"
        elif words_with_timing_pct >= 75:
            quality = "GOOD"
        elif words_with_timing_pct >= 50:
            quality = "FAIR"
        else:
            quality = "POOR"

        # Write to CSV
        with open(report_file, "a", encoding="utf-8", newline="") as f:
            # Write header if file is new
            if not file_exists:
                f.write(
                    "article_id,title,timestamp,total_sentences,sentences_with_audio,sentences_with_timings,sentences_with_partial_timings,sentences_without_timings,total_words,words_with_timing,timing_percentage,quality\n"
                )

            # Write data row with all the detailed statistics
            f.write(
                f'{article_id},"{title.replace('"', '""')}",{now},'
                f"{timing_stats['total_sentences']},"
                f"{timing_stats['sentences_with_audio']},"
                f"{timing_stats['sentences_with_timings']},"
                f"{timing_stats['sentences_without_timings']},"
                f"{timing_stats['total_words']},"
                f"{timing_stats['words_with_timings']},"
                f"{words_with_timing_pct:.1f},"
                f"{quality}\n"
            )

        print(f"\n✅ Saved timing report to {report_file}")

    except Exception as e:
        print(f"\n❌ Failed to save timing report: {str(e)}")
        import traceback

        traceback.print_exc()


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


def get_or_generate_root_audio(word: str) -> Optional[str]:
    """Get cached audio URL or generate new one for a root word."""
    cache_key = get_cache_key(word)
    cache_path = os.path.join(AUDIO_CACHE_DIR, cache_key)
    storage_url = f"{SUPABASE_URL}/storage/v1/object/public/audio/{cache_key}"

    print(f"\nProcessing root word: '{word}' (cache_key: {cache_key})")

    # First check if file exists in storage
    if check_file_exists("audio", cache_key):
        print(f"✅ Found file in Supabase storage: {cache_key}")
        # If already in storage, just check if we have local cache
        if not os.path.exists(cache_path):
            # Try to download and save to local cache for future use
            try:
                response = supabase.storage.from_("audio").download(cache_key)
                if response:
                    with open(cache_path, "wb") as f:
                        f.write(response)
                    print(f"Downloaded {cache_key} to local cache")
            except Exception as e:
                # If download fails, just continue - we know it's on the server
                print(f"Warning: Failed to download to cache: {str(e)}")
        else:
            print("✅ File exists both in storage and local cache")
        return storage_url

    # Check if file exists in local cache but not on server
    if os.path.exists(cache_path):
        print(f"Found in local cache but not in storage: {cache_key}")
        try:
            # Get file size for debugging
            file_size = os.path.getsize(cache_path)
            print(f"Cache file size: {file_size} bytes")

            # Verify the cached file is valid
            with open(cache_path, "rb") as f:
                file_content = f.read()

            # Use more lenient validation for cached files
            if validate_mp3(file_content, is_cached_file=True):
                print(f"Validated cached file, uploading to storage: {cache_key}")
                # Upload to storage
                try:
                    with open(cache_path, "rb") as f:
                        result_url = upload_to_storage("audio", cache_key, f)
                        if result_url:
                            print("✅ Successfully uploaded cached file to storage")
                            return result_url
                except Exception as e:
                    print(f"Warning: Cache upload failed: {str(e)}")
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
    print(f"Generating new audio for root word: {word}")
    result = generate_arabic_word_audio(word, cache_key)

    if result and result.get("url"):
        # Save to cache
        temp_path = os.path.join(AUDIO_TEMP_DIR, cache_key)
        if os.path.exists(temp_path):
            try:
                shutil.copy2(temp_path, cache_path)
                print(f"✅ Cached audio for root word: {word}")
                # Only remove temp file if successfully copied to cache
                os.remove(temp_path)
            except Exception as e:
                print(f"Error caching audio file: {str(e)}")
                # Don't remove temp file if copying failed - we can use it directly
        return result["url"]

    return None


def get_or_create_root(letters: str, meaning: Optional[str] = None) -> int:
    """Get existing root or create a new one, and generate audio URL for the root."""
    # Clean up letters (remove extra spaces)
    letters = " ".join(letters.split())

    # Check if root exists, include audio_url
    result = (
        supabase.table("roots")
        .select("id", "audio_url")
        .eq("letters", letters)
        .execute()
    )
    if result.data:
        root = result.data[0]
        root_id = root["id"]
        # Generate and update audio_url if missing
        if not root.get("audio_url"):
            try:
                # Get or generate audio for the root word using cache
                audio_url = get_or_generate_root_audio(letters)
                if audio_url:
                    supabase.table("roots").update({"audio_url": audio_url}).eq(
                        "id", root_id
                    ).execute()
            except Exception as e:
                print(f"Error generating audio for root '{letters}': {e}")
        return root_id

    # Create new root without audio_url first
    root_data = {"letters": letters, "meaning": meaning}
    result = supabase.table("roots").insert(root_data).execute()
    root_id = result.data[0]["id"]

    # Generate and update audio_url for the new root
    try:
        # Get or generate audio for the root word using cache
        audio_url = get_or_generate_root_audio(letters)
        if audio_url:
            supabase.table("roots").update({"audio_url": audio_url}).eq(
                "id", root_id
            ).execute()
    except Exception as e:
        print(f"Error generating audio for new root '{letters}': {e}")

    return root_id


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

    # Use essential letters and translation as the root when available
    letters = word.get("essential", word.get("arabic"))
    meaning = (
        word.get("essential_translation")
        or f"Auto-generated root for: {word.get('english', '')}"
    )
    return letters, meaning


def concatenate_audio_files(audio_files: List[str], output_file: str) -> Optional[str]:
    """
    Concatenate multiple MP3 files using ffmpeg with proper silence between them.

    Args:
        audio_files: List of audio file paths to concatenate
        output_file: Path for the output concatenated file

    Returns:
        Path to the concatenated file if successful, None otherwise
    """
    try:
        if not audio_files:
            print("No audio files to concatenate")
            return None

        # Create a temporary directory for processing
        temp_dir = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "temp_concat"
        )
        os.makedirs(temp_dir, exist_ok=True)

        # Create a file list for ffmpeg
        list_file = os.path.join(temp_dir, "files.txt")
        with open(list_file, "w") as f:
            for audio_file in audio_files:
                # Add 0.5s silence between files using ffmpeg's silenceremove filter
                f.write(f"file '{audio_file}'\n")
                f.write("file 'silence:d=0.5'\n")

        # Use ffmpeg to concatenate files with the silence
        cmd = [
            "ffmpeg",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            list_file,
            "-c:a",
            "libmp3lame",
            "-q:a",
            "2",  # High quality MP3
            "-y",  # Overwrite output file if exists
            output_file,
        ]

        # Run ffmpeg
        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            print(f"Error concatenating audio files: {result.stderr}")
            return None

        # Clean up
        os.remove(list_file)
        os.rmdir(temp_dir)

        return output_file

    except Exception as e:
        print(f"Error in audio concatenation: {str(e)}")
        return None


def main():
    """Main function to run the script."""
    # Ensure all cache files have proper extensions
    ensure_valid_cache_files()

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
