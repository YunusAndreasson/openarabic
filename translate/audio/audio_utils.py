import functools
import hashlib
import io
import logging
import os
import random
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
    max_attempts: int = 3, delay: float = 1, backoff: float = 2, jitter: bool = True
) -> Callable:
    """Retry decorator for network operations with exponential backoff and jitter.

    Args:
        max_attempts: Maximum number of retry attempts
        delay: Initial delay in seconds
        backoff: Backoff multiplier (e.g., 2 for exponential backoff)
        jitter: Add random jitter to delay to avoid thundering herd
    """

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

                    # Check if this is a rate limiting error (429)
                    is_rate_limit = False
                    error_msg = str(e).lower()
                    if '429' in error_msg or 'rate limit' in error_msg or 'system_busy' in error_msg:
                        is_rate_limit = True
                        logger.warning(f"Rate limit detected on attempt {attempts}/{max_attempts}: {e}")
                    else:
                        logger.warning(f"Attempt {attempts}/{max_attempts} failed: {e}")

                    if attempts == max_attempts:
                        if is_rate_limit:
                            logger.error(f"Rate limit exceeded after {max_attempts} attempts: {e}")
                        else:
                            logger.error(f"Failed after {max_attempts} attempts: {e}")
                        raise

                    # Calculate delay with jitter to avoid thundering herd
                    if jitter:
                        # Add random jitter up to 25% of current delay
                        jitter_amount = current_delay * 0.25 * random.random()  # noqa: S311
                        actual_delay = current_delay + jitter_amount
                    else:
                        actual_delay = current_delay

                    logger.info(f"Retrying in {actual_delay:.1f} seconds...")
                    time.sleep(actual_delay)

                    # Exponential backoff for rate limits, linear for others
                    if is_rate_limit:
                        current_delay *= backoff  # Exponential backoff for rate limits
                    else:
                        current_delay = delay * attempts  # Linear backoff for other errors

                    # Cap the delay at 60 seconds maximum
                    current_delay = min(current_delay, 60)

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

        try:
            eleven_labs = ElevenLabs(api_key=api_key)
        except Exception as e:
            logger.error(f"Failed to initialize ElevenLabs client: {e}")
            raise AudioGenerationError(
                f"ElevenLabs client initialization failed: {e}"
            ) from e

    return eleven_labs


@retry_operation(max_attempts=5, delay=2, backoff=2)
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
            # Audio file uploaded successfully
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
            # Audio file uploaded successfully
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
            # Audio file uploaded successfully
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
                    # Segment loaded successfully
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

        # Create article audio segments

        # Generate all audio segments in one pass
        arabic_segments = []
        bilingual_segments = []

        # Add title and summary to bilingual audio if provided
        if article_title and article_title.strip():
            title_response = generate_speech(
                text=article_title.strip(),
                voice_id=ENGLISH_VOICE_ID,
                voice_settings=VoiceSettings(**ENGLISH_VOICE_SETTINGS),
            )
            if title_response and title_response.get("audio"):
                bilingual_segments.append(title_response["audio"])
                # Title audio generated
            else:
                logger.warning("Failed to generate title audio")

        if article_summary and article_summary.strip():
            summary_response = generate_speech(
                text=article_summary.strip(),
                voice_id=ENGLISH_VOICE_ID,
                voice_settings=VoiceSettings(**ENGLISH_VOICE_SETTINGS),
            )
            if summary_response and summary_response.get("audio"):
                bilingual_segments.append(summary_response["audio"])
                # Summary audio generated
            else:
                logger.warning("Failed to generate summary audio")

        # Process each sentence

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

            # Generate Arabic audio for this sentence
            try:
                arabic_response = generate_speech(
                    text=tashkeel_text,
                    voice_id=ARABIC_VOICE_ID,
                    voice_settings=VoiceSettings(**DEFAULT_VOICE_SETTINGS),
                )

                if not arabic_response or not arabic_response.get("audio"):
                    logger.warning(f"Failed to generate Arabic audio for sentence {i + 1}")
                    continue

                arabic_audio = arabic_response["audio"]
                arabic_segments.append(arabic_audio)

            except Exception as e:
                error_msg = str(e).lower()
                if 'content_against_policy' in error_msg or 'terms of service' in error_msg:
                    logger.warning(f"Skipping sentence {i + 1} due to content policy violation")
                else:
                    logger.warning(f"Error generating Arabic audio for sentence {i + 1}: {e}")
                continue

            # Generate English audio for bilingual version (without timestamps for now)
            try:
                english_response = generate_speech(
                    text=english_text,
                    voice_id=ENGLISH_VOICE_ID,
                    voice_settings=VoiceSettings(**ENGLISH_VOICE_SETTINGS),
                )
                if not english_response or not english_response.get("audio"):
                    logger.warning(f"Failed to generate English audio for sentence {i + 1}")
                    continue

                english_audio = english_response["audio"]

                # Add English then Arabic to bilingual segments
                bilingual_segments.append(english_audio)
                bilingual_segments.append(arabic_audio)

            except Exception as e:
                error_msg = str(e).lower()
                if 'content_against_policy' in error_msg or 'terms of service' in error_msg:
                    logger.warning(f"Skipping English audio for sentence {i + 1} due to content policy violation")
                else:
                    logger.warning(f"Error generating English audio for sentence {i + 1}: {e}")
                # Still add Arabic audio to bilingual if we have it
                bilingual_segments.append(arabic_audio)

            logger.info(
                f"Sentence {i + 1} audio generated successfully"
            )

        if not arabic_segments:
            logger.warning("No Arabic audio segments generated - skipping article audio creation")
            return None

        if not bilingual_segments:
            logger.warning("No bilingual audio segments generated - skipping article audio creation")
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
            # Article audio uploaded successfully
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
            # Bilingual article audio uploaded successfully
        except Exception as e:
            logger.error(f"Failed to upload bilingual article audio: {e}")
            return None

        # Clean up temporary files
        for temp_file in [arabic_article_path, bilingual_article_path]:
            if os.path.exists(temp_file):
                os.remove(temp_file)

        # Validate collected timestamps
        # Return audio URLs without timestamps
        result = urls.copy()

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

    # Generate word audio clips using Google TTS

    for word_data in word_data_list:
        word_form = word_data.get("word_form", "").strip()
        position = word_data.get("position", 0)

        if not word_form:
            logger.warning(f"Empty word form for position {position}, skipping")
            continue

        # Create filename for this word
        filename = f"w{sentence_id}_{position:02d}.mp3"

        # Generate audio for word
        try:
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

                # Word audio generated successfully

            else:
                logger.warning(
                    f"Failed to generate audio for word '{word_form}' at position {position}"
                )

        except Exception as e:
            # Check if it's a content policy violation
            error_msg = str(e).lower()
            if 'content_against_policy' in error_msg or 'terms of service' in error_msg:
                logger.warning(f"Skipping word '{word_form}' due to content policy violation")
            else:
                logger.warning(f"Error generating audio for word '{word_form}' at position {position}: {e}")
            continue

    # Word audio generation completed
    return word_audio_results


