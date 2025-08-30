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
from utils.progress_tracker import suppress_verbose_logging
from utils.responses_api import load_api_keys, token_tracker
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
  4. Word Audio: Cut and upload individual word audio clips

Examples:
  python main.py --split                    # Split all files from inbox
  python main.py --translate                # Translate split files
  python main.py --insert                   # Insert into database
  python main.py --split --translate        # Split then translate
  python main.py --translate --insert       # Translate then insert
  python main.py --split --translate --insert  # Full pipeline
  python main.py --full                     # Complete pipeline (recommended)
  python main.py --auto                     # Same as --full
  python main.py --process-word-audio 123   # Process word audio for article 123
        """,
    )

    parser.add_argument(
        "--split",
        action="store_true",
        help="Split input files from 0_inbox into sentences",
    )

    parser.add_argument(
        "--translate",
        action="store_true",
        help="Translate split files",
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
        "--process-word-audio",
        type=int,
        help="Process word-level audio for a specific article ID",
    )

    parser.add_argument(
        "--full",
        action="store_true",
        help="Run the complete pipeline: split -> translate -> insert -> word-audio",
    )

    parser.add_argument(
        "--auto",
        action="store_true",
        help="Alias for --full: run complete pipeline automatically",
    )

    args = parser.parse_args()

    if not any(
        [
            args.split,
            args.translate,
            args.insert,
            args.process_word_audio,
            args.full,
            args.auto,
        ]
    ):
        parser.print_help()
        sys.exit(1)

    # Handle --full and --auto arguments
    if args.full or args.auto:
        logger.info(
            "🚀 Starting FULL PIPELINE (split -> translate -> insert -> word-audio)"
        )
        args.split = True
        args.translate = True
        args.insert = True
        args.process_word_audio = None  # Will be handled after insert

    if args.batch_size < 1 or args.batch_size > 15:
        raise ValueError(f"Batch size must be between 1 and 15, got: {args.batch_size}")

    # Start pipeline
    # Pipeline start is now handled by progress bars

    # Only run split phase if specifically requested
    if args.split:
        logger.info("📄 PHASE 1: SPLIT - Splitting input files into sentences")

        input_files = find_input_files_in_inbox()
        if not input_files:
            logger.error(f"❌ No input files found in inbox directory: {INBOX_DIR}")
            raise FileNotFoundError(
                f"No input files found in inbox directory: {INBOX_DIR}"
            )

        logger.info(f"📁 Found {len(input_files)} files to process")

        for i, (input_file, author_folder, author_name) in enumerate(input_files, 1):
            logger.info(f"   {i}/{len(input_files)} - Processing {author_name}")
            run_split_file(input_file, author_folder)

        logger.info("✅ Split phase completed successfully")

    # Only run translate phase if specifically requested
    if args.translate:
        logger.info("🌍 PHASE 2: TRANSLATE - Translating sentences to English")

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
            logger.error(f"❌ No split files found in: {SPLIT_DIR}")
            raise FileNotFoundError(f"No split files found in: {SPLIT_DIR}")

        logger.info(f"📄 Found {len(split_files)} split files to translate")

        for i, (split_file, author_number, author_name) in enumerate(split_files, 1):
            logger.info(f"   {i}/{len(split_files)} - Translating {author_name}")

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

        logger.info("✅ Translate phase completed successfully")

    # Only run insert phase if specifically requested
    if args.insert:
        logger.info(
            "💾 PHASE 3: INSERT - Processing through ElevenLabs and inserting into database"
        )

        # Delegate insertion of all files to the insert script in a single run.
        # Note: The insert script discovers and processes all files in TRANSLATE_DIR
        # and archives them. Calling it once avoids double-processing and missing-file races.
        run_pipeline_step(
            script_path="pipeline/insert.py",
            description="database insertion",
            cwd=os.path.dirname(os.path.abspath(__file__)),
        )

        logger.info("✅ Insert phase completed successfully")

        # Handle word audio processing for full pipeline
        if args.full or args.auto:
            logger.info(
                "🎵 PHASE 4: WORD AUDIO - Cutting and uploading individual word audio clips"
            )

            # Import and run word audio processing for the latest inserted articles
            try:
                from audio.audio_utils import process_word_audio_for_latest_articles

                # Process word audio for articles inserted in this session
                success = process_word_audio_for_latest_articles()
                if success:
                    logger.info("✅ Word audio processing completed successfully")
                else:
                    logger.warning("⚠️ Word audio processing completed with some issues")

            except ImportError as e:
                logger.warning(f"⚠️ Word audio processing not available: {e}")
            except Exception as e:
                logger.error(f"❌ Error during word audio processing: {e}")

    # Only run word audio processing if specifically requested
    if args.process_word_audio:
        logger.info(
            f"🎵 WORD AUDIO - Processing word-level audio for article {args.process_word_audio}"
        )

        # Import word audio processing function
        try:
            import tempfile

            from audio.audio_utils import process_word_audio_for_article

            # Create temporary directory for word audio processing
            with tempfile.TemporaryDirectory() as temp_dir:
                success = process_word_audio_for_article(
                    article_id=args.process_word_audio, output_dir=temp_dir
                )

                if success:
                    logger.info(
                        f"✅ Successfully processed word audio for article {args.process_word_audio}"
                    )
                else:
                    logger.error(
                        f"❌ Failed to process word audio for article {args.process_word_audio}"
                    )

        except ImportError as e:
            logger.error(f"❌ Word audio processing not available: {e}")
        except Exception as e:
            logger.error(f"❌ Error processing word audio: {e}")

    # Final pipeline completion message
    if args.full or args.auto:
        logger.info("🎉 FULL PIPELINE COMPLETED SUCCESSFULLY!")
        logger.info("   📄 Split → 🌍 Translate → 💾 Insert → 🎵 Word Audio")
    elif any([args.split, args.translate, args.insert, args.process_word_audio]):
        logger.info("✅ Pipeline phases completed successfully")

    # Report token usage statistics
    if token_tracker.api_calls > 0:
        pass  # Token usage reporting removed to reduce noise


__all__ = [
    "run_split_file",
    "run_translation",
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
