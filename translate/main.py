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
EDITOR = os.environ.get("EDITOR", "nano")  # Default to nano if no EDITOR env var set

# Set keys
set_keys_path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "core", "set_keys.py"
)
exec(open(set_keys_path).read())


def print_header():
    """Print a fancy header for the application"""
    print("\n" + "=" * 80)
    print("  ARABIC TEXT TRANSLATION PIPELINE".center(80))
    print("  Split → Review → Translate".center(80))
    print("=" * 80 + "\n")


def confirm_step(prompt):
    """Get user confirmation for a step"""
    while True:
        response = input(f"{prompt} (y/n): ").lower().strip()
        if response in ["y", "yes"]:
            return True
        elif response in ["n", "no"]:
            return False
        print("Please answer 'y' or 'n'.")


def open_editor(file_path):
    """Open a file in the default editor"""
    try:
        subprocess.run([EDITOR, file_path], check=True)
        return True
    except subprocess.SubprocessError as e:
        print(f"Error opening editor: {e}")
        return False
    except FileNotFoundError:
        print(
            f"Editor '{EDITOR}' not found. Please set the EDITOR environment variable."
        )
        return False


def get_input_file():
    """Get input file path from the user or use default"""
    if len(sys.argv) >= 2:
        input_file = sys.argv[1]
    else:
        print(f"No input file specified. Default is: {DEFAULT_INPUT_FILE}")
        custom_input = input(
            "Enter input file path or press Enter for default: "
        ).strip()
        input_file = custom_input if custom_input else DEFAULT_INPUT_FILE

    if not os.path.exists(input_file):
        print(f"Warning: Input file '{input_file}' does not exist.")
        if not confirm_step("Create an empty file and continue"):
            print("Exiting.")
            sys.exit(1)
        os.makedirs(os.path.dirname(os.path.abspath(input_file)), exist_ok=True)
        with open(input_file, "w", encoding="utf-8") as f:
            f.write("")
        print(f"Created empty file: {input_file}")
        print("Please add your Arabic text to this file.")
        confirm_step("Ready to continue with the split step")

    return input_file


def get_output_file(input_file):
    """Get output file path from the user or derive from input file"""
    if len(sys.argv) >= 3:
        output_file = sys.argv[2]
    else:
        default_output = (
            sys.argv[2]
            if len(sys.argv) >= 3
            else os.path.splitext(input_file)[0] + ".json"
        )
        print(f"Default output file: {default_output}")
        custom_output = input(
            "Enter output file path or press Enter for default: "
        ).strip()
        output_file = custom_output if custom_output else default_output

    # Create the directory if it doesn't exist
    os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)

    return output_file


def get_batch_size():
    """Get batch size parameter from the user"""
    if len(sys.argv) >= 4:
        try:
            batch_size = int(sys.argv[3])
            if batch_size < 1:
                print(
                    f"Batch size must be at least 1, using default of {DEFAULT_BATCH_SIZE}"
                )
                batch_size = DEFAULT_BATCH_SIZE
            elif batch_size > 10:
                print("Batch size over 10 may cause API issues, limiting to 10")
                batch_size = 10
            return batch_size
        except ValueError:
            print(f"Invalid batch size, using default of {DEFAULT_BATCH_SIZE}")

    print(f"Default batch size: {DEFAULT_BATCH_SIZE}")
    while True:
        try:
            custom_batch = input(
                "Enter batch size (1-10) or press Enter for default: "
            ).strip()
            if not custom_batch:
                return DEFAULT_BATCH_SIZE

            batch_size = int(custom_batch)
            if 1 <= batch_size <= 10:
                return batch_size
            else:
                print("Batch size must be between 1 and 10.")
        except ValueError:
            print("Please enter a valid number.")


def split_file(input_file):
    """Run the split_file.py script"""
    split_file = os.path.splitext(input_file)[0] + "_split.json"
    print("\nStep 1: Splitting input file into learner-friendly units...")
    result = subprocess.run(
        [sys.executable, "-m", "translate.core.split_file", input_file],
        capture_output=True,
        text=True,
    )

    print(result.stdout)
    if result.returncode != 0:
        print(f"Error splitting file: {result.stderr}")
        sys.exit(1)

    if not os.path.exists(split_file):
        print(f"Split file not created: {split_file}")
        sys.exit(1)

    return split_file


def translate_file(input_file, output_file, batch_size):
    """Run the translate.py script"""
    print("\nStep 3: Translating file...")
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
        print("Translation completed with issues.")
    else:
        print("\n✅ Translation completed successfully.")


def main():
    print_header()

    # Step 0: Use default parameters
    input_file = DEFAULT_INPUT_FILE
    output_file = DEFAULT_OUTPUT_FILE
    batch_size = DEFAULT_BATCH_SIZE

    # Step 1: Split file
    split_file_path = split_file(input_file)

    # Step 2: Review the split file
    print("\nStep 2: Review the split file before translation")
    confirm_step("Ready to proceed with translation")

    # Step 3: Translate file
    translate_file(input_file, output_file, batch_size)

    # Step 3.5: Optionally run insert.py
    if confirm_step("Translation done. Would you like to continue and run insert.py?"):
        print("\nRunning insert.py...")
        result = subprocess.run(
            [sys.executable, "-m", "translate.core.insert", input_file, output_file],
            capture_output=False,
        )
        if result.returncode != 0:
            print("insert.py completed with issues.")
        else:
            print("\n✅ insert.py completed successfully.")
    else:
        print("Skipping insert.py. Exiting.")
        sys.exit(0)

    # Step 4: Show final output
    print(f"\nOutput saved to: {output_file}")
    confirm_step("Ready to finish and exit")

    print("\nProcess complete. Thank you for using the Arabic Translation Pipeline.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nProcess interrupted by user. Exiting.")
        sys.exit(130)
