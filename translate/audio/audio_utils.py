import functools
import hashlib
import io
import logging
import os
import sys
import time
import uuid
from collections.abc import Callable
from typing import Any

from elevenlabs import VoiceSettings
from elevenlabs.client import ElevenLabs
from mutagen.mp3 import MP3

# Audio generation optimization: Prevent duplicate generation and uploads
# This addresses the issue where the system would try to generate audio for
# words that already exist, causing "Duplicate resource" errors and wasting
# API costs (ElevenLabs, Google TTS).

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.config import (
    ARABIC_VOICE_ID,
    AUDIO_TEMP_DIR,
    BILINGUAL_AUDIO_PAUSE_MS,
    DEFAULT_VOICE_SETTINGS,
    ELEVENLABS_API_KEY,
    ELEVENLABS_TTS_MODEL_ID,
    ENGLISH_VOICE_ID,
    ENGLISH_VOICE_SETTINGS,
    GOOGLE_CLOUD_CREDENTIALS_PATH,
)
from data.models import AudioResult
from utils.config_common import get_storage_url
from utils.exceptions import AudioGenerationError
from utils.google_tts_service import GoogleTTSService
from utils.storage_utils import (
    check_file_exists,
    get_supabase_client,
)

logger = logging.getLogger(__name__)

# Initialize ElevenLabs client lazily to avoid import-time failures
eleven_labs = None

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
            return get_storage_url(filename)
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
) -> dict[str, Any] | None:
    """
    Generate speech using ElevenLabs API.

    Args:
        text: The text to convert to speech
        voice_id: The voice ID to use
        voice_settings: Optional voice settings

    Returns:
        Dictionary with audio data and metadata, or None if failed
    """
    try:
        client = _get_eleven_labs_client()

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

        # Handle generator response (new ElevenLabs API format)
        if hasattr(response, "__iter__") and not hasattr(response, "audio"):
            try:
                # Collect all chunks from the generator and concatenate them
                audio_chunks = []

                for audio_chunk in response:
                    # Check for audio data in the chunk
                    if hasattr(audio_chunk, "audio") and audio_chunk.audio:
                        chunk_data = audio_chunk.audio
                    elif hasattr(audio_chunk, "data") and audio_chunk.data:
                        chunk_data = audio_chunk.data
                    elif hasattr(audio_chunk, "content") and audio_chunk.content:
                        chunk_data = audio_chunk.content
                    elif isinstance(audio_chunk, bytes):
                        # The chunk is raw audio data
                        chunk_data = audio_chunk
                    else:
                        logger.error(
                            f"No audio data found in chunk. Available attributes: {[attr for attr in dir(audio_chunk) if not attr.startswith('_')]}"
                        )
                        return None

                    audio_chunks.append(chunk_data)

                # Concatenate all chunks
                if audio_chunks:
                    audio_data = b"".join(audio_chunks)
                else:
                    logger.error("No audio chunks collected")
                    return None

            except Exception as e:
                logger.error(f"Error processing generator response: {e}")
                return None
        else:
            # Handle old response format
            if hasattr(response, "audio"):
                if response.audio:
                    audio_data = response.audio
                else:
                    logger.error("No audio data in response")
                    return None
            else:
                logger.error("No audio data in response")
                return None

        # Validate the audio data
        if not validate_mp3(audio_data):
            logger.error("Invalid MP3 data received")
            return None

        return {
            "audio": audio_data,
            "duration": getattr(response, "duration", 0.0),
            "voice_id": voice_id,
            "text": text,
        }

    except Exception as e:
        logger.error(f"Speech generation failed: {e}")
        return None


