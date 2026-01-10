import logging
import os
import sys
from typing import Any

from data.config import (
    DEFAULT_INPUT_FILE,
    DEFAULT_SPLIT_OUTPUT_FILE,
    MODEL_ANALYSIS,
    SPLIT_DIR,
)
from data.enums import DifficultyLevel
from data.models import SplitResult
from data.schemas import (
    GENERAL_SYSTEM_PROMPT,
    SENTENCE_SPLITTING_USER_PROMPT,
)
from utils.file_utils import (
    generate_pipeline_filename,
    generate_split_filename,
    read_text_file,
    write_json_file,
)
from utils.responses_api import call_response_api

logger = logging.getLogger(__name__)


def build_split_messages(text: str) -> list[dict[str, str]]:
    """Create the chat messages payload for splitting."""
    return [
        {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
        {"role": "user", "content": SENTENCE_SPLITTING_USER_PROMPT + text},
    ]


def parse_split_response(response: dict[str, Any]) -> SplitResult:
    """Normalize the split API response."""
    # Handle new Response API format with wrapped data
    if "error" in response:
        return SplitResult(
            units=[],
            title="unknown",
            summary=response["error"],
            difficulty_level=DifficultyLevel.ELEMENTARY,
            category="aqeedah",
            total_units=0,
        )

    # Extract data from new Response API format
    if "data" in response and response.get("success"):
        # New format: {"data": {...}, "success": True}
        data = response["data"]
    else:
        # Legacy format: direct data
        data = response

    # Handle case where data doesn't have expected structure
    if not isinstance(data, dict) or "units" not in data:
        logger.warning("Unexpected response structure, creating default SplitResult")
        return SplitResult(
            units=[],
            title="unknown",
            summary="unknown",
            difficulty_level=DifficultyLevel.ELEMENTARY,
            category="aqeedah",
            total_units=0,
        )

    # Validate via Pydantic with safe defaults
    return SplitResult(
        units=data.get("units", []),
        title=data.get("title", "unknown"),
        summary=data.get("summary", "unknown"),
        difficulty_level=data.get("difficulty_level", "unknown"),
        category=data.get("category", "aqeedah"),
        total_units=len(data.get("units", [])),
    )


def split_text_into_sentences(text: str) -> SplitResult:
    """Use GPT-4.1 to intelligently split text into learner-friendly units and analyze content"""
    if not text or len(text.strip()) == 0:
        raise ValueError("Input text is empty; cannot split into sentences")

    messages = build_split_messages(text)

    response = call_response_api(
        messages,
        response_model=SplitResult,
        model=MODEL_ANALYSIS,
    )

    return parse_split_response(response)


def split_file(input_file: str, output_file: str) -> SplitResult:
    """Split an input file into learner-friendly units and save the result."""

    try:
        # Set phase for API call tracking
        from utils.responses_api import token_tracker

        token_tracker.set_phase("Split")

        full_text = read_text_file(input_file)

        split_result = split_text_into_sentences(full_text)

        # Log sentence count
        sentence_count = len(split_result.units)
        logger.info(f"Split complete: {sentence_count} sentences extracted")

        # Convert to dict for JSON serialization
        split_dict = split_result.model_dump()
        write_json_file(output_file, split_dict)

        return split_result

    except Exception as e:
        raise RuntimeError(f"Text splitting failed: {e!s}") from e


def split_files(input_files: list[tuple[str, str, str]]) -> list[str]:
    """
    Split all input files and return output paths.

    Args:
        input_files: List of tuples (input_file_path, author_folder, author_name).

    Returns:
        List of output file paths.

    Raises:
        RuntimeError: If a split file is not created successfully.
    """
    # Ensure split directory exists
    os.makedirs(SPLIT_DIR, exist_ok=True)

    output_files: list[str] = []
    for input_file, author_folder, _author_name in input_files:
        output_file = generate_pipeline_filename(
            input_file, author_folder, "_split", SPLIT_DIR
        )
        split_file(input_file, output_file)
        if not os.path.exists(output_file):
            raise RuntimeError(f"Split file not created: {output_file}")
        output_files.append(output_file)

    return output_files


__all__ = [
    "build_split_messages",
    "parse_split_response",
    "split_file",
    "split_files",
    "split_text_into_sentences",
]


def main() -> int:
    """Main entry point"""
    input_file = sys.argv[1] if len(sys.argv) >= 2 else DEFAULT_INPUT_FILE

    if len(sys.argv) == 2:
        output_file = generate_split_filename(input_file)
    else:
        output_file = sys.argv[2] if len(sys.argv) >= 3 else DEFAULT_SPLIT_OUTPUT_FILE

    try:
        split_file(input_file, output_file)
        return 0
    except KeyboardInterrupt:
        return 130
    except Exception:
        return 1


if __name__ == "__main__":
    sys.exit(main())
