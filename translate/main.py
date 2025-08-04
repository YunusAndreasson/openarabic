#!/usr/bin/env python3
import argparse
import json
import logging
import os
import subprocess
import sys
from pathlib import Path

# Add current directory to path for testing
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from data.config import (
    AUTHOR_FOLDER_MAPPING,
    AUTHOR_NUMBER_MAPPING,
    DEFAULT_BATCH_SIZE,
    INBOX_DIR,
    SPLIT_DIR,
    TRANSLATE_DIR,
)
from pipeline.split_file import split_file as split_text
from pipeline.translate import translate_file as translate_text
from utils.progress_tracker import (
    log_irrecoverable_error,
    log_phase_start,
    log_pipeline_completion,
    log_pipeline_start,
    progress_tracker,
    suppress_verbose_logging,
)
from utils.responses_api import load_api_keys, token_tracker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

# Suppress verbose logging from external libraries
suppress_verbose_logging()
logger = logging.getLogger(__name__)

load_api_keys()


def find_input_files_in_inbox() -> list[tuple[str, str, str]]:
    """
    Find all input files in the inbox directory.
    Returns list of tuples: (input_file_path, author_folder, author_name)
    """
    input_files: list[tuple[str, str, str]] = []

    if not os.path.exists(INBOX_DIR):
        return input_files

    for author_folder in os.listdir(INBOX_DIR):
        author_folder_path = os.path.join(INBOX_DIR, author_folder)

        if not os.path.isdir(author_folder_path):
            continue

        if author_folder not in AUTHOR_FOLDER_MAPPING:
            logger.debug(f"Skipping unknown author folder: {author_folder}")
            continue

        author_name = AUTHOR_FOLDER_MAPPING[author_folder]

        # Look for .txt files in the author folder
        for file_name in os.listdir(author_folder_path):
            if file_name.endswith(".txt"):
                input_file_path = os.path.join(author_folder_path, file_name)
                input_files.append((input_file_path, author_folder, author_name))

    return input_files


def run_split_file(input_file: str, author_folder: str) -> str:
    """Split the input text into sentences."""
    # Create split output filename based on input filename with author prefix
    input_path = Path(input_file)
    author_number = author_folder.split("_")[0]  # Extract number from folder name
    split_filename = f"{author_number}_{input_path.stem}_split.json"
    output_file = os.path.join(SPLIT_DIR, split_filename)

    # Ensure split directory exists
    os.makedirs(SPLIT_DIR, exist_ok=True)

    split_text(input_file, output_file)
    if not os.path.exists(output_file):
        raise RuntimeError(f"Split file not created: {output_file}")
    return output_file


def review_split_file(
    split_file: str, author_name: str, force_yes: bool = False
) -> bool:
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
        logger.info(f"Author: {author_name}")
        logger.info(f"Title: {metadata['title']}")
        logger.info(f"Summary: {metadata['summary']}")
        logger.info(f"Difficulty Level: {metadata['difficulty_level']}")
        logger.info(f"Total Sentences: {metadata['total_units']}")

        if units:
            logger.info("\n📝 Preview of first 3 sentences:")
            for i, unit in enumerate(units[:3]):
                # Handle both string and dict formats
                if isinstance(unit, dict):
                    sentence = unit.get("text", "")
                else:
                    sentence = str(unit)

                sentence = sentence[:80] + "..." if len(sentence) > 80 else sentence
                logger.info(f"  {i + 1}. {sentence}")

        logger.info(f"📁 Split file saved to: {split_file}")

        return confirm_step(
            "Review complete. Would you like to proceed with translation?",
            force_yes,
        )

    except Exception as e:
        logger.error(f"❌ Error reading split file: {str(e)}")
        return False


def run_translation(input_file: str, output_file: str, batch_size: int) -> None:
    """Translate the previously split file."""
    if not translate_text(
        input_file, output_file, batch_size, use_conversation_continuity=False
    ):
        logger.error("❌ Translation failed.")
        raise RuntimeError("Translation failed.")


