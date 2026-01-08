"""ElevenLabs TTS integration."""

import logging
import os
from typing import Any

from elevenlabs import VoiceSettings
from elevenlabs.client import ElevenLabs

from audio.retry import retry_operation
from audio.validation import validate_mp3
from data.config import (
    DEFAULT_VOICE_SETTINGS,
    ELEVENLABS_API_KEY,
    ELEVENLABS_TTS_MODEL_ID,
)
from utils.arabic_text import clean_text_for_tts
from utils.exceptions import AudioGenerationError

logger = logging.getLogger(__name__)

# Initialize ElevenLabs client lazily to avoid import-time failures
eleven_labs = None


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

        # Clean text before sending to ElevenLabs (removes invisible/control characters)
        cleaned_text = clean_text_for_tts(text)

        # Use default voice settings if none provided
        if voice_settings is None:
            voice_settings = VoiceSettings(**DEFAULT_VOICE_SETTINGS)  # type: ignore[arg-type]

        # Generate speech
        response = client.text_to_speech.convert(
            text=cleaned_text,
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
        logger.error(f"SPEECH GENERATION FAILED: {e}")
        return None


__all__ = ["generate_speech", "_get_eleven_labs_client"]
