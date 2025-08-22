import functools
import hashlib
import io
import logging
import os
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
    BILINGUAL_AUDIO_PAUSE_MS,
    DEFAULT_VOICE_SETTINGS,
    ELEVENLABS_API_KEY,
    ELEVENLABS_TTS_MODEL_ID,
    ENGLISH_VOICE_ID,
    ENGLISH_VOICE_SETTINGS,
    GOOGLE_CLOUD_CREDENTIALS_PATH,
    SUPABASE_URL,
)
from data.models import AudioResult, BilingualAudioResult
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

        # Debug the response
        logger.debug(f"TTS Response type: {type(response)}")

        # Handle generator response (new ElevenLabs API format)
        if hasattr(response, "__iter__") and not hasattr(response, "audio"):
            logger.debug("Response is a generator, iterating to get audio data")
            try:
                # Collect all chunks from the generator and concatenate them
                audio_chunks = []
                chunk_count = 0

                for audio_chunk in response:
                    chunk_count += 1
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
                            f"No audio data found in chunk {chunk_count}. Available attributes: {[attr for attr in dir(audio_chunk) if not attr.startswith('_')]}"
                        )
                        return None

                    audio_chunks.append(chunk_data)
                    logger.debug(
                        f"Collected chunk {chunk_count}: {len(chunk_data)} bytes"
                    )

                # Concatenate all chunks
                if audio_chunks:
                    audio_data = b"".join(audio_chunks)
                    logger.debug(
                        f"Concatenated {chunk_count} chunks into {len(audio_data)} bytes"
                    )
                else:
                    logger.error("No audio chunks collected")
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
            "duration": getattr(response, "duration", "unknown"),
            "voice_id": voice_id,
            "text": text,
        }

    except Exception as e:
        logger.error(f"Speech generation failed: {e}")
        return None


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


