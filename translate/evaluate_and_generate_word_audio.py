"""Evaluate and generate audio for single words using Chirp 3: HD.

This script:
1. Evaluates words with missing audio URLs in the database
2. Generates audio using Google Cloud TTS Chirp 3: HD voices
3. Uploads to Supabase storage
4. Updates database with audio URLs

Usage:
    # Evaluate only (count empty audio entries)
    uv run python translate/evaluate_and_generate_word_audio.py --dry-run

    # Generate audio for all empty entries
    uv run python translate/evaluate_and_generate_word_audio.py

    # Generate for specific table only
    uv run python translate/evaluate_and_generate_word_audio.py --table sentence_words

    # Generate for specific word by ID
    uv run python translate/evaluate_and_generate_word_audio.py --word-id 12345 --table sentence_words

    # Test with Rasalgethi voice (default)
    uv run python translate/evaluate_and_generate_word_audio.py --voice Rasalgethi --limit 10
"""

import argparse
import logging
import os
import sys
from typing import Any

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import set_keys to configure environment variables
from utils import set_keys  # noqa: F401

from audio.audio_utils import (
    generate_arabic_word_audio,
    generate_english_word_audio,
)
from utils.storage_utils import get_supabase_client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def evaluate_empty_audio(table: str | None = None) -> dict[str, Any]:
    """
    Evaluate words with empty audio URLs in the database.

    Args:
        table: Specific table to evaluate ('sentence_words' or 'roots'), or None for all

    Returns:
        Dictionary with evaluation statistics
    """
    client = get_supabase_client()
    stats = {}

    if table is None or table == "sentence_words":
        # Count sentence words with NULL audio_url
        result = (
            client.table("sentence_words")
            .select("id", count="exact")
            .is_("audio_url", "null")
            .execute()
        )
        stats["sentence_words_empty"] = result.count

        # Get sample words
        sample_result = (
            client.table("sentence_words")
            .select("id, word_form, position, sentence_id")
            .is_("audio_url", "null")
            .limit(5)
            .execute()
        )
        stats["sentence_words_sample"] = sample_result.data

    if table is None or table == "roots":
        # Count roots with empty audio_url (Arabic)
        result = (
            client.table("roots")
            .select("id", count="exact")
            .or_("audio_url.eq.,audio_url.is.null")
            .execute()
        )
        stats["roots_arabic_empty"] = result.count

        # Count roots with empty audio_url_en (English)
        result = (
            client.table("roots")
            .select("id", count="exact")
            .or_("audio_url_en.eq.,audio_url_en.is.null")
            .execute()
        )
        stats["roots_english_empty"] = result.count

        # Get sample roots
        sample_result = (
            client.table("roots")
            .select("id, letters, meaning")
            .or_("audio_url.eq.,audio_url.is.null,audio_url_en.eq.,audio_url_en.is.null")
            .limit(5)
            .execute()
        )
        stats["roots_sample"] = sample_result.data

    return stats


def generate_audio_for_sentence_word(
    word_id: int, voice: str | None = None, force: bool = False
) -> dict[str, Any]:
    """
    Generate audio for a specific sentence word.

    Args:
        word_id: The ID of the sentence word
        voice: Optional voice name (default: 'Rasalgethi')
        force: If True, regenerate audio even if it already exists

    Returns:
        Dictionary with generation result
    """
    client = get_supabase_client()

    # Get word data
    result = (
        client.table("sentence_words")
        .select("id, word_form, position, sentence_id, audio_url")
        .eq("id", word_id)
        .execute()
    )

    if not result.data:
        return {"success": False, "error": f"Word ID {word_id} not found"}

    word_data = result.data[0]
    word_form = word_data["word_form"]
    sentence_id = word_data["sentence_id"]
    position = word_data["position"]

    # Generate filename
    filename = f"w{sentence_id}_{position:02d}.mp3"

    # Generate audio using existing helper function (pass force flag)
    try:
        voice_name = voice or "Rasalgethi"
        audio_result = generate_arabic_word_audio(word_form, filename, voice_name, force)

        if audio_result and audio_result.get("url"):
            # Update database
            client.table("sentence_words").update(
                {"audio_url": audio_result["url"]}
            ).eq("id", word_id).execute()

            return {
                "success": True,
                "word_id": word_id,
                "word_form": word_form,
                "audio_url": audio_result["url"],
                "cached": audio_result.get("cached", False),
                "voice": voice_name,
            }
        else:
            return {
                "success": False,
                "word_id": word_id,
                "error": "Failed to generate audio",
            }

    except Exception as e:
        logger.error(f"Error generating audio for word {word_id}: {e}")
        return {"success": False, "word_id": word_id, "error": str(e)}


