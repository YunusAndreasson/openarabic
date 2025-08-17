import functools
import hashlib
import io
import logging
import os
import re
import subprocess
import sys
import time
import uuid
from collections.abc import Callable
from typing import Any

from elevenlabs import VoiceSettings
from elevenlabs.client import ElevenLabs
from mutagen.mp3 import MP3

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.config import (
    ARABIC_VOICE_ID,
    AUDIO_CACHE_DIR,
    AUDIO_TEMP_DIR,
    DEFAULT_VOICE_SETTINGS,
    ELEVENLABS_API_KEY,
    ELEVENLABS_TTS_MODEL_ID,
    GOOGLE_CLOUD_CREDENTIALS_PATH,
    SUPABASE_URL,
)
from data.models import AudioResult, WordTiming
from utils.arabic_text import (
    preprocess_text_for_tts,
    wrap_in_arabic_ssml,
)
from utils.exceptions import AudioGenerationError
from utils.google_tts_service import GoogleTTSService
from utils.storage_utils import (
    check_file_exists,
    get_supabase_client,
)

logger = logging.getLogger(__name__)

# Initialize ElevenLabs client lazily to avoid import-time failures
eleven_labs = None

os.makedirs(AUDIO_CACHE_DIR, exist_ok=True)
os.makedirs(AUDIO_TEMP_DIR, exist_ok=True)


