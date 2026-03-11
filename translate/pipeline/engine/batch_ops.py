"""Batch sentence translation operations."""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

from data.config import MAX_PARALLEL_API_CALLS, MODEL_TRANSLATION
from data.models import TranslationResult
from data.pipeline_types import TranslationResults
from data.schemas import GENERAL_SYSTEM_PROMPT, SENTENCE_TRANSLATION_USER_PROMPT
from utils.batch_context import get_batch_prefix
from utils.responses_api import call_response_api

from .helpers import _extract_response_data

logger = logging.getLogger(__name__)


def _translate_single_sentence(
    i: int,
    sentence: str,
    context: str | None,
) -> tuple[int, TranslationResult]:
    """Translate a single sentence (standalone API call)."""
    context_str = (
        f"\n\nContext (for understanding only — do NOT translate):\n{context}"
        if context
        else ""
    )
    messages = [
        {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"{SENTENCE_TRANSLATION_USER_PROMPT}\n\n"
            f"Translate ONLY this sentence:\n{sentence}{context_str}",
        },
    ]
    response = call_response_api(
        messages, response_model=TranslationResult, model=MODEL_TRANSLATION
    )
    data = _extract_response_data(response)
    if data is not None:
        return i, TranslationResult(**data)
    raise RuntimeError(f"Failed to translate sentence {i}")


def batch_translate_full_sentences(
    sentences: list[str],
    contexts: list[str | None],
) -> TranslationResults:
    """Translate full sentences in parallel using standalone API calls."""
    from utils.responses_api import token_tracker

    token_tracker.set_phase("Sentence Translation")
    logger.info(f"  → {get_batch_prefix()}Sentence translation...")

    # Verify lengths match before processing
    if len(sentences) != len(contexts):
        logger.warning(
            f"Length mismatch: {len(sentences)} sentences vs {len(contexts)} contexts"
        )
        if len(contexts) < len(sentences):
            contexts.extend([None] * (len(sentences) - len(contexts)))
        else:
            contexts = contexts[: len(sentences)]

    # Parallel standalone calls — same pattern as tashkeel/word translation
    indexed_results: list[tuple[int, TranslationResult]] = []

    with ThreadPoolExecutor(max_workers=MAX_PARALLEL_API_CALLS) as executor:
        futures = {
            executor.submit(_translate_single_sentence, i, sentence, contexts[i]): i
            for i, sentence in enumerate(sentences)
        }
        for future in as_completed(futures):
            idx = futures[future]
            try:
                indexed_results.append(future.result())
            except Exception as e:
                raise RuntimeError(
                    f"Failed to translate sentence {idx}: {e}"
                ) from e

    # Sort by index to maintain original order
    indexed_results.sort(key=lambda x: x[0])
    results: TranslationResults = [result for _, result in indexed_results]

    # Basic validation - ensure we have results for all sentences
    if len(results) != len(sentences):
        raise RuntimeError(
            f"Result count mismatch - got {len(results)} results for {len(sentences)} sentences"
        )

    return results


__all__ = ["batch_translate_full_sentences"]
