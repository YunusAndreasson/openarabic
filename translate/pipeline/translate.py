"""Translation pipeline for processing Arabic text files."""

import logging
from typing import Any

from data.models import (
    SentenceTranslation,
    SplitResult,
    TextMetadata,
    TranslationValidationError,
)
from data.pipeline_types import (
    TranslationBatch,
)
from utils.context_cache import ContextCache
from utils.error_handling import safe_file_operation
from utils.file_utils import read_json_file, write_json_file
from utils.responses_api import ResponsesAPIManager
from utils.translation_processor import (
    apply_tashkeel,
    refine_translations,
    run_full_translation,
    translate_words,
)

logger = logging.getLogger(__name__)

# Maximum batch size for processing
MAX_BATCH_SIZE = 12


def create_batches(
    sentences: list[str],
    start_index: int,
    batch_size: int,
    context_cache: ContextCache | None = None,
) -> list[TranslationBatch]:
    """Create batches of sentences for parallel processing."""
    batches: list[TranslationBatch] = []

    for i in range(0, len(sentences), batch_size):
        batch_sentences = sentences[i : i + batch_size]
        batch_start_index = start_index + i
        batch_indices = list(
            range(batch_start_index, batch_start_index + len(batch_sentences))
        )

        # Get context for each sentence in the batch
        if context_cache:
            # Batch the context requests for efficiency
            batch_contexts = context_cache.get_contexts(
                batch_indices, for_tashkeel=False
            )
        else:
            batch_contexts = [""] * len(batch_sentences)

        batch: TranslationBatch = {
            "sentences": batch_sentences,
            "contexts": batch_contexts,
            "start_index": batch_start_index,
            "indices": batch_indices,
        }
        batches.append(batch)

    return batches


def load_split_data(input_file: str) -> SplitResult | None:
    """Load split data from JSON file."""
    try:
        data = safe_file_operation(
            lambda: read_json_file(input_file),
            input_file,
            "reading",
        )
    except Exception:
        return None

    if data is None:
        return None

    # Instantiate SplitResult from loaded data
    return SplitResult(**data)


def create_metadata(split_data: SplitResult) -> TextMetadata:
    """Create metadata from split data."""
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
    conversation_manager: ResponsesAPIManager | None = None,
) -> list[SentenceTranslation]:
    """Process a single batch of sentences."""
    if not batch_sentences:
        return []

    # Ensure batch_indices is properly set
    if batch_indices is None:
        batch_indices = list(range(start_index, start_index + len(batch_sentences)))

    try:
        # Step 1: Run full translation
        translations = _run_translation_step(
            batch_sentences, batch_contexts, conversation_manager
        )

        # Step 2: Apply tashkeel
        tashkeel = _run_tashkeel_step(
            batch_sentences,
            translations,
            all_sentences,
            batch_indices,
            context_cache,
            conversation_manager,
            start_index,
        )

        # Step 3: Translate words
        word_options = _run_word_translation_step(
            batch_sentences,
            tashkeel,
            translations,
            all_sentences,
            batch_indices,
            context_cache,
            conversation_manager,
            start_index,
        )

        # Step 4: Refine translations
        return refine_translations(
            batch_sentences,
            start_index,
            translations,
            tashkeel,
            word_options,
            conversation_manager,
        )
    except Exception as e:
        logger.error(
            f"Batch processing failed for batch starting at {start_index}: {e}"
        )
        # CRITICAL: Fail completely instead of creating placeholder data
        raise Exception(
            f"Batch processing failed after all retries for batch starting at {start_index}. "
            f"Placeholder data creation is not allowed. Error: {str(e)}"
        ) from e


def _run_translation_step(
    batch_sentences: list[str],
    batch_contexts: list[str | None],
    conversation_manager: ResponsesAPIManager | None,
) -> list[Any]:
    """Run the full translation step for a batch."""
    return run_full_translation(batch_sentences, batch_contexts, conversation_manager)


def _run_tashkeel_step(
    batch_sentences: list[str],
    translations: list[Any],
    all_sentences: list[str] | None,
    batch_indices: list[int],
    context_cache: Any,
    conversation_manager: ResponsesAPIManager | None,
    start_index: int,
) -> list[dict[str, Any]]:
    """Run the tashkeel step for a batch."""
    return apply_tashkeel(
        batch_sentences,
        translations,
        all_sentences,
        batch_indices,
        context_cache,
        conversation_manager,
    )


def _run_word_translation_step(
    batch_sentences: list[str],
    tashkeel: list[dict[str, Any]],
    translations: list[Any],
    all_sentences: list[str] | None,
    batch_indices: list[int],
    context_cache: Any,
    conversation_manager: ResponsesAPIManager | None,
    start_index: int,
) -> list[dict[str, Any]]:
    """Run the word translation step for a batch."""
    return translate_words(
        batch_sentences,
        tashkeel,
        translations,
        all_sentences,
        batch_indices,
        context_cache,
        conversation_manager,
    )


