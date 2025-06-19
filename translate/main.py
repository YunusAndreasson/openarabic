#!/usr/bin/env python3
import os
import sys
import subprocess
import logging

# Set constants
DEFAULT_INPUT_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "article", "input.txt"
)
DEFAULT_OUTPUT_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "article", "output.json"
)
from translate.core.config import DEFAULT_BATCH_SIZE

from translate.core.utils import load_api_keys
from translate.core.split_file import split_file as split_text
from translate.core.translate import translate_file as translate_text

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables once
load_api_keys()



def confirm_step(prompt):
    """Get user confirmation for a step"""
    while True:
        response = input(f"{prompt} (y/n): ").lower().strip()
        if response in ["y", "yes"]:
            return True
        elif response in ["n", "no"]:
            return False
        logger.info("Please answer 'y' or 'n'.")


def run_split_file(input_file: str) -> str:
    """Split the input text into sentences."""
    output_file = os.path.splitext(input_file)[0] + "_split.json"
    split_text(input_file, output_file)
    if not os.path.exists(output_file):
        logger.info(f"❌ Split file not created: {output_file}")
        sys.exit(1)
    return output_file


def run_translation(input_file: str, output_file: str, batch_size: int) -> None:
    """Translate the previously split file."""
    if not translate_text(input_file, output_file, batch_size):
        logger.info("❌ Translation failed.")
        sys.exit(1)


def main():
    # Step 0: Use default parameters
    input_file = DEFAULT_INPUT_FILE
    output_file = DEFAULT_OUTPUT_FILE
    batch_size = DEFAULT_BATCH_SIZE

    # Step 1: Split file
    run_split_file(input_file)

    # Step 2: Review the split file
    confirm_step("Ready to proceed with translation")

    # Step 3: Translate file
    run_translation(input_file, output_file, batch_size)

    # Step 3.5: Optionally run insert.py
    if confirm_step("Translation done. Would you like to continue and run insert.py?"):
        result = subprocess.run(
            [sys.executable, "-m", "translate.core.insert", input_file, output_file],
            capture_output=False,
        )
        if result.returncode != 0:
            logger.info("❌ insert.py failed.")
            sys.exit(1)

    # Normal successful completion
    sys.exit(0)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
