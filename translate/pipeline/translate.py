"""Translation pipeline for processing Arabic text files."""

import concurrent.futures
import json
import logging
from typing import Any

from tqdm import tqdm

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
from utils.file_utils import write_json_file
from utils.responses_api import ResponsesAPIManager
from utils.text_utils import filter_arabic_words
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
            batch_contexts = [
                context_cache.get_contexts([idx], for_tashkeel=False)[0]
                for idx in batch_indices
            ]
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
        with open(input_file, encoding="utf-8") as f:
            data = json.load(f)

        # Instantiate SplitResult from loaded data
        return SplitResult(**data)
    except Exception as e:
        logger.error(f"Error loading split data: {e}")
        return None


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
        # Use regular translation pipeline with Response API
        translations = run_full_translation(
            batch_sentences, batch_contexts, conversation_manager
        )

        # Add error handling for tashkeel step
        try:
            tashkeel = apply_tashkeel(
                batch_sentences,
                translations,
                all_sentences,
                batch_indices,
                context_cache,
                conversation_manager,
            )
        except Exception as e:
            logger.error(
                f"Tashkeel step failed for batch starting at {start_index}: {e}"
            )
            # Create fallback tashkeel results
            tashkeel = [
                {"tashkeel": sentence, "uncertainties": []}
                for sentence in batch_sentences
            ]

        # Add error handling for word translation step
        try:
            word_options = translate_words(
                batch_sentences,
                tashkeel,
                translations,
                all_sentences,
                batch_indices,
                context_cache,
                conversation_manager,
            )
        except Exception as e:
            logger.error(
                f"Word translation step failed for batch starting at {start_index}: {e}"
            )
            # Create fallback word options
            word_options = []
            for sentence in batch_sentences:
                arabic_words = filter_arabic_words(sentence)
                fallback_word_translations = []
                for word in arabic_words:
                    fallback_word_translations.append(
                        {
                            "arabic": word,
                            "english_options": [f"[{word}]"],
                            "pos": "unknown",
                            "essential": word,
                            "essential_translation_options": [f"[{word}]"],
                            "notes": "Fallback due to word translation failure",
                            "uncertainties": [
                                {"text": word, "reason": "Word translation step failed"}
                            ],
                        }
                    )
                word_options.append(
                    {
                        "word_translations": [
                            {
                                "arabic": word,
                                "english_options": [f"[{word}]"],
                                "pos": "unknown",
                                "essential": word,
                                "essential_translation_options": [f"[{word}]"],
                                "notes": "Fallback due to word translation failure",
                                "uncertainties": [
                                    {
                                        "text": word,
                                        "reason": "Word translation step failed",
                                    }
                                ],
                            }
                        ]
                    }
                )

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

    # Process batches in parallel for better performance
    max_workers = min(3, len(batches))  # Limit to 3 parallel workers

    with tqdm(
        total=len(all_units),
        desc="Phase: Translate - Processing batches",
        unit="sentences",
        bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, {rate_fmt}]",
        ncols=100,
        colour="blue",
    ) as pbar:
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
                    conversation_manager,
                ): batch
                for batch in batches
            }

            # Collect results as they complete
            for future in concurrent.futures.as_completed(future_to_batch):
                batch = future_to_batch[future]
                try:
                    batch_results = future.result()
                    results.extend(batch_results)
                    pbar.update(len(batch["sentences"]))
                except TranslationValidationError as e:
                    error_msg = f"Batch {batch['start_index']}-{batch['start_index'] + len(batch['sentences'])} failed validation: {str(e)}"
                    errors.append(error_msg)
                    pbar.update(len(batch["sentences"]))
                except (ValueError, TypeError, RuntimeError) as e:
                    error_msg = f"Batch {batch['start_index']}-{batch['start_index'] + len(batch['sentences'])} failed: {str(e)}"
                    errors.append(error_msg)
                    pbar.update(len(batch["sentences"]))
                except Exception as e:
                    error_msg = f"Batch {batch['start_index']}-{batch['start_index'] + len(batch['sentences'])} failed with unexpected error: {str(e)}"
                    errors.append(error_msg)
                    pbar.update(len(batch["sentences"]))

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
    use_conversation_continuity: bool = True,
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
            full_text = "\n\n".join(sentences)

            logger.info("Starting document-level conversation for context continuity")
            conversation_manager.start_document_conversation(full_text)
            logger.info("Document conversation started successfully")

        results, errors = process_batches(all_units, batch_size, conversation_manager)

        actual_count, missing_count = validate_results(results, all_units)

        if errors:
            logger.warning(f"Translation completed with {len(errors)} errors")
            for error in errors:
                logger.warning(f"  {error}")

        if missing_count > 0:
            logger.warning(
                f"Translation completed with {missing_count} missing translations"
            )

        if actual_count == 0:
            logger.error("No translations were generated")
            return False

        save_translation_output(output_file, metadata, results)

        logger.info(
            f"Translation completed successfully. "
            f"Generated {actual_count} translations, "
            f"{len(errors)} errors, {missing_count} missing"
        )
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
