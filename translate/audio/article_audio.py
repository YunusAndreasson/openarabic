"""Article-level audio generation."""

import logging
import os

from elevenlabs import VoiceSettings

from audio.combiner import create_multi_audio_with_delays
from audio.elevenlabs import generate_speech
from audio.storage import generate_audio_filename
from data.config import (
    ARABIC_VOICE_ID,
    AUDIO_TEMP_DIR,
    BILINGUAL_AUDIO_PAUSE_MS,
    DEFAULT_VOICE_SETTINGS,
    ENGLISH_VOICE_ID,
    ENGLISH_VOICE_SETTINGS,
    VoiceSettingsDict,
)
from utils.config_common import get_storage_url
from utils.error_handling import handle_speech_generation_error
from utils.storage import get_supabase_client


def _create_voice_settings(settings: VoiceSettingsDict) -> VoiceSettings:
    """Create VoiceSettings from typed dict configuration.

    Uses explicit keyword args to satisfy type checker.
    """
    return VoiceSettings(
        stability=settings.get("stability"),
        similarity_boost=settings.get("similarity_boost"),
        use_speaker_boost=settings.get("use_speaker_boost"),
        speed=settings.get("speed"),
    )


logger = logging.getLogger(__name__)


def create_article_audio(
    sentences: list[dict],
    article_title: str | None = None,
    output_dir: str = AUDIO_TEMP_DIR,
) -> dict[str, str] | None:
    """
    Create article-level audio files in one pass:
    1. Arabic-only MP3: all sentences concatenated with 500ms delays
    2. Bilingual MP3: title + English/Arabic mixed with 500ms delays

    Args:
        sentences: List of sentence dictionaries with 'arabic_text', 'english_text', 'tashkeel'
        article_title: Article title for bilingual audio intro
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

        # Add title to bilingual audio if provided (summary is excluded)
        if article_title and article_title.strip():
            title_response = generate_speech(
                text=article_title.strip(),
                voice_id=ENGLISH_VOICE_ID,
                voice_settings=_create_voice_settings(ENGLISH_VOICE_SETTINGS),
            )
            if title_response and title_response.get("audio"):
                bilingual_segments.append(title_response["audio"])
                # Title audio generated
            else:
                logger.warning("Failed to generate title audio")

        # Note: Article summary is intentionally excluded from audio generation
        # as per requirements - only title and sentence content are included

        # Process each sentence

        for i, sentence in enumerate(sentences):
            arabic_text = sentence.get("arabic_text", "")
            english_text = sentence.get("english_text", "")
            tashkeel_text = sentence.get("tashkeel", arabic_text)

            if not arabic_text or not english_text:
                logger.warning(f"Skipping sentence {i + 1} - missing text")
                continue

            # Generate Arabic audio for this sentence
            try:
                arabic_response = generate_speech(
                    text=tashkeel_text,
                    voice_id=ARABIC_VOICE_ID,
                    voice_settings=_create_voice_settings(DEFAULT_VOICE_SETTINGS),
                )

                if not arabic_response or not arabic_response.get("audio"):
                    logger.warning(
                        f"Failed to generate Arabic audio for sentence {i + 1}"
                    )
                    continue

                arabic_audio = arabic_response["audio"]
                arabic_segments.append(arabic_audio)

            except Exception as e:
                handle_speech_generation_error(e, "Arabic", i)
                continue

            # Generate English audio for bilingual version (without timestamps for now)
            try:
                english_response = generate_speech(
                    text=english_text,
                    voice_id=ENGLISH_VOICE_ID,
                    voice_settings=_create_voice_settings(ENGLISH_VOICE_SETTINGS),
                )
                if not english_response or not english_response.get("audio"):
                    logger.warning(
                        f"Failed to generate English audio for sentence {i + 1}"
                    )
                    continue

                english_audio = english_response["audio"]

                # Add English then Arabic to bilingual segments
                bilingual_segments.append(english_audio)
                bilingual_segments.append(arabic_audio)

            except Exception as e:
                handle_speech_generation_error(e, "English", i)
                # Still add Arabic audio to bilingual if we have it
                bilingual_segments.append(arabic_audio)

        if not arabic_segments:
            logger.warning(
                "No Arabic audio segments generated - skipping article audio creation"
            )
            return None

        if not bilingual_segments:
            logger.warning(
                "No bilingual audio segments generated - skipping article audio creation"
            )
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
        logger.error(f"Error creating article audio: {e!s}")
        return None


__all__ = ["create_article_audio"]
