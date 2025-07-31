import logging
import sys
from typing import Any

from data.config import (
    DEFAULT_INPUT_FILE,
    DEFAULT_SPLIT_OUTPUT_FILE,
    MODEL_ANALYSIS,
)
from data.enums import DifficultyLevel
from data.models import SplitResult
from data.schemas import (
    GENERAL_SYSTEM_PROMPT,
    SENTENCE_SPLITTING_USER_PROMPT,
    SPLIT_TEXT_TOOL,
)
from utils.file_utils import (
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
    if "error" in response:
        logger.error(f"Failed to analyze text: {response['error']}")
        return SplitResult(
            units=[],
            title="Error",
            summary=response["error"],
            difficulty_level=DifficultyLevel.BASIC.value,
            total_units=0,
        )

    return SplitResult(
        units=response.get("units", []),
        title=response.get("title", "Untitled Text"),
        summary=response.get("summary", "No summary available"),
        difficulty_level=response.get(
            "difficulty_level", DifficultyLevel.INTERMEDIATE.value
        ),
        total_units=len(response.get("units", [])),
        unit_types=response.get("unit_types"),
    )


def split_text_into_sentences(text: str) -> SplitResult:
    """Use GPT-4.1 to intelligently split text into learner-friendly units and analyze content"""
    if not text or len(text.strip()) == 0:
        return SplitResult(
            units=[],
            title="Empty Text",
            summary="No content",
            difficulty_level=DifficultyLevel.BASIC.value,
            total_units=0,
        )

    messages = build_split_messages(text)

    response = call_response_api(
        messages,
        function_schema=SPLIT_TEXT_TOOL,
        _function_name="split_text_into_sentences",
        model=MODEL_ANALYSIS,
    )

    return parse_split_response(response)


def split_file(input_file: str, output_file: str) -> SplitResult:
    """Split an input file into learner-friendly units and save the result."""

    try:
        full_text = read_text_file(input_file)

        split_result = split_text_into_sentences(full_text)

        # Convert to dict for JSON serialization
        split_dict = split_result.model_dump()
        write_json_file(output_file, split_dict)

        return split_result

    except Exception as e:
        logging.error(f"Text splitting failed: {str(e)}")
        raise


__all__ = [
    "split_text_into_sentences",
    "split_file",
    "build_split_messages",
    "parse_split_response",
]


def main() -> None:
    """Main entry point"""
    input_file = sys.argv[1] if len(sys.argv) >= 2 else DEFAULT_INPUT_FILE

    if len(sys.argv) == 2:
        output_file = generate_split_filename(input_file)
    else:
        output_file = sys.argv[2] if len(sys.argv) >= 3 else DEFAULT_SPLIT_OUTPUT_FILE

    try:
        split_file(input_file, output_file)
        sys.exit(0)
    except KeyboardInterrupt:
        sys.exit(130)
    except Exception:
        sys.exit(1)


if __name__ == "__main__":
    main()
