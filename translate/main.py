#!/usr/bin/env python3
"""Arabic Translation Pipeline - Main Entry Point.

This module serves as the orchestrator for the translation pipeline,
delegating business logic to specialized modules in pipeline/ and utils/.
"""

import argparse
import logging
import sys
import time
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from data.config import DEFAULT_BATCH_SIZE, INBOX_DIR, SPLIT_DIR
from pipeline.split_file import split_files
from pipeline.translate import translate_files
from utils.file_discovery import find_input_files_in_inbox, find_split_files
from utils.progress_tracker import suppress_verbose_logging
from utils.responses_api import load_api_keys, token_tracker
from utils.subprocess import run_pipeline_step

# Module directory for subprocess calls
MODULE_DIR = Path(__file__).parent

logger = logging.getLogger(__name__)


@contextmanager
def timed_phase(phase_name: str) -> Iterator[None]:
    """Context manager for timing and logging pipeline phases."""
    logger.info(phase_name)
    start = time.perf_counter()
    yield
    elapsed = time.perf_counter() - start
    logger.info(f"✅ Completed in {elapsed:.1f}s")


def _setup_logging() -> None:
    """Configure logging for the pipeline."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
    )
    suppress_verbose_logging()


def _load_api_keys() -> None:
    """Load API keys from set_keys module or environment."""
    try:
        import utils.set_keys  # noqa: F401

        logger.info("API keys loaded from set_keys.py")
    except ImportError:
        logger.warning("set_keys.py not found, using environment variables")

    load_api_keys()


def _run_word_audio(article_id: int | None = None) -> None:
    """Run word audio processing for latest articles or a specific article."""
    import tempfile

    from audio import (
        process_word_audio_for_article,
        process_word_audio_for_latest_articles,
    )

    if article_id is None:
        phase_name = (
            "🎵 PHASE 4: WORD AUDIO - Cutting and uploading individual word audio clips"
        )
        with timed_phase(phase_name):
            if not process_word_audio_for_latest_articles():
                logger.warning("⚠️ Word audio processing completed with issues")
    else:
        phase_name = (
            f"🎵 WORD AUDIO - Processing word-level audio for article {article_id}"
        )
        with timed_phase(phase_name):
            with tempfile.TemporaryDirectory() as temp_dir:
                if not process_word_audio_for_article(
                    article_id=article_id, output_dir=temp_dir
                ):
                    logger.error(
                        f"❌ Failed to process word audio for article {article_id}"
                    )


def _create_parser() -> argparse.ArgumentParser:
    """Create and configure the argument parser."""
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
  python main.py --full                     # Complete pipeline (recommended)
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
        choices=range(1, 16),
        metavar="N",
        help=f"Batch size for translation, 1-15 (default: {DEFAULT_BATCH_SIZE})",
    )
    parser.add_argument(
        "--process-word-audio",
        type=int,
        metavar="ID",
        help="Process word-level audio for a specific article ID",
    )
    parser.add_argument(
        "--full",
        "--auto",
        action="store_true",
        dest="full",
        help="Run the complete pipeline: split -> translate -> insert -> word-audio",
    )

    return parser


def main() -> None:
    """Main entry point for the Arabic translation pipeline."""
    _setup_logging()
    _load_api_keys()

    parser = _create_parser()
    args = parser.parse_args()

    # Determine which phases to run
    run_split = args.split or args.full
    run_translate = args.translate or args.full
    run_insert = args.insert or args.full
    run_word_audio_latest = args.full and args.insert
    run_word_audio_specific = args.process_word_audio

    if not any((run_split, run_translate, run_insert, run_word_audio_specific)):
        parser.print_help()
        sys.exit(1)

    if args.full:
        logger.info(
            "🚀 Starting FULL PIPELINE (split -> translate -> insert -> word-audio)"
        )

    total_start = time.perf_counter()

    # Phase 1: Split
    if run_split:
        with timed_phase("📄 PHASE 1: SPLIT - Splitting input files into sentences"):
            input_files = find_input_files_in_inbox()
            if not input_files:
                raise FileNotFoundError(f"No input files found in inbox: {INBOX_DIR}")
            split_files(input_files)

    # Phase 2: Translate
    if run_translate:
        with timed_phase("🌍 PHASE 2: TRANSLATE - Translating sentences to English"):
            split_file_list = find_split_files()
            if not split_file_list:
                raise FileNotFoundError(f"No split files found in: {SPLIT_DIR}")
            translate_files(split_file_list, args.batch_size)

    # Phase 3: Insert
    if run_insert:
        with timed_phase(
            "💾 PHASE 3: INSERT - Processing through ElevenLabs and inserting into database"
        ):
            run_pipeline_step(
                script_path="pipeline/insert.py",
                description="database insertion",
                cwd=str(MODULE_DIR),
            )

        # Phase 4: Word Audio (for full pipeline)
        if run_word_audio_latest:
            try:
                _run_word_audio()
            except ImportError as e:
                logger.warning(f"⚠️ Word audio processing not available: {e}")
            except Exception as e:
                logger.error(f"❌ Error during word audio processing: {e}")

    # Standalone word audio processing
    if run_word_audio_specific:
        try:
            _run_word_audio(run_word_audio_specific)
        except ImportError as e:
            logger.error(f"❌ Word audio processing not available: {e}")
        except Exception as e:
            logger.error(f"❌ Error processing word audio: {e}")

    # Final summary
    total_elapsed = time.perf_counter() - total_start
    if args.full:
        logger.info("🎉 FULL PIPELINE COMPLETED SUCCESSFULLY!")
        logger.info("   📄 Split → 🌍 Translate → 💾 Insert → 🎵 Word Audio")
    logger.info(f"⏱️  Total time: {total_elapsed:.1f}s")

    if token_tracker.api_calls > 0:
        logger.info("📊 API Usage Summary:")
        logger.info(token_tracker.get_phase_summary())


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("\n⚠️  Operation cancelled by user")
        sys.exit(130)
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        sys.exit(1)
