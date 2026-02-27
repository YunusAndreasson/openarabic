"""Tashkeel (diacritical marks) operations."""

import logging
import re
from concurrent.futures import ThreadPoolExecutor, as_completed

from data.config import MAX_PARALLEL_API_CALLS, MODEL_OTHER
from data.models import TashkeelResult
from data.pipeline_types import TashkeelResults, TranslationResults
from data.schemas import GENERAL_SYSTEM_PROMPT, TASHKEEL_USER_PROMPT
from utils.batch_context import get_batch_prefix
from utils.camel_tools_service import generate_tashkeel_suggestions_with_context
from utils.context_cache import ContextCache
from utils.responses_api import ResponsesAPIManager, call_response_api

from .helpers import _extract_tashkeel_data, _get_translation_data

logger = logging.getLogger(__name__)


def _enhance_sentence_with_suggestions(
    sentence: str,
    context_cache: ContextCache | None,
    indices: list[int] | None,
    i: int,
) -> tuple[str, str | None]:
    """Build enhanced sentence with camel-tools suggestions and get context."""
    context = None
    if context_cache and indices and i < len(indices):
        context = context_cache.get_context(indices[i], for_tashkeel=True)

    suggestions = generate_tashkeel_suggestions_with_context(
        sentence,
        context=context,
        sentence_index=indices[i] if indices and i < len(indices) else i,
    )

    enhanced_sentence = sentence
    for original_word, suggested_tashkeel in suggestions.items():
        if suggested_tashkeel != original_word:
            pattern = r"\b" + re.escape(original_word) + r"\b"
            enhanced_sentence = re.sub(pattern, suggested_tashkeel, enhanced_sentence)

    return enhanced_sentence, context


def _tashkeel_single_sentence(
    i: int,
    sentence: str,
    context_cache: ContextCache | None,
    indices: list[int] | None,
    conversation_manager: ResponsesAPIManager,
    base_response_id: str,
) -> tuple[int, TashkeelResult]:
    """Generate tashkeel for a single sentence (thread-safe)."""
    enhanced_sentence, context = _enhance_sentence_with_suggestions(
        sentence, context_cache, indices, i
    )

    context_info = ""
    if context and context.strip():
        context_info = f"\nContext from surrounding sentences: {context}"

    message = f"{TASHKEEL_USER_PROMPT}\n\nInput text: {enhanced_sentence}{context_info}"
    response = conversation_manager.continue_conversation_parallel(
        base_response_id, message, response_model=TashkeelResult
    )
    data = _extract_tashkeel_data(response)
    if data is not None:
        return i, TashkeelResult(**data)
    raise RuntimeError(f"Failed to generate tashkeel for sentence {i}")


def batch_add_tashkeel(
    sentences: list[str],
    translation_results: TranslationResults,
    all_sentences: list[str] | None = None,
    indices: list[int] | None = None,
    context_cache: ContextCache | None = None,
    conversation_manager: ResponsesAPIManager | None = None,
) -> TashkeelResults:
    """Add diacritical marks to Arabic text."""
    # Set phase for tashkeel generation tracking
    from utils.responses_api import token_tracker

    token_tracker.set_phase("Tashkeel Generation")
    logger.info(f"  → {get_batch_prefix()}Generating tashkeel...")

    # Use conversation continuity if available — run sentences in parallel
    if conversation_manager and conversation_manager.current_response_id:
        base_response_id = conversation_manager.current_response_id
        indexed_results: dict[int, TashkeelResult] = {}

        with ThreadPoolExecutor(max_workers=MAX_PARALLEL_API_CALLS) as executor:
            futures = {
                executor.submit(
                    _tashkeel_single_sentence,
                    i,
                    sentence,
                    context_cache,
                    indices,
                    conversation_manager,
                    base_response_id,
                ): i
                for i, sentence in enumerate(sentences)
            }
            for future in as_completed(futures):
                idx, result = future.result()
                indexed_results[idx] = result

        results = [indexed_results[i] for i in range(len(sentences))]
    else:
        # Use standard implementation when no conversation manager
        results: TashkeelResults = []
        for i, (sentence, translation_result) in enumerate(
            zip(sentences, translation_results, strict=False)
        ):
            enhanced_sentence, context = _enhance_sentence_with_suggestions(
                sentence, context_cache, indices, i
            )

            # Handle both TranslationResult objects and dictionaries
            _translation, _uncertainties = _get_translation_data(translation_result)

            # Get context for this sentence
            context_info = ""
            if context and context.strip():
                context_info = f"\nContext from surrounding sentences: {context}"

            # Use the prompt from schemas.py
            individual_prompt = (
                f"{TASHKEEL_USER_PROMPT}\n\nInput text: {enhanced_sentence}"
            )

            individual_messages = [
                {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
                {"role": "user", "content": individual_prompt},
            ]

            response = call_response_api(
                individual_messages,
                response_model=TashkeelResult,
                model=MODEL_OTHER,
            )

            data = _extract_tashkeel_data(response)
            if data is not None:
                results.append(TashkeelResult(**data))
            else:
                raise RuntimeError(f"Failed to generate tashkeel for sentence {i}")

    # Basic validation - ensure we have results for all sentences
    if len(results) != len(sentences):
        raise RuntimeError(
            f"Tashkeel result count mismatch - got {len(results)} results for {len(sentences)} sentences"
        )

    return results


__all__ = ["batch_add_tashkeel"]
