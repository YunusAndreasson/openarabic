import os
import json
import time
import logging
import sys

from tqdm import tqdm

# Import from models module
from translate.core.models import (
    SentenceTranslation,
    TextMetadata,
    TranslationResult,
)

# Import batch utilities
from translate.core.batch_utils import create_batches, process_batch

# Import shared utilities
from translate.core.utils import token_tracker

# Configure logging to show only errors
logging.basicConfig(
    level=logging.ERROR, format="%(asctime)s - %(levelname)s - %(message)s"
)

# Configuration constants
MAX_SENTENCE_LENGTH = 500  # characters
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
    start_time = time.time()

    # Check for split file
    split_file = os.path.splitext(input_file)[0] + "_split.json"
    if not os.path.exists(split_file):
        print(f"Split file not found: {split_file}")
        print("Please run split_file.py first.")
        return None

    # Load the split file
    with open(split_file, encoding="utf-8") as f:
        split_data = json.load(f)

    all_units = split_data.get("units", [])
    if not all_units:
        print("No units found in the split file")
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
        print("No batches created to process, finishing.")
        return None

    # Process each batch with progress bar
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
                # Add error markers for this batch
                for i, sentence in enumerate(batch["sentences"]):
                    error_index = batch["start_index"] + i
                    results.append(
                        SentenceTranslation(
                            index=error_index,
                            original=sentence,
                            tashkeel=sentence,
                            word_by_word=[],
                            full_translation="[BATCH PROCESSING ERROR]",
                            notes=f"Error: {str(e)}",
                            verification_status="Failed",
                            verification_issues=["Processing failed"],
                        )
                    )
                pbar.update(len(batch["sentences"]))

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
    except Exception as e:
        print(f"Fatal error writing output: {str(e)}")
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
        print("Please run split_file.py first:")
        print(f"  python split_file.py {input_file}")
        sys.exit(1)

    # Parse batch size parameter
    batch_size = MAX_BATCH_SIZE
    if len(sys.argv) >= 4:
        try:
            batch_size = int(sys.argv[3])
            if batch_size < 1:
                print(
                    f"Batch size must be at least 1, using default of {MAX_BATCH_SIZE}"
                )
                batch_size = MAX_BATCH_SIZE
            elif batch_size > 10:
                print("Batch size over 10 may cause API issues, limiting to 10")
                batch_size = 10
        except ValueError:
            print(f"Invalid batch size, using default of {MAX_BATCH_SIZE}")

    try:
        # Run translation
        results = translate_file(input_file, output_file, batch_size)

        if not results:
            print("\n⚠️ Translation failed to produce results.")
            sys.exit(1)

        # Check for issues in the results
        error_count = 0
        for result in results.translations:
            if result.verification_status in ["Failed", "Issues Found"]:
                error_count += 1
                print(
                    f"\n{'⚠️ Issue' if result.verification_status == 'Issues Found' else '❌ Error'} in sentence {result.index}:"
                )
                print(f"Original: {result.original}")
                print(f"Status: {result.verification_status}")
                if result.verification_issues:
                    print("Issues:", ", ".join(result.verification_issues))
                print("-" * 40)

        # Print final status
        if error_count > 0:
            print(
                f"\n⚠️ Translation completed with {error_count} {'errors/issues' if error_count > 1 else 'error/issue'}."
            )
            print(f"Output saved to {output_file}")
            sys.exit(1)
        else:
            print("\n✅ Translation completed successfully.")
            print(f"Output saved to {output_file}")
            sys.exit(0)

    except KeyboardInterrupt:
        print("\n⚠️ Translation interrupted by user.")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
