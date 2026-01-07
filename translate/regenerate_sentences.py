#!/usr/bin/env python3
"""
Regenerate English audio for sentences marked with english_repeat = TRUE.

Uses optimal quality settings discovered through testing:
- Maximum stability (1.0) for consistent output
- Maximum similarity_boost (1.0) to match original voice closely
- Slower speed (0.85) for better clarity
- Text cleaning to remove problematic punctuation
- Adam voice (ENGLISH_VOICE_ID)

This script:
1. Queries sentences where english_repeat = TRUE
2. Regenerates English audio using ElevenLabs with optimal settings
3. Reuses existing Arabic audio (downloads from Supabase)
4. Creates new bilingual audio (English + 500ms pause + Arabic)
5. Uploads new audio files and updates database URLs

Usage:
    uv run python regenerate_sentences.py
"""

import logging
import os
import re
import sys

import requests
from elevenlabs import VoiceSettings

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load API keys (imported for side effects)
try:
    import utils.set_keys as _set_keys  # noqa: F401

    del _set_keys  # Cleanup namespace, import was for side effects only
except ImportError:
    pass

from audio.audio_utils import create_bilingual_audio, generate_speech
from data.config import (
    AUDIO_TEMP_DIR,
    BILINGUAL_AUDIO_PAUSE_MS,
    ENGLISH_VOICE_ID,
)
from utils.responses_api import load_api_keys
from utils.storage_utils import generate_audio_filename, get_supabase_client

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

load_api_keys()
os.makedirs(AUDIO_TEMP_DIR, exist_ok=True)


# OPTIMAL QUALITY SETTINGS (discovered through testing)
OPTIMAL_SETTINGS = {
    "stability": 1.0,  # Robust stability (must be 0.0, 0.5, or 1.0 per ElevenLabs API)
    "similarity_boost": 1.0,  # Maximum similarity to original voice
    "style": 0.0,  # No exaggeration, pure neutral
    "use_speaker_boost": True,  # Enhanced clarity
    "speed": 0.85,  # Slower for better clarity
}


def clean_text_for_tts(text: str) -> str:
    """
    Clean text to make it more TTS-friendly.
    Removes problematic punctuation and formatting.
    """
    # Remove multiple dots (...)
    text = re.sub(r"\.{2,}", ".", text)

    # Remove excessive exclamation/question marks
    text = re.sub(r"!{2,}", "!", text)
    text = re.sub(r"\?{2,}", "?", text)

    # Remove question+exclamation combos that can confuse TTS
    text = re.sub(r"\?\!+", "?", text)
    text = re.sub(r"\!\?+", "!", text)

    # Clean up spaces
    text = re.sub(r"\s+", " ", text).strip()

    # Ensure single space after punctuation
    text = re.sub(r"([.!?])\s*([A-Z])", r"\1 \2", text)

    return text


def download_audio_from_url(audio_url: str) -> bytes | None:
    """Download audio from Supabase storage."""
    try:
        if not audio_url.startswith("http"):
            supabase_url = os.getenv("SUPABASE_URL")
            audio_url = f"{supabase_url}/storage/v1/object/public/audio/{audio_url}"

        response = requests.get(audio_url, timeout=30)
        response.raise_for_status()
        return response.content
    except Exception as e:
        logger.error(f"Download failed: {e}")
        return None


def upload_audio_to_storage(audio_data: bytes, filename: str) -> str | None:
    """Upload audio to Supabase storage."""
    try:
        client = get_supabase_client()
        client.storage.from_("audio").upload(
            filename, audio_data, file_options={"content-type": "audio/mpeg"}
        )
        logger.info(f"✓ Uploaded: {filename}")
        return filename
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        return None


