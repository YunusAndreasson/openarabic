#!/usr/bin/env python3
import logging
import subprocess
import sys
from pathlib import Path

logger = logging.getLogger(__name__)


def setup_environment() -> None:
    """Install requirements and set up environment for translation system"""
    py_version = sys.version_info
    if py_version.major < 3 or (py_version.major == 3 and py_version.minor < 8):
        logger.info(
            f"⚠️ Warning: Python 3.8+ recommended. You're running {py_version.major}.{py_version.minor}.{py_version.micro}"
        )
        response = input("Continue anyway? (y/n): ")
        if response.lower() != "y":
            return

    try:
        # Use absolute path to requirements.txt
        requirements_path = Path(__file__).parent.parent / "requirements.txt"
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "-r", str(requirements_path)]
        )
    except subprocess.CalledProcessError:
        logger.info(
            "❌ Error installing requirements. Please check your Python installation."
        )
        return

    article_dir = Path("article")
    if not article_dir.exists():
        article_dir.mkdir()

    set_keys_path = Path("set_keys.py")
    if not set_keys_path.exists():
        with open(set_keys_path, "w") as f:
            f.write("""import os
# Set your OpenAI API key here
os.environ["OPENAI_API_KEY"] = "your-api-key-here"
""")
        logger.info(f"✅ Template created at {set_keys_path.absolute()}")
        logger.info(
            "⚠️ You need to edit this file and add your OpenAI API key before running the translation system."
        )


if __name__ == "__main__":
    setup_environment()
