"""Batch sentence translation operations."""

import logging
from typing import Any

from data.config import MODEL_TRANSLATION
from data.models import TranslationResult
from data.pipeline_types import TranslationResults
from data.schemas import GENERAL_SYSTEM_PROMPT, SENTENCE_TRANSLATION_USER_PROMPT
from utils.batch_context import get_batch_prefix
from utils.responses_api import ResponsesAPIManager, call_response_api

from .helpers import _extract_response_data

logger = logging.getLogger(__name__)


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
    results: TranslationResults = []

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

    # Use conversation continuity if available
    if conversation_manager and conversation_manager.current_response_id:
        # Process each sentence individually with conversation manager
        for i, sentence in enumerate(sentences):
            context_str = (
                f"\nContext: {contexts[i]}" if contexts and contexts[i] else ""
            )
            individual_message = (
                f"Please translate sentence {i + 1} from the uploaded document.\n\n"
                f"Sentence: {sentence}{context_str}"
            )
            individual_response = conversation_manager.continue_with_stage(
                individual_message, response_model=TranslationResult
            )
            individual_data = _extract_response_data(individual_response)
            if individual_data is not None:
                # Enforce model fields; let Pydantic raise on invalid data
                results.append(TranslationResult(**individual_data))
            else:
                raise RuntimeError(f"Failed to translate sentence {i}")
        return results
    # Use standard implementation when no conversation manager
    response = try_translation(sentences, contexts)

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
