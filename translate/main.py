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

from data.config import INBOX_DIR, SPLIT_DIR
from pipeline.split_file import split_files
from pipeline.translate import translate_files
from utils.cli_style import (
    print_api_summary,
    print_error,
    print_logo,
    print_phase,
    print_phase_complete,
    print_pipeline_complete,
    print_pipeline_start,
    print_rule,
    print_status,
    print_warning,
    setup_rich_logging,
)
from utils.file_discovery import find_input_files_in_inbox, find_split_files
from utils.progress_tracker import suppress_verbose_logging
from utils.responses_api import load_api_keys, token_tracker
from utils.subprocess import run_pipeline_step

# Module directory for subprocess calls
MODULE_DIR = Path(__file__).parent

logger = logging.getLogger(__name__)


@contextmanager
def timed_phase(
    emoji: str, phase_num: int, name: str, description: str
) -> Iterator[None]:
    """Context manager for timing and logging pipeline phases."""
    print_rule()
    print_phase(emoji, phase_num, name, description)
    start = time.perf_counter()
    yield
    elapsed = time.perf_counter() - start
    print_phase_complete(elapsed)


def _setup_logging() -> None:
    """Configure logging for the pipeline with Rich styling."""
    setup_rich_logging()
    suppress_verbose_logging()


def _load_api_keys() -> None:
    """Load API keys from set_keys module or environment."""
    try:
        import utils.set_keys  # noqa: F401

        print_status("API keys loaded from set_keys.py")
    except ImportError:
        print_warning("set_keys.py not found, using environment variables")

    load_api_keys()


def _process_one_file() -> None:
    """Process all files from inbox through the complete pipeline, one at a time."""

    from pipeline.split_file import split_files
    from pipeline.translate import translate_files
    from utils.file_discovery import find_input_files_in_inbox

    print_pipeline_start(["Split", "Translate", "Insert", "Word Audio"])
    total_start = time.perf_counter()

    # Find all files in inbox
    input_files = find_input_files_in_inbox()
    if not input_files:
        print_warning("No files found in inbox. Use --extract to add some.")
        return

    total_files = len(input_files)
    print_status(f"Found {total_files} file(s) in inbox")

    for file_idx, single_file_tuple in enumerate(input_files, start=1):
        single_file = single_file_tuple[0]  # Extract just the path
        print_rule()
        print_status(f"[{file_idx}/{total_files}] Processing: {Path(single_file).name}")

        # Phase 1: Split
        with timed_phase("📄", 1, "SPLIT", f"Splitting {Path(single_file).name}"):
            split_files([single_file_tuple])

        # Find the split file we just created
        from utils.file_discovery import find_split_files

        split_file_list = find_split_files()
        if not split_file_list:
            print_error(f"Split file not found for {Path(single_file).name}, skipping")
            continue

        # Take only the most recent split file (the one we just created)
        # Each item is a tuple: (file_path, author_number, author_name)
        split_file_list.sort(
            key=lambda x: Path(x[0]).stat().st_mtime, reverse=True
        )
        single_split_tuple = split_file_list[0]
        single_split_path = single_split_tuple[0]

        # Phase 2: Translate
        with timed_phase(
            "🌍", 2, "TRANSLATE", f"Translating {Path(single_split_path).name}"
        ):
            translate_files([single_split_tuple])

        # Phase 3: Insert (runs as subprocess, processes all translated files)
        with timed_phase("💾", 3, "INSERT", "Inserting into database"):
            run_pipeline_step(
                script_path="pipeline/insert.py",
                description="database insertion",
                cwd=str(MODULE_DIR),
            )

        # Phase 4: Word Audio (for the single article we just inserted)
        try:
            from audio import process_word_audio_for_latest_articles

            with timed_phase("🎵", 4, "WORD AUDIO", "Processing word audio"):
                process_word_audio_for_latest_articles(limit=1)
        except ImportError as e:
            print_warning(f"Word audio skipped: {e}")
        except Exception as e:
            print_warning(f"Word audio failed: {e}")

        if file_idx < total_files:
            print_status(
                f"Finished {file_idx}/{total_files}. Continuing to next file..."
            )

    # Summary
    print_rule()
    total_elapsed = time.perf_counter() - total_start
    print_pipeline_complete(total_elapsed)
    print_status(f"Processed {total_files} file(s) total")


def _run_word_audio(article_id: int | None = None) -> None:
    """Run word audio processing for latest articles or a specific article."""
    import tempfile

    from audio import (
        process_word_audio_for_article,
        process_word_audio_for_latest_articles,
    )

    if article_id is None:
        with timed_phase(
            "🎵", 4, "WORD AUDIO", "Cutting and uploading individual word audio clips"
        ):
            if not process_word_audio_for_latest_articles():
                print_warning("Word audio processing completed with issues")
    else:
        with timed_phase(
            "🎵",
            0,
            "WORD AUDIO",
            f"Processing word-level audio for article {article_id}",
        ):
            with tempfile.TemporaryDirectory() as temp_dir:
                if not process_word_audio_for_article(
                    article_id=article_id, output_dir=temp_dir
                ):
                    print_error(
                        f"Failed to process word audio for article {article_id}"
                    )


