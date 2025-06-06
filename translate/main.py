#!/usr/bin/env python3
import os
import sys
import subprocess

# Set constants
DEFAULT_INPUT_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "article", "input.txt"
)
DEFAULT_OUTPUT_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "article", "output.json"
)
DEFAULT_BATCH_SIZE = 5

# Set keys
set_keys_path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "core", "set_keys.py"
)
try:
    exec(open(set_keys_path).read())
except FileNotFoundError:
    print(f"❌ API keys file not found: {set_keys_path}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error loading API keys: {str(e)}")
    sys.exit(1)


def print_header():
    """Print a fancy header for the application"""
    pass


def confirm_step(prompt):
    """Get user confirmation for a step"""
    while True:
        response = input(f"{prompt} (y/n): ").lower().strip()
        if response in ["y", "yes"]:
            return True
        elif response in ["n", "no"]:
            return False
        print("Please answer 'y' or 'n'.")


def split_file(input_file):
    """Run the split_file.py script"""
    split_file = os.path.splitext(input_file)[0] + "_split.json"
    result = subprocess.run(
        [sys.executable, "-m", "translate.core.split_file", input_file],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print(f"❌ Error splitting file: {result.stderr}")
        sys.exit(1)

    if not os.path.exists(split_file):
        print(f"❌ Split file not created: {split_file}")
        sys.exit(1)

    return split_file


def translate_file(input_file, output_file, batch_size):
    """Run the translate.py script"""
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "translate.core.translate",
            input_file,
            output_file,
            str(batch_size),
        ],
        capture_output=False,  # Show output in real-time
    )

    if result.returncode != 0:
        print("❌ Translation failed.")
        sys.exit(1)


def main():
    print_header()

    # Step 0: Use default parameters
    input_file = DEFAULT_INPUT_FILE
    output_file = DEFAULT_OUTPUT_FILE
    batch_size = DEFAULT_BATCH_SIZE

    # Step 1: Split file
    split_file(input_file)

    # Step 2: Review the split file
    confirm_step("Ready to proceed with translation")

    # Step 3: Translate file
    translate_file(input_file, output_file, batch_size)

    # Step 3.5: Optionally run insert.py
    if confirm_step("Translation done. Would you like to continue and run insert.py?"):
        result = subprocess.run(
            [sys.executable, "-m", "translate.core.insert", input_file, output_file],
            capture_output=False,
        )
        if result.returncode != 0:
            print("❌ insert.py failed.")
            sys.exit(1)

    # Normal successful completion
    sys.exit(0)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
