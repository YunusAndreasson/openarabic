#!/usr/bin/env python3
import argparse
import logging
import os
import sys
from pathlib import Path

# Add current directory to path for testing
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load API keys at startup
try:
    import utils.set_keys  # noqa: F401  # Import for side effects only

    logging.getLogger(__name__).info("API keys loaded from set_keys.py")
except ImportError:
    logging.getLogger(__name__).warning(
        "set_keys.py not found, using environment variables"
    )

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
    progress_tracker,
    suppress_verbose_logging,
)
from utils.responses_api import load_api_keys, token_tracker
from utils.review_helpers import review_file_with_preview
from utils.subprocess_utils import run_pipeline_step

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
    return review_file_with_preview(
        file_path=split_file,
        author_name=author_name,
        file_type="Split",
        force_yes=force_yes,
        confirm_prompt="Review complete. Would you like to proceed with translation?",
    )


def run_translation(
    input_file: str,
    output_file: str,
    batch_size: int,
    use_conversation_continuity: bool = True,
) -> None:
    """Run the full translation pipeline."""
    if not translate_text(
        input_file, output_file, batch_size, use_conversation_continuity=True
    ):
        logger.error("❌ Translation failed.")
        raise RuntimeError("Translation failed.")


def review_translation(
    output_file: str, author_name: str, force_yes: bool = False
) -> bool:
    """Review the translation output and ask user if they want to continue."""
    return review_file_with_preview(
        file_path=output_file,
        author_name=author_name,
        file_type="Translation",
        force_yes=force_yes,
        confirm_prompt="Review complete. Would you like to proceed with database insertion?",
    )


def run_insert_only() -> None:
    """Run only the database insertion step."""

    # Load API keys to ensure environment variables are set
    from utils.responses_api import load_api_keys

    load_api_keys()

    # Run the insertion step using the subprocess utility
    run_pipeline_step(
        script_path="pipeline/insert.py",
        description="database insertion",
        cwd=os.path.dirname(os.path.abspath(__file__)),
    )


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
    # Pipeline start is now handled by progress bars

    # Only run split phase if specifically requested
    if args.split:
        # Phase start is now handled by progress bars

        input_files = find_input_files_in_inbox()
        if not input_files:
            logger.error(f"No input files found in inbox directory: {INBOX_DIR}")
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
            logger.error(f"No split files found in: {SPLIT_DIR}")
            raise FileNotFoundError(f"No split files found in: {SPLIT_DIR}")

        # Phase start is now handled by progress bars

        # Start progress tracking for translation phase
        progress_tracker.start_phase("Translate", len(split_files), "Translating files")

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

        progress_tracker.finish_phase()

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

        if not translation_files:
            logger.error(f"No translation files found in: {TRANSLATE_DIR}")
            raise FileNotFoundError(f"No translation files found in: {TRANSLATE_DIR}")

        # Phase start is now handled by progress bars

        # Calculate total sentences for progress tracking
        total_sentences = 0
        for translation_file, _, _ in translation_files:
            try:
                import json

                with open(translation_file, encoding="utf-8") as f:
                    data = json.load(f)
                    if "translations" not in data or not isinstance(
                        data["translations"], list
                    ):
                        raise ValueError(
                            f"Invalid translation file structure: missing 'translations' array in {translation_file}"
                        )
                    total_sentences += len(data["translations"])
            except Exception as e:
                logger.debug(
                    f"Could not read sentence count from {translation_file}: {e}"
                )

        # Start progress tracking for insert phase
        progress_tracker.start_phase(
            "Insert",
            total_sentences,
            "Processing sentences through ElevenLabs and database",
        )

        # Process each translation file
        for _i, (translation_file, _author_number, author_name) in enumerate(
            translation_files
        ):
            # Get sentence count for progress tracking
            try:
                import json

                with open(translation_file, encoding="utf-8") as f:
                    data = json.load(f)
                    if "translations" not in data or not isinstance(
                        data["translations"], list
                    ):
                        raise ValueError(
                            f"Invalid translation file structure: missing 'translations' array in {translation_file}"
                        )
                    sentence_count = len(data["translations"])
            except Exception as e:
                raise RuntimeError(
                    f"Failed to read sentence count from {translation_file}: {e}"
                ) from e

            # Run the insertion step for this specific file
            run_pipeline_step(
                script_path="pipeline/insert.py",
                description=f"database insertion for {author_name}",
                cwd=os.path.dirname(os.path.abspath(__file__)),
            )

            # Update progress for all sentences in this file
            progress_tracker.update(sentence_count)

        progress_tracker.finish_phase()

    # Report token usage statistics
    if token_tracker.api_calls > 0:
        pass  # Token usage reporting removed to reduce noise

    # Pipeline completion is now handled by progress bars


__all__ = [
    "run_split_file",
    "run_translation",
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
        logger.error(f"Pipeline failed: {e}")
        sys.exit(1)
