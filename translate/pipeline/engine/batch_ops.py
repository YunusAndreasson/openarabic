"""Batch sentence translation operations."""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from data.config import MAX_PARALLEL_API_CALLS, MODEL_TRANSLATION
from data.models import TranslationResult
from data.pipeline_types import TranslationResults
from data.schemas import GENERAL_SYSTEM_PROMPT, SENTENCE_TRANSLATION_USER_PROMPT
from utils.batch_context import get_batch_prefix
from utils.responses_api import ResponsesAPIManager, call_response_api

from .helpers import _extract_response_data

logger = logging.getLogger(__name__)


def _translate_single_sentence(
    i: int,
    sentence: str,
    context: str | None,
    conversation_manager: ResponsesAPIManager,
    base_response_id: str,
) -> tuple[int, TranslationResult]:
    """Translate a single sentence using the conversation manager (thread-safe)."""
    context_str = f"\nContext: {context}" if context else ""
    message = (
        f"Please translate sentence {i + 1} from the uploaded document.\n\n"
        f"Sentence: {sentence}{context_str}"
    )
    response = conversation_manager.continue_conversation_parallel(
        base_response_id, message, response_model=TranslationResult
    )
    data = _extract_response_data(response)
    if data is not None:
        return i, TranslationResult(**data)
    raise RuntimeError(f"Failed to translate sentence {i}")


def batch_translate_full_sentences(
    sentences: list[str],
    contexts: list[str | None],
    conversation_manager: ResponsesAPIManager | None = None,
) -> TranslationResults:
    """Translate full sentences with context."""
    # Set phase for sentence translation tracking
    from utils.responses_api import token_tracker

    token_tracker.set_phase("Sentence Translation")
    logger.info(f"  → {get_batch_prefix()}Sentence translation...")

    def try_translation(
        sentences: list[str],
        contexts: list[str | None],
        retry_without_context: bool = False,
    ) -> dict[str, Any]:
        """Helper function to attempt translation with or without context"""
        formatted_inputs: list[str] = []
        # Verify lengths match before processing
        if len(sentences) != len(contexts):
            logger.warning(
                f"Length mismatch: {len(sentences)} sentences vs {len(contexts)} contexts"
            )
            # Pad contexts if shorter, truncate if longer
            if len(contexts) < len(sentences):
                contexts.extend([None] * (len(sentences) - len(contexts)))
            else:
                contexts = contexts[: len(sentences)]

        for i, (sentence, context) in enumerate(zip(sentences, contexts, strict=False)):
            context_str = (
                ""
                if retry_without_context
                else (f"\nContext: {context}" if context else "")
            )
            formatted_inputs.append(f"Sentence {i + 1}: {sentence}{context_str}")

        messages = [
            {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": SENTENCE_TRANSLATION_USER_PROMPT
                + "\n\n"
                + "\n\n".join(formatted_inputs),
            },
        ]

        # Use Response API with fixed TranslationResult model
        return call_response_api(
            messages,
            response_model=TranslationResult,
            model=MODEL_TRANSLATION,
        )

    # Use conversation continuity if available — run sentences in parallel
    if conversation_manager and conversation_manager.current_response_id:
        base_response_id = conversation_manager.current_response_id
        indexed_results: dict[int, TranslationResult] = {}

        with ThreadPoolExecutor(max_workers=MAX_PARALLEL_API_CALLS) as executor:
            futures = {
                executor.submit(
                    _translate_single_sentence,
                    i,
                    sentence,
                    contexts[i] if contexts else None,
                    conversation_manager,
                    base_response_id,
                ): i
                for i, sentence in enumerate(sentences)
            }
            for future in as_completed(futures):
                idx, result = future.result()  # propagates exceptions
                indexed_results[idx] = result

        # Reassemble in order
        results = [indexed_results[i] for i in range(len(sentences))]

        # Basic validation - ensure we have results for all sentences
        if len(results) != len(sentences):
            raise RuntimeError(
                f"Result count mismatch - got {len(results)} results for {len(sentences)} sentences"
            )
        return results

    # Use standard implementation when no conversation manager
    response = try_translation(sentences, contexts)
    results: TranslationResults = []

    # Handle Response API response structure (only for standard implementation)
    data = _extract_response_data(response)
    if data is None:
        # API call failed, create error results
        error_msg = response.get("error", "Unknown error")
        for _ in range(len(sentences)):
            raise RuntimeError(f"Translation failed: {error_msg}")
    elif len(sentences) == 1:
        # Single sentence - use the response directly
        results.append(TranslationResult(**data))
    else:
        # Multiple sentences - process each sentence individually
        for i, sentence in enumerate(sentences):
            individual_response = try_translation(
                [sentence], [contexts[i] if contexts else None]
            )
            individual_data = _extract_response_data(individual_response)
            if individual_data is not None:
                results.append(TranslationResult(**individual_data))
            else:
                raise RuntimeError(f"Failed to translate sentence {i}")

    # Basic validation - ensure we have results for all sentences
    if len(results) != len(sentences):
        raise RuntimeError(
            f"Result count mismatch - got {len(results)} results for {len(sentences)} sentences"
        )

    return results


__all__ = ["batch_translate_full_sentences"]