def extract_word_timestamps(
    text: str, alignment: Any, sentence_id: int | None = None
) -> list[dict[str, Any]]:
    """
    Extract word-level timestamps from ElevenLabs character-level alignment data.

    Args:
        text: The Arabic text used for TTS (should include diacritics)
        alignment: The alignment object from ElevenLabs response
        sentence_id: Optional sentence ID for logging context

    Returns:
        List of word timestamp dictionaries, empty list if extraction fails
    """
    try:
        # Validate inputs
        if not text or not text.strip():
            logger.warning(
                f"Empty text provided for timestamp extraction (sentence_id: {sentence_id})"
            )
            return []

        if not alignment:
            logger.warning(
                f"No alignment data provided for timestamp extraction (sentence_id: {sentence_id})"
            )
            return []

        # Extract character timing arrays
        char_starts = getattr(alignment, "character_start_times_seconds", None)
        char_ends = getattr(alignment, "character_end_times_seconds", None)

        if not char_starts or not char_ends:
            logger.warning(
                f"Missing character timing arrays in alignment (sentence_id: {sentence_id})"
            )
            return []

        if len(char_starts) != len(char_ends):
            logger.warning(
                f"Mismatched character timing arrays lengths: {len(char_starts)} vs {len(char_ends)} (sentence_id: {sentence_id})"
            )
            return []

        # Split text into words (preserving Arabic word boundaries)
        arabic_words = text.strip().split()
        word_count = len(arabic_words)

        if word_count == 0:
            logger.warning(
                f"No words found in text for timestamp extraction (sentence_id: {sentence_id})"
            )
            return []

        # Extract timestamps for words

        word_timestamps = []
        char_index = 0

        for word_idx, word in enumerate(arabic_words):
            word_length = len(word)

            # Validate we have enough characters remaining
            if char_index + word_length > len(char_starts):
                logger.warning(
                    f"Word '{word}' (index {word_idx}) exceeds available characters. "
                    f"Word length: {word_length}, Remaining chars: {len(char_starts) - char_index} "
                    f"(sentence_id: {sentence_id})"
                )
                break

            try:
                # Get timing for this word
                start_time = float(char_starts[char_index])
                end_time = float(char_ends[char_index + word_length - 1])
                duration = round(end_time - start_time, 3)

                # Validate timing values
                if start_time < 0 or end_time < 0 or duration < 0:
                    logger.warning(
                        f"Invalid timing values for word '{word}': "
                        f"start={start_time}, end={end_time}, duration={duration} "
                        f"(sentence_id: {sentence_id})"
                    )
                    continue

                word_data = {
                    "word": word,
                    "start_time": round(start_time, 3),
                    "end_time": round(end_time, 3),
                    "duration": duration,
                    "word_index": word_idx,
                    "char_start_index": char_index,
                    "char_end_index": char_index + word_length - 1,
                }

                word_timestamps.append(word_data)

            except (ValueError, IndexError) as e:
                logger.warning(
                    f"Failed to extract timing for word '{word}' (index {word_idx}): {e} "
                    f"(sentence_id: {sentence_id})"
                )
                continue

            # Move to next word (skip the space character)
            char_index += word_length + 1

        extracted_count = len(word_timestamps)
        if extracted_count != word_count:
            logger.warning(
                f"Extracted {extracted_count}/{word_count} word timestamps "
                f"(sentence_id: {sentence_id})"
            )
        else:
            logger.info(
                f"Successfully extracted {extracted_count} word timestamps "
                f"(sentence_id: {sentence_id})"
            )

        return word_timestamps

    except Exception as e:
        logger.error(
            f"Critical error during word timestamp extraction: {e} "
            f"(sentence_id: {sentence_id})"
        )
        return []


