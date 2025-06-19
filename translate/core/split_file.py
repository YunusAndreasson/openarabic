import os
import json
import time
import logging
import sys
from typing import Dict, Any

# Import from shared utilities
from translate.core.utils import (
    call_openai_api,
    token_tracker,
)
from translate.core.file_utils import (
    read_text_file,
    write_json_file,
    generate_split_filename,
)

logger = logging.getLogger(__name__)
from translate.core.config import MODEL_ANALYSIS

# Import schemas and prompt templates
from translate.core.schemas import (
    SPLIT_TEXT_FUNCTION,
    GENERAL_SYSTEM_PROMPT,
    SENTENCE_SPLITTING_USER_PROMPT,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


def build_split_messages(text: str) -> list[dict]:
    """Create the chat messages payload for splitting."""
    return [
        {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
        {"role": "user", "content": SENTENCE_SPLITTING_USER_PROMPT + text},
    ]


def parse_split_response(response: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize the split API response."""
    if "error" in response:
        logger.error(f"Failed to analyze text: {response['error']}")
        return {
            "units": [],
            "title": "Error",
            "summary": response["error"],
            "difficulty_level": 1,
        }

    return {
        "units": response.get("units", []),
        "title": response.get("title", "Untitled Text"),
        "summary": response.get("summary", "No summary available"),
        "difficulty_level": response.get("difficulty_level", 3),
    }


def split_text_into_sentences(text: str) -> Dict[str, Any]:
    """Use GPT-4.1 to intelligently split text into learner-friendly units and analyze content"""
    if not text or len(text.strip()) == 0:
        return {
            "units": [],
            "title": "Empty Text",
            "summary": "No content",
            "difficulty_level": 1,
        }

    messages = build_split_messages(text)

    response = call_openai_api(
        messages,
        function_schema=SPLIT_TEXT_FUNCTION,
        function_name="split_text_into_sentences",
        model=MODEL_ANALYSIS,
    )

    return parse_split_response(response)


def split_file(input_file: str, output_file: str):
    """Split an input file into learner-friendly units and save the result."""
    start_time = time.time()

    try:
        # Read input file
        full_text = read_text_file(input_file)

        split_result = split_text_into_sentences(full_text)

        # Add total units to metadata
        split_result["total_units"] = len(split_result["units"])

        # Save to output file
        write_json_file(output_file, split_result)

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


def main():
    """Main entry point"""
    # Default files in article directory
    default_input = "article/input.txt"
    default_output = "article/input_split.json"  # Changed to match expected pattern

    # Use command line arguments if provided, otherwise use defaults
    input_file = sys.argv[1] if len(sys.argv) >= 2 else default_input

    # If only input is provided, auto-generate output filename with _split.json suffix
    if len(sys.argv) == 2:
        output_file = generate_split_filename(input_file)
    else:
        output_file = sys.argv[2] if len(sys.argv) >= 3 else default_output

    try:
        split_file(input_file, output_file)
        sys.exit(0)
    except KeyboardInterrupt:
        sys.exit(130)  # Standard exit code for SIGINT
    except Exception as e:
        logger.info(f"❌ Fatal error during text splitting: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