def review_translation(
    output_file: str, author_name: str, force_yes: bool = False
) -> bool:
    """Review the translation output and ask user if they want to continue."""
    if not os.path.exists(output_file):
        logger.error(f"❌ Translation output file not found: {output_file}")
        return False

    try:
        with open(output_file, encoding="utf-8") as f:
            data = json.load(f)

        metadata = data.get("metadata", {})
        translations = data.get("translations", [])

        logger.info("\n📋 Translation Review:")
        logger.info(f"Author: {author_name}")
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
            force_yes,
        )

    except Exception as e:
        logger.error(f"❌ Error reading translation file: {str(e)}")
        return False


def run_insert_only() -> None:
    """Run only the database insertion step."""
    logger.info("Running database insertion step...")

    # Load API keys to ensure environment variables are set
    from utils.responses_api import load_api_keys

    load_api_keys()

    # Get current environment and add our variables
    env = os.environ.copy()

    result = subprocess.run(
        [
            sys.executable,
            "pipeline/insert.py",
        ],
        capture_output=True,
        text=True,
        cwd=os.path.dirname(os.path.abspath(__file__)),
        env=env,
    )
    if result.returncode != 0:
        logger.error("❌ insert.py failed.")
        if result.stdout:
            logger.error(f"stdout: {result.stdout}")
        if result.stderr:
            logger.error(f"stderr: {result.stderr}")
        raise RuntimeError("insert.py failed.")
    logger.info("✅ Database insertion completed successfully.")


