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
    SentenceTranslation,
    SplitResult,
    TextMetadata,
)
from data.pipeline_types import TranslationBatch
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
) -> list[TranslationBatch]:
    """Create batches of sentences with their contexts"""
    batches: list[TranslationBatch] = []

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
            TranslationBatch(
                sentences=batch_sentences,
                contexts=batch_contexts,
                start_index=current_batch_start_global_index,
                indices=batch_indices,
            ),
        )

    return batches


def load_split_data(input_file: str) -> SplitResult | None:
    """Load the split JSON created by split_file.py."""
    # If input_file already ends with _split.json, use it directly
    if input_file.endswith("_split.json"):
        split_path = input_file
    else:
        split_path = generate_split_filename(input_file)

    if not os.path.exists(split_path):
        return None

    split_dict = read_json_file(split_path)
    return SplitResult(**split_dict)


def create_metadata(split_data: SplitResult) -> TextMetadata:
    """Build a TextMetadata object from split data."""
    return TextMetadata(
        title=split_data.title,
        summary=split_data.summary,
        difficulty_level=split_data.difficulty_level,
        total_units=split_data.total_units,
    )


def process_batch(
    batch_sentences: list[str],
    start_index: int,
    batch_contexts: list[str | None],
    all_sentences: list[str] | None = None,
    batch_indices: list[int] | None = None,
    context_cache: Any = None,
) -> list[SentenceTranslation]:
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
) -> tuple[list[SentenceTranslation], list[str]]:
    """Process all batches in parallel and return results and errors."""
    results: list[SentenceTranslation] = []
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
                    batch.sentences,
                    batch.start_index,
                    batch.contexts,
                    all_units,
                    batch.indices,
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
                    pbar.update(len(batch.sentences))
                except Exception as e:
                    error_msg = f"Batch {batch.start_index}-{batch.start_index + len(batch.sentences)} failed: {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)
                    pbar.update(len(batch.sentences))

    return results, errors


def validate_results(
    results: list[SentenceTranslation],
    all_units: list[str] | list[dict[str, Any]],
) -> tuple[int, int]:
    """Validate that all sentences were processed correctly."""
    expected_count = len(all_units)
    actual_count = len(results)

    if actual_count != expected_count:
        logger.warning(
            f"Translation count mismatch: expected {expected_count}, got {actual_count}"
        )

    # Check for any missing translations
    missing_count = 0
    for i, _unit in enumerate(all_units):
        if i >= len(results):
            missing_count += 1
            continue

        if not results[i].original.strip():
            missing_count += 1

    if missing_count > 0:
        logger.warning(f"Missing translations: {missing_count}")

    return actual_count, missing_count


def save_translation_output(
    output_file: str,
    metadata: TextMetadata,
    results: list[SentenceTranslation],
) -> None:
    """Save the translation results to a JSON file."""
    output_data = {
        "metadata": metadata.model_dump(),
        "translations": [result.model_dump() for result in results],
    }

    write_json_file(output_file, output_data)


def serialize(obj: Any) -> dict[str, Any] | list[Any] | Any:
    """Serialize objects for JSON output."""
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    elif hasattr(obj, "__dict__"):
        return obj.__dict__
    else:
        return obj


def translate_file(
    input_file: str,
    output_file: str,
    batch_size: int = MAX_BATCH_SIZE,
) -> bool | None:
    """Translate a file containing split sentences."""
    try:
        split_data = load_split_data(input_file)
        if not split_data:
            logger.error(f"Could not load split data from {input_file}")
            return False

        metadata = create_metadata(split_data)
        all_units = split_data.units

        logger.info(f"Processing {len(all_units)} sentences in batches of {batch_size}")

        results, errors = process_batches(all_units, batch_size)

        actual_count, missing_count = validate_results(results, all_units)

        if errors:
            logger.warning(f"Translation completed with {len(errors)} errors")
            for error in errors:
                logger.warning(f"  {error}")

        if missing_count > 0:
            logger.warning(f"Missing {missing_count} translations")

        save_translation_output(output_file, metadata, results)

        logger.info(
            f"Translation completed: {actual_count} sentences processed, "
            f"{len(errors)} errors, {missing_count} missing"
        )

        return True

    except Exception as e:
        logger.error(f"Translation failed: {str(e)}")
        return False


def main() -> None:
    """Main entry point"""
    input_file = sys.argv[1] if len(sys.argv) >= 2 else DEFAULT_INPUT_FILE
    output_file = sys.argv[2] if len(sys.argv) >= 3 else DEFAULT_OUTPUT_FILE

    try:
        success = translate_file(input_file, output_file)
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        sys.exit(130)
    except Exception:
        sys.exit(1)


if __name__ == "__main__":
    main()
