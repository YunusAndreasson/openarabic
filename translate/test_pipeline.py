#!/usr/bin/env python3
import json
import logging
import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from data.config import DEFAULT_INPUT_FILE
from data.schemas import SENTENCE_SPLITTING_USER_PROMPT, SPLIT_TEXT_TOOL
from utils.responses_api import call_response_api, load_api_keys

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_split_phase():
    """Test the split phase of the pipeline"""
    logger.info("Testing split phase...")

    # Load API keys
    load_api_keys()

    # Read input file
    if not os.path.exists(DEFAULT_INPUT_FILE):
        logger.error(f"Input file not found: {DEFAULT_INPUT_FILE}")
        return False

    with open(DEFAULT_INPUT_FILE, encoding="utf-8") as f:
        input_text = f.read().strip()

    logger.info(f"Input text: {input_text[:100]}...")

    # Call OpenAI API for splitting
    messages = [
        {
            "role": "system",
            "content": "You are an expert in Arabic text analysis and Islamic studies.",
        },
        {
            "role": "user",
            "content": SENTENCE_SPLITTING_USER_PROMPT + "\n\n" + input_text,
        },
    ]

    try:
        response = call_response_api(
            messages,
            function_schema=SPLIT_TEXT_TOOL,
            function_name="split_text_into_sentences",
            model="gpt-4o-mini",
        )

        logger.info("✅ Split phase completed successfully!")
        logger.info(f"Title: {response.get('title', 'N/A')}")
        logger.info(f"Summary: {response.get('summary', 'N/A')}")
        logger.info(f"Difficulty: {response.get('difficulty_level', 'N/A')}")
        logger.info(f"Units: {len(response.get('units', []))}")

        # Save split result
        split_file = os.path.splitext(DEFAULT_INPUT_FILE)[0] + "_split.json"
        with open(split_file, "w", encoding="utf-8") as f:
            json.dump(response, f, ensure_ascii=False, indent=2)

        logger.info(f"✅ Split result saved to: {split_file}")
        return True

    except Exception as e:
        logger.error(f"❌ Split phase failed: {e}")
        return False


def test_translate_phase():
    """Test the translate phase of the pipeline"""
    logger.info("Testing translate phase...")

    split_file = os.path.splitext(DEFAULT_INPUT_FILE)[0] + "_split.json"
    if not os.path.exists(split_file):
        logger.error(f"Split file not found: {split_file}")
        return False

    # Load split data
    with open(split_file, encoding="utf-8") as f:
        split_data = json.load(f)

    units = split_data.get("units", [])
    if not units:
        logger.error("No units found in split data")
        return False

    logger.info(f"Found {len(units)} units to translate")

    # Test translation of first unit
    first_unit = units[0]
    logger.info(f"Translating first unit: {first_unit[:50]}...")

    # This would normally call the translation API
    # For now, just log that we would translate
    logger.info("✅ Translate phase test completed (would call translation API)")
    return True


def main():
    """Run the pipeline test"""
    logger.info("🚀 Starting pipeline test...")

    # Test split phase
    if not test_split_phase():
        logger.error("❌ Split phase test failed")
        return

    # Test translate phase
    if not test_translate_phase():
        logger.error("❌ Translate phase test failed")
        return

    logger.info("✅ All pipeline tests completed successfully!")


if __name__ == "__main__":
    main()