def _create_parser() -> argparse.ArgumentParser:
    """Create and configure the argument parser."""
    parser = argparse.ArgumentParser(
        description="Arabic Translation Pipeline - Step by Step",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Pipeline Phases:
  0. Extract: Extract passages from URL (pre-inbox phase)
  1. Split: Split input files from 0_inbox into sentences
  2. Translate: Translate split sentences to English
  3. Insert: Process through ElevenLabs and insert into database
  4. Word Audio: Cut and upload individual word audio clips

Examples:
  python main.py --extract --url URL --author 15   # Extract from URL (uses Claude CLI)
  python main.py --extract --file book.txt --author 2  # Extract from local file
  python main.py --extract --url URL --author 15 --use-deepseek  # Use DeepSeek instead
  python main.py --full                            # Process ALL inbox files end-to-end (recommended)
  python main.py --split                           # Split all files from inbox
  python main.py --translate                       # Translate split files
  python main.py --insert                          # Insert into database
  python main.py --process-word-audio 123          # Process word audio for article 123
        """,
    )

    parser.add_argument(
        "-e",
        "--extract",
        action="store_true",
        help="Extract passages from a URL or local file (pre-inbox phase)",
    )
    parser.add_argument(
        "--url",
        type=str,
        metavar="URL",
        help="URL to extract passages from (requires --extract)",
    )
    parser.add_argument(
        "--file",
        type=str,
        metavar="PATH",
        dest="file_path",
        help="Local file to extract passages from (requires --extract)",
    )
    parser.add_argument(
        "-a",
        "--author",
        type=str,
        metavar="NUM",
        help="Author number (e.g., 15 for al-Dhahabi) (requires --extract)",
    )
    parser.add_argument(
        "--skip-pages",
        type=int,
        default=10,
        metavar="N",
        help="Pages to skip from book start (default: 10, skips author intro)",
    )
    parser.add_argument(
        "--use-deepseek",
        action="store_true",
        help="Use DeepSeek instead of Claude CLI for extraction",
    )
    parser.add_argument(
        "-s",
        "--split",
        action="store_true",
        help="Split input files from 0_inbox into sentences",
    )
    parser.add_argument(
        "-t",
        "--translate",
        action="store_true",
        help="Translate split files",
    )
    parser.add_argument(
        "-i",
        "--insert",
        action="store_true",
        help="Process through ElevenLabs and insert into database",
    )
    parser.add_argument(
        "--process-word-audio",
        type=int,
        metavar="ID",
        help="Process word-level audio for a specific article ID",
    )
    parser.add_argument(
        "-f",
        "--full",
        action="store_true",
        help="Process ALL inbox files through complete pipeline (split -> translate -> insert -> word-audio)",
    )

    return parser


def main() -> None:
    """Main entry point for the Arabic translation pipeline."""
    print_logo()
    _setup_logging()

    parser = _create_parser()
    args = parser.parse_args()

    # Handle extract phase separately (it's interactive and doesn't chain)
    if args.extract:
        if not args.author:
            print_error("--extract requires --author")
            sys.exit(1)
        if not args.url and not args.file_path:
            print_error("--extract requires either --url or --file")
            print_status(
                "Examples:\n"
                "  python main.py --extract --url 'https://...' --author 15\n"
                "  python main.py --extract --file book.txt --author 15"
            )
            sys.exit(1)

        from pipeline.extract import extract_from_source

        # Only load API keys if using DeepSeek (Claude CLI needs no keys)
        if args.use_deepseek:
            _load_api_keys()
        try:
            extract_from_source(
                author_key=args.author,
                url=args.url,
                file_path=args.file_path,
                skip_pages=args.skip_pages,
                use_deepseek=args.use_deepseek,
            )
        except Exception as e:
            print_error(f"Extraction failed: {e}")
            sys.exit(1)
        return

    # Handle --full: process single file through complete pipeline
    if args.full:
        _load_api_keys()
        _process_one_file()
        return

    # Determine which phases to run (individual phases, not --full)
    run_split = args.split
    run_translate = args.translate
    run_insert = args.insert
    run_word_audio_specific = args.process_word_audio

    if not any((run_split, run_translate, run_insert, run_word_audio_specific)):
        parser.print_help()
        sys.exit(1)

    # Load API keys only when actually running pipeline phases
    _load_api_keys()

    # Build list of phases to run
    phases = []
    if run_split:
        phases.append("Split")
    if run_translate:
        phases.append("Translate")
    if run_insert:
        phases.append("Insert")
    if args.full or run_word_audio_specific:
        phases.append("Word Audio")

    if phases:
        print_pipeline_start(phases)

    total_start = time.perf_counter()

    # Phase 1: Split
    if run_split:
        with timed_phase("📄", 1, "SPLIT", "Splitting input files into sentences"):
            input_files = find_input_files_in_inbox()
            if not input_files:
                raise FileNotFoundError(f"No input files found in inbox: {INBOX_DIR}")
            split_files(input_files)

    # Phase 2: Translate
    if run_translate:
        with timed_phase("🌍", 2, "TRANSLATE", "Translating sentences to English"):
            split_file_list = find_split_files()
            if not split_file_list:
                raise FileNotFoundError(f"No split files found in: {SPLIT_DIR}")
            translate_files(split_file_list)

    # Phase 3: Insert
    if run_insert:
        with timed_phase(
            "💾",
            3,
            "INSERT",
            "Processing through ElevenLabs and inserting into database",
        ):
            run_pipeline_step(
                script_path="pipeline/insert.py",
                description="database insertion",
                cwd=str(MODULE_DIR),
            )

    # Standalone word audio processing
    if run_word_audio_specific:
        try:
            _run_word_audio(run_word_audio_specific)
        except ImportError as e:
            print_error(f"Word audio processing not available: {e}")
        except Exception as e:
            print_error(f"Error processing word audio: {e}")

    # Final summary
    print_rule()
    total_elapsed = time.perf_counter() - total_start
    print_pipeline_complete(total_elapsed)

    if token_tracker.api_calls > 0:
        print_api_summary("API Usage", token_tracker.get_phase_summary())


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print_warning("Operation cancelled by user")
        sys.exit(130)
    except Exception as e:
        print_error(f"Pipeline failed: {e}")
        sys.exit(1)