def generate_speech_with_timestamps(
    text: str,
    voice_id: str,
    voice_settings: VoiceSettings | None = None,
    sentence_id: int | None = None,
) -> dict[str, Any] | None:
    """
    Generate speech using ElevenLabs API with timestamp extraction.

    Args:
        text: The text to convert to speech
        voice_id: The voice ID to use
        voice_settings: Optional voice settings
        sentence_id: Optional sentence ID for logging context

    Returns:
        Dictionary with audio data, metadata, and word timestamps, or None if failed
    """
    try:
        client = _get_eleven_labs_client()

        # Use default voice settings if none provided
        if voice_settings is None:
            voice_settings = VoiceSettings(**DEFAULT_VOICE_SETTINGS)
        elif isinstance(voice_settings, dict):
            voice_settings = VoiceSettings(**voice_settings)

        logger.info(
            f"Generating speech with timestamps for sentence {sentence_id}: '{text[:50]}...'"
        )

        # Generate speech with timestamps
        response = client.text_to_speech.convert_with_timestamps(
            text=text,
            voice_id=voice_id,
            model_id=ELEVENLABS_TTS_MODEL_ID,
            voice_settings=voice_settings,
        )

        # Extract audio data
        audio_data = None

        # Handle different response formats
        if hasattr(response, "audio_base_64") and response.audio_base_64:
            # Direct response with base64 encoded audio
            import base64

            audio_data = base64.b64decode(response.audio_base_64)
        elif hasattr(response, "audio") and response.audio:
            # Direct response with raw audio
            audio_data = response.audio
        elif hasattr(response, "__iter__") and not hasattr(response, "audio"):
            # Generator response (fallback)
            audio_chunks = []

            for audio_chunk in response:
                if hasattr(audio_chunk, "audio") and audio_chunk.audio:
                    chunk_data = audio_chunk.audio
                elif hasattr(audio_chunk, "data") and audio_chunk.data:
                    chunk_data = audio_chunk.data
                elif hasattr(audio_chunk, "content") and audio_chunk.content:
                    chunk_data = audio_chunk.content
                elif isinstance(audio_chunk, bytes):
                    chunk_data = audio_chunk
                else:
                    continue

                audio_chunks.append(chunk_data)

            if audio_chunks:
                audio_data = b"".join(audio_chunks)
            else:
                logger.error("No audio chunks collected")
                return None
        else:
            logger.error("No audio data in response")
            return None

        # Validate audio data
        if not validate_mp3(audio_data):
            logger.error("Invalid MP3 data received")
            return None

        # Extract word timestamps
        word_timestamps = []
        if hasattr(response, "alignment") and response.alignment:
            word_timestamps = extract_word_timestamps(
                text, response.alignment, sentence_id
            )
        else:
            logger.warning(f"No alignment data in response for sentence {sentence_id}")

        result = {
            "audio": audio_data,
            "duration": getattr(response, "duration", 0.0),
            "voice_id": voice_id,
            "text": text,
            "word_timestamps": word_timestamps,
            "timestamp_count": len(word_timestamps),
        }

        logger.info(
            f"Successfully generated speech with {len(word_timestamps)} word timestamps "
            f"for sentence {sentence_id}"
        )

        return result

    except Exception as e:
        logger.error(
            f"Speech generation with timestamps failed for sentence {sentence_id}: {e}"
        )
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
        # Check if audio already exists in storage using the actual filename
        if check_file_exists("audio", filename):
            logger.info(
                f"Arabic audio file {filename} already exists, skipping generation"
            )
            url = get_storage_url(filename)
            return {"url": url, "cached": True}

        # Check cache first (fallback)
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

        # Upload to Supabase storage (double-check existence)
        if not check_file_exists("audio", filename):
            with open(temp_audio_path, "rb") as f:
                get_supabase_client().storage.from_("audio").upload(
                    filename,
                    f,
                    file_options={"content-type": "audio/mpeg"},
                )
            logger.info(f"Uploaded new Arabic audio file: {filename}")
        else:
            logger.info(
                f"Arabic audio file {filename} already exists in storage, skipping upload"
            )

        # Clean up temporary file
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

        url = get_storage_url(filename)
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
        # Check if audio already exists in storage using the actual filename
        if check_file_exists("audio", filename):
            logger.info(
                f"English audio file {filename} already exists, skipping generation"
            )
            url = get_storage_url(filename)
            return {"url": url, "cached": True}

        # Check cache first (fallback)
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

        # Upload to Supabase storage (double-check existence)
        if not check_file_exists("audio", filename):
            with open(temp_audio_path, "rb") as f:
                get_supabase_client().storage.from_("audio").upload(
                    filename,
                    f,
                    file_options={"content-type": "audio/mpeg"},
                )
            logger.info(f"Uploaded new English audio file: {filename}")
        else:
            logger.info(
                f"English audio file {filename} already exists in storage, skipping upload"
            )

        # Clean up temporary file
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

        url = get_storage_url(filename)
        return {"url": url, "cached": False}

    except Exception as e:
        logger.error(f"Error generating English word audio: {str(e)}")
        return None


def generate_sentence_audio(
    text: str,
    filename: str,
    tashkeel_text: str | None = None,
) -> AudioResult | None:
    """
    Generate audio for a sentence using ElevenLabs, with optional tashkeel.
    Returns an AudioResult object with URL.
    """
    try:
        # Check if audio already exists in storage to avoid duplicate generation
        if check_file_exists("audio", filename):
            logger.info(f"Audio file {filename} already exists, skipping generation")
            url = get_storage_url(filename)
            return AudioResult(
                url=url,
                filename=filename,
                duration=0.0,  # Duration not available without generating
            )

        # Prefer tashkeel text if available
        tts_text = tashkeel_text if tashkeel_text else text
        # Use the main voice for sentences
        voice_id = ARABIC_VOICE_ID

        # Generate audio using unified function
        response = generate_speech(
            text=tts_text,
            voice_id=voice_id,
            voice_settings=VoiceSettings(**DEFAULT_VOICE_SETTINGS),
        )
        # Extract audio data
        audio_data = response.get("audio") if response else None
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

        # Upload to Supabase storage (double-check existence to prevent duplicates)
        if not check_file_exists("audio", filename):
            with open(temp_audio_path, "rb") as f:
                get_supabase_client().storage.from_("audio").upload(
                    filename,
                    f,
                    file_options={"content-type": "audio/mpeg"},
                )
            logger.info(f"Uploaded new sentence audio file: {filename}")
        else:
            logger.info(
                f"Sentence audio file {filename} already exists in storage, skipping upload"
            )

        url = get_storage_url(filename)
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

        return AudioResult(
            url=url,
            filename=filename,
            duration=response.get("duration") if response else 0.0,
        )
    except Exception as e:
        logger.error(f"Error generating sentence audio: {str(e)}")
        return None