def regenerate_sentence(
    sentence_id: int, english_text: str, arabic_audio_url: str
) -> dict[str, str | None]:
    """
    Regenerate sentence audio with optimal quality settings.
    """
    logger.info(f"Processing sentence {sentence_id}")

    result = {"english_url": None, "bilingual_url": None}

    try:
        # Clean the text for TTS
        original_text = english_text
        cleaned_text = clean_text_for_tts(english_text)

        if cleaned_text != original_text:
            logger.info(f"  Text cleaned: '{original_text}' → '{cleaned_text}'")

        # Generate English audio with optimal settings
        english_response = generate_speech(
            text=cleaned_text,
            voice_id=ENGLISH_VOICE_ID,
            voice_settings=VoiceSettings(**OPTIMAL_SETTINGS),
        )

        if not english_response or not english_response.get("audio"):
            logger.error("Failed to generate English audio")
            return result

        english_audio = english_response["audio"]

        # Download existing Arabic audio
        arabic_audio = download_audio_from_url(arabic_audio_url)
        if not arabic_audio:
            return result

        # Create bilingual audio
        bilingual_audio = create_bilingual_audio(
            english_audio=english_audio,
            arabic_audio=arabic_audio,
            pause_duration_ms=BILINGUAL_AUDIO_PAUSE_MS,
        )

        # Upload English audio
        english_filename = generate_audio_filename()
        english_url = upload_audio_to_storage(english_audio, english_filename)

        if not english_url:
            return result

        result["english_url"] = english_filename

        # Upload bilingual audio
        bilingual_filename = generate_audio_filename()
        bilingual_url = upload_audio_to_storage(bilingual_audio, bilingual_filename)

        if bilingual_url:
            result["bilingual_url"] = bilingual_filename
            logger.info(f"✓ Sentence {sentence_id} completed successfully")

        return result

    except Exception as e:
        logger.error(f"Error: {e}")
        return result


def main() -> None:
    logger.info("=" * 80)
    logger.info("Sentence Audio Regeneration - OPTIMAL QUALITY")
    logger.info("Settings:")
    logger.info("  - Stability: 0.95 (maximum)")
    logger.info("  - Similarity Boost: 1.0 (maximum - closest to original voice)")
    logger.info("  - Style: 0.0 (neutral)")
    logger.info("  - Speed: 0.85 (slower for better clarity)")
    logger.info("  - Text Cleaning: Enabled")
    logger.info("=" * 80)

    try:
        client = get_supabase_client()

        # Get sentences with english_repeat = TRUE
        response = (
            client.table("article_sentences")
            .select("id, english, audio_url")
            .eq("english_repeat", True)
            .execute()
        )

        sentences = response.data

        if not sentences:
            logger.info("No sentences to process (english_repeat=TRUE)")
            return

        logger.info(f"Found {len(sentences)} sentences to regenerate\n")

        successful = 0
        failed = 0

        for idx, sentence in enumerate(sentences):
            logger.info(f"[{idx + 1}/{len(sentences)}] Sentence {sentence['id']}")
            logger.info(f"  Text: {sentence['english'][:80]}...")

            result = regenerate_sentence(
                sentence_id=sentence["id"],
                english_text=sentence["english"],
                arabic_audio_url=sentence["audio_url"],
            )

            if result["english_url"] and result["bilingual_url"]:
                # Update database
                try:
                    client.table("article_sentences").update(
                        {
                            "audio_url_english": result["english_url"],
                            "audio_url_bilingual": result["bilingual_url"],
                        }
                    ).eq("id", sentence["id"]).execute()
                    successful += 1
                except Exception as e:
                    logger.error(f"Database update failed: {e}")
                    failed += 1
            else:
                failed += 1

            print()  # Spacing

        # Summary
        logger.info("=" * 80)
        logger.info("SUMMARY")
        logger.info("=" * 80)
        logger.info(f"Total: {len(sentences)}")
        logger.info(f"Successful: {successful}")
        logger.info(f"Failed: {failed}")
        logger.info("=" * 80)
        logger.info("Next step: Run regenerate_articles.py to update article audio")

    except Exception as e:
        logger.error(f"Fatal error: {e}")
        raise


if __name__ == "__main__":
    main()
