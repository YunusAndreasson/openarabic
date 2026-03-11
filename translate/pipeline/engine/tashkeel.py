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
from utils.responses_api import call_response_api

from .helpers import _extract_tashkeel_data

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
) -> tuple[int, TashkeelResult]:
    """Process tashkeel for a single sentence (standalone API call)."""
    enhanced_sentence, context = _enhance_sentence_with_suggestions(
        sentence, context_cache, indices, i
    )

    context_info = ""
    if context and context.strip():
        context_info = f"\nContext from surrounding sentences: {context}"

    messages = [
        {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"{TASHKEEL_USER_PROMPT}\n\nInput text: {enhanced_sentence}{context_info}",
        },
    ]

    response = call_response_api(
        messages,
        response_model=TashkeelResult,
        model=MODEL_OTHER,
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
) -> TashkeelResults:
    """Add diacritical marks to Arabic text."""
    # Set phase for tashkeel generation tracking
    from utils.responses_api import token_tracker

    token_tracker.set_phase("Tashkeel Generation")
    logger.info(f"  → {get_batch_prefix()}Generating tashkeel...")

    # Process all sentences in parallel with standalone API calls
    indexed_results: list[tuple[int, TashkeelResult]] = []

    with ThreadPoolExecutor(max_workers=MAX_PARALLEL_API_CALLS) as executor:
        futures = {
            executor.submit(
                _tashkeel_single_sentence, i, sentence, context_cache, indices
            ): i
            for i, sentence in enumerate(sentences)
        }
        for future in as_completed(futures):
            idx = futures[future]
            try:
                indexed_results.append(future.result())
            except Exception as e:
                raise RuntimeError(
                    f"Failed to generate tashkeel for sentence {idx}: {e}"
                ) from e

    # Sort by index to maintain original order
    indexed_results.sort(key=lambda x: x[0])
    results: TashkeelResults = [result for _, result in indexed_results]

    # Basic validation - ensure we have results for all sentences
    if len(results) != len(sentences):
        raise RuntimeError(
            f"Tashkeel result count mismatch - got {len(results)} results for {len(sentences)} sentences"
        )

    return results


__all__ = ["batch_add_tashkeel"]