def create_bilingual_audio(
    english_audio: bytes,
    arabic_audio: bytes,
    pause_duration_ms: int = BILINGUAL_AUDIO_PAUSE_MS,
) -> bytes:
    """
    Create bilingual audio by combining English and Arabic audio with a pause.

    Args:
        english_audio: English audio data
        arabic_audio: Arabic audio data
        pause_duration_ms: Pause duration in milliseconds

    Returns:
        Combined bilingual audio data
    """
    try:
        import io

        from pydub import AudioSegment

        # Load audio segments
        english_segment = AudioSegment.from_mp3(io.BytesIO(english_audio))
        arabic_segment = AudioSegment.from_mp3(io.BytesIO(arabic_audio))

        # Create pause segment
        pause_segment = AudioSegment.silent(duration=pause_duration_ms)

        # Combine: English + Pause + Arabic
        bilingual_audio = english_segment + pause_segment + arabic_segment

        # Export as MP3
        output = io.BytesIO()
        bilingual_audio.export(output, format="mp3")
        output.seek(0)

        return output.read()

    except ImportError:
        logger.error("pydub not available for audio concatenation")
        # Fallback: simple concatenation without pause
        return english_audio + arabic_audio
    except Exception as e:
        logger.error(f"Error creating bilingual audio: {e}")
        # Fallback: simple concatenation
        return english_audio + arabic_audio


def create_multi_audio_with_delays(
    audio_segments: list[bytes],
    delay_ms: int = 1000,  # 1 second delay
) -> bytes:
    """
    Create multi-segment audio with delays between each segment.

    Args:
        audio_segments: List of audio data segments
        delay_ms: Delay duration in milliseconds between segments

    Returns:
        Combined audio data with delays
    """
    try:
        import io

        from pydub import AudioSegment

        if not audio_segments:
            logger.error("No audio segments provided")
            return b""

        if len(audio_segments) == 1:
            return audio_segments[0]

        # Load all audio segments
        segments = []
        for i, audio_data in enumerate(audio_segments):
            if audio_data:
                try:
                    segment = AudioSegment.from_mp3(io.BytesIO(audio_data))
                    segments.append(segment)
                    logger.debug(f"Loaded segment {i + 1}: {len(audio_data)} bytes")
                except Exception as e:
                    logger.error(f"Failed to load segment {i + 1}: {e}")
                    # Skip this segment
                    continue
            else:
                logger.warning(f"Empty audio data for segment {i + 1}, skipping")

        if not segments:
            logger.error("No valid audio segments found")
            return b""

        # Create delay segment (500ms as per config)
        delay_segment = AudioSegment.silent(duration=delay_ms)

        # Combine all segments with delays between them
        combined = segments[0]
        for i in range(1, len(segments)):
            combined = combined + delay_segment + segments[i]
            logger.debug(f"Added segment {i + 1} with {delay_ms}ms delay")

        # Export as MP3
        output = io.BytesIO()
        combined.export(output, format="mp3")
        output.seek(0)

        logger.info(
            f"Created multi-segment audio: {len(segments)} segments, {len(output.getvalue())} bytes"
        )
        return output.getvalue()

    except ImportError:
        logger.error("pydub not available for multi-segment audio creation")
        # Fallback: simple concatenation without delays
        return b"".join(audio_segments)
    except Exception as e:
        logger.error(f"Error creating multi-segment audio: {e}")
        # Fallback: simple concatenation
        return b"".join(audio_segments)