def confirm_step(prompt: str, force_yes: bool = False) -> bool:
    """Get user confirmation for a step"""
    if force_yes:
        logger.info(f"Auto-confirming: {prompt}")
        return True

    while True:
        response = input(f"{prompt} (y/n): ").lower().strip()
        if response in ["y", "yes"]:
            return True
        elif response in ["n", "no"]:
            return False
        logger.error("Please answer 'y' or 'n'.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Arabic Translation Pipeline - Step by Step",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Pipeline Phases:
  1. Split: Split input files from 0_inbox into sentences
  2. Translate: Translate split sentences to English
  3. Insert: Process through ElevenLabs and insert into database

Examples:
  python main.py --split                    # Split all files from inbox and review
  python main.py --translate                # Translate split files and review
  python main.py --insert                   # Insert into database
  python main.py --split --translate        # Split then translate
  python main.py --translate --insert       # Translate then insert
  python main.py --split --translate --insert  # Full pipeline
  python main.py --split --translate --insert --force-yes  # Full pipeline with auto-confirm
        """,
    )

    parser.add_argument(
        "--split",
        action="store_true",
        help="Split input files from 0_inbox into sentences and review",
    )

    parser.add_argument(
        "--translate",
        action="store_true",
        help="Translate split files and review",
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

    parser.add_argument(
        "--force-yes",
        "-y",
        action="store_true",
        help="Automatically answer 'yes' to all confirmation questions",
    )

    args = parser.parse_args()

    if not any([args.split, args.translate, args.insert]):
        parser.print_help()
        sys.exit(1)

    if args.batch_size < 1 or args.batch_size > 15:
        raise ValueError(f"Batch size must be between 1 and 15, got: {args.batch_size}")

    # Start pipeline
    log_pipeline_start()

    # Only run split phase if specifically requested
    if args.split:
        log_phase_start("Split")

        input_files = find_input_files_in_inbox()
        if not input_files:
            log_irrecoverable_error(
                f"No input files found in inbox directory: {INBOX_DIR}"
            )
            raise FileNotFoundError(
                f"No input files found in inbox directory: {INBOX_DIR}"
            )

        # Start progress tracking for split phase
        progress_tracker.start_phase(
            "Split", len(input_files), "Processing input files"
        )

        split_files = []
        for _i, (input_file, author_folder, author_name) in enumerate(input_files):
            progress_tracker.set_description(f"Processing {author_name}")
            split_file = run_split_file(input_file, author_folder)
            split_files.append((split_file, author_name))
            progress_tracker.update(1)

        progress_tracker.finish_phase()

        # Review all split files
        for split_file, author_name in split_files:
            if not review_split_file(split_file, author_name, args.force_yes):
                return

    # Only run translate phase if specifically requested
    if args.translate:
        # Find all split files in the split directory
        split_files = []
        if os.path.exists(SPLIT_DIR):
            for file_name in os.listdir(SPLIT_DIR):
                if file_name.endswith("_split.json"):
                    split_file = os.path.join(SPLIT_DIR, file_name)
                    # Extract author number from filename
                    author_number = file_name.split("_")[0]
                    author_name = AUTHOR_NUMBER_MAPPING.get(author_number, "Unknown")
                    split_files.append((split_file, author_number, author_name))

        if not split_files:
            log_irrecoverable_error(f"No split files found in: {SPLIT_DIR}")
            raise FileNotFoundError(f"No split files found in: {SPLIT_DIR}")

        log_phase_start("Translate")

        # Start progress tracking for translation phase
        progress_tracker.start_phase(
            "Translate", len(split_files), "Translating sentences"
        )

        for _i, (split_file, author_number, author_name) in enumerate(split_files):
            progress_tracker.set_description(f"Translating {author_name}")

            # Create translation output filename
            split_path = Path(split_file)
            # Remove the author prefix and _split suffix, then add author prefix and _translated suffix
            base_name = split_path.stem.replace("_split", "")
            if base_name.startswith(f"{author_number}_"):
                base_name = base_name[len(f"{author_number}_") :]
            translate_filename = f"{author_number}_{base_name}_translated.json"
            output_file = os.path.join(TRANSLATE_DIR, translate_filename)

            # Ensure translate directory exists
            os.makedirs(os.path.dirname(output_file), exist_ok=True)

            run_translation(split_file, output_file, args.batch_size)

            if not review_translation(output_file, author_name, args.force_yes):
                return

            progress_tracker.update(1)

    # Only run insert phase if specifically requested
    if args.insert:
        # Find all translation files in the translate directory
        translation_files = []
        if os.path.exists(TRANSLATE_DIR):
            for file_name in os.listdir(TRANSLATE_DIR):
                if file_name.endswith("_translated.json"):
                    translation_file = os.path.join(TRANSLATE_DIR, file_name)
                    # Extract author number from filename
                    author_number = file_name.split("_")[0]
                    author_name = AUTHOR_NUMBER_MAPPING.get(author_number, "Unknown")
                    translation_files.append(
                        (translation_file, author_number, author_name)
                    )

        progress_tracker.finish_phase()

        if not translation_files:
            log_irrecoverable_error(f"No translation files found in: {TRANSLATE_DIR}")
            raise FileNotFoundError(f"No translation files found in: {TRANSLATE_DIR}")

        log_phase_start("Insert")

        # Start progress tracking for insert phase
        progress_tracker.start_phase(
            "Insert",
            len(translation_files),
            "Processing through ElevenLabs and database",
        )

        # Update insert.py to handle the new file structure
        # For now, we'll use the legacy approach but with the new file locations
        run_insert_only()

        progress_tracker.finish_phase()

    # Report token usage statistics
    if token_tracker.api_calls > 0:
        logger.info(f"📊 {token_tracker}")

    log_pipeline_completion()


__all__ = [
    "run_split_file",
    "run_translation",
    "confirm_step",
    "review_split_file",
    "review_translation",
    "find_input_files_in_inbox",
]


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("\n⚠️  Operation cancelled by user")
        sys.exit(130)
    except Exception as e:
        log_irrecoverable_error(str(e))
        sys.exit(1)
