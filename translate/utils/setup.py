#!/usr/bin/env python3
import logging
import subprocess
import sys
from pathlib import Path
from typing import NoReturn

logger = logging.getLogger(__name__)


def setup_environment() -> None:
    """Install requirements and set up environment for translation system"""
    logger.info("Setting up Arabic Translation System environment...\n")

    # Check Python version
    py_version = sys.version_info
    if py_version.major < 3 or (py_version.major == 3 and py_version.minor < 8):
        logger.info(
            "⚠️ Warning: Python 3.8+ recommended. You're running {}.{}.{}".format(
                py_version.major, py_version.minor, py_version.micro
            )
        )
        response = input("Continue anyway? (y/n): ")
        if response.lower() != "y":
            logger.info("Setup cancelled.")
            return

    # Install requirements
    logger.info("\n📦 Installing required packages...")
    try:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"]
        )
    except subprocess.CalledProcessError:
        logger.info(
            "❌ Error installing requirements. Please check your Python installation."
        )
        return

    # Create article directory if it doesn't exist
    logger.info("\n📁 Checking for article directory...")
    article_dir = Path("article")
    if not article_dir.exists():
        article_dir.mkdir()
        logger.info("Created article directory.")
    else:
        logger.info("Article directory already exists.")

    # Check for API key setup
    logger.info("\n🔑 Checking API key configuration...")
    set_keys_path = Path("set_keys.py")
    if not set_keys_path.exists():
        logger.info("Creating set_keys.py template for API key configuration...")
        with open(set_keys_path, "w") as f:
            f.write("""import os
# Set your OpenAI API key here
os.environ["OPENAI_API_KEY"] = "your-api-key-here"
""")
        logger.info(f"✅ Template created at {set_keys_path.absolute()}")
        logger.info(
            "⚠️ You need to edit this file and add your OpenAI API key before running the translation system."
        )
    else:
        logger.info("set_keys.py file already exists.")

    logger.info("\n✅ Setup complete! You can now use the translation system.")
    logger.info("\n📝 Usage Examples:")
    logger.info("  1. Split a text file: python split_file.py article/input.txt")
    logger.info(
        "  2. Translate a split file: python translate.py article/input.txt article/output.json"
    )
    logger.info("\nSee README.md for more details.")


if __name__ == "__main__":
    setup_environment()