def create_article_audio(
    sentences: list[dict],
    article_title: str | None = None,
    article_summary: str | None = None,
    output_dir: str = AUDIO_TEMP_DIR,
) -> dict[str, str] | None:
    """
    Create article-level audio files in one pass:
    1. Arabic-only MP3: all sentences concatenated with 500ms delays
    2. Bilingual MP3: title + summary + English/Arabic mixed with 500ms delays

    Args:
        sentences: List of sentence dictionaries with 'arabic_text', 'english_text', 'tashkeel'
        article_title: Article title for bilingual audio intro
        article_summary: Article summary for bilingual audio intro
        output_dir: Directory to save temporary files

    Returns:
        Dictionary with 'arabic_url' and 'bilingual_url', or None if failed
    """
    try:
        if not sentences:
            logger.error("No sentences provided for article audio creation")
            return None

        logger.info(f"Creating article audio for {len(sentences)} sentences")

        # Generate all audio segments in one pass
        arabic_segments = []
        bilingual_segments = []

        # Add title and summary to bilingual audio if provided
        if article_title and article_title.strip():
            logger.info(f"Generating title audio: '{article_title}'")
            title_response = generate_speech(
                text=article_title.strip(),
                voice_id=ENGLISH_VOICE_ID,
                voice_settings=VoiceSettings(**ENGLISH_VOICE_SETTINGS),
            )
            if title_response and title_response.get("audio"):
                bilingual_segments.append(title_response["audio"])
                logger.info("Title audio generated successfully")
            else:
                logger.warning("Failed to generate title audio")

        if article_summary and article_summary.strip():
            logger.info(f"Generating summary audio: '{article_summary[:50]}...'")
            summary_response = generate_speech(
                text=article_summary.strip(),
                voice_id=ENGLISH_VOICE_ID,
                voice_settings=VoiceSettings(**ENGLISH_VOICE_SETTINGS),
            )
            if summary_response and summary_response.get("audio"):
                bilingual_segments.append(summary_response["audio"])
                logger.info("Summary audio generated successfully")
            else:
                logger.warning("Failed to generate summary audio")

        # Process each sentence
        all_word_timestamps = []

        for i, sentence in enumerate(sentences):
            arabic_text = sentence.get("arabic_text", "")
            english_text = sentence.get("english_text", "")
            tashkeel_text = sentence.get("tashkeel", arabic_text)
            sentence_id = sentence.get("id")  # Get sentence ID for tracking

            if not arabic_text or not english_text:
                logger.warning(f"Skipping sentence {i + 1} - missing text")
                continue

            logger.info(
                f"Processing sentence {i + 1}/{len(sentences)} (ID: {sentence_id})"
            )

            # Generate Arabic audio for this sentence WITH TIMESTAMPS
            arabic_response = generate_speech_with_timestamps(
                text=tashkeel_text,
                voice_id=ARABIC_VOICE_ID,
                voice_settings=VoiceSettings(**DEFAULT_VOICE_SETTINGS),
                sentence_id=sentence_id,
            )
            if not arabic_response or not arabic_response.get("audio"):
                logger.error(
                    f"Failed to generate Arabic audio for sentence {i + 1} (ID: {sentence_id})"
                )
                continue

            arabic_audio = arabic_response["audio"]
            arabic_segments.append(arabic_audio)

            # Collect word timestamps from this sentence
            sentence_timestamps = arabic_response.get("word_timestamps", [])
            if sentence_timestamps:
                logger.info(
                    f"Collected {len(sentence_timestamps)} word timestamps for sentence {i + 1}"
                )
                all_word_timestamps.extend(sentence_timestamps)
            else:
                logger.warning(
                    f"No word timestamps collected for sentence {i + 1} (ID: {sentence_id})"
                )

            # Generate English audio for bilingual version (without timestamps for now)
            english_response = generate_speech(
                text=english_text,
                voice_id=ENGLISH_VOICE_ID,
                voice_settings=VoiceSettings(**ENGLISH_VOICE_SETTINGS),
            )
            if not english_response or not english_response.get("audio"):
                logger.error(f"Failed to generate English audio for sentence {i + 1}")
                continue

            english_audio = english_response["audio"]

            # Add English then Arabic to bilingual segments
            bilingual_segments.append(english_audio)
            bilingual_segments.append(arabic_audio)

            logger.info(
                f"Sentence {i + 1} audio generated successfully with {len(sentence_timestamps)} timestamps"
            )

        if not arabic_segments:
            logger.error("No Arabic audio segments generated")
            return None

        if not bilingual_segments:
            logger.error("No bilingual audio segments generated")
            return None

        # Create final audio files with 500ms delays
        logger.info("Creating final audio files with 500ms delays")

        # 1. Arabic-only article audio
        arabic_article_filename = generate_audio_filename()
        arabic_article_path = os.path.join(output_dir, arabic_article_filename)

        arabic_combined = create_multi_audio_with_delays(
            arabic_segments,
            delay_ms=BILINGUAL_AUDIO_PAUSE_MS,  # 500ms
        )

        if not arabic_combined:
            logger.error("Failed to create Arabic article audio")
            return None

        # Save Arabic article audio
        with open(arabic_article_path, "wb") as f:
            f.write(arabic_combined)

        # 2. Bilingual article audio
        bilingual_article_filename = generate_audio_filename()
        bilingual_article_path = os.path.join(output_dir, bilingual_article_filename)

        bilingual_combined = create_multi_audio_with_delays(
            bilingual_segments,
            delay_ms=BILINGUAL_AUDIO_PAUSE_MS,  # 500ms
        )

        if not bilingual_combined:
            logger.error("Failed to create bilingual article audio")
            return None

        # Save bilingual article audio
        with open(bilingual_article_path, "wb") as f:
            f.write(bilingual_combined)

        # Upload both files to Supabase storage
        urls = {}

        # Upload Arabic article audio
        try:
            with open(arabic_article_path, "rb") as f:
                get_supabase_client().storage.from_("audio").upload(
                    arabic_article_filename,
                    f,
                    file_options={"content-type": "audio/mpeg"},
                )
            urls["arabic_url"] = get_storage_url(arabic_article_filename)
            logger.info(f"Uploaded Arabic article audio: {arabic_article_filename}")
        except Exception as e:
            logger.error(f"Failed to upload Arabic article audio: {e}")
            return None

        # Upload bilingual article audio
        try:
            with open(bilingual_article_path, "rb") as f:
                get_supabase_client().storage.from_("audio").upload(
                    bilingual_article_filename,
                    f,
                    file_options={"content-type": "audio/mpeg"},
                )
            urls["bilingual_url"] = get_storage_url(bilingual_article_filename)
            logger.info(
                f"Uploaded bilingual article audio: {bilingual_article_filename}"
            )
        except Exception as e:
            logger.error(f"Failed to upload bilingual article audio: {e}")
            return None

        # Clean up temporary files
        for temp_file in [arabic_article_path, bilingual_article_path]:
            if os.path.exists(temp_file):
                os.remove(temp_file)

        # Validate collected timestamps
        if all_word_timestamps:
            logger.info(f"Total word timestamps collected: {len(all_word_timestamps)}")
        else:
            logger.warning("No word timestamps were collected for this article")

        # Add timestamps to return data
        result = urls.copy()
        result["word_timestamps"] = all_word_timestamps
        result["timestamp_count"] = len(all_word_timestamps)

        logger.info("Article audio creation completed successfully")
        return result

    except Exception as e:
        logger.error(f"Error creating article audio: {str(e)}")
        return None