def generate_audio_for_root(root_id: int, voice: str | None = None, force: bool = False) -> dict[str, Any]:
    """
    Generate audio for a specific root word.

    Args:
        root_id: The ID of the root word
        voice: Optional voice name (default: 'Rasalgethi')
        force: If True, regenerate audio even if it already exists

    Returns:
        Dictionary with generation result
    """
    client = get_supabase_client()

    # Get root data
    result = (
        client.table("roots")
        .select("id, letters, meaning, audio_url, audio_url_en")
        .eq("id", root_id)
        .execute()
    )

    if not result.data:
        return {"success": False, "error": f"Root ID {root_id} not found"}

    root_data = result.data[0]
    letters = root_data["letters"]
    meaning = root_data["meaning"]

    results = {"success": True, "root_id": root_id, "generated": []}
    voice_name = voice or "Rasalgethi"

    # Generate Arabic audio if missing or force regeneration
    if not root_data["audio_url"] or force:
        filename = f"root_{root_id}_ar.mp3"

        try:
            audio_result = generate_arabic_word_audio(letters, filename, voice_name, force)

            if audio_result and audio_result.get("url"):
                client.table("roots").update({"audio_url": audio_result["url"]}).eq(
                    "id", root_id
                ).execute()

                results["generated"].append(
                    {
                        "language": "Arabic",
                        "text": letters,
                        "audio_url": audio_result["url"],
                        "cached": audio_result.get("cached", False),
                        "voice": voice_name,
                    }
                )
            else:
                results["success"] = False
                results.setdefault("errors", []).append(
                    "Failed to generate Arabic audio"
                )

        except Exception as e:
            logger.error(f"Error generating Arabic audio for root {root_id}: {e}")
            results["success"] = False
            results.setdefault("errors", []).append(f"Arabic generation error: {e}")

    # Generate English audio if missing or force regeneration
    if not root_data["audio_url_en"] or force:
        filename = f"root_{root_id}_en.mp3"

        try:
            audio_result = generate_english_word_audio(meaning, filename, voice_name, force)

            if audio_result and audio_result.get("url"):
                client.table("roots").update({"audio_url_en": audio_result["url"]}).eq(
                    "id", root_id
                ).execute()

                results["generated"].append(
                    {
                        "language": "English",
                        "text": meaning,
                        "audio_url": audio_result["url"],
                        "cached": audio_result.get("cached", False),
                        "voice": voice_name,
                    }
                )
            else:
                results["success"] = False
                results.setdefault("errors", []).append(
                    "Failed to generate English audio"
                )

        except Exception as e:
            logger.error(f"Error generating English audio for root {root_id}: {e}")
            results["success"] = False
            results.setdefault("errors", []).append(f"English generation error: {e}")

    return results


def generate_audio_batch(
    table: str, limit: int | None = None, voice: str | None = None
) -> dict[str, Any]:
    """
    Generate audio for a batch of words with empty audio URLs.

    Args:
        table: Table to process ('sentence_words' or 'roots')
        limit: Optional limit on number of words to process
        voice: Optional voice name (default: 'Rasalgethi')

    Returns:
        Dictionary with generation statistics
    """
    client = get_supabase_client()
    stats = {"total": 0, "success": 0, "failed": 0, "cached": 0}

    if table == "sentence_words":
        # Get words with NULL audio_url
        query = client.table("sentence_words").select("id").is_("audio_url", "null")

        if limit:
            query = query.limit(limit)

        result = query.execute()

        stats["total"] = len(result.data)
        logger.info(f"Processing {stats['total']} sentence words...")

        for word in result.data:
            word_id = word["id"]
            result = generate_audio_for_sentence_word(word_id, voice)

            if result.get("success"):
                stats["success"] += 1
                if result.get("cached"):
                    stats["cached"] += 1
            else:
                stats["failed"] += 1
                logger.warning(
                    f"Failed to generate audio for word {word_id}: {result.get('error')}"
                )

            # Log progress every 10 words
            if (stats["success"] + stats["failed"]) % 10 == 0:
                logger.info(
                    f"Progress: {stats['success']}/{stats['total']} successful, {stats['failed']} failed"
                )

    elif table == "roots":
        # Get roots with empty audio URLs
        query = (
            client.table("roots")
            .select("id")
            .or_("audio_url.eq.,audio_url.is.null,audio_url_en.eq.,audio_url_en.is.null")
        )

        if limit:
            query = query.limit(limit)

        result = query.execute()

        stats["total"] = len(result.data)
        logger.info(f"Processing {stats['total']} root words...")

        for root in result.data:
            root_id = root["id"]
            result = generate_audio_for_root(root_id, voice)

            if result.get("success"):
                stats["success"] += 1
                for gen in result.get("generated", []):
                    if gen.get("cached"):
                        stats["cached"] += 1
            else:
                stats["failed"] += 1
                logger.warning(
                    f"Failed to generate audio for root {root_id}: {result.get('errors')}"
                )

            # Log progress every 10 roots
            if (stats["success"] + stats["failed"]) % 10 == 0:
                logger.info(
                    f"Progress: {stats['success']}/{stats['total']} successful, {stats['failed']} failed"
                )

    return stats


