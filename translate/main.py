#!/usr/bin/env python3
import argparse
import json
import logging
import os
import subprocess
import sys

from translate.data.config import (
    DEFAULT_BATCH_SIZE,
    DEFAULT_INPUT_FILE,
    DEFAULT_OUTPUT_FILE,
)
from translate.pipeline.split_file import split_file as split_text
from translate.pipeline.translate import translate_file as translate_text
from translate.utils.api_utils import load_api_keys, token_tracker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

load_api_keys()


def confirm_step(prompt: str) -> bool:
    """Get user confirmation for a step"""
    while True:
        response = input(f"{prompt} (y/n): ").lower().strip()
        if response in ["y", "yes"]:
            return True
        elif response in ["n", "no"]:
            return False
        logger.info("Please answer 'y' or 'n'.")


def run_split_file(input_file: str) -> str:
    """Split the input text into sentences."""
    output_file = os.path.splitext(input_file)[0] + "_split.json"
    split_text(input_file, output_file)
    if not os.path.exists(output_file):
        logger.info(f"❌ Split file not created: {output_file}")
        sys.exit(1)
    return output_file


def review_split_file(split_file: str) -> bool:
    """Review the split file and ask user if they want to continue."""
    if not os.path.exists(split_file):
        logger.info(f"❌ Split file not found: {split_file}")
        return False

    try:
        with open(split_file, encoding="utf-8") as f:
            data = json.load(f)

        units = data.get("units", [])
        metadata = {
            "title": data.get("title", "Unknown"),
            "summary": data.get("summary", "No summary"),
            "difficulty_level": data.get("difficulty_level", "Unknown"),
            "total_units": len(units),
        }

        logger.info("\n📋 Split Review:")
        logger.info(f"Title: {metadata['title']}")
        logger.info(f"Summary: {metadata['summary']}")
        logger.info(f"Difficulty Level: {metadata['difficulty_level']}")
        logger.info(f"Total Sentences: {metadata['total_units']}")

        if units:
            logger.info("\n📝 Preview of first 3 sentences:")
            for i, unit in enumerate(units[:3]):
                sentence = (
                    unit.get("text", "")[:80] + "..."
                    if len(unit.get("text", "")) > 80
                    else unit.get("text", "")
                )
                logger.info(f"  {i + 1}. {sentence}")

        logger.info(f"📁 Split file saved to: {split_file}")

        return confirm_step(
            "Review complete. Would you like to proceed with translation?",
        )

    except Exception as e:
        logger.info(f"❌ Error reading split file: {str(e)}")
        return False


def run_translation(input_file: str, output_file: str, batch_size: int) -> None:
    """Translate the previously split file."""
    if not translate_text(input_file, output_file, batch_size):
        logger.info("❌ Translation failed.")
        sys.exit(1)


def review_translation(output_file: str) -> bool:
    """Review the translation output and ask user if they want to continue."""
    if not os.path.exists(output_file):
        logger.info(f"❌ Translation output file not found: {output_file}")
        return False

    try:
        with open(output_file, encoding="utf-8") as f:
            data = json.load(f)

        metadata = data.get("metadata", {})
        translations = data.get("translations", [])

        logger.info("\n📋 Translation Review:")
        logger.info(f"Title: {metadata.get('title', 'Unknown')}")
        logger.info(f"Summary: {metadata.get('summary', 'No summary')}")
        logger.info(f"Difficulty Level: {metadata.get('difficulty_level', 'Unknown')}")
        logger.info(f"Total Sentences: {len(translations)}")

        if translations:
            logger.info("\n📝 Preview of first 3 translations:")
            for i, translation in enumerate(translations[:3]):
                original = (
                    translation.get("original", "")[:50] + "..."
                    if len(translation.get("original", "")) > 50
                    else translation.get("original", "")
                )
                english = (
                    translation.get("full_translation", "")[:50] + "..."
                    if len(translation.get("full_translation", "")) > 50
                    else translation.get("full_translation", "")
                )
                logger.info(f"  {i + 1}. Original: {original}")
                logger.info(f"     English: {english}")

        logger.info(f"📁 Full translation saved to: {output_file}")

        return confirm_step(
            "Review complete. Would you like to proceed with database insertion?",
        )

    except Exception as e:
        logger.info(f"❌ Error reading translation file: {str(e)}")
        return False


