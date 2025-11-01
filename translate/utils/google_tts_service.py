"""Google Cloud Text-to-Speech service for single word audio generation."""

import logging
import os
from typing import Any

from google.cloud import texttospeech

from utils.exceptions import AudioGenerationError

logger = logging.getLogger(__name__)


class GoogleTTSService:
    """Google Cloud Text-to-Speech service for single word audio generation."""

    def __init__(self, credentials_path: str | None = None):
        """Initialize the Google Cloud TTS service."""
        # Use service account credentials if provided, otherwise use environment variable
        creds_path = credentials_path or os.getenv("GOOGLE_CLOUD_CREDENTIALS_PATH")
        if creds_path and os.path.exists(creds_path):
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = creds_path
            # Set Google Cloud credentials

        try:
            self.client = texttospeech.TextToSpeechClient()
            # Google Cloud TTS client initialized
        except Exception as e:
            raise AudioGenerationError(
                f"Failed to initialize Google Cloud TTS client: {e}"
            ) from e

    def generate_arabic_word_audio(self, word: str) -> dict[str, Any] | None:
        """Generate audio for an Arabic word using Google Cloud TTS."""
        try:
            # Configure Arabic voice (Modern Standard Arabic) - Chirp 3: HD quality
            voice = texttospeech.VoiceSelectionParams(
                language_code="ar-XA",
                name="ar-XA-Chirp3-HD-Charon",  # Chirp 3: HD male voice for best Arabic quality
                ssml_gender=texttospeech.SsmlVoiceGender.MALE,
            )

            # Configure premium audio output with high quality settings
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=0.8,  # 20% slower for clarity (Chirp 3: HD supports 0.25-2.0)
            )

            # Create enhanced SSML for better Arabic pronunciation
            ssml_text = f"<speak>{word}</speak>"

            # Synthesize speech
            synthesis_input = texttospeech.SynthesisInput(ssml=ssml_text)

            response = self.client.synthesize_speech(
                input=synthesis_input, voice=voice, audio_config=audio_config
            )

            if not response.audio_content:
                logger.error(f"No audio content returned for Arabic word: {word}")
                return None

            return {
                "audio": response.audio_content,
                "format": "mp3",
                "language": "ar-XA",
                "voice": "ar-XA-Chirp3-HD-Charon",  # Chirp 3: HD male voice
                "text": word,
            }

        except Exception as e:
            logger.error(f"Failed to generate Arabic word audio for '{word}': {e}")
            raise AudioGenerationError(f"Arabic TTS generation failed: {e}") from e

    def generate_english_word_audio(self, word: str) -> dict[str, Any] | None:
        """Generate audio for an English word using Google Cloud TTS."""
        try:
            # Configure English voice (US English) - Chirp 3: HD quality
            voice = texttospeech.VoiceSelectionParams(
                language_code="en-US",
                name="en-US-Chirp3-HD-Charon",  # Chirp 3: HD male voice for best English quality
                ssml_gender=texttospeech.SsmlVoiceGender.MALE,
            )

            # Configure premium audio output with high quality settings
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=0.8,  # 20% slower for clarity (Chirp 3: HD supports 0.25-2.0)
            )

            # Create enhanced SSML for better English pronunciation
            ssml_text = f"<speak>{word}</speak>"

            # Synthesize speech
            synthesis_input = texttospeech.SynthesisInput(ssml=ssml_text)

            response = self.client.synthesize_speech(
                input=synthesis_input, voice=voice, audio_config=audio_config
            )

            if not response.audio_content:
                logger.error(f"No audio content returned for English word: {word}")
                return None

            return {
                "audio": response.audio_content,
                "format": "mp3",
                "language": "en-US",
                "voice": "en-US-Chirp3-HD-Charon",  # Chirp 3: HD male voice
                "text": word,
            }

        except Exception as e:
            logger.error(f"Failed to generate English word audio for '{word}': {e}")
            raise AudioGenerationError(f"English TTS generation failed: {e}") from e


__all__ = ["GoogleTTSService"]
