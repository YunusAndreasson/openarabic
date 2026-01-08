"""Deduplication utilities for checking if content has already been processed."""

import logging

logger = logging.getLogger(__name__)


def is_file_already_processed(input_file_path: str) -> bool:
    """
    Check if an input file has already been processed by comparing its content hash
    with existing articles in the database.

    Args:
        input_file_path: Path to the input file to check.

    Returns:
        True if the file content already exists in the database, False otherwise.
    """
    try:
        # Read the file content
        with open(input_file_path, encoding="utf-8") as f:
            content = f.read().strip()

        if not content:
            return False

        # Generate content hash
        from utils.storage import generate_content_hash

        content_hash = generate_content_hash({"content": content})

        # Check if article exists with this hash
        from utils.storage import check_article_exists

        existing_article_id, _ = check_article_exists(content_hash)

        return existing_article_id is not None

    except Exception as e:
        logger.warning(
            f"Error checking if file is already processed {input_file_path}: {e}"
        )
        return False


__all__ = ["is_file_already_processed"]
