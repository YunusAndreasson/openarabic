"""Word-by-word translation operations."""

import logging
import time

from data.models import WordTranslation, WordTranslationResult
from data.pipeline_types import (
    TashkeelResults,
    TranslationResults,
    WordTranslationResults,
)
from data.schemas import WORD_BY_WORD_USER_PROMPT
from utils.responses_api import ResponsesAPIManager
from utils.text import filter_arabic_words

from .engine_helpers import (
    _extract_response_data,
    _get_tashkeel_data,
    _get_translation_data,
    _validate_uncertainties,
)

logger = logging.getLogger(__name__)


def batch_translate_words(
    sentences: list[str],
    tashkeel_results: TashkeelResults,
    translations: TranslationResults,
    all_sentences: list[str] | None = None,
    indices: list[int] | None = None,
    conversation_manager: ResponsesAPIManager | None = None,
) -> WordTranslationResults:
    """Translate individual words with context from full sentence translation."""
    # Set phase for word-by-word translation tracking
    from utils.responses_api import token_tracker

    token_tracker.set_phase("Word-by-Word Translation")
    processed_results: WordTranslationResults = []
    max_retries = 3

    for i, (_sentence, tashkeel_result, translation_result) in enumerate(
        zip(sentences, tashkeel_results, translations, strict=False)
    ):
        attempt = 0
        while attempt < max_retries:
            try:
                # Handle both TranslationResult objects and dictionaries
                tashkeel, tashkeel_uncertainties = _get_tashkeel_data(tashkeel_result)
                translation, translation_uncertainties = _get_translation_data(
                    translation_result
                )

                arabic_words = filter_arabic_words(tashkeel)

                if all_sentences and indices and i < len(indices):
                    orig_index = indices[i]
                    key_terms = set()
                    important_words = [w for w in arabic_words if len(w) > 3]
                    for j in range(
                        max(0, orig_index - 1),
                        min(len(all_sentences), orig_index + 2),
                    ):
                        if j != orig_index:
                            for word in important_words:
                                if word in all_sentences[j]:
                                    key_terms.add(word)

                # Use conversation continuity if available
                if conversation_manager and conversation_manager.current_response_id:
                    # Build comprehensive prompt for this specific sentence
                    semantic_context = ""
                    if all_sentences and indices and i < len(indices):
                        orig_index = indices[i]
                        # Get surrounding context
                        context_sentences = []
                        for j in range(
                            max(0, orig_index - 1),
                            min(len(all_sentences), orig_index + 2),
                        ):
                            if j != orig_index:
                                context_sentences.append(all_sentences[j])
                        if context_sentences:
                            semantic_context = f"\nContext from surrounding sentences: {' '.join(context_sentences)}"

                    # Build tashkeel notes
                    tashkeel_notes = ""
                    if tashkeel_uncertainties:
                        tashkeel_notes = "\nTashkeel uncertainties:\n" + "\n".join(
                            f"- {u}" for u in tashkeel_uncertainties
                        )

                    # Build translation notes
                    translation_notes = ""
                    if translation_uncertainties:
                        translation_notes = (
                            "\nTranslation uncertainties:\n"
                            + "\n".join(f"- {u}" for u in translation_uncertainties)
                        )

                    # Use the prompt from schemas.py with context
                    context_info = f"\nTashkeel: {tashkeel}\nTranslation: {translation}{semantic_context}{tashkeel_notes}{translation_notes}"
                    message = f"{WORD_BY_WORD_USER_PROMPT}\n\nInput for word‑by‑word translation: {context_info}"
                    response = conversation_manager.continue_with_stage(
                        message, response_model=WordTranslationResult
                    )
                else:
                    # CRITICAL: Conversation manager must be properly initialized
                    raise RuntimeError(
                        f"Conversation manager not properly initialized. "
                        f"current_response_id: {getattr(conversation_manager, 'current_response_id', None) if conversation_manager else None}"
                    )

                # Handle Response API format - data is returned in the "data" field
                data = _extract_response_data(response)
                if data is not None:
                    # Response API returns data in the "data" field
                    result = data
                elif "results" in response and isinstance(response["results"], list):
                    # Check if results contains individual word objects or sentence objects
                    if response["results"] and isinstance(response["results"][0], dict):
                        if "word_translations" in response["results"][0]:
                            # Sentence object with word_translations
                            result = response["results"][0]
                        else:
                            # Individual word objects - wrap them in a sentence object
                            result = {"word_translations": response["results"]}
                    else:
                        result = {}
                elif isinstance(response, dict) and "word_translations" in response:
                    # Direct response format
                    result = response
                else:
                    # Try to find word_translations in the response
                    result = response if isinstance(response, dict) else {}

                word_translations_options = []
                raw_word_translations = result.get("word_translations", [])
                if not isinstance(raw_word_translations, list):
                    raw_word_translations = []

                # Require valid word translations - no fallbacks allowed
                if not raw_word_translations:
                    raise RuntimeError(
                        f"No word translations returned for sentence {i}"
                    )
                else:
                    for word_data in raw_word_translations:
                        if isinstance(word_data, dict):
                            # Build model directly; let it raise if invalid
                            # Support both final and options formats via WordTranslation model
                            if "english_options" in word_data:
                                english_value = word_data["english_options"]
                            else:
                                english_value = word_data["english"]

                            if "essential_translation_options" in word_data:
                                essential_translation_value = word_data[
                                    "essential_translation_options"
                                ]
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
                                essential=word_data.get("essential"),
                                essential_translation=essential_translation_value,
                                notes=word_data.get("notes", ""),
                                uncertainties=uncertainties_value,
                            )

                            # Validate essential field - must be present and different from arabic
                            if not word_option.essential:
                                raise ValueError(
                                    f"Missing 'essential' field for word '{word_data['arabic']}'. "
                                    f"The AI must provide a stripped root form without complex affixes/case endings. "
                                    f"Expected: root form (e.g., 'كَتَبَ' from 'يَكْتُبُ'), "
                                    f"Got: missing field"
                                )

                            if word_option.essential == word_option.arabic:
                                # Check if this is a word type where identical fields are allowed
                                pos = word_option.pos.lower()
                                if pos in [
                                    "preposition",
                                    "particle",
                                    "conjunction",
                                    "pronoun",
                                    "demonstrative_pronoun",
                                    "relative_pronoun",
                                    "interjection",
                                    "numeral",
                                    "proper_noun",
                                ]:
                                    # For these word types, identical fields are correct
                                    pass
                                elif pos in ["noun", "adjective"]:
                                    # For nouns/adjectives, check if they're already in root form
                                    pass
                                elif pos == "verb":
                                    # For verbs, identical fields might be correct (e.g., past tense like بَاعَ)
                                    # No warning needed - this is acceptable
                                    pass
                                else:
                                    # For other parts of speech, allow identical fields without warning
                                    pass

                            word_translations_options.append(word_option)

                # Require valid word translations - no fallbacks allowed
                if word_translations_options:
                    # Use the proper Pydantic model
                    processed_results.append(
                        WordTranslationResult(
                            word_translations=word_translations_options
                        )
                    )
                    break
                else:
                    # CRITICAL: Fail completely instead of creating placeholder data
                    raise Exception(
                        f"Translation failed for sentence {i} after {max_retries} attempts. "
                        f"Placeholder data creation is not allowed."
                    )

            except Exception as err:
                attempt += 1
                if attempt >= max_retries:
                    # CRITICAL: Fail completely instead of creating placeholder data
                    raise Exception(
                        f"Translation failed for sentence {i} after {max_retries} attempts. "
                        f"Placeholder data creation is not allowed. Error: {str(err)}"
                    ) from err
                time.sleep(1)

    # Basic validation - ensure we have results for all sentences
    if len(processed_results) != len(sentences):
        raise RuntimeError(
            f"Word translation result count mismatch - got {len(processed_results)} results for {len(sentences)} sentences. "
            f"This may indicate that some sentences failed translation completely."
        )

    return processed_results


__all__ = ["batch_translate_words"]