def run_insert_only(input_file: str, output_file: str) -> None:
    """Run only the database insertion step."""
    logger.info("Running database insertion step...")
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "translate.pipeline.insert",
        ],
        capture_output=False,
    )
    if result.returncode != 0:
        logger.info("❌ insert.py failed.")
        sys.exit(1)
    logger.info("✅ Database insertion completed successfully.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Arabic Translation Pipeline - Step by Step",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Pipeline Phases:
  1. Split: Split input.txt into sentences
  2. Translate: Translate split sentences to English
  3. Insert: Process through ElevenLabs and insert into database

Examples:
  python main.py --split                    # Split input.txt and review
  python main.py --translate                # Translate split file and review
  python main.py --insert                   # Insert into database
  python main.py --split --translate        # Split then translate
  python main.py --translate --insert       # Translate then insert
  python main.py --split --translate --insert  # Full pipeline
        """,
    )

    parser.add_argument(
        "--split",
        action="store_true",
        help="Split input.txt into sentences and review",
    )

    parser.add_argument(
        "--translate",
        action="store_true",
        help="Translate split file and review",
    )

    parser.add_argument(
        "--insert",
        action="store_true",
        help="Process through ElevenLabs and insert into database",
    )

    parser.add_argument(
        "--batch-size",
        "-b",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help=f"Batch size for translation (default: {DEFAULT_BATCH_SIZE})",
    )

    args = parser.parse_args()

    if not any([args.split, args.translate, args.insert]):
        parser.print_help()
        sys.exit(1)

    if not os.path.exists(DEFAULT_INPUT_FILE):
        logger.info(f"❌ Input file not found: {DEFAULT_INPUT_FILE}")
        sys.exit(1)

    if args.batch_size < 1 or args.batch_size > 10:
        logger.info(f"❌ Batch size must be between 1 and 10, got: {args.batch_size}")
        sys.exit(1)

    split_file = os.path.splitext(DEFAULT_INPUT_FILE)[0] + "_split.json"

    if args.split:
        logger.info("🔄 Phase 1: Splitting input.txt into sentences...")
        run_split_file(DEFAULT_INPUT_FILE)
        if not review_split_file(split_file):
            logger.info("Pipeline stopped after split review.")
            sys.exit(0)

    if args.translate:
        if not os.path.exists(split_file):
            logger.info(f"❌ Split file not found: {split_file}")
            logger.info("Please run --split first.")
            sys.exit(1)

        logger.info("🔄 Phase 2: Translating sentences...")
        run_translation(split_file, DEFAULT_OUTPUT_FILE, args.batch_size)
        if not review_translation(DEFAULT_OUTPUT_FILE):
            logger.info("Pipeline stopped after translation review.")
            sys.exit(0)

    if args.insert:
        if not os.path.exists(DEFAULT_OUTPUT_FILE):
            logger.info(f"❌ Translation output file not found: {DEFAULT_OUTPUT_FILE}")
            logger.info("Please run --translate first.")
            sys.exit(1)

        logger.info(
            "🔄 Phase 3: Processing through ElevenLabs and inserting into database...",
        )
        run_insert_only(DEFAULT_INPUT_FILE, DEFAULT_OUTPUT_FILE)

    # Report token usage statistics
    if token_tracker.api_calls > 0:
        logger.info(f"📊 {token_tracker}")

    logger.info("✅ Pipeline completed successfully!")
    sys.exit(0)


__all__ = [
    "run_split_file",
    "run_translation",
    "confirm_step",
    "review_split_file",
    "review_translation",
]


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("\n⚠️  Operation cancelled by user")
        sys.exit(130)
