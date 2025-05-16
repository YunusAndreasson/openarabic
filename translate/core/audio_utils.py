import os
import io
import time
import hashlib
import base64
import functools
import re
import subprocess
import uuid
from typing import Dict, List, Optional
from elevenlabs.client import ElevenLabs
from elevenlabs import VoiceSettings
from mutagen.mp3 import MP3

from translate.core.arabic_text import (
    clean_arabic_text,
    wrap_in_arabic_ssml,
    preprocess_text_for_tts,
)

# Execute set_keys.py to set environment variables
set_keys_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "set_keys.py")
exec(open(set_keys_path).read())

# ElevenLabs configuration
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")

if not ELEVENLABS_API_KEY:
    raise EnvironmentError("Missing ELEVENLABS_API_KEY environment variable.")

# Initialize client
eleven_labs = ElevenLabs(api_key=ELEVENLABS_API_KEY)

# Constants for voice IDs
ARABIC_VOICE_ID = "nPczCjzI2devNBz1zQrb"  # Voice ID for Arabic sentences
ARABIC_WORD_VOICE_ID = (
    "IES4nrmZdUBHByLBde0P"  # Special voice ID for single Arabic words
)

# Default voice settings for consistent audio generation
DEFAULT_VOICE_SETTINGS = VoiceSettings(
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
                    time.sleep(current_delay)
                    current_delay *= backoff
            return None

        return wrapper

    return decorator


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
            if len(audio_data) < 10:
                return False

            header = audio_data[:10]
            # Check for ID3 tag
            if header[:3] == b"ID3":
                return True

            # Look for MPEG frame sync marker (1111 1111 111)
            for i in range(min(len(audio_data) - 2, 1000)):  # Check first 1000 bytes
                if audio_data[i] == 0xFF and (audio_data[i + 1] & 0xE0) == 0xE0:
                    return True

            # If it's cached and we have a reasonable size, trust it's valid
            if len(audio_data) > 1000:
                return True

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
                    return True
            return False

        # Try to load it as an MP3
        try:
            mp3 = MP3(audio_file)

            # Check if it has basic MP3 attributes
            if mp3.info.length > 0 and mp3.info.bitrate > 0:
                return True
            else:
                return False
        except Exception:
            # Return True for ID3 files even if mutagen fails, since it might still be valid
            if is_id3:
                return True
            return False

    except Exception as e:
        print(f"Invalid MP3: {str(e)}")
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
                    os.rename(old_path, new_path)
                    fixed_count += 1
                except Exception as e:
                    print(f"Error fixing cache file {filename}: {str(e)}")

    if fixed_count > 0:
        print(f"Fixed {fixed_count} cache files with missing extensions")


def generate_audio_filename() -> str:
    """Generate a unique filename for the audio file."""
    return f"{uuid.uuid4()}.mp3"


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
    previous_text: Optional[str] = None,
    next_text: Optional[str] = None,
) -> Dict:
    """Generate speech with timestamps using ElevenLabs API with retries.

    Args:
        text: The text to convert to speech
        voice_id: The voice ID to use
        speed: Speech speed (0.5 to 2.0)
        previous_text: Optional text that came before this text for better continuity
        next_text: Optional text that comes after this text for better continuity
    """
    # Preprocess text to handle numbers
    text = preprocess_text_for_tts(text)
    if previous_text:
        previous_text = preprocess_text_for_tts(previous_text)
        # Wrap previous text in SSML
        previous_text = wrap_in_arabic_ssml(previous_text)
    if next_text:
        next_text = preprocess_text_for_tts(next_text)
        # Wrap next text in SSML
        next_text = wrap_in_arabic_ssml(next_text)

    # Always wrap in Arabic SSML tags since we're working with Arabic text
    text = wrap_in_arabic_ssml(text)

    # Create voice settings with default settings plus speed
    voice_settings = VoiceSettings(
        **DEFAULT_VOICE_SETTINGS.dict(),
        speed=speed,
    )

    # Base parameters with enhanced options for better quality
    params = {
        "text": text,
        "voice_id": voice_id,
        "model_id": "eleven_multilingual_v2",
        "output_format": "mp3_44100_128",
        "voice_settings": voice_settings,
        # Add previous/next text for better continuity if available
        "previous_text": previous_text if previous_text else None,
        "next_text": next_text if next_text else None,
        # Use deterministic sampling for more consistent results
        "seed": int(hashlib.sha256(text.encode()).hexdigest()[:8], 16),
        # Enable text normalization for better pronunciation
        "apply_text_normalization": "on",
        # Optimize for quality over latency since we're not streaming
        "optimize_streaming_latency": 0,
    }

    response = eleven_labs.text_to_speech.convert_with_timestamps(**params)

    if not response:
        raise ValueError("Empty response from ElevenLabs API")

    return response


