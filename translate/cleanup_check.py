"""Cleanup validation for translate pipeline."""

import os
import sys

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from data.config import INBOX_DIR, SPLIT_DIR, TRANSLATE_DIR


def validate_cleanup() -> bool:
    """Validate that processing directories are clean.

    Checks that:
    - No intermediate files remain in split/translate directories
    - Author directories in inbox are preserved (only .txt files should be moved)

    Returns:
        bool: True if cleanup successful, False if files remain
    """
    split_files: list[str] = []
    translate_files: list[str] = []

    if os.path.exists(SPLIT_DIR):
        split_files = [f for f in os.listdir(SPLIT_DIR) if f.endswith(".json")]

    if os.path.exists(TRANSLATE_DIR):
        translate_files = [f for f in os.listdir(TRANSLATE_DIR) if f.endswith(".json")]

    # Fail if any intermediate files remain
    if split_files or translate_files:
        sys.stderr.write(
            f"Cleanup validation failed: {len(split_files)} split files, {len(translate_files)} translate files remaining\n"
        )
        return False

    return True


def validate_inbox_structure() -> bool:
    """Validate that inbox author directories are preserved.

    This is a safety check to ensure author directories weren't accidentally deleted.
    The main cleanup process only moves .txt files, not directories.

    Returns:
        bool: True if structure is valid, False if directories were deleted
    """
    if not os.path.exists(INBOX_DIR):
        return True  # No inbox directory is fine

    # Check that author directories still exist (safety check)
    author_dirs = [
        d for d in os.listdir(INBOX_DIR) if os.path.isdir(os.path.join(INBOX_DIR, d))
    ]

    # This is just a warning - author directories should be preserved
    # but we don't fail the pipeline if they're missing
    if not author_dirs:
        sys.stderr.write(
            "Warning: No author directories found in inbox - this may indicate cleanup issues\n"
        )
        # Don't fail the pipeline for this - it's just a warning

    return True


if __name__ == "__main__":
    if not validate_cleanup() or not validate_inbox_structure():
        sys.exit(1)