def generate_word_audio_with_google_tts(
    word_data_list: list[dict[str, Any]],
    sentence_id: int,
    output_dir: str,
) -> list[dict[str, Any]]:
    """
    Generate individual word audio using Google Cloud TTS.

    Args:
        word_data_list: List of word data dictionaries with 'word_form', 'position', etc.
        sentence_id: The sentence ID for generating unique filenames
        output_dir: Directory to save temporary audio files

    Returns:
        List of dictionaries with word data including audio URLs
    """
    if not word_data_list:
        logger.warning("No word data provided for audio generation")
        return []

    os.makedirs(output_dir, exist_ok=True)
    word_audio_results = []

    logger.info(
        f"Generating {len(word_data_list)} word audio clips using Google TTS for sentence {sentence_id}"
    )

    for word_data in word_data_list:
        try:
            word_form = word_data.get("word_form", "").strip()
            position = word_data.get("position", 0)

            if not word_form:
                logger.warning(f"Empty word form for position {position}, skipping")
                continue

            # Create filename for this word
            filename = f"w{sentence_id}_{position:02d}.mp3"

            logger.debug(
                f"Generating audio for word '{word_form}' (position {position})"
            )

            # Generate audio using Google TTS (similar to study words)
            result = generate_arabic_word_audio(word_form, filename)

            if result and result.get("url"):
                word_audio_results.append(
                    {
                        "audio_filename": filename,
                        "audio_url": result["url"],
                        "position": position,
                        "word_form": word_form,
                        "sentence_id": sentence_id,
                        "cached": result.get("cached", False),
                    }
                )

                if result.get("cached"):
                    logger.debug(f"Used cached audio for word '{word_form}'")
                else:
                    logger.debug(f"Generated new audio for word '{word_form}'")

            else:
                logger.warning(
                    f"Failed to generate audio for word '{word_form}' at position {position}"
                )

        except Exception as e:
            logger.error(
                f"Error generating audio for word at position {word_data.get('position', 'unknown')}: {e}"
            )
            continue

    logger.info(
        f"Successfully generated {len(word_audio_results)}/{len(word_data_list)} word audio clips for sentence {sentence_id}"
    )
    return word_audio_results