def generate_sentence_audio(
    text: str,
    filename: str,
    tashkeel_text: str | None = None,
    previous_text: str | None = None,
    next_text: str | None = None,
) -> AudioResult | None:
    """
    Generate audio for a sentence using ElevenLabs, with optional tashkeel, SSML, and context.
    Returns an AudioResult object with URL.
    """
    try:
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

        with open(temp_audio_path, "rb") as f:
            get_supabase_client().storage.from_("audio").upload(
                filename,
                f,
                file_options={"content-type": "audio/mpeg"},
            )
            url = f"{SUPABASE_URL}/storage/v1/object/public/audio/{filename}"
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

        return AudioResult(
            url=url,
            filename=filename,
            duration=response.get("duration") if response else "unknown",
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

        # Create delay segment (1 second)
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


def generate_bilingual_sentence_audio(
    english_text: str,
    arabic_text: str,
    filename: str,
    title: str | None = None,
    summary: str | None = None,
    tashkeel_text: str | None = None,
    previous_text: str | None = None,
    next_text: str | None = None,
) -> BilingualAudioResult | None:
    """
    Generate bilingual audio for a sentence with optional title and summary intro (English + Arabic).

    Args:
        english_text: English translation text
        arabic_text: Arabic text
        filename: Output filename
        title: Optional title to read in English first
        summary: Optional summary to read in English after title
        tashkeel_text: Arabic text with diacritics (preferred)
        previous_text: Previous text for context
        next_text: Next text for context

    Returns:
        BilingualAudioResult with URL and timing information
    """
    try:
        logger.info(
            f"Starting bilingual audio generation for: '{english_text[:50]}...' + '{arabic_text[:50]}...'"
        )

        # Collect all audio segments
        audio_segments = []
        segment_info = []

        # Generate title audio (if provided)
        if title and title.strip():
            logger.info(f"Generating title audio: '{title}'")
            title_response = generate_speech(
                text=title.strip(),
                voice_id=ENGLISH_VOICE_ID,
                voice_settings=VoiceSettings(**ENGLISH_VOICE_SETTINGS),
            )
            if title_response and title_response.get("audio"):
                audio_segments.append(title_response["audio"])
                segment_info.append(f"Title: {len(title_response['audio'])} bytes")
                logger.info(
                    f"Title audio generated: {len(title_response['audio'])} bytes"
                )
            else:
                logger.warning("Failed to generate title audio")

        # Generate summary audio (if provided)
        if summary and summary.strip():
            logger.info(f"Generating summary audio: '{summary[:50]}...'")
            summary_response = generate_speech(
                text=summary.strip(),
                voice_id=ENGLISH_VOICE_ID,
                voice_settings=VoiceSettings(**ENGLISH_VOICE_SETTINGS),
            )
            if summary_response and summary_response.get("audio"):
                audio_segments.append(summary_response["audio"])
                segment_info.append(f"Summary: {len(summary_response['audio'])} bytes")
                logger.info(
                    f"Summary audio generated: {len(summary_response['audio'])} bytes"
                )
            else:
                logger.warning("Failed to generate summary audio")

        # Generate main English audio
        logger.info("Generating main English audio...")
        english_response = generate_speech(
            text=english_text,
            voice_id=ENGLISH_VOICE_ID,
            voice_settings=VoiceSettings(**ENGLISH_VOICE_SETTINGS),
        )
        if not english_response or not english_response.get("audio"):
            logger.error("Failed to generate main English audio")
            return None

        english_audio = english_response["audio"]
        english_duration = english_response.get("duration", "unknown")
        audio_segments.append(english_audio)
        segment_info.append(f"English: {len(english_audio)} bytes")
        logger.info(
            f"Main English audio generated: {len(english_audio)} bytes, duration: {english_duration}"
        )

        # Generate Arabic audio
        logger.info("Generating Arabic audio...")
        arabic_response = generate_speech(
            text=tashkeel_text if tashkeel_text else arabic_text,
            voice_id=ARABIC_VOICE_ID,
            voice_settings=VoiceSettings(**DEFAULT_VOICE_SETTINGS),
        )
        if not arabic_response or not arabic_response.get("audio"):
            logger.error("Failed to generate Arabic audio")
            return None

        arabic_audio = arabic_response["audio"]
        arabic_duration = arabic_response.get("duration", "unknown")
        audio_segments.append(arabic_audio)
        segment_info.append(f"Arabic: {len(arabic_audio)} bytes")
        logger.info(
            f"Arabic audio generated: {len(arabic_audio)} bytes, duration: {arabic_duration}"
        )

        # Validate audio lengths
        for i, audio_data in enumerate(audio_segments):
            if len(audio_data) < 1000:
                logger.warning(
                    f"Audio segment {i + 1} seems very short: {len(audio_data)} bytes"
                )

        # Create multi-segment audio with 1-second delays
        logger.info(
            f"Creating multi-segment audio with {len(audio_segments)} segments: {segment_info}"
        )
        combined_audio_data = create_multi_audio_with_delays(
            audio_segments,
            delay_ms=1000,  # 1 second delay between segments
        )

        # Validate and save audio
        if not validate_mp3(combined_audio_data):
            logger.error("Invalid MP3 data for multi-segment audio")
            return None

        logger.info(f"Multi-segment audio created: {len(combined_audio_data)} bytes")

        # Save to temporary file
        temp_audio_path = os.path.join(AUDIO_TEMP_DIR, filename)
        with open(temp_audio_path, "wb") as f:
            f.write(combined_audio_data)

        # Upload to Supabase storage
        with open(temp_audio_path, "rb") as f:
            get_supabase_client().storage.from_("audio").upload(
                filename,
                f,
                file_options={"content-type": "audio/mpeg"},
            )
            url = f"{SUPABASE_URL}/storage/v1/object/public/audio/{filename}"

        # Clean up temporary file
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

        # Calculate durations for multi-segment audio
        total_segments = len(audio_segments)
        total_duration = "unknown"
        try:
            # Estimate total duration with delays (1 second per segment + 1 second delays)
            estimated_duration = total_segments * 1.0  # Assume ~1 second per segment
            estimated_duration += (
                total_segments - 1
            ) * 1.0  # Add 1 second delays between segments
            total_duration = estimated_duration
            logger.info(
                f"Estimated total duration: {total_duration:.2f}s for {total_segments} segments with 1s delays"
            )
        except Exception:
            total_duration = "unknown"
            logger.warning("Could not estimate total duration")

        logger.info(f"Bilingual audio generation completed successfully: {filename}")

        return BilingualAudioResult(
            url=url,
            filename=filename,
            duration=total_duration,
            english_duration=english_duration,
            arabic_duration=arabic_duration,
            pause_duration=1.0,  # 1 second delays between segments
        )

    except Exception as e:
        logger.error(f"Error generating bilingual sentence audio: {str(e)}")
        return None


def download_audio_for_concat(filename: str, dest_path: str) -> bool:
    """
    Download audio file from Supabase storage for concatenation.

    Args:
        filename: Audio filename in storage
        dest_path: Local destination path

    Returns:
        True if successful, False otherwise
    """
    try:
        # Download audio from Supabase storage
        response = get_supabase_client().storage.from_("audio").download(filename)

        if response:
            # Save to local file
            with open(dest_path, "wb") as f:
                f.write(response)
            return True
        else:
            logger.error(f"Failed to download audio file: {filename}")
            return False

    except Exception as e:
        logger.error(f"Error downloading audio file {filename}: {e}")
        return False
