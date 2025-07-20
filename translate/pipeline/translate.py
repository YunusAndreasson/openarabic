import concurrent.futures
import logging
import os
import sys
from typing import Any

from tqdm import tqdm

from data.config import (
    DEFAULT_INPUT_FILE,
    DEFAULT_OUTPUT_FILE,
    MAX_BATCH_SIZE,
)
from data.models import (
    TextMetadata,
)
from utils.context_cache import ContextCache
from utils.file_utils import (
    generate_split_filename,
    read_json_file,
    write_json_file,
)
from utils.text_utils import get_optimized_context
from utils.translation_processor import (
    apply_tashkeel,
    refine_translations,
    run_full_translation,
    translate_words,
)

logger = logging.getLogger(__name__)


def create_batches(
    sentences: list[str],
    start_index: int,
    batch_size: int,
    context_cache: ContextCache | None = None,
) -> list[dict[str, Any]]:
    """Create batches of sentences with their contexts"""
    batches: list[dict[str, Any]] = []

    num_remaining = len(sentences) - start_index
    for i in range(0, num_remaining, batch_size):
        current_batch_start_global_index = start_index + i
        batch_sentences = sentences[
            current_batch_start_global_index : current_batch_start_global_index
            + batch_size
        ]

        if not batch_sentences:
            continue

        batch_indices = list(
            range(
                current_batch_start_global_index,
                current_batch_start_global_index + len(batch_sentences),
            ),
        )

        # Use context cache if available, otherwise calculate directly
        if context_cache:
            batch_contexts = context_cache.get_contexts(batch_indices)
        else:
            batch_contexts = [
                get_optimized_context(sentences, idx) for idx in batch_indices
            ]

        batches.append(
            {
                "sentences": batch_sentences,
                "contexts": batch_contexts,
                "start_index": current_batch_start_global_index,
                "indices": batch_indices,
            },
        )

    return batches


def load_split_data(input_file: str) -> dict[str, Any] | None:
    """Load the split JSON created by split_file.py."""
    # If input_file already ends with _split.json, use it directly
    if input_file.endswith("_split.json"):
        split_path = input_file
    else:
        split_path = generate_split_filename(input_file)

    if not os.path.exists(split_path):
        return None
    return read_json_file(split_path)


def create_metadata(split_data: dict[str, Any]) -> TextMetadata:
    """Build a TextMetadata object from raw split data."""
    return TextMetadata(
        title=split_data.get("title", "Untitled Text"),
        summary=split_data.get("summary", "No summary available"),
        difficulty_level=split_data.get("difficulty_level", 3),
        total_units=split_data.get("total_units", len(split_data.get("units", []))),
    )


def process_batch(
    batch_sentences: list[str],
    start_index: int,
    batch_contexts: list[str | None],
    all_sentences: list[str] | None = None,
    batch_indices: list[int] | None = None,
    context_cache: Any = None,
) -> list[Any]:
    """Process a batch of sentences by orchestrating each translation phase."""
    if not batch_sentences:
        return []

    translations = run_full_translation(batch_sentences, batch_contexts)
    tashkeel = apply_tashkeel(
        batch_sentences,
        translations,
        all_sentences,
        batch_indices,
        context_cache,
    )
    word_options = translate_words(
        batch_sentences,
        tashkeel,
        translations,
        all_sentences,
        batch_indices,
        context_cache,
    )

    return refine_translations(
        batch_sentences,
        start_index,
        translations,
        tashkeel,
        word_options,
    )


def process_batches(
    all_units: list[str] | list[dict[str, Any]],
    batch_size: int,
) -> tuple[list[Any], list[str]]:
    """Process all batches in parallel and return results and errors."""
    results: list[Any] = []
    errors: list[str] = []

    # Convert to list of strings if needed
    if all_units and isinstance(all_units[0], dict):
        sentences = [unit.get("text", "") for unit in all_units]
    else:
        sentences = all_units

    # Create context cache for efficiency
    context_cache = ContextCache(sentences)
    batches = create_batches(sentences, 0, batch_size, context_cache)

    # Process batches in parallel for better performance
    max_workers = min(3, len(batches))  # Limit to 3 parallel workers

    with tqdm(total=len(all_units), desc="Translating", initial=0) as pbar:
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all batch processing tasks
            future_to_batch = {
                executor.submit(
                    process_batch,
                    batch["sentences"],
                    batch["start_index"],
                    batch["contexts"],
                    all_units,
                    batch["indices"],
                    context_cache,
                ): batch
                for batch in batches
            }

            # Collect results as they complete
            for future in concurrent.futures.as_completed(future_to_batch):
                batch = future_to_batch[future]
                try:
                    batch_results = future.result()
                    results.extend(batch_results)
                except Exception as exc:
                    errors.append(f"Batch {len(errors) + 1}: {exc}")
                finally:
                    pbar.update(len(batch["sentences"]))

    return results, errors


def validate_results(
    results: list[Any],
    all_units: list[dict[str, Any]],
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
    output_file: str,
    metadata: TextMetadata,
    results: list[Any],
) -> None:
    """Persist the translation results to disk."""
    write_json_file(
        output_file,
        {
            "metadata": serialize(metadata),
            "translations": [serialize(r) for r in results],
        },
    )


def serialize(obj: Any) -> dict[str, Any] | list[Any] | Any:
    """Recursively convert Pydantic models and lists into dictionaries."""
    if isinstance(obj, list):
        return [serialize(item) for item in obj]
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if hasattr(obj, "__dict__"):
        return {k: serialize(v) for k, v in obj.__dict__.items()}
    return obj


def translate_file(
    input_file: str,
    output_file: str,
    batch_size: int = MAX_BATCH_SIZE,
) -> bool | None:
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
    except Exception:
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
