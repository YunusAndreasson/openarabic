"""Word-by-word translation operations."""

import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from data.config import MAX_PARALLEL_API_CALLS, MODEL_OTHER
from data.models import WordTranslation, WordTranslationResult
from data.pipeline_types import (
    TashkeelResults,
    TranslationResults,
    WordTranslationResults,
)
from data.schemas import GENERAL_SYSTEM_PROMPT, WORD_BY_WORD_USER_PROMPT
from utils.batch_context import get_batch_prefix, pipeline_stats
from utils.responses_api import call_response_api
from utils.text import filter_arabic_words

from .helpers import (
    _extract_response_data,
    _get_tashkeel_data,
    _get_translation_data,
    _validate_uncertainties,
)

logger = logging.getLogger(__name__)


def _parse_word_translation_response(
    response: dict,
    i: int,
) -> WordTranslationResult:
    """Parse an API response into a WordTranslationResult."""
    data = _extract_response_data(response)
    if data is not None:
        result = data
    elif "results" in response and isinstance(response["results"], list):
        if response["results"] and isinstance(response["results"][0], dict):
            if "word_translations" in response["results"][0]:
                result = response["results"][0]
            else:
                result = {"word_translations": response["results"]}
        else:
            result = {}
    elif isinstance(response, dict) and "word_translations" in response:
        result = response
    else:
        result = response if isinstance(response, dict) else {}

    raw_word_translations = result.get("word_translations", [])
    if not isinstance(raw_word_translations, list):
        raw_word_translations = []

    if not raw_word_translations:
        raise RuntimeError(f"No word translations returned for sentence {i}")

    word_translations_options = []
    for word_data in raw_word_translations:
        if isinstance(word_data, dict):
            if "english_options" in word_data:
                english_value = word_data["english_options"]
            else:
                english_value = word_data["english"]

            if "essential_translation_options" in word_data:
                essential_translation_value = word_data["essential_translation_options"]
            else:
                essential_translation_value = word_data.get(
                    "essential_translation", "unknown"
                )

            uncertainties_value = _validate_uncertainties(
                word_data.get("uncertainties", [])
            )

            word_option = WordTranslation(
                arabic=word_data["arabic"],
                english=english_value,
                pos=word_data["pos"],
                essential=word_data.get("essential", ""),
                essential_translation=essential_translation_value,
                notes=word_data.get("notes", ""),
                uncertainties=uncertainties_value,
            )

            if not word_option.essential:
                raise ValueError(
                    f"Missing 'essential' field for word '{word_data['arabic']}'. "
                    f"The AI must provide a stripped root form without complex affixes/case endings. "
                    f"Expected: root form (e.g., 'كَتَبَ' from 'يَكْتُبُ'), "
                    f"Got: missing field"
                )

            word_translations_options.append(word_option)

    if not word_translations_options:
        raise RuntimeError(f"No valid word translations parsed for sentence {i}")

    return WordTranslationResult(word_translations=word_translations_options)


def _build_word_translation_message(
    i: int,
    tashkeel_result: object,
    translation_result: object,
    all_sentences: list[str] | None,
    indices: list[int] | None,
) -> str:
    """Build the prompt message for word-by-word translation."""
    tashkeel, tashkeel_uncertainties = _get_tashkeel_data(tashkeel_result)
    translation, translation_uncertainties = _get_translation_data(translation_result)

    arabic_words = filter_arabic_words(tashkeel)

    semantic_context = ""
    if all_sentences and indices and i < len(indices):
        orig_index = indices[i]
        context_sentences = []
        for j in range(
            max(0, orig_index - 1),
            min(len(all_sentences), orig_index + 2),
        ):
            if j != orig_index:
                context_sentences.append(all_sentences[j])
        if context_sentences:
            semantic_context = (
                f"\nContext from surrounding sentences: {' '.join(context_sentences)}"
            )

    tashkeel_notes = ""
    if tashkeel_uncertainties:
        tashkeel_notes = "\nTashkeel uncertainties:\n" + "\n".join(
            f"- {u}" for u in tashkeel_uncertainties
        )

    translation_notes = ""
    if translation_uncertainties:
        translation_notes = "\nTranslation uncertainties:\n" + "\n".join(
            f"- {u}" for u in translation_uncertainties
        )

    context_info = f"\nTashkeel: {tashkeel}\nTranslation: {translation}{semantic_context}{tashkeel_notes}{translation_notes}"
    return f"{WORD_BY_WORD_USER_PROMPT}\n\nInput for word‑by‑word translation: {context_info}"


def _translate_words_single_sentence(
    i: int,
    tashkeel_result: object,
    translation_result: object,
    all_sentences: list[str] | None,
    indices: list[int] | None,
) -> tuple[int, WordTranslationResult]:
    """Translate words for a single sentence with retry logic (standalone API call)."""
    max_retries = 3
    attempt = 0
    while attempt < max_retries:
        try:
            message = _build_word_translation_message(
                i, tashkeel_result, translation_result, all_sentences, indices
            )
            messages = [
                {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
                {"role": "user", "content": message},
            ]
            response = call_response_api(
                messages, response_model=WordTranslationResult, model=MODEL_OTHER
            )
            result = _parse_word_translation_response(response, i)
            return i, result
        except Exception as err:
            attempt += 1
            if attempt >= max_retries:
                raise Exception(
                    f"Translation failed for sentence {i} after {max_retries} attempts. "
                    f"Placeholder data creation is not allowed. Error: {err!s}"
                ) from err
            pipeline_stats.record_retry(i)
            logger.warning(
                f"  ⚠ Sentence {i} failed (attempt {attempt}/{max_retries}): {err}"
            )
            time.sleep(1)
    # Unreachable, but satisfies type checker
    raise RuntimeError(f"Translation failed for sentence {i}")


def batch_translate_words(
    sentences: list[str],
    tashkeel_results: TashkeelResults,
    translations: TranslationResults,
    all_sentences: list[str] | None = None,
    indices: list[int] | None = None,
) -> WordTranslationResults:
    """Translate individual words with context from full sentence translation."""
    # Set phase for word-by-word translation tracking
    from utils.responses_api import token_tracker

    token_tracker.set_phase("Word-by-Word Translation")
    logger.info(f"  → {get_batch_prefix()}Word-by-word translation...")

    # Process all sentences in parallel with standalone API calls
    indexed_results: list[tuple[int, WordTranslationResult]] = []

    with ThreadPoolExecutor(max_workers=MAX_PARALLEL_API_CALLS) as executor:
        futures = {
            executor.submit(
                _translate_words_single_sentence,
                i,
                tashkeel_results[i],
                translations[i],
                all_sentences,
                indices,
            ): i
            for i in range(len(sentences))
        }
        for future in as_completed(futures):
            idx = futures[future]
            try:
                indexed_results.append(future.result())
            except Exception as e:
                raise RuntimeError(
                    f"Word translation failed for sentence {idx}: {e}"
                ) from e

    # Sort by index to maintain original order
    indexed_results.sort(key=lambda x: x[0])
    processed_results: WordTranslationResults = [
        result for _, result in indexed_results
    ]

    # Basic validation - ensure we have results for all sentences
    if len(processed_results) != len(sentences):
        raise RuntimeError(
            f"Word translation result count mismatch - got {len(processed_results)} results for {len(sentences)} sentences. "
            f"This may indicate that some sentences failed translation completely."
        )

    return processed_results


__all__ = ["batch_translate_words"]
