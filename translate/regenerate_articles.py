#!/usr/bin/env python3
"""
Regenerate article-level bilingual audio for articles with updated sentences.

This script:
1. Finds all articles that have sentences marked with english_repeat = TRUE
2. For each article:
   - Downloads ALL existing sentence audio (both English and Arabic)
   - For corrected sentences, uses NEW English audio
   - For all other sentences, uses existing English audio
   - Generates title audio via ElevenLabs (1 call per article)
   - Combines all audio with 500ms gaps
   - Skips summary (no summary audio)
3. Uploads new article bilingual audio and updates database

IMPORTANT: This only generates title audio via ElevenLabs.
All sentence audio is downloaded, not regenerated.

Usage:
    uv run python regenerate_articles.py
"""

import logging
import os
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

from audio.audio_utils import create_multi_audio_with_delays, generate_speech
from data.config import (
    AUDIO_TEMP_DIR,
    BILINGUAL_AUDIO_PAUSE_MS,
    ENGLISH_VOICE_ID,
    ENGLISH_VOICE_SETTINGS,
)
from utils.responses_api import load_api_keys
from utils.storage_utils import generate_audio_filename, get_supabase_client

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

load_api_keys()
os.makedirs(AUDIO_TEMP_DIR, exist_ok=True)


def download_audio_from_url(audio_url: str) -> bytes | None:
    """Download audio file from Supabase storage URL."""
    try:
        if not audio_url.startswith("http"):
            supabase_url = os.getenv("SUPABASE_URL")
            if not supabase_url:
                raise ValueError("SUPABASE_URL environment variable not set")
            audio_url = f"{supabase_url}/storage/v1/object/public/audio/{audio_url}"

        response = requests.get(audio_url, timeout=30)
        response.raise_for_status()
        return response.content
    except Exception as e:
        logger.error(f"Failed to download audio from {audio_url}: {e}")
        return None


def upload_audio_to_storage(audio_data: bytes, filename: str) -> str | None:
    """Upload audio data to Supabase storage."""
    try:
        client = get_supabase_client()
        client.storage.from_("audio").upload(
            filename, audio_data, file_options={"content-type": "audio/mpeg"}
        )
        logger.info(f"Uploaded audio: {filename}")
        return filename
    except Exception as e:
        logger.error(f"Failed to upload audio {filename}: {e}")
        return None


def regenerate_article_audio(
    article_id: int, article_title: str | None = None
) -> str | None:
    """
    Regenerate article-level bilingual audio by downloading existing audio.
    Only generates title audio via ElevenLabs.
    """
    logger.info(f"Regenerating article audio for article {article_id}")

    try:
        client = get_supabase_client()

        # Query ALL sentences for this article
        response = (
            client.table("article_sentences")
            .select("id, audio_url, audio_url_english, position")
            .eq("article_id", article_id)
            .order("position")
            .execute()
        )

        sentences = response.data

        if not sentences:
            logger.warning(f"No sentences found for article {article_id}")
            return None

        logger.info(f"Processing {len(sentences)} sentences...")

        bilingual_segments = []

        # Generate title audio (ONLY ElevenLabs call per article)
        if article_title and article_title.strip():
            logger.info("Generating title audio...")
            title_response = generate_speech(
                text=article_title.strip(),
                voice_id=ENGLISH_VOICE_ID,
                voice_settings=VoiceSettings(**ENGLISH_VOICE_SETTINGS),
            )
            if title_response and title_response.get("audio"):
                bilingual_segments.append(title_response["audio"])
            else:
                logger.warning("Failed to generate title audio")

        # Download all sentence audio (NO generation)
        for idx, sentence in enumerate(sentences):
            logger.info(f"Downloading audio for sentence {idx + 1}/{len(sentences)}...")

            english_audio_url = sentence["audio_url_english"]
            arabic_audio_url = sentence["audio_url"]

            # Download English audio (newly generated for corrected sentences, existing for others)
            english_audio = download_audio_from_url(english_audio_url)
            if not english_audio:
                logger.warning(
                    f"Failed to download English audio for sentence {idx + 1}"
                )
                continue

            # Download Arabic audio (existing)
            arabic_audio = download_audio_from_url(arabic_audio_url)
            if not arabic_audio:
                logger.warning(
                    f"Failed to download Arabic audio for sentence {idx + 1}"
                )
                continue

            # Add English then Arabic
            bilingual_segments.append(english_audio)
            bilingual_segments.append(arabic_audio)

        if not bilingual_segments:
            logger.error("No bilingual segments generated")
            return None

        # Combine with 500ms delays
        logger.info("Combining audio segments with 500ms delays...")
        combined_audio = create_multi_audio_with_delays(
            audio_segments=bilingual_segments,
            delay_ms=BILINGUAL_AUDIO_PAUSE_MS,
        )

        if not combined_audio:
            logger.error("Failed to combine audio segments")
            return None

        # Upload article bilingual audio
        article_filename = generate_audio_filename()
        article_url = upload_audio_to_storage(combined_audio, article_filename)

        if not article_url:
            logger.error("Failed to upload article audio")
            return None

        logger.info(f"✓ Successfully regenerated article audio: {article_filename}")
        return article_filename

    except Exception as e:
        logger.error(f"Error regenerating article audio: {e}")
        return None


