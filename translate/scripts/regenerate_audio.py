#!/usr/bin/env python3
"""Regenerate ElevenLabs audio for an existing article.

Only regenerates audio for specified sentences via ElevenLabs. For article-level
audio, downloads existing sentence audio from Supabase storage and re-concatenates
— no unnecessary ElevenLabs calls.

Usage:
    uv run scripts/regenerate_audio.py 505 --sentence 12   # regen sentence 12 + article audio
    uv run scripts/regenerate_audio.py 505                  # regen ALL sentences + article audio
    uv run scripts/regenerate_audio.py 505 --sentence 12 --skip-article-audio  # sentence only
"""

import argparse
import logging
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import utils.set_keys  # noqa: F401, E402

from audio.combiner import create_multi_audio_with_delays  # noqa: E402
from audio.elevenlabs import generate_speech  # noqa: E402
from audio.storage import generate_audio_filename  # noqa: E402
from data.config import (  # noqa: E402
    ARABIC_VOICE_ID,
    ARABIC_VOICE_SETTINGS,
    BILINGUAL_AUDIO_PAUSE_MS,
    ENGLISH_VOICE_ID,
    ENGLISH_VOICE_SETTINGS,
)
from utils.config_common import get_storage_url  # noqa: E402
from utils.responses_api import load_api_keys  # noqa: E402
from utils.storage import get_supabase_client  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

try:
    from elevenlabs import VoiceSettings
except ImportError:
    logger.error("elevenlabs package not installed")
    sys.exit(1)


def _download_audio_from_storage(filename: str) -> bytes | None:
    """Download an audio file from Supabase storage by filename."""
    try:
        data = get_supabase_client().storage.from_("audio").download(filename)
        return data
    except Exception as e:
        logger.warning(f"Failed to download {filename}: {e}")
        return None


def regenerate_sentence_audio(
    sentence_id: int, arabic_text: str, english_text: str, position: int
) -> dict[str, str | None]:
    """Generate and upload Arabic, English, and bilingual audio for one sentence."""
    result: dict[str, str | None] = {
        "audio_url": None,
        "audio_url_english": None,
        "audio_url_bilingual": None,
    }

    # Arabic
    arabic_response = generate_speech(
        text=arabic_text,
        voice_id=ARABIC_VOICE_ID,
        voice_settings=VoiceSettings(**ARABIC_VOICE_SETTINGS),
    )
    if arabic_response and arabic_response.get("audio"):
        filename = generate_audio_filename()
        get_supabase_client().storage.from_("audio").upload(
            filename, arabic_response["audio"], file_options={"content-type": "audio/mpeg"}
        )
        result["audio_url"] = get_storage_url(filename)
        logger.info(f"  [pos {position}] Arabic audio uploaded")
    else:
        logger.error(f"  [pos {position}] Arabic audio generation failed")

    # English
    english_response = generate_speech(
        text=english_text,
        voice_id=ENGLISH_VOICE_ID,
        voice_settings=VoiceSettings(**ENGLISH_VOICE_SETTINGS),
    )
    if english_response and english_response.get("audio"):
        filename = generate_audio_filename()
        get_supabase_client().storage.from_("audio").upload(
            filename, english_response["audio"], file_options={"content-type": "audio/mpeg"}
        )
        result["audio_url_english"] = get_storage_url(filename)
        logger.info(f"  [pos {position}] English audio uploaded")
    else:
        logger.error(f"  [pos {position}] English audio generation failed")

    # Bilingual (English then Arabic)
    if (
        arabic_response
        and arabic_response.get("audio")
        and english_response
        and english_response.get("audio")
    ):
        bilingual_audio = create_multi_audio_with_delays(
            [english_response["audio"], arabic_response["audio"]],
            delay_ms=BILINGUAL_AUDIO_PAUSE_MS,
        )
        if bilingual_audio:
            filename = generate_audio_filename()
            get_supabase_client().storage.from_("audio").upload(
                filename, bilingual_audio, file_options={"content-type": "audio/mpeg"}
            )
            result["audio_url_bilingual"] = get_storage_url(filename)
            logger.info(f"  [pos {position}] Bilingual audio uploaded")

    # Update DB
    update_data = {k: v for k, v in result.items() if v is not None}
    if update_data:
        get_supabase_client().table("article_sentences").update(update_data).eq(
            "id", sentence_id
        ).execute()
        logger.info(f"  [pos {position}] DB updated with {len(update_data)} audio URLs")

    return result