def concatenate_audio_files(audio_files: List[str], output_file: str) -> Optional[str]:
    """Concatenate multiple MP3 files using ffmpeg."""
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
                f.write(f"file '{audio_file}'\n")

        # Use ffmpeg to concatenate files
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
        try:
            os.remove(list_file)
            os.rmdir(temp_dir)
        except Exception as e:
            print(f"Warning: Cleanup error: {str(e)}")

        if os.path.exists(output_file):
            print(f"Successfully created concatenated audio file: {output_file}")
            return output_file
        else:
            print("Output file was not created")
            return None

    except Exception as e:
        print(f"Error in audio concatenation: {str(e)}")
        import traceback

        traceback.print_exc()
        return None


def generate_arabic_word_audio(word: str, filename: str) -> Optional[Dict]:
    """Generate audio file for an Arabic word using ElevenLabs API."""
    temp_audio_path = None
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
        with open(temp_audio_path, "wb") as f:
            f.write(audio_response)

        from translate.core.storage_utils import upload_to_storage

        try:
            with open(temp_audio_path, "rb") as f:
                url = upload_to_storage("audio", filename, f)
                if not url:
                    raise Exception("Failed to get URL from upload")
        except Exception as e:
            print(f"Upload failed despite retries: {str(e)}")
            return None

        return {"url": url}

    except Exception as e:
        print(f"Error generating/uploading Arabic word audio for '{word}': {str(e)}")
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        return None


def extract_word_timings_from_alignment(alignment, text):
    """Extract word timings from ElevenLabs alignment data."""
    if not alignment:
        print("No alignment data found in response")
        raise ValueError("Missing alignment data in API response")

    chars = alignment.get("characters", [])
    start_times = alignment.get("character_start_times_seconds", [])
    end_times = alignment.get("character_end_times_seconds", [])

    if not (
        chars
        and start_times
        and end_times
        and len(chars) == len(start_times) == len(end_times)
    ):
        print("Invalid alignment data structure")
        raise ValueError("Invalid or missing timing data in API response")

    # Clean up the character array by removing non-Arabic characters while preserving timing
    cleaned_chars = []
    cleaned_start_times = []
    cleaned_end_times = []

    # Keep only Arabic characters and their timings
    arabic_pattern = re.compile(
        r"[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF\u064B-\u065F\s]"
    )
    for i, char in enumerate(chars):
        if arabic_pattern.match(char) or char.isspace():
            cleaned_chars.append(char)
            cleaned_start_times.append(start_times[i])
            cleaned_end_times.append(end_times[i])

    # Use the cleaned arrays for word extraction
    chars = cleaned_chars
    start_times = cleaned_start_times
    end_times = cleaned_end_times

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
                    from translate.core.arabic_text import clean_word_for_matching

                    clean_word = clean_word_for_matching(current_word)

                    word_timings.append(
                        {
                            "word": current_word,
                            "cleaned_word": clean_word,
                            "start_time": str(word_start_time),
                            "end_time": str(word_end_time),
                        }
                    )

            # Reset for next word
            word_start_idx = None
            current_word = ""

    if not word_timings:
        raise ValueError("Failed to extract any word timings from the response")

    # Sort word timings by start time to ensure proper sequencing
    word_timings = sorted(word_timings, key=lambda x: float(x["start_time"]))

    return word_timings


def generate_sentence_audio(
    text: str,
    filename: str,
    tashkeel_text: str = None,
    is_last_sentence: bool = False,
    previous_text: str = None,
    next_text: str = None,
):
    """
    Generate audio for a sentence using ElevenLabs, with optional tashkeel, SSML, and context.
    Returns a dict with 'url' and 'word_timings'.
    """
    try:
        # Prefer tashkeel text if available
        tts_text = tashkeel_text if tashkeel_text else text
        # Use SSML for better pronunciation
        from translate.core.arabic_text import wrap_in_arabic_ssml

        tts_text = wrap_in_arabic_ssml(tts_text)
        # Use the main voice for sentences
        voice_id = ARABIC_VOICE_ID
        # Generate audio with timestamps
        response = generate_speech_with_timestamps(
            text=tts_text,
            voice_id=voice_id,
            speed=0.8,
            previous_text=previous_text,
            next_text=next_text,
        )
        # Extract audio and timings
        audio_data = response.get("audio")
        alignment = response.get("alignment")
        if not audio_data:
            print("No audio data returned from TTS API")
            return None
        # Validate and save audio
        if not validate_mp3(audio_data):
            print("Invalid MP3 data returned from TTS API")
            return None
        temp_audio_path = os.path.join(AUDIO_TEMP_DIR, filename)
        with open(temp_audio_path, "wb") as f:
            f.write(audio_data)
        from translate.core.storage_utils import upload_to_storage

        url = upload_to_storage("audio", filename, open(temp_audio_path, "rb"))
        # Extract word timings if available
        word_timings = []
        if alignment:
            from translate.core.audio_utils import extract_word_timings_from_alignment

            word_timings = extract_word_timings_from_alignment(alignment, tts_text)
        return {"url": url, "word_timings": word_timings}
    except Exception as e:
        print(f"Error generating sentence audio: {str(e)}")
        return None
