#!/usr/bin/env python3
import sys
import subprocess
from pathlib import Path


def setup_environment():
    """Install requirements and set up environment for translation system"""
    print("Setting up Arabic Translation System environment...\n")

    # Check Python version
    py_version = sys.version_info
    if py_version.major < 3 or (py_version.major == 3 and py_version.minor < 8):
        print(
            "⚠️ Warning: Python 3.8+ recommended. You're running {}.{}.{}".format(
                py_version.major, py_version.minor, py_version.micro
            )
        )
        response = input("Continue anyway? (y/n): ")
        if response.lower() != "y":
            print("Setup cancelled.")
            return

    # Install requirements
    print("\n📦 Installing required packages...")
    try:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"]
        )
    except subprocess.CalledProcessError:
        print(
            "❌ Error installing requirements. Please check your Python installation."
        )
        return

    # Create article directory if it doesn't exist
    print("\n📁 Checking for article directory...")
    article_dir = Path("article")
    if not article_dir.exists():
        article_dir.mkdir()
        print("Created article directory.")
    else:
        print("Article directory already exists.")

    # Check for API key setup
    print("\n🔑 Checking API key configuration...")
    set_keys_path = Path("set_keys.py")
    if not set_keys_path.exists():
        print("Creating set_keys.py template for API key configuration...")
        with open(set_keys_path, "w") as f:
            f.write("""import os
# Set your OpenAI API key here
os.environ["OPENAI_API_KEY"] = "your-api-key-here"
""")
        print(f"✅ Template created at {set_keys_path.absolute()}")
        print(
            "⚠️ You need to edit this file and add your OpenAI API key before running the translation system."
        )
    else:
        print("set_keys.py file already exists.")

    print("\n✅ Setup complete! You can now use the translation system.")
    print("\n📝 Usage Examples:")
    print("  1. Split a text file: python split_file.py article/input.txt")
    print(
        "  2. Translate a split file: python translate.py article/input.txt article/output.json"
    )
    print("\nSee README.md for more details.")


if __name__ == "__main__":
    setup_environment()