def cut_word_audio_clips(
    _audio_file_path: str,
    _word_timestamps: list[dict[str, Any]],
    _output_dir: str,
    _word_prefix: str = "word",
    sentence_id: int | None = None,
) -> list[dict[str, Any]]:
    """
    DEPRECATED: This function is no longer used.
    Word audio is now generated using Google TTS instead of cutting from ElevenLabs audio.

    Cut individual word audio clips from sentence audio using ffmpeg.

    Args:
        audio_file_path: Path to the source sentence audio file
        word_timestamps: List of word timestamp dictionaries with start_time, end_time
        output_dir: Directory to save word audio clips
        word_prefix: Prefix for word audio filenames

    Returns:
        List of dictionaries with word data including audio file paths
    """
    logger.warning(
        "cut_word_audio_clips is deprecated. Use generate_word_audio_with_google_tts instead."
    )
    return []


def process_word_audio_for_latest_articles() -> bool:
    """
    Process word audio for the most recently inserted articles.
    This is used in the full pipeline to automatically process word audio after insertion.
    """
    logger.info("🔍 Finding latest articles for word audio processing")

    try:
        # Query for the latest articles (most recently inserted)
        import os

        from dotenv import load_dotenv

        from supabase import create_client

        load_dotenv()

        supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

        # Get the 3 most recent articles that don't have word audio processed yet
        result = (
            supabase.table("articles")
            .select("id, title")
            .order("created_at", desc=True)
            .limit(3)
            .execute()
        )

        if not result.data:
            logger.warning("No articles found for word audio processing")
            return False

        logger.info(f"📝 Processing word audio for {len(result.data)} latest articles")

        success_count = 0
        for article in result.data:
            article_id = article["id"]
            article_title = article["title"]

            logger.info(
                f"🎵 Processing word audio for article {article_id}: {article_title}"
            )

            try:
                import tempfile

                with tempfile.TemporaryDirectory() as temp_dir:
                    success = process_word_audio_for_article(
                        article_id=article_id, output_dir=temp_dir
                    )

                    if success:
                        logger.info(
                            f"✅ Successfully processed word audio for article {article_id}"
                        )
                        success_count += 1
                    else:
                        logger.warning(
                            f"⚠️ Failed to process word audio for article {article_id}"
                        )

            except Exception as e:
                logger.error(
                    f"❌ Error processing word audio for article {article_id}: {e}"
                )

        logger.info(
            f"📊 Word audio processing complete: {success_count}/{len(result.data)} articles successful"
        )
        return success_count > 0

    except Exception as e:
        logger.error(f"❌ Failed to process word audio for latest articles: {e}")
        return False


def process_word_audio_for_sentences(
    sentences: list[dict],
    _arabic_audio_path: str,
    output_dir: str,
    sentence_id_offset: int = 0,
) -> dict[int, list[dict[str, Any]]]:
    """
    Process word-level audio for multiple sentences.

    Args:
        sentences: List of sentence data with word timestamps
        arabic_audio_path: Path to the Arabic sentence audio file
        output_dir: Directory to save word audio clips
        sentence_id_offset: Offset for sentence IDs in logging

    Returns:
        Dictionary mapping sentence indices to word audio data
    """
    word_audio_by_sentence = {}

    for sentence_idx, sentence in enumerate(sentences):
        sentence_id = sentence.get("id") or (sentence_idx + sentence_id_offset + 1)
        word_data_list = sentence.get("word_timestamps", [])

        if not word_data_list:
            logger.debug(f"No word data for sentence {sentence_id}")
            continue

        logger.info(
            f"Processing word audio for sentence {sentence_id} with {len(word_data_list)} words"
        )

        # Generate word audio using Google TTS
        word_audio_data = generate_word_audio_with_google_tts(
            word_data_list=word_data_list,
            sentence_id=sentence_id,
            output_dir=output_dir,
        )

        if word_audio_data:
            # Word audio is already uploaded by Google TTS, use data directly
            # Store by sentence index
            word_audio_by_sentence[sentence_idx] = word_audio_data

            logger.info(
                f"Processed {len(word_audio_data)} word audio clips for sentence {sentence_id}"
            )
        else:
            logger.warning(f"No word audio clips generated for sentence {sentence_id}")

    return word_audio_by_sentence


