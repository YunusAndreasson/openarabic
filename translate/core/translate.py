import os
import json
import logging
import sys

from tqdm import tqdm

# Import from models module
from translate.core.models import (
    TextMetadata,
)

# Import batch utilities
from translate.core.batch_utils import create_batches, process_batch

# Import shared utilities

# Configure logging to show only errors
logging.basicConfig(
    level=logging.ERROR, format="%(asctime)s - %(levelname)s - %(message)s"
)

# Configuration constants
MAX_BATCH_SIZE = 5  # Maximum number of sentences to process in one batch


def to_dict(obj):
    if isinstance(obj, list):
        return [to_dict(item) for item in obj]
    elif hasattr(obj, "__dict__"):
        return {k: to_dict(v) for k, v in obj.__dict__.items()}
    else:
        return obj


def translate_file(input_file: str, output_file: str, batch_size: int = MAX_BATCH_SIZE):
    """Translate a pre-split file"""
    # Check for split file
    split_file = os.path.splitext(input_file)[0] + "_split.json"
    if not os.path.exists(split_file):
        return None

    # Load the split file
    with open(split_file, encoding="utf-8") as f:
        split_data = json.load(f)

    all_units = split_data.get("units", [])
    if not all_units:
        return None

    # Create metadata object
    metadata = TextMetadata(
        title=split_data.get("title", "Untitled Text"),
        summary=split_data.get("summary", "No summary available"),
        difficulty_level=split_data.get("difficulty_level", 3),
        total_units=split_data.get("total_units", len(all_units)),
    )

    # Initialize the results list
    results = []

    # Create batches for all units
    batches_to_process = create_batches(all_units, 0, batch_size)
    if not batches_to_process:
        return None

    # Process each batch with progress bar
    batch_errors = []
    with tqdm(total=len(all_units), desc="Translating", initial=0) as pbar:
        for batch in batches_to_process:
            try:
                # Process batch
                batch_results = process_batch(
                    batch["sentences"],
                    batch["start_index"],
                    batch["contexts"],
                    all_units,
                    batch["indices"],
                )
                results.extend(batch_results)
                pbar.update(len(batch["sentences"]))

            except Exception as e:
                # Record batch error instead of adding error markers
                batch_errors.append(f"Batch {len(batch_errors) + 1}: {str(e)}")
                pbar.update(len(batch["sentences"]))

    # If any batch failed, don't write incomplete data
    if batch_errors:
        print(f"❌ Translation failed - {len(batch_errors)} batch(es) failed:")
        for error in batch_errors:
            print(f"  - {error}")
        return None

    # Verify we have all expected translations
    if len(results) != len(all_units):
        print(
            f"❌ Translation incomplete - expected {len(all_units)} translations, got {len(results)}"
        )
        return None

    # Check for any failed translations in results
    failed_count = 0
    issue_count = 0
    for i, result in enumerate(results):
        if hasattr(result, "verification_status"):
            if result.verification_status == "Failed":
                failed_count += 1
            elif result.verification_status == "Issues Found":
                issue_count += 1

        if hasattr(result, "full_translation") and result.full_translation:
            if any(
                error_marker in result.full_translation
                for error_marker in [
                    "[ERROR]",
                    "[BATCH PROCESSING ERROR]",
                    "[Translation Error]",
                    "[Format Error]",
                ]
            ):
                failed_count += 1

    if failed_count > 0:
        print(f"❌ Translation contains {failed_count} failed sentence(s)")
        return None

    if issue_count > 0:
        print(
            f"❌ Translation contains {issue_count} sentence(s) with validation issues"
        )
        return None

    # Write final output with metadata
    try:
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "metadata": to_dict(metadata),
                    "translations": [to_dict(r) for r in results],
                },
                f,
                ensure_ascii=False,
                indent=2,
            )
        return True  # Return success indicator
    except Exception as e:
        return None


def main():
    """Main entry point"""
    # Default files in article directory
    default_input = "article/input.txt"
    default_output = "article/output.json"

    # Use command line arguments if provided, otherwise use defaults
    input_file = sys.argv[1] if len(sys.argv) >= 2 else default_input
    output_file = sys.argv[2] if len(sys.argv) >= 3 else default_output

    # Check if the split file exists
    split_file = os.path.splitext(input_file)[0] + "_split.json"
    if not os.path.exists(split_file):
        print(f"❌ Split file not found: {split_file}")
        sys.exit(1)

    # Parse batch size parameter
    batch_size = MAX_BATCH_SIZE
    if len(sys.argv) >= 4:
        try:
            batch_size = int(sys.argv[3])
            if batch_size < 1:
                batch_size = MAX_BATCH_SIZE
            elif batch_size > 10:
                batch_size = 10
        except ValueError:
            batch_size = MAX_BATCH_SIZE

    try:
        # Run translation
        success = translate_file(input_file, output_file, batch_size)

        if not success:
            print("❌ Translation failed to produce results.")
            sys.exit(1)

        sys.exit(0)

    except KeyboardInterrupt:
        sys.exit(130)
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