def main():
    """Main function."""
    parser = argparse.ArgumentParser(
        description="Evaluate and generate audio for single words using Chirp 3: HD"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Evaluate only (count empty audio entries)",
    )
    parser.add_argument(
        "--table",
        choices=["sentence_words", "roots"],
        help="Specific table to process",
    )
    parser.add_argument(
        "--word-id", type=int, help="Generate audio for specific word ID"
    )
    parser.add_argument(
        "--limit", type=int, help="Limit number of words to process (for testing)"
    )
    parser.add_argument(
        "--voice",
        help="Voice name for audio generation (default: 'Rasalgethi')",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force regenerate audio even if it already exists",
    )

    args = parser.parse_args()

    # Validate arguments
    if args.word_id and not args.table:
        logger.error("--word-id requires --table to be specified")
        return 1

    # Dry run - evaluation only
    if args.dry_run:
        logger.info("Evaluating empty audio URLs...")
        stats = evaluate_empty_audio(args.table)

        print("\n=== Audio Evaluation Results ===\n")

        if "sentence_words_empty" in stats:
            print(f"Sentence Words with NULL audio_url: {stats['sentence_words_empty']}")
            if stats.get("sentence_words_sample"):
                print("\nSample sentence words:")
                for word in stats["sentence_words_sample"]:
                    print(
                        f"  - ID {word['id']}: '{word['word_form']}' (sentence {word['sentence_id']}, pos {word['position']})"
                    )

        if "roots_arabic_empty" in stats:
            print(f"\nRoots with empty Arabic audio: {stats['roots_arabic_empty']}")
            print(f"Roots with empty English audio: {stats['roots_english_empty']}")
            if stats.get("roots_sample"):
                print("\nSample roots:")
                for root in stats["roots_sample"]:
                    print(
                        f"  - ID {root['id']}: '{root['letters']}' = {root['meaning']}"
                    )

        print("\n=================================\n")
        return 0

    # Generate audio for specific word ID
    if args.word_id:
        force_msg = " (force regenerate)" if args.force else ""
        logger.info(
            f"Generating audio for {args.table} ID {args.word_id} with voice {args.voice or 'Rasalgethi (default)'}{force_msg}..."
        )

        if args.table == "sentence_words":
            result = generate_audio_for_sentence_word(args.word_id, args.voice, args.force)
        elif args.table == "roots":
            result = generate_audio_for_root(args.word_id, args.voice, args.force)
        else:
            logger.error(f"Unknown table: {args.table}")
            return 1

        if result.get("success"):
            print("\n=== Generation Successful ===\n")
            print(f"Word ID: {result.get('word_id') or result.get('root_id')}")
            print(f"Voice: {args.voice or 'Rasalgethi (default)'}")
            if "word_form" in result:
                print(f"Word: {result['word_form']}")
                print(f"Audio URL: {result['audio_url']}")
                print(f"Cached: {result.get('cached', False)}")
            elif "generated" in result:
                for gen in result["generated"]:
                    print(
                        f"{gen['language']}: {gen['text']} -> {gen['audio_url']} (cached: {gen['cached']})"
                    )
            print("\n=============================\n")
        else:
            print(f"\n=== Generation Failed ===\n")
            print(f"Error: {result.get('error') or result.get('errors')}")
            print("\n=========================\n")
            return 1

        return 0

    # Generate audio for batch
    if not args.table:
        logger.error(
            "Please specify --table (sentence_words or roots) for batch generation, or use --word-id for single word generation"
        )
        return 1

    logger.info(
        f"Generating audio for {args.table} with voice {args.voice or 'Rasalgethi (default)'}..."
    )
    if args.limit:
        logger.info(f"Limited to {args.limit} words")

    stats = generate_audio_batch(args.table, args.limit, args.voice)

    print("\n=== Generation Statistics ===\n")
    print(f"Total words processed: {stats['total']}")
    print(f"Successful: {stats['success']}")
    print(f"Failed: {stats['failed']}")
    print(f"Cached (reused existing): {stats['cached']}")
    print("\n=============================\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