def regenerate_article_audio(article_id: int) -> None:
    """Regenerate article-level audio by downloading existing sentence audio from storage.

    Downloads Arabic and English audio files for each sentence from Supabase storage,
    then concatenates them into article-level files. No ElevenLabs calls needed.
    """
    supabase = get_supabase_client()

    # Get article title for bilingual intro
    article_data = supabase.table("articles").select("title").eq("id", article_id).execute()
    title = article_data.data[0].get("title") if article_data.data else None

    # Fetch all sentences with their audio URLs
    sentences = (
        supabase.table("article_sentences")
        .select("position, audio_url, audio_url_english")
        .eq("article_id", article_id)
        .order("position")
        .execute()
        .data
    )

    if not sentences:
        logger.error("No sentences found")
        return

    # Download existing audio from Supabase storage
    arabic_segments: list[bytes] = []
    bilingual_segments: list[bytes] = []

    # Generate title audio for bilingual version
    if title and title.strip():
        title_response = generate_speech(
            text=title.strip(),
            voice_id=ENGLISH_VOICE_ID,
            voice_settings=VoiceSettings(**ENGLISH_VOICE_SETTINGS),
        )
        if title_response and title_response.get("audio"):
            bilingual_segments.append(title_response["audio"])
            logger.info("  Title audio generated (1 ElevenLabs call)")

    for s in sentences:
        pos = s["position"]
        ar_file = s.get("audio_url")
        en_file = s.get("audio_url_english")

        if not ar_file:
            logger.warning(f"  [pos {pos}] No Arabic audio URL, skipping")
            continue

        # Download Arabic audio from storage
        ar_data = _download_audio_from_storage(ar_file)
        if not ar_data:
            logger.warning(f"  [pos {pos}] Failed to download Arabic audio")
            continue

        arabic_segments.append(ar_data)

        # Download English audio for bilingual
        if en_file:
            en_data = _download_audio_from_storage(en_file)
            if en_data:
                bilingual_segments.append(en_data)
                bilingual_segments.append(ar_data)
            else:
                logger.warning(f"  [pos {pos}] Failed to download English audio")
        else:
            logger.warning(f"  [pos {pos}] No English audio URL")

    logger.info(
        f"  Downloaded {len(arabic_segments)} Arabic + English audio files from storage"
    )

    if not arabic_segments:
        logger.error("No audio segments collected")
        return

    # Concatenate into article-level files
    arabic_combined = create_multi_audio_with_delays(
        arabic_segments, delay_ms=BILINGUAL_AUDIO_PAUSE_MS
    )
    bilingual_combined = create_multi_audio_with_delays(
        bilingual_segments, delay_ms=BILINGUAL_AUDIO_PAUSE_MS
    )

    if not arabic_combined or not bilingual_combined:
        logger.error("Failed to create combined audio")
        return

    # Upload article-level audio
    ar_filename = generate_audio_filename()
    get_supabase_client().storage.from_("audio").upload(
        ar_filename, arabic_combined, file_options={"content-type": "audio/mpeg"}
    )

    bi_filename = generate_audio_filename()
    get_supabase_client().storage.from_("audio").upload(
        bi_filename, bilingual_combined, file_options={"content-type": "audio/mpeg"}
    )

    # Update articles table
    supabase.table("articles").update(
        {
            "audio_url": get_storage_url(ar_filename),
            "audio_url_bilingual": get_storage_url(bi_filename),
        }
    ).eq("id", article_id).execute()

    logger.info(
        f"Article-level audio updated (Arabic: {len(arabic_combined)} bytes, "
        f"Bilingual: {len(bilingual_combined)} bytes)"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Regenerate ElevenLabs audio for an article")
    parser.add_argument("article_id", type=int, help="Article ID to regenerate audio for")
    parser.add_argument(
        "--sentence",
        type=int,
        default=None,
        metavar="POS",
        help="Regenerate only a specific sentence position (0-indexed)",
    )
    parser.add_argument(
        "--skip-article-audio",
        action="store_true",
        help="Skip article-level audio regeneration",
    )
    args = parser.parse_args()

    load_api_keys()
    supabase = get_supabase_client()

    # Fetch sentences
    query = (
        supabase.table("article_sentences")
        .select("id, position, arabic, english")
        .eq("article_id", args.article_id)
        .order("position")
    )
    if args.sentence is not None:
        query = query.eq("position", args.sentence)

    sentences = query.execute().data
    if not sentences:
        logger.error(f"No sentences found for article {args.article_id}")
        sys.exit(1)

    logger.info(
        f"Regenerating audio for {len(sentences)} sentence(s) of article {args.article_id}"
    )

    for s in sentences:
        logger.info(f"Sentence {s['position']}: {s['arabic'][:50]}...")
        regenerate_sentence_audio(s["id"], s["arabic"], s["english"], s["position"])

    # Article-level audio — downloads existing audio from storage, no extra ElevenLabs calls
    if not args.skip_article_audio:
        logger.info("Regenerating article-level audio (downloading from storage)...")
        regenerate_article_audio(args.article_id)

    logger.info("Done!")


if __name__ == "__main__":
    main()
