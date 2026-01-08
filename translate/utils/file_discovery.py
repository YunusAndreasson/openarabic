"""File discovery utilities for the translation pipeline."""

import logging
import os
from pathlib import Path

from data.config import (
    AUTHOR_FOLDER_MAPPING,
    AUTHOR_NUMBER_MAPPING,
    INBOX_DIR,
    SPLIT_DIR,
)
from utils.deduplication import is_file_already_processed

logger = logging.getLogger(__name__)


def find_input_files_in_inbox() -> list[tuple[str, str, str]]:
    """
    Find all input files in the inbox directory.

    Returns:
        List of tuples: (input_file_path, author_folder, author_name)
        Excludes files that have already been processed and archived.

    Uses Path.walk() (Python 3.12+) for efficient directory traversal.
    """
    input_files: list[tuple[str, str, str]] = []
    inbox_path = Path(INBOX_DIR)

    if not inbox_path.exists():
        return input_files

    # Use Path.walk() (Python 3.12+) for efficient directory traversal
    for root, _dirs, files in inbox_path.walk():
        # Only process direct subdirectories of inbox (author folders)
        if root.parent != inbox_path:
            continue

        author_folder = root.name
        if author_folder not in AUTHOR_FOLDER_MAPPING:
            continue

        author_name = AUTHOR_FOLDER_MAPPING[author_folder]

        # Look for .txt files in the author folder
        for file_name in files:
            if file_name.endswith(".txt"):
                input_file_path = str(root / file_name)

                # Check if this file has already been processed
                if is_file_already_processed(input_file_path):
                    logger.info(f"Skipping already processed file: {input_file_path}")
                    continue

                input_files.append((input_file_path, author_folder, author_name))

    return input_files


def find_split_files() -> list[tuple[str, str, str]]:
    """
    Find all split files in the split directory.

    Returns:
        List of tuples: (split_file_path, author_number, author_name)
    """
    split_files: list[tuple[str, str, str]] = []

    if not os.path.exists(SPLIT_DIR):
        return split_files

    for file_name in os.listdir(SPLIT_DIR):
        if file_name.endswith("_split.json"):
            split_file = os.path.join(SPLIT_DIR, file_name)
            # Extract author number from filename (e.g., "01_filename_split.json")
            author_number = file_name.split("_")[0]
            author_name = AUTHOR_NUMBER_MAPPING.get(author_number, "Unknown")
            split_files.append((split_file, author_number, author_name))

    return split_files


__all__ = ["find_input_files_in_inbox", "find_split_files"]
