"""Review helper utilities for the translation pipeline."""

import logging

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
    Generic file review function that loads JSON and asks for confirmation.

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
    try:
        data = safe_file_operation(
            lambda: read_json_file(file_path),
            file_path,
            "reading",
        )
    except Exception:
        data = None

    if data is None:
        logger.error(f"❌ Failed to load {file_type.lower()} file: {file_path}")
        return False

    # Get user confirmation
    if not confirm_prompt:
        confirm_prompt = (
            "Review complete. Would you like to proceed with the next step?"
        )

    return confirm_step(confirm_prompt, force_yes)


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
