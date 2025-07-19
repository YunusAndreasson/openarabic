import json
import logging
import os
import sys
from typing import Any, Dict, List, Optional, Union

from tqdm import tqdm

from translate.data.config import (
    DEFAULT_INPUT_FILE,
    DEFAULT_OUTPUT_FILE,
    MAX_BATCH_SIZE,
)
from translate.data.models import (
    TextMetadata,
)
from translate.utils.file_utils import (
    generate_split_filename,
    read_json_file,
    write_json_file,
)
from translate.utils.translation_processor import create_batches, process_batch

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


def load_split_data(input_file: str) -> Optional[Dict[str, Any]]:
    """Load the split JSON created by split_file.py."""
    split_path = generate_split_filename(input_file)
    if not os.path.exists(split_path):
        return None
    return read_json_file(split_path)


def create_metadata(split_data: Dict[str, Any]) -> TextMetadata:
    """Build a TextMetadata object from raw split data."""
    return TextMetadata(
        title=split_data.get("title", "Untitled Text"),
        summary=split_data.get("summary", "No summary available"),
        difficulty_level=split_data.get("difficulty_level", 3),
        total_units=split_data.get("total_units", len(split_data.get("units", []))),
    )


def process_batches(
    all_units: List[Dict[str, Any]], batch_size: int
) -> tuple[List[Any], List[str]]:
    """Process all batches and return results and errors."""
    results: List[Any] = []
    errors: List[str] = []
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


def validate_results(
    results: List[Any], all_units: List[Dict[str, Any]]
) -> tuple[int, int]:
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
        if any(
            m in ft
            for m in [
                "[ERROR]",
                "[BATCH PROCESSING ERROR]",
                "[Translation Error]",
                "[Format Error]",
            ]
        ):
            failed += 1
    return failed, issues


def save_translation_output(
    output_file: str, metadata: TextMetadata, results: List[Any]
) -> None:
    """Persist the translation results to disk."""
    write_json_file(
        output_file,
        {
            "metadata": serialize(metadata),
            "translations": [serialize(r) for r in results],
        },
    )


def serialize(obj: Any) -> Union[Dict[str, Any], List[Any], Any]:
    """Recursively convert Pydantic models and lists into dictionaries."""
    if isinstance(obj, list):
        return [serialize(item) for item in obj]
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if hasattr(obj, "__dict__"):
        return {k: serialize(v) for k, v in obj.__dict__.items()}
    return obj


def translate_file(
    input_file: str, output_file: str, batch_size: int = MAX_BATCH_SIZE
) -> Optional[bool]:
    """Translate a pre-split file"""
    split_data = load_split_data(input_file)
    if not split_data:
        return None

    all_units = split_data.get("units", [])
    if not all_units:
        return None

    metadata = create_metadata(split_data)
    results, batch_errors = process_batches(all_units, batch_size)

    if batch_errors:
        return None

    failed_count, issue_count = validate_results(results, all_units)
    if failed_count or issue_count:
        return None

    try:
        save_translation_output(output_file, metadata, results)
        return True
    except Exception:
        return None


def main() -> None:
    """Main entry point"""
    input_file = sys.argv[1] if len(sys.argv) >= 2 else DEFAULT_INPUT_FILE
    output_file = sys.argv[2] if len(sys.argv) >= 3 else DEFAULT_OUTPUT_FILE

    if not load_split_data(input_file):
        sys.exit(1)

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
        success = translate_file(input_file, output_file, batch_size)

        if not success:
            sys.exit(1)

        sys.exit(0)

    except KeyboardInterrupt:
        sys.exit(130)
    except Exception as e:
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