def process_word_audio_for_latest_articles() -> bool:
    """
    Process word audio for the most recently inserted articles.
    This is used in the full pipeline to automatically process word audio after insertion.
    """
    # Find latest articles for word audio processing

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

        # Process word audio for latest articles

        success_count = 0
        for article in result.data:
            article_id = article["id"]
            _article_title = article["title"]  # Unused but kept for potential future use

            # Process word audio for article

            try:
                import tempfile

                with tempfile.TemporaryDirectory() as temp_dir:
                    success = process_word_audio_for_article(
                        article_id=article_id, output_dir=temp_dir
                    )

                    if success:
                        # Article word audio processing completed
                        success_count += 1
                    else:
                        logger.warning(
                            f"⚠️ Failed to process word audio for article {article_id}"
                        )

            except Exception as e:
                logger.error(
                    f"❌ Error processing word audio for article {article_id}: {e}"
                )

        # Word audio processing batch completed
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
        word_data_list = sentence.get("words", [])

        if not word_data_list:
            # No word data for sentence
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

        # Process word audio for article

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

        _total_sentences = len(sentences_result.data)
        processed_sentences = 0

        for sentence in sentences_result.data:
            sentence_id = sentence["id"]

            # Get words for this sentence
            words_result = (
                client.table("sentence_words")
                .select("id, position, word_form")
                .eq("sentence_id", sentence_id)
                .order("position")
                .execute()
            )

            if not words_result.data:
                # No words found for sentence
                continue

            word_data_list = []
            for word in words_result.data:
                word_data_list.append(
                    {
                        "word_form": word["word_form"],
                        "word_id": word["id"],
                        "position": word["position"],
                    }
                )

            if not word_data_list:
                # No valid word data for sentence
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
                    # Process uploaded word
                    if audio_url and position is not None:
                        word_audio_urls.append((position, audio_url))
                        # Added word audio URL for update
                    else:
                        logger.warning(
                            f"Missing audio_url or position for word: position={position}, audio_url={audio_url}"
                        )

                # Update words in database
                for position, audio_url in word_audio_urls:
                    try:
                        # Update word audio URL in database
                        result = (
                            client.table("sentence_words")
                            .update({"audio_url": audio_url})
                            .eq("sentence_id", sentence_id)
                            .eq("position", position)
                            .execute()
                        )

                        # Check if the update actually affected any rows
                        if result.data:
                            # Successfully updated word with audio URL
                            pass
                        else:
                            logger.warning(
                                f"No words were updated for sentence {sentence_id}, position {position}"
                            )

                    except Exception as e:
                        logger.error(
                            f"Failed to update word audio URL for position {position}: {e}"
                        )

                # Updated word audio URLs for sentence
                processed_sentences += 1

            # No cleanup needed for Google TTS approach (no temporary sentence audio files)

            # Word audio processed for article
        return processed_sentences > 0

    except Exception as e:
        logger.error(f"Error processing word audio for article {article_id}: {e}")
        return False
