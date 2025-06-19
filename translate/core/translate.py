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
from translate.core.file_utils import (
    read_json_file,
    write_json_file,
    generate_split_filename,
)
from translate.core.config import MAX_BATCH_SIZE

# Import shared utilities

# Configure logging to show only errors
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


def load_split_data(input_file: str) -> dict | None:
    """Load the split JSON created by split_file.py."""
    split_path = generate_split_filename(input_file)
    if not os.path.exists(split_path):
        return None
    return read_json_file(split_path)


def create_metadata(split_data: dict) -> TextMetadata:
    """Build a TextMetadata object from raw split data."""
    return TextMetadata(
        title=split_data.get("title", "Untitled Text"),
        summary=split_data.get("summary", "No summary available"),
        difficulty_level=split_data.get("difficulty_level", 3),
        total_units=split_data.get("total_units", len(split_data.get("units", []))),
    )


def process_batches(all_units: list, batch_size: int) -> tuple[list, list]:
    """Process all batches and return results and errors."""
    results: list = []
    errors: list[str] = []
    batches = create_batches(all_units, 0, batch_size)
    with tqdm(total=len(all_units), desc="Translating", initial=0) as pbar:
        for batch in batches:
            try:
                batch_results = process_batch(
                    batch["sentences"],
                    batch["start_index"],
                    batch["contexts"],
                    all_units,
                    batch["indices"],
                )
                results.extend(batch_results)
            except Exception as exc:
                errors.append(f"Batch {len(errors) + 1}: {exc}")
            finally:
                pbar.update(len(batch["sentences"]))
    return results, errors


def validate_results(results: list, all_units: list) -> tuple[int, int]:
    """Return counts of failed and issue translations."""
    failed = 0
    issues = 0
    if len(results) != len(all_units):
        return len(all_units), 0
    for result in results:
        if getattr(result, "verification_status", "") == "Failed":
            failed += 1
        elif getattr(result, "verification_status", "") == "Issues Found":
            issues += 1
        ft = getattr(result, "full_translation", "")
        if any(m in ft for m in ["[ERROR]", "[BATCH PROCESSING ERROR]", "[Translation Error]", "[Format Error]"]):
            failed += 1
    return failed, issues


def save_translation_output(output_file: str, metadata: TextMetadata, results: list) -> None:
    """Persist the translation results to disk."""
    write_json_file(
        output_file,
        {
            "metadata": serialize(metadata),
            "translations": [serialize(r) for r in results],
        },
    )

def serialize(obj):
    """Recursively convert Pydantic models and lists into dictionaries."""
    if isinstance(obj, list):
        return [serialize(item) for item in obj]
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if hasattr(obj, "__dict__"):
        return {k: serialize(v) for k, v in obj.__dict__.items()}
    return obj


def translate_file(input_file: str, output_file: str, batch_size: int = MAX_BATCH_SIZE):
    """Translate a pre-split file"""
    split_data = load_split_data(input_file)
    if not split_data:
        return None

    all_units = split_data.get("units", [])
    if not all_units:
        return None

    # Create metadata object
    metadata = create_metadata(split_data)

    # Process batches
    results, batch_errors = process_batches(all_units, batch_size)

    # Validate results
    if batch_errors:
        logger.info(f"❌ Translation failed - {len(batch_errors)} batch(es) failed:")
        for error in batch_errors:
            logger.info(f"  - {error}")
        return None

    failed_count, issue_count = validate_results(results, all_units)
    if failed_count or issue_count:
        if failed_count:
            logger.info(f"❌ Translation contains {failed_count} failed sentence(s)")
        if issue_count:
            logger.info(
                f"❌ Translation contains {issue_count} sentence(s) with validation issues"
            )
        return None

    try:
        save_translation_output(output_file, metadata, results)
        return True
    except Exception:
        return None


def main():
    """Main entry point"""
    # Default files in article directory
    default_input = "article/input.txt"
    default_output = "article/output.json"

    # Use command line arguments if provided, otherwise use defaults
    input_file = sys.argv[1] if len(sys.argv) >= 2 else default_input
    output_file = sys.argv[2] if len(sys.argv) >= 3 else default_output

    if not load_split_data(input_file):
        logger.info(f"❌ Split file not found: {generate_split_filename(input_file)}")
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
            logger.info("❌ Translation failed to produce results.")
            sys.exit(1)

        sys.exit(0)

    except KeyboardInterrupt:
        sys.exit(130)
    except Exception as e:
        logger.info(f"❌ Error: {str(e)}")
        sys.exit(1)


__all__ = [
    "translate_file",
    "load_split_data",
    "create_metadata",
    "process_batches",
    "validate_results",
    "save_translation_output",
]

if __name__ == "__main__":
    main()