def process_word_audio_for_article(article_id: int, output_dir: str) -> bool:
    """
    Process word-level audio for all sentences in an article.

    This function should be called after the main pipeline has completed
    and sentence audio files are available.

    Args:
        article_id: The article ID to process
        output_dir: Directory to save temporary word audio files

    Returns:
        True if processing was successful
    """
    try:
        client = get_supabase_client()
        os.makedirs(output_dir, exist_ok=True)

        logger.info(f"Processing word audio for article {article_id}")

        # Get article sentences with word timestamps
        sentences_result = (
            client.table("article_sentences")
            .select("id, arabic, audio_url")
            .eq("article_id", article_id)
            .execute()
        )

        if not sentences_result.data:
            logger.warning(f"No sentences found for article {article_id}")
            return False

        total_sentences = len(sentences_result.data)
        processed_sentences = 0

        for sentence in sentences_result.data:
            sentence_id = sentence["id"]

            # Get word timestamps for this sentence
            words_result = (
                client.table("sentence_words")
                .select("id, position, word_form, start_time, end_time")
                .eq("sentence_id", sentence_id)
                .order("position")
                .execute()
            )

            # Filter out NULL timestamps in Python
            if words_result.data:
                words_result.data = [
                    word
                    for word in words_result.data
                    if word.get("start_time") is not None
                ]

            if not words_result.data:
                logger.debug(f"No word timestamps found for sentence {sentence_id}")
                continue

            word_data_list = []
            for word in words_result.data:
                word_data_list.append(
                    {
                        "word_form": word["word_form"],
                        "start_time": word["start_time"],
                        "end_time": word["end_time"],
                        "word_id": word["id"],
                        "position": word["position"],
                    }
                )

            if not word_data_list:
                logger.debug(f"No valid word data for sentence {sentence_id}")
                continue

            # Generate word audio using Google TTS (no need to download sentence audio)
            word_audio_data = generate_word_audio_with_google_tts(
                word_data_list=word_data_list,
                sentence_id=sentence_id,
                output_dir=output_dir,
            )

            if word_audio_data:
                # Word audio is already uploaded by Google TTS, use data directly
                uploaded_word_data = word_audio_data

                # Update database with word audio URLs
                word_audio_urls = []
                for uploaded_word in uploaded_word_data:
                    audio_url = uploaded_word.get("audio_url")
                    position = uploaded_word.get("position")
                    logger.debug(
                        f"Processing uploaded word: position={position}, audio_url={audio_url}"
                    )
                    if audio_url and position is not None:
                        word_audio_urls.append((position, audio_url))
                        logger.debug(f"Added word audio URL for update: {audio_url}")
                    else:
                        logger.warning(
                            f"Missing audio_url or position for word: position={position}, audio_url={audio_url}"
                        )

                # Update words in database
                for position, audio_url in word_audio_urls:
                    try:
                        logger.debug(
                            f"Updating word audio URL for sentence {sentence_id}, position {position}: {audio_url}"
                        )
                        result = (
                            client.table("sentence_words")
                            .update({"audio_url": audio_url})
                            .eq("sentence_id", sentence_id)
                            .eq("position", position)
                            .execute()
                        )

                        # Check if the update actually affected any rows
                        if result.data:
                            logger.debug(
                                f"Successfully updated {len(result.data)} word(s) with audio URL"
                            )
                        else:
                            logger.warning(
                                f"No words were updated for sentence {sentence_id}, position {position}"
                            )

                    except Exception as e:
                        logger.error(
                            f"Failed to update word audio URL for position {position}: {e}"
                        )

                logger.info(
                    f"Updated {len(word_audio_urls)} word audio URLs for sentence {sentence_id}"
                )
                processed_sentences += 1

            # No cleanup needed for Google TTS approach (no temporary sentence audio files)

        logger.info(
            f"Successfully processed word audio for {processed_sentences}/{total_sentences} sentences in article {article_id}"
        )
        return processed_sentences > 0

    except Exception as e:
        logger.error(f"Error processing word audio for article {article_id}: {e}")
        return False
