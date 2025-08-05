"""Review helper utilities for the translation pipeline."""

import logging
from typing import Any

from utils.error_handling import safe_file_operation
from utils.file_utils import read_json_file

logger = logging.getLogger(__name__)


def review_file_with_preview(
    file_path: str,
    author_name: str,
    file_type: str,
    force_yes: bool = False,
    confirm_prompt: str = "",
) -> bool:
    """
    Generic file review function that loads JSON, logs metadata, and shows preview.

    Args:
        file_path: Path to the JSON file to review
        author_name: Name of the author
        file_type: Type of file being reviewed (e.g., "Split", "Translation")
        force_yes: Whether to skip confirmation prompts
        confirm_prompt: Custom confirmation prompt to show after review

    Returns:
        True if user confirms to proceed, False otherwise
    """
    if not file_path:
        logger.error(f"❌ {file_type} file path is empty")
        return False

    # Load JSON data using safe file operation
    data = safe_file_operation(
        lambda: read_json_file(file_path),
        file_path,
        "reading",
        fallback_value=None,
    )

    if data is None:
        logger.error(f"❌ Failed to load {file_type.lower()} file: {file_path}")
        return False

    # Extract metadata based on file type
    if file_type.lower() == "split":
        metadata = extract_split_metadata(data)
        units = data.get("units", [])
        preview_items = units
    elif file_type.lower() == "translation":
        metadata = extract_translation_metadata(data)
        translations = data.get("translations", [])
        preview_items = translations
    else:
        logger.error(f"❌ Unknown file type: {file_type}")
        return False

    # Log metadata
    log_review_metadata(author_name, metadata, file_type)

    # Show preview
    if preview_items:
        show_preview(preview_items, file_type)

    logger.info(f"📁 {file_type} file saved to: {file_path}")

    # Get user confirmation
    if not confirm_prompt:
        confirm_prompt = (
            "Review complete. Would you like to proceed with the next step?"
        )

    return confirm_step(confirm_prompt, force_yes)


def extract_split_metadata(data: dict[str, Any]) -> dict[str, Any]:
    """Extract metadata from split file data."""
    units = data.get("units", [])
    return {
        "title": data.get("title", "Unknown"),
        "summary": data.get("summary", "No summary"),
        "difficulty_level": data.get("difficulty_level", "Unknown"),
        "total_units": len(units),
    }


def extract_translation_metadata(data: dict[str, Any]) -> dict[str, Any]:
    """Extract metadata from translation file data."""
    translations = data.get("translations", [])
    metadata = data.get("metadata", {})
    return {
        "title": metadata.get("title", "Unknown"),
        "summary": metadata.get("summary", "No summary"),
        "difficulty_level": metadata.get("difficulty_level", "Unknown"),
        "total_units": len(translations),
    }


def log_review_metadata(
    author_name: str, metadata: dict[str, Any], file_type: str
) -> None:
    """Log metadata for file review."""
    logger.info(f"\n📋 {file_type} Review:")
    logger.info(f"Author: {author_name}")
    logger.info(f"Title: {metadata['title']}")
    logger.info(f"Summary: {metadata['summary']}")
    logger.info(f"Difficulty Level: {metadata['difficulty_level']}")
    logger.info(f"Total Sentences: {metadata['total_units']}")


def show_preview(items: list[Any], file_type: str) -> None:
    """Show preview of first 3 items."""
    logger.info(
        f"\n📝 Preview of first 3 {'sentences' if file_type.lower() == 'split' else 'translations'}:"
    )

    for i, item in enumerate(items[:3]):
        if file_type.lower() == "split":
            # Handle both string and dict formats for split files
            if isinstance(item, dict):
                sentence = item.get("text", "")
            else:
                sentence = str(item)

            sentence = sentence[:80] + "..." if len(sentence) > 80 else sentence
            logger.info(f"  {i + 1}. {sentence}")

        elif file_type.lower() == "translation":
            # Show original and English translation
            original = (
                item.get("original", "")[:50] + "..."
                if len(item.get("original", "")) > 50
                else item.get("original", "")
            )
            english = (
                item.get("full_translation", "")[:50] + "..."
                if len(item.get("full_translation", "")) > 50
                else item.get("full_translation", "")
            )
            logger.info(f"  {i + 1}. Original: {original}")
            logger.info(f"     English: {english}")


def confirm_step(prompt: str, force_yes: bool = False) -> bool:
    """Get user confirmation for a step."""
    if force_yes:
        return True

    while True:
        response = input(f"{prompt} (y/n): ").lower().strip()
        if response in ["y", "yes"]:
            return True
        elif response in ["n", "no"]:
            return False
        logger.error("Please answer 'y' or 'n'.")