def main() -> None:
    """Main function to regenerate article audio for affected articles."""
    logger.info("=" * 80)
    logger.info("Article Audio Regeneration")
    logger.info("=" * 80)
    logger.info("This script:")
    logger.info("  - Downloads all existing sentence audio")
    logger.info("  - Generates title audio only (1 ElevenLabs call per article)")
    logger.info("  - Combines with 500ms gaps")
    logger.info("  - Skips summary")
    logger.info("=" * 80)

    try:
        client = get_supabase_client()

        # Get all affected articles
        logger.info("Finding affected articles...")
        articles_response = (
            client.table("article_sentences")
            .select("article_id")
            .eq("english_repeat", True)
            .execute()
        )

        article_ids = list(set(s["article_id"] for s in articles_response.data))

        if not article_ids:
            logger.info("No articles to regenerate")
            return

        logger.info(f"Found {len(article_ids)} articles to regenerate")

        # Regenerate each article
        successful = 0
        failed = 0

        for idx, article_id in enumerate(sorted(article_ids)):
            logger.info(
                f"\n[{idx + 1}/{len(article_ids)}] Processing article {article_id}..."
            )

            # Get article title
            article_response = (
                client.table("articles")
                .select("title")
                .eq("id", article_id)
                .single()
                .execute()
            )

            article_title = (
                article_response.data.get("title") if article_response.data else None
            )

            # Regenerate article audio
            article_filename = regenerate_article_audio(article_id, article_title)

            if article_filename:
                # Update database
                try:
                    client.table("articles").update(
                        {"audio_url_bilingual": article_filename}
                    ).eq("id", article_id).execute()
                    logger.info(f"✓ Updated article {article_id}")
                    successful += 1
                except Exception as e:
                    logger.error(f"✗ Failed to update article {article_id}: {e}")
                    failed += 1
            else:
                logger.error(f"✗ Failed to regenerate article {article_id}")
                failed += 1

        # Summary
        logger.info("\n" + "=" * 80)
        logger.info("SUMMARY")
        logger.info("=" * 80)
        logger.info(f"Total articles: {len(article_ids)}")
        logger.info(f"Successfully updated: {successful}")
        logger.info(f"Failed: {failed}")
        logger.info(f"ElevenLabs API calls: ~{len(article_ids)} (titles only)")
        logger.info("=" * 80)

    except Exception as e:
        logger.error(f"Fatal error: {e}")
        raise


if __name__ == "__main__":
    main()