def retry_operation(
    max_attempts: int = 3, delay: float = 1, backoff: float = 2
) -> Callable:
    """Retry decorator for network operations."""

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            attempts = 0
            current_delay = delay
            while attempts < max_attempts:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    attempts += 1
                    if attempts == max_attempts:
                        logger.error(f"Failed after {max_attempts} attempts: {str(e)}")
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
        is_cached_file: Whether this is a cached file (for different validation)

    Returns:
        True if valid MP3, False otherwise
    """
    try:
        if is_cached_file:
            # For cached files, just check if it's not empty
            return len(audio_data) > 0

        # For fresh API responses, validate MP3 structure
        with io.BytesIO(audio_data) as audio_stream:
            audio = MP3(audio_stream)
            # Check if duration is reasonable (not 0 or extremely long)
            if audio.info.length <= 0 or audio.info.length > 3600:  # 1 hour max
                logger.warning(f"Invalid audio duration: {audio.info.length}")
                return False
            return True
    except Exception as e:
        logger.error(f"MP3 validation failed: {e}")
        return False


@functools.cache
def get_cache_key(word: str) -> str:
    """Generate a cache key for a word."""
    return hashlib.sha256(word.encode("utf-8")).hexdigest()


def generate_audio_filename() -> str:
    """Generate a unique filename for audio files."""
    return f"{uuid.uuid4()}.mp3"


def get_cached_audio_url(cache_key: str, label: str | None = None) -> str | None:
    """
    Check if audio is already cached and return the URL.

    Args:
        cache_key: The cache key for the audio
        label: Optional label for the audio (e.g., "arabic", "english")

    Returns:
        The cached audio URL if found, None if not
    """
    try:
        filename = f"{cache_key}.mp3"
        if label:
            # Ensure label is safe for storage - use only ASCII characters
            safe_label = "".join(c for c in label if c.isascii() and c.isalnum())
            if safe_label:
                filename = f"{cache_key}_{safe_label}.mp3"

        # Check if file exists in Supabase storage
        if check_file_exists("audio", filename):
            return f"{SUPABASE_URL}/storage/v1/object/public/audio/{filename}"
        return None
    except Exception as e:
        logger.error(f"Error checking cached audio: {e}")
        return None


def _get_eleven_labs_client() -> ElevenLabs:
    """Get the ElevenLabs client, initializing it if necessary."""
    global eleven_labs
    if eleven_labs is None:
        # Check environment variable directly to ensure it's loaded
        api_key = os.getenv("ELEVENLABS_API_KEY") or ELEVENLABS_API_KEY
        if not api_key:
            raise AudioGenerationError("ElevenLabs API key not configured")

        logger.debug(f"Initializing ElevenLabs client with API key: {api_key[:8]}...")
        try:
            eleven_labs = ElevenLabs(api_key=api_key)
            logger.debug("ElevenLabs client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize ElevenLabs client: {e}")
            raise AudioGenerationError(
                f"ElevenLabs client initialization failed: {e}"
            ) from e

    return eleven_labs


@retry_operation(max_attempts=3, delay=1, backoff=2)
def generate_speech(
    text: str,
    voice_id: str,
    voice_settings: VoiceSettings | None = None,
    is_arabic: bool = True,
) -> dict[str, Any] | None:
    """
    Generate speech using ElevenLabs API.

    Args:
        text: The text to convert to speech
        voice_id: The voice ID to use
        voice_settings: Optional voice settings
        is_arabic: Whether the text is Arabic (for preprocessing)

    Returns:
        Dictionary with audio data and metadata, or None if failed
    """
    try:
        client = _get_eleven_labs_client()

        # Preprocess text for TTS
        if is_arabic:
            logger.debug(f"Original Arabic text: '{text}'")
            text = preprocess_text_for_tts(text)
            logger.debug(f"After preprocessing: '{text}'")
            text = wrap_in_arabic_ssml(text)
            logger.debug(f"After SSML wrapping: '{text}'")

        # Use default voice settings if none provided
        if voice_settings is None:
            voice_settings = VoiceSettings(**DEFAULT_VOICE_SETTINGS)
        elif isinstance(voice_settings, dict):
            voice_settings = VoiceSettings(**voice_settings)

        # Generate speech
        response = client.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id=ELEVENLABS_TTS_MODEL_ID,
            voice_settings=voice_settings,
        )

        # Debug the response
        logger.debug(f"TTS Response type: {type(response)}")

        # Handle generator response (new ElevenLabs API format)
        if hasattr(response, "__iter__") and not hasattr(response, "audio"):
            logger.debug("Response is a generator, iterating to get audio data")
            try:
                # Get the first (and usually only) chunk from the generator
                audio_chunk = next(response)

                # Check for audio data in the chunk
                if hasattr(audio_chunk, "audio") and audio_chunk.audio:
                    audio_data = audio_chunk.audio
                    logger.debug(f"Found audio data: {len(audio_data)} bytes")
                elif hasattr(audio_chunk, "data") and audio_chunk.data:
                    audio_data = audio_chunk.data
                    logger.debug(f"Found data attribute: {len(audio_chunk.data)} bytes")
                elif hasattr(audio_chunk, "content") and audio_chunk.content:
                    audio_data = audio_chunk.content
                    logger.debug(
                        f"Found content attribute: {len(audio_chunk.content)} bytes"
                    )
                elif isinstance(audio_chunk, bytes):
                    # The chunk is raw audio data
                    audio_data = audio_chunk
                    logger.debug(f"Found raw audio data: {len(audio_data)} bytes")
                else:
                    logger.error(
                        f"No audio data found in chunk. Available attributes: {[attr for attr in dir(audio_chunk) if not attr.startswith('_')]}"
                    )
                    return None

            except StopIteration:
                logger.error("Generator response was empty")
                return None
            except Exception as e:
                logger.error(f"Error processing generator response: {e}")
                return None
        else:
            # Handle old response format
            if hasattr(response, "audio"):
                logger.debug(f"Audio data present: {response.audio is not None}")
                if response.audio:
                    logger.debug(f"Audio data length: {len(response.audio)} bytes")
                    audio_data = response.audio
                else:
                    logger.error("No audio data in response")
                    return None
            else:
                logger.debug("No 'audio' attribute in response")
                logger.error("No audio data in response")
                return None

        # Validate the audio data
        if not validate_mp3(audio_data):
            logger.error("Invalid MP3 data received")
            return None

        return {
            "audio": audio_data,
            "duration": getattr(response, "duration", None),
            "voice_id": voice_id,
            "text": text,
        }

    except Exception as e:
        logger.error(f"Speech generation failed: {e}")
        return None


@retry_operation(max_attempts=3, delay=1, backoff=2)
def generate_speech_with_timestamps(
    text: str,
    voice_id: str,
    previous_text: str | None = None,
    next_text: str | None = None,
) -> dict:
    """
    Generate speech with word-level timestamps using ElevenLabs API.

    Args:
        text: The text to convert to speech
        voice_id: The voice ID to use
        previous_text: Previous text for context
        next_text: Next text for context

    Returns:
        Dictionary with audio data, timestamps, and metadata
    """
    try:
        client = _get_eleven_labs_client()

        # Preprocess text for TTS
        text = preprocess_text_for_tts(text)
        text = wrap_in_arabic_ssml(text)

        # Build context for better pronunciation
        context_text = ""
        if previous_text:
            context_text += f"Previous: {previous_text}\n"
        if next_text:
            context_text += f"Next: {next_text}\n"
        context_text += f"Current: {text}"

        # Generate speech with alignment
        response = client.text_to_speech.convert_with_timestamps(
            text=text,
            voice_id=voice_id,
            voice_settings=VoiceSettings(**DEFAULT_VOICE_SETTINGS),
            output_format="mp3_44100_128",
        )

        if not response:
            logger.error("No response from TTS API")
            return {}

        # Log response details for debugging
        logger.debug(f"TTS Response type: {type(response)}")
        logger.debug(f"TTS Response attributes: {dir(response)}")
        if hasattr(response, "audio"):
            logger.debug(f"Audio data present: {response.audio is not None}")
            if response.audio:
                logger.debug(f"Audio data length: {len(response.audio)} bytes")
        else:
            logger.debug("No 'audio' attribute in response")

        # Handle both old and new response formats
        audio_data = getattr(response, "audio", None)
        audio_base64 = getattr(response, "audio_base_64", None)

        # If we have base64 data but no audio bytes, decode it
        if audio_base64 and not audio_data:
            import base64

            audio_data = base64.b64decode(audio_base64)

        return {
            "audio": audio_data,
            "alignment": getattr(response, "alignment", None),
            "audio_base_64": audio_base64,
            "duration": getattr(response, "duration", "unknown"),
            "voice_id": voice_id,
            "text": text,
        }

    except Exception as e:
        logger.error(f"Speech generation with timestamps failed: {e}")
        # Fallback to basic convert method without timestamps
        try:
            logger.info("Attempting fallback to basic convert method")
            fallback_client = _get_eleven_labs_client()
            fallback_response = fallback_client.text_to_speech.convert(
                text=text,
                voice_id=voice_id,
                model_id=ELEVENLABS_TTS_MODEL_ID,
                voice_settings=VoiceSettings(**DEFAULT_VOICE_SETTINGS),
            )

            if (
                fallback_response
                and hasattr(fallback_response, "audio")
                and fallback_response.audio
            ):
                logger.info("Fallback convert method succeeded")
                return {
                    "audio": fallback_response.audio,
                    "alignment": None,  # No timestamps in fallback
                    "audio_base_64": None,
                    "duration": getattr(fallback_response, "duration", "unknown"),
                    "voice_id": voice_id,
                    "text": text,
                }
            else:
                logger.error("Fallback convert method also failed")
                return {}
        except Exception as fallback_error:
            logger.error(f"Fallback convert method failed: {fallback_error}")
            return {}


def concatenate_audio_files(audio_files: list[str], output_file: str) -> str | None:
    """
    Concatenate multiple audio files into a single file.

    Args:
        audio_files: List of audio file paths to concatenate
        output_file: Output file path

    Returns:
        Path to the concatenated file, or None if failed
    """
    try:
        if not audio_files:
            logger.error("No audio files to concatenate")
            return None

        # Use ffmpeg to concatenate files
        file_list_path = output_file + ".txt"
        with open(file_list_path, "w", encoding="utf-8") as f:
            for audio_file in audio_files:
                if os.path.exists(audio_file):
                    f.write(f"file '{audio_file}'\n")

        cmd = [
            "ffmpeg",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            file_list_path,
            "-c",
            "copy",
            output_file,
            "-y",  # Overwrite output file
        ]

        subprocess.run(cmd, capture_output=True, text=True, check=True)

        # Clean up temporary file
        if os.path.exists(file_list_path):
            os.remove(file_list_path)

        if os.path.exists(output_file):
            return output_file
        else:
            logger.error("Concatenated file not created")
            return None

    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg concatenation failed: {e.stderr}")
        return None
    except Exception as e:
        logger.error(f"Audio concatenation failed: {e}")
        return None


def generate_arabic_word_audio(word: str, filename: str) -> dict | None:
    """
    Generate audio for an Arabic word using Google Cloud TTS.

    Args:
        word: The Arabic word to generate audio for
        filename: The filename to save the audio as

    Returns:
        Dictionary with audio URL and metadata, or None if failed
    """
    try:
        # Check cache first
        cache_key = get_cache_key(word)
        cached_url = get_cached_audio_url(cache_key, "arabic")
        if cached_url:
            return {"url": cached_url, "cached": True}

        # Initialize Google TTS service with same credentials as translation service
        tts_service = GoogleTTSService(credentials_path=GOOGLE_CLOUD_CREDENTIALS_PATH)

        # Generate new audio using Google TTS
        result = tts_service.generate_arabic_word_audio(word)

        if not result or not result.get("audio"):
            logger.error(f"Failed to generate audio for word: {word}")
            return None

        # Save to temporary file
        temp_audio_path = os.path.join(AUDIO_TEMP_DIR, filename)
        with open(temp_audio_path, "wb") as f:
            f.write(result["audio"])

        # Upload to Supabase storage
        with open(temp_audio_path, "rb") as f:
            get_supabase_client().storage.from_("audio").upload(
                filename,
                f,
                file_options={"content-type": "audio/mpeg"},
            )

        # Clean up temporary file
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

        url = f"{SUPABASE_URL}/storage/v1/object/public/audio/{filename}"
        return {"url": url, "cached": False}

    except Exception as e:
        logger.error(f"Error generating Arabic word audio: {str(e)}")
        return None


def generate_english_word_audio(word: str, filename: str) -> dict | None:
    """
    Generate audio for an English word using Google Cloud TTS.

    Args:
        word: The English word to generate audio for
        filename: The filename to save the audio as

    Returns:
        Dictionary with audio URL and metadata, or None if failed
    """
    try:
        # Check cache first
        cache_key = get_cache_key(word)
        cached_url = get_cached_audio_url(cache_key, "english")
        if cached_url:
            return {"url": cached_url, "cached": True}

        # Initialize Google TTS service with same credentials as translation service
        tts_service = GoogleTTSService(credentials_path=GOOGLE_CLOUD_CREDENTIALS_PATH)

        # Generate new audio using Google TTS
        result = tts_service.generate_english_word_audio(word)

        if not result or not result.get("audio"):
            logger.error(f"Failed to generate audio for word: {word}")
            return None

        # Save to temporary file
        temp_audio_path = os.path.join(AUDIO_TEMP_DIR, filename)
        with open(temp_audio_path, "wb") as f:
            f.write(result["audio"])

        # Upload to Supabase storage
        with open(temp_audio_path, "rb") as f:
            get_supabase_client().storage.from_("audio").upload(
                filename,
                f,
                file_options={"content-type": "audio/mpeg"},
            )

        # Clean up temporary file
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

        url = f"{SUPABASE_URL}/storage/v1/object/public/audio/{filename}"
        return {"url": url, "cached": False}

    except Exception as e:
        logger.error(f"Error generating English word audio: {str(e)}")
        return None


def extract_word_timings_from_alignment(alignment: Any, text: str) -> list[WordTiming]:
    """
    Extract word-level timing information from ElevenLabs alignment data.

    Args:
        alignment: The alignment data from ElevenLabs API
        text: The original text for word matching

    Returns:
        List of WordTiming objects with word-level timing information
    """
    word_timings: list[WordTiming] = []

    try:
        if not alignment or not hasattr(alignment, "characters"):
            logger.warning("No alignment data available")
            return word_timings

        # Extract timing data for each character
        start_times = []
        end_times = []

        for char_data in alignment.characters:
            if hasattr(char_data, "start") and hasattr(char_data, "end"):
                start_times.append(char_data.start)
                end_times.append(char_data.end)
            else:
                # Fallback for different alignment format
                start_times.append(0.0)
                end_times.append(0.0)

        # Clean the text for word matching
        cleaned_str = re.sub(r"[^\w\s]", "", text)
        word_regex = re.compile(r"\b\w+\b")

        # Extract word timings
        for match in word_regex.finditer(cleaned_str):
            word = match.group()
            start_char_idx = match.start()
            end_char_idx = match.end() - 1  # inclusive
            try:
                word_start_time = start_times[start_char_idx]
                word_end_time = end_times[end_char_idx]
                # Clean the word for better matching later
                try:
                    from utils.arabic_text import clean_word_for_matching

                    clean_word = clean_word_for_matching(word)
                except ImportError:
                    # Fallback if import fails
                    clean_word = word

                word_timings.append(
                    WordTiming(
                        word=word,
                        cleaned_word=clean_word,
                        start_time=str(word_start_time),
                        end_time=str(word_end_time),
                    )
                )
            except Exception as e:
                logger.error(f"Failed to extract timings for word '{word}': {str(e)}")

        if not word_timings:
            logger.error("Failed to extract any word timings from the response")
            raise ValueError("Failed to extract any word timings from the response")

        # Sort word timings by start time to ensure proper sequencing
        word_timings = sorted(word_timings, key=lambda x: float(x.start_time))

        return word_timings

    except Exception as e:
        logger.error(f"Error extracting word timings: {str(e)}")
        return []


def generate_sentence_audio(
    text: str,
    filename: str,
    tashkeel_text: str | None = None,
    previous_text: str | None = None,
    next_text: str | None = None,
) -> AudioResult | None:
    """
    Generate audio for a sentence using ElevenLabs, with optional tashkeel, SSML, and context.
    Returns an AudioResult object with URL and word timings.
    """
    try:
        # Prefer tashkeel text if available
        tts_text = tashkeel_text if tashkeel_text else text
        # Use SSML for better pronunciation
        tts_text = wrap_in_arabic_ssml(tts_text)
        # Use the main voice for sentences
        voice_id = ARABIC_VOICE_ID
        # Generate audio with timestamps
        response = generate_speech_with_timestamps(
            text=tts_text,
            voice_id=voice_id,
            previous_text=previous_text,
            next_text=next_text,
        )
        # Extract audio and timings
        audio_data = response.get("audio") if response else None
        alignment = response.get("alignment") if response else None
        if not audio_data:
            logger.error("No audio data returned from TTS API")
            return None
        # Validate and save audio
        if not validate_mp3(audio_data):
            logger.error("Invalid MP3 data returned from TTS API")
            return None
        temp_audio_path = os.path.join(AUDIO_TEMP_DIR, filename)
        with open(temp_audio_path, "wb") as f:
            f.write(audio_data)

        with open(temp_audio_path, "rb") as f:
            get_supabase_client().storage.from_("audio").upload(
                filename,
                f,
                file_options={"content-type": "audio/mpeg"},
            )
            url = f"{SUPABASE_URL}/storage/v1/object/public/audio/{filename}"
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        # Extract word timings if available
        word_timings = []
        if alignment:
            word_timings = extract_word_timings_from_alignment(alignment, tts_text)

        return AudioResult(
            url=url,
            word_timings=word_timings,
            filename=filename,
            duration=response.get("duration") if response else "unknown",
        )
    except Exception as e:
        logger.error(f"Error generating sentence audio: {str(e)}")
        return None