def process_batches(
    all_units: list[str] | list[dict[str, Any]],
    batch_size: int,
    conversation_manager: ResponsesAPIManager | None = None,
) -> tuple[list[SentenceTranslation], list[str]]:
    """Process all batches in parallel and return results and errors."""
    results: list[SentenceTranslation] = []
    errors: list[str] = []

    # Convert to list of strings if needed using pattern matching
    match all_units:
        case [{"text": _text, **_rest}, *_] if isinstance(all_units[0], dict):
            sentences = [unit.get("text", "") for unit in all_units]
        case _:
            sentences = all_units

    # Create context cache for efficiency
    context_cache = ContextCache(sentences)
    batches = create_batches(sentences, 0, batch_size, context_cache)

    # Process batches sequentially to avoid conversation manager conflicts
    # max_workers = max(1, min(3, len(batches)))  # Ensure at least 1 worker, limit to 3

    # Process batches sequentially to avoid conversation manager conflicts
    for batch in batches:
        try:
            batch_results = process_batch(
                batch["sentences"],
                batch["start_index"],
                batch["contexts"],
                all_units,
                batch["indices"],
                context_cache,
                conversation_manager,
            )
            results.extend(batch_results)
        except TranslationValidationError as e:
            error_msg = f"Batch {batch['start_index']}-{batch['start_index'] + len(batch['sentences'])} failed validation: {str(e)}"
            errors.append(error_msg)
        except (ValueError, TypeError, RuntimeError) as e:
            error_msg = f"Batch {batch['start_index']}-{batch['start_index'] + len(batch['sentences'])} failed: {str(e)}"
            errors.append(error_msg)
        except Exception as e:
            error_msg = f"Batch {batch['start_index']}-{batch['start_index'] + len(batch['sentences'])} failed with unexpected error: {str(e)}"
            errors.append(error_msg)

    return results, errors


def validate_results(
    results: list[SentenceTranslation],
    all_units: list[str] | list[dict[str, Any]],
) -> tuple[int, int]:
    """Validate that all sentences were processed correctly."""
    actual_count = len(results)

    # Check for any missing translations using pattern matching
    missing_count = 0
    for i, unit in enumerate(all_units):
        if i >= len(results):
            missing_count += 1
            continue

        match unit:
            case {"text": _text, **_rest} if isinstance(unit, dict):
                if not results[i].original.strip():
                    missing_count += 1
            case _:
                if not results[i].original.strip():
                    missing_count += 1

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


def translate_file(
    input_file: str,
    output_file: str,
    batch_size: int = MAX_BATCH_SIZE,
    use_conversation_continuity: bool = True,
) -> bool | None:
    """Translate a file containing split sentences."""
    try:
        # Set phase for API call tracking
        from utils.responses_api import token_tracker
        token_tracker.set_phase("Translation")

        split_data = load_split_data(input_file)
        if not split_data:
            logger.error(f"Could not load split data from {input_file}")
            return False

        metadata = create_metadata(split_data)
        all_units = split_data.units

        # Initialize conversation manager for document-level continuity
        conversation_manager = None
        if use_conversation_continuity:
            from utils.responses_api import ResponsesAPIManager

            conversation_manager = ResponsesAPIManager()

            # Start document-level conversation with full text
            sentences = [
                unit.get("text", "") if isinstance(unit, dict) else unit
                for unit in all_units
            ]

            conversation_manager.start_document_conversation(sentences)

            # Debug: Check if conversation manager was properly initialized
            if not conversation_manager.current_response_id:
                logger.error(
                    "Conversation manager failed to initialize - no response_id set"
                )
                raise RuntimeError("Conversation manager initialization failed")

        # Handle empty files
        if len(all_units) == 0:
            results: list[SentenceTranslation] = []
            errors: list[str] = []
            actual_count = 0
            missing_count = 0
        else:
            results, errors = process_batches(
                all_units, batch_size, conversation_manager
            )
            actual_count, missing_count = validate_results(results, all_units)

        if errors:
            logger.warning(f"Translation completed with {len(errors)} errors")
            for error in errors:
                logger.warning(f"  {error}")

        if missing_count > 0:
            logger.warning(
                f"Translation completed with {missing_count} missing translations"
            )

        # Only fail if we expected translations but got none
        if len(all_units) > 0 and actual_count == 0:
            logger.error("No translations were generated")
            return False

        save_translation_output(output_file, metadata, results)

        return True

    except Exception as e:
        logger.error(f"Translation failed: {e}")
        return False


def main() -> None:
    """Main function for translation pipeline."""
    import argparse

    parser = argparse.ArgumentParser(description="Translate Arabic text to English")
    parser.add_argument("--input", default="input_split.json", help="Input file path")
    parser.add_argument(
        "--output", default="input_translated.json", help="Output file path"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=MAX_BATCH_SIZE,
        help=f"Batch size for processing (default: {MAX_BATCH_SIZE})",
    )
    parser.add_argument(
        "--no-conversation-continuity",
        action="store_true",
        help="Disable conversation continuity optimization",
    )

    args = parser.parse_args()

    success = translate_file(
        args.input, args.output, args.batch_size, not args.no_conversation_continuity
    )
    if success:
        logger.info(
            f"Translation completed successfully. Output saved to {args.output}"
        )
    else:
        logger.error("Translation failed. Check logs for details.")


if __name__ == "__main__":
    main()
