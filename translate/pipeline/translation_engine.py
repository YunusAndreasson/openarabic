import logging
import os
import time
import unicodedata
from typing import Any, cast

from data.config import (
    MODEL_OTHER,
    MODEL_TRANSLATION,
    MODEL_VERIFICATION,
)
from data.models import (
    RefinementResult,
    TashkeelResult,
    TranslationResult,
    Uncertainty,
    WordTranslation,
    WordTranslationResult,
)
from data.pipeline_types import (
    RefinementInput,
    RefinementInputs,
    RefinementResults,
    TashkeelResults,
    TranslationResults,
    WordTranslationResults,
)
from data.schemas import (
    FINAL_VERIFICATION_USER_PROMPT,
    GENERAL_SYSTEM_PROMPT,
    SENTENCE_TRANSLATION_USER_PROMPT,
)
from utils.camel_tools_service import (
    generate_tashkeel_suggestions_with_context,
)
from utils.context_cache import ContextCache
from utils.google_translate_service import GoogleTranslateService
from utils.responses_api import ResponsesAPIManager, call_response_api
from utils.text_utils import filter_arabic_words

logger = logging.getLogger(__name__)


def _handle_arabic_processing_error(
    text: str, operation: str, error: Exception
) -> None:
    """Handle Arabic text processing errors with proper logging and context."""
    # Normalize text for logging
    normalized_text = unicodedata.normalize(
        "NFC", text[:50]
    )  # First 50 chars for context

    error_msg = f"Arabic {operation} failed for text: '{normalized_text}'"
    if len(text) > 50:
        error_msg += "..."

    # Log specific error details for Arabic text issues
    if "Unicode" in str(error) or "encoding" in str(error).lower():
        logger.error(f"{error_msg} - Unicode/encoding issue: {error}")
    elif "JSON" in str(error) or "parsing" in str(error).lower():
        logger.error(
            f"{error_msg} - JSON parsing failed (possible Arabic formatting issue): {error}"
        )
    else:
        logger.error(f"{error_msg} - {error}")


def _extract_response_data(response: dict[str, Any]) -> dict[str, Any] | None:
    """Extract data from Response API response with proper error handling."""
    if not response.get("success"):
        return None
    return response.get("data")


def _extract_tashkeel_data(response: dict[str, Any]) -> dict[str, Any] | None:
    """Extract tashkeel data from various response formats."""
    if isinstance(response, dict):
        # Response API format: response["data"]["tashkeel"]
        if "data" in response and "tashkeel" in response["data"]:
            return {
                "tashkeel": response["data"]["tashkeel"],
                "uncertainties": response["data"].get("uncertainties", []),
            }
        # Direct format: response["tashkeel"]
        elif "tashkeel" in response:
            return {
                "tashkeel": response["tashkeel"],
                "uncertainties": response.get("uncertainties", []),
            }
    return None


def _validate_word_data(word_data: dict[str, Any]) -> dict[str, Any]:
    """Validate and clean word data from API response."""
    if not isinstance(word_data, dict):
        return {}

    # Handle both 'english' (string) and 'english_options' (list) formats
    eng_opts = word_data.get("english_options", [])
    if not eng_opts:
        # Try 'english' field if 'english_options' is not present
        english_str = word_data.get("english", "")
        if english_str:
            eng_opts = [english_str] if isinstance(english_str, str) else []

    if not isinstance(eng_opts, list) or not all(isinstance(s, str) for s in eng_opts):
        eng_opts = []

    # Handle both 'essential_translation' (string) and 'essential_translation_options' (list) formats
    ess_opts = word_data.get("essential_translation_options", [])
    if not ess_opts:
        # Try 'essential_translation' field if 'essential_translation_options' is not present
        essential_str = word_data.get("essential_translation", "")
        if essential_str:
            ess_opts = [essential_str] if isinstance(essential_str, str) else []

    if not isinstance(ess_opts, list) or not all(isinstance(s, str) for s in ess_opts):
        ess_opts = []

    return {
        "arabic": word_data.get("arabic", ""),
        "english_options": eng_opts,
        "pos": word_data.get("pos") or "unknown",
        "essential": word_data.get("essential", word_data.get("arabic", "")),
        "essential_translation_options": ess_opts,
        "notes": word_data.get("notes"),
        "uncertainties": word_data.get("uncertainties", []),
    }


def _get_translation_data(obj: Any) -> tuple[str, list[Any]]:
    """Extract translation and uncertainties from TranslationResult object or dict."""
    if hasattr(obj, "translation"):
        return obj.translation, obj.uncertainties
    else:
        return obj.get("translation", ""), obj.get("uncertainties", [])


def _get_tashkeel_data(obj: Any) -> tuple[str, list[Any]]:
    """Extract tashkeel and uncertainties from TashkeelResult object or dict."""
    if hasattr(obj, "tashkeel"):
        return obj.tashkeel, obj.uncertainties
    else:
        return obj.get("tashkeel", ""), obj.get("uncertainties", [])


def _validate_uncertainties(uncertainties: list[Any]) -> list[Uncertainty]:
    """Validate and convert uncertainties to proper format."""
    validated = []
    for item in uncertainties:
        if isinstance(item, dict):
            # Handle various dictionary formats
            if "text" in item and "reason" in item:
                # Standard format
                validated.append(
                    Uncertainty(
                        text=item["text"],
                        reason=item["reason"],
                        word=item.get("word", "unknown"),
                        type=item.get("type", "unknown"),
                        step=item.get("step", "unknown"),
                        resolution=item.get("resolution", "unknown"),
                        explanation=item.get("explanation", "unknown"),
                        related_translation_uncertainty=item.get(
                            "related_translation_uncertainty", "unknown"
                        ),
                        original_uncertainty=item.get(
                            "original_uncertainty", "unknown"
                        ),
                        reason_unresolved=item.get("reason_unresolved", "unknown"),
                    )
                )
            elif "word" in item and "reason" in item:
                # Tashkeel uncertainty format
                validated.append(
                    Uncertainty(
                        text="unknown",
                        reason=item["reason"],
                        word=item["word"],
                        type=item.get("type", "unknown"),
                        step=item.get("step", "unknown"),
                        resolution=item.get("resolution", "unknown"),
                        explanation=item.get("explanation", "unknown"),
                        related_translation_uncertainty=item.get(
                            "related_translation_uncertainty", "unknown"
                        ),
                        original_uncertainty=item.get(
                            "original_uncertainty", "unknown"
                        ),
                        reason_unresolved=item.get("reason_unresolved", "unknown"),
                    )
                )
            elif "reason" in item:
                # Minimal format with just reason
                validated.append(
                    Uncertainty(
                        text=item.get("text", "unknown"),
                        reason=item["reason"],
                        word=item.get("word", "unknown"),
                        type=item.get("type", "unknown"),
                        step=item.get("step", "unknown"),
                        resolution=item.get("resolution", "unknown"),
                        explanation=item.get("explanation", "unknown"),
                        related_translation_uncertainty=item.get(
                            "related_translation_uncertainty", "unknown"
                        ),
                        original_uncertainty=item.get(
                            "original_uncertainty", "unknown"
                        ),
                        reason_unresolved=item.get("reason_unresolved", "unknown"),
                    )
                )
        elif isinstance(item, str):
            # Convert string to proper format
            validated.append(
                Uncertainty(
                    text="unknown",
                    reason=item,
                    word="unknown",
                    type="unknown",
                    step="unknown",
                    resolution="unknown",
                    explanation="unknown",
                    related_translation_uncertainty="unknown",
                    original_uncertainty="unknown",
                    reason_unresolved="unknown",
                )
            )
        elif isinstance(item, Uncertainty):
            validated.append(item)
        else:
            # Skip invalid items but log for debugging
            logger.debug(f"Skipping invalid uncertainty item: {type(item)} - {item}")
            continue
    return validated


def _build_word_prompt(
    tashkeel: str,
    translation: str,
    arabic_words: list[str],
    semantic_context: str,
    tashkeel_notes: str,
    translation_notes: str,
) -> str:
    """Generate the prompt payload for word translations."""
    return (
        "Set 1:\n"
        f"Arabic words to translate:\n{' '.join(arabic_words)}\n"
        f"Full context (with tashkeel): {tashkeel}\n"
        f"Translation: {translation}"
        f"{semantic_context}"
        f"{tashkeel_notes}"
        f"{translation_notes}"
    )


def batch_translate_full_sentences(
    sentences: list[str],
    contexts: list[str | None],
    conversation_manager: ResponsesAPIManager | None = None,
) -> TranslationResults:
    """Translate full sentences with context."""
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
                results.append(
                    TranslationResult(
                        translation=individual_data.get("translation", ""),
                        notes=individual_data.get("notes", ""),
                        uncertainties=individual_data.get("uncertainties", []),
                        word_by_word=individual_data.get("word_by_word", []),
                    )
                )
            else:
                raise RuntimeError(f"Failed to translate sentence {i}")
        return results
    else:
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
        results.append(
            TranslationResult(
                translation=data["translation"],
                notes=data["notes"],
                uncertainties=data["uncertainties"],
                word_by_word=data["word_by_word"],
            )
        )
    else:
        # Multiple sentences - process each sentence individually
        for i, sentence in enumerate(sentences):
            individual_response = try_translation(
                [sentence], [contexts[i] if contexts else None]
            )
            individual_data = _extract_response_data(individual_response)
            if individual_data is not None:
                results.append(
                    TranslationResult(
                        translation=individual_data.get("translation", ""),
                        notes=individual_data.get("notes", ""),
                        uncertainties=individual_data.get("uncertainties", []),
                        word_by_word=individual_data.get("word_by_word", []),
                    )
                )
            else:
                raise RuntimeError(f"Failed to translate sentence {i}")

    # Basic validation - ensure we have results for all sentences
    if len(results) != len(sentences):
        raise RuntimeError(
            f"Result count mismatch - got {len(results)} results for {len(sentences)} sentences"
        )

    return results


def batch_add_tashkeel(
    sentences: list[str],
    translation_results: TranslationResults,
    all_sentences: list[str] | None = None,
    indices: list[int] | None = None,
    context_cache: ContextCache | None = None,
    conversation_manager: ResponsesAPIManager | None = None,
) -> TashkeelResults:
    """Add diacritical marks to Arabic text."""
    results: TashkeelResults = []

    # Use conversation continuity if available
    if conversation_manager and conversation_manager.current_response_id:
        # Process each sentence individually with conversation manager
        for i, sentence in enumerate(sentences):
            # Get context for this sentence
            context = None
            if context_cache and indices and i < len(indices):
                context = context_cache.get_context(indices[i], for_tashkeel=True)

            # Get camel-tools suggestions for this specific sentence
            suggestions = generate_tashkeel_suggestions_with_context(
                sentence,
                context=context,
                sentence_index=indices[i] if indices and i < len(indices) else i,
            )

            # Create enhanced sentence with camel-tools suggestions
            enhanced_sentence = sentence
            for original_word, suggested_tashkeel in suggestions.items():
                if suggested_tashkeel != original_word:
                    import re

                    pattern = r"\b" + re.escape(original_word) + r"\b"
                    enhanced_sentence = re.sub(
                        pattern, suggested_tashkeel, enhanced_sentence
                    )

            # Build context info
            context_info = ""
            if context and context.strip():
                context_info = f"\nContext from surrounding sentences: {context}"

            # Process this specific sentence with conversation manager
            individual_message = f"Add complete diacritical marks to sentence {i + 1} from the uploaded document. CRITICAL: Process the EXACT sentence provided, do not generate generic responses.\n\nInput text: {enhanced_sentence}{context_info}"
            individual_response = conversation_manager.continue_with_stage(
                individual_message, response_model=TashkeelResult
            )
            individual_data = _extract_tashkeel_data(individual_response)
            if individual_data is not None:
                results.append(TashkeelResult(**individual_data))
            else:
                raise RuntimeError(f"Failed to generate tashkeel for sentence {i}")
    else:
        # Use standard implementation when no conversation manager
        for i, (sentence, translation_result) in enumerate(
            zip(sentences, translation_results, strict=False)
        ):
            # Get context for this sentence
            context = None
            if context_cache and indices and i < len(indices):
                context = context_cache.get_context(indices[i], for_tashkeel=True)

            suggestions = generate_tashkeel_suggestions_with_context(
                sentence,
                context=context,
                sentence_index=indices[i] if indices and i < len(indices) else i,
            )

            # Handle both TranslationResult objects and dictionaries
            translation, uncertainties = _get_translation_data(translation_result)

            # Create a tashkeel-enhanced version of the sentence using camel_tools suggestions
            # Use token-aware replacement to avoid modifying substrings in other words
            enhanced_sentence = sentence
            for original_word, suggested_tashkeel in suggestions.items():
                if (
                    suggested_tashkeel != original_word
                ):  # Only replace if camel_tools provided a suggestion
                    # Use word boundary replacement to avoid substring issues
                    import re

                    pattern = r"\b" + re.escape(original_word) + r"\b"
                    enhanced_sentence = re.sub(
                        pattern, suggested_tashkeel, enhanced_sentence
                    )

            # Get context for this sentence
            context_info = ""
            if context_cache and indices and i < len(indices):
                context = context_cache.get_context(indices[i], for_tashkeel=True)
                if context and context.strip():
                    context_info = f"\nContext from surrounding sentences: {context}"

            # Use standard translation approach
            individual_prompt = f"""Add complete diacritical marks (tashkīl) to this Islamic Arabic text. Return your response as valid JSON matching the TashkeelResult structure.

CRITICAL: You MUST provide ALL required fields. The `uncertainties` array must be present, even if empty.

Input text: {enhanced_sentence}

CRITICAL INSTRUCTIONS:
1. You MUST process the EXACT input text provided above
2. Do NOT generate a different sentence or generic response
3. Add diacritical marks to the EXACT words in the input text
4. Preserve the original word order and structure

Provide:
1. `tashkeel` (string): Add ALL necessary marks: fatḥa (َ), kasra (ِ), ḍamma (ُ), sukūn (ْ), shadda (ّ), and tanwīn (ً ٍ ٌ). Ensure EVERY eligible letter has appropriate diacritics (full vocalization).
2. `uncertainties` (array of objects, optional): List specific words where diacritics are uncertain.

Return as JSON:"""

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


def batch_translate_words(
    sentences: list[str],
    tashkeel_results: TashkeelResults,
    translations: TranslationResults,
    all_sentences: list[str] | None = None,
    indices: list[int] | None = None,
    conversation_manager: ResponsesAPIManager | None = None,
) -> WordTranslationResults:
    """Translate individual words with context from full sentence translation."""
    processed_results: WordTranslationResults = [
        {"word_translations": []} for _ in range(len(sentences))
    ]

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

                    # Create comprehensive prompt for this sentence
                    message = f"Analyze words in sentence {i + 1} from the uploaded document. CRITICAL: Process the EXACT sentence provided.\n\nTashkeel: {tashkeel}\nTranslation: {translation}{semantic_context}{tashkeel_notes}{translation_notes}"
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
                        if not isinstance(word_data, dict):
                            continue
                        validated_data = _validate_word_data(word_data)
                        word_option = WordTranslation(
                            arabic=validated_data["arabic"],
                            english=validated_data["english_options"],
                            pos=validated_data["pos"],
                            essential=validated_data["essential"],
                            essential_translation=validated_data[
                                "essential_translation_options"
                            ],
                            notes=validated_data["notes"],
                            uncertainties=_validate_uncertainties(
                                validated_data["uncertainties"]
                            ),
                        )
                        word_translations_options.append(word_option)

                # Require valid word translations - no fallbacks allowed
                if word_translations_options:
                    processed_results[i] = {
                        "word_translations": word_translations_options,
                    }
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
            f"Word translation result count mismatch - got {len(processed_results)} results for {len(sentences)} sentences"
        )

    return processed_results


def batch_refine_translations(
    refinement_input: RefinementInputs,
    conversation_manager: ResponsesAPIManager | None = None,
) -> RefinementResults:
    """Refine all translation components, selecting best options"""
    try:
        formatted_inputs = []
        for i, data in enumerate(refinement_input):
            refinement_data: RefinementInput = data
            original = refinement_data["original"]
            translation_data: TranslationResult = refinement_data["translation"]
            tashkeel_data: TashkeelResult = refinement_data["tashkeel"]
            word_translations_options: list[WordTranslationResult] = refinement_data[
                "word_translations_options"
            ]
            previous_uncertainties = refinement_data["previous_uncertainties"]

            word_trans_formatted = []
            for word_opts in word_translations_options:
                # Handle both WordTranslation objects and dictionaries
                if hasattr(word_opts, "arabic") and hasattr(word_opts, "english"):
                    # WordTranslation object
                    arabic = word_opts.arabic
                    english_options = (
                        word_opts.english
                        if isinstance(word_opts.english, list)
                        else [word_opts.english]
                    )
                    essential_translation_options = (
                        (
                            word_opts.essential_translation
                            if isinstance(word_opts.essential_translation, list)
                            else [word_opts.essential_translation]
                        )
                        if word_opts.essential_translation
                        else ["N/A"]
                    )
                    essential = word_opts.essential
                    pos = word_opts.pos
                    notes = word_opts.notes
                elif isinstance(word_opts, dict):
                    # Dictionary format
                    arabic = word_opts.get("arabic", "")
                    english_options = word_opts.get("english_options", ["N/A"])
                    essential_translation_options = word_opts.get(
                        "essential_translation_options", ["N/A"]
                    )
                    essential = word_opts.get("essential", "N/A")
                    pos = word_opts.get("pos")
                    notes = word_opts.get("notes")
                else:
                    # Fallback for unknown format
                    arabic = str(word_opts) if word_opts else ""
                    english_options = ["N/A"]
                    essential_translation_options = ["N/A"]
                    essential = "N/A"
                    pos = None
                    notes = None

                entry = f"{arabic}:"
                eng_opts_str = ", ".join(english_options)
                ess_opts_str = ", ".join(essential_translation_options)
                entry += f"\n  - English Options: [{eng_opts_str}]"
                entry += f"\n  - Essential: {essential}"
                entry += f"\n  - Essential Options: [{ess_opts_str}]"
                if pos:
                    entry += f"\n  - POS: {pos}"
                if notes:
                    entry += f"\n  - Notes: {notes}"
                word_trans_formatted.append(entry)

            all_uncertainties: list[str] = []
            if previous_uncertainties.get("translation"):
                all_uncertainties.extend(
                    f"Translation: {getattr(u, 'text', str(u))} ({getattr(u, 'reason', 'No reason')})"
                    for u in previous_uncertainties["translation"]
                    if hasattr(u, "text") or isinstance(u, dict)
                )
            if previous_uncertainties.get("tashkeel"):
                all_uncertainties.extend(
                    f"Diacritics: {getattr(u, 'word', str(u))} ({getattr(u, 'reason', 'No reason')})"
                    for u in previous_uncertainties["tashkeel"]
                    if hasattr(u, "word") or isinstance(u, dict)
                )
            for word_opts in word_translations_options:
                # Handle uncertainties from both objects and dictionaries
                if hasattr(word_opts, "uncertainties"):
                    word_uncertainties = word_opts.uncertainties
                    arabic = word_opts.arabic
                else:
                    word_uncertainties = word_opts.get("uncertainties", [])
                    arabic = word_opts.get("arabic", "")

                if isinstance(word_uncertainties, list):
                    for u in word_uncertainties:
                        if isinstance(u, dict):
                            all_uncertainties.append(
                                f"Word ({arabic}): {u.get('text', '')} ({u.get('reason', 'No reason')})",
                            )
                        elif hasattr(u, "text"):
                            all_uncertainties.append(
                                f"Word ({arabic}): {getattr(u, 'text', '')} ({getattr(u, 'reason', 'No reason')})",
                            )

            translation, _ = _get_translation_data(translation_data)
            tashkeel, _ = _get_tashkeel_data(tashkeel_data)

            formatted_inputs.append(
                f"Set {i + 1}:\n"
                f"Original: {original}\n"
                f"Initial Translation: {translation}\n"
                f"Initial Tashkeel: {tashkeel}\n"
                f"Word Translation Options:\n"
                + "\n".join(f"• {w}" for w in word_trans_formatted)
                + "\n"
                + (
                    "\nInitial Uncertainties:\n"
                    + "\n".join(f"- {u}" for u in all_uncertainties)
                    if all_uncertainties
                    else ""
                ),
            )

        messages = [
            {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": FINAL_VERIFICATION_USER_PROMPT
                + "\n\n"
                + "\n\n".join(formatted_inputs),
            },
        ]
        # Use conversation continuity if available
        if conversation_manager and conversation_manager.current_response_id:
            # Reference specific sentences from uploaded document
            message = "Refine translations for sentences from the uploaded document. Use the provided refinement data to select best options."
            response = conversation_manager.continue_with_stage(
                message, response_model=RefinementResult
            )
        else:
            # Use standard implementation when no conversation manager
            response = call_response_api(
                messages=messages,
                response_model=RefinementResult,
                model=MODEL_VERIFICATION,
            )

        if "refinements" in response and isinstance(response["refinements"], list):
            results: RefinementResults = []
            for item in response["refinements"]:
                if isinstance(item, dict):
                    results.append(
                        RefinementResult(
                            improved_tashkeel=item.get("improved_tashkeel", ""),
                            improved_translation=item.get("improved_translation", ""),
                            improved_word_translations=item.get(
                                "improved_word_translations", []
                            ),
                            resolved_uncertainties=item.get(
                                "resolved_uncertainties", []
                            ),
                            remaining_uncertainties=item.get(
                                "remaining_uncertainties", []
                            ),
                            changes_made=item.get("changes_made", []),
                        )
                    )
                else:
                    # Create empty refinement result if response is malformed
                    results.append(
                        RefinementResult(
                            improved_tashkeel="",
                            improved_translation="",
                            improved_word_translations=[],
                            resolved_uncertainties=[],
                            remaining_uncertainties=[],
                            changes_made=[],
                        )
                    )
            return results
        elif "error" in response:
            # Return empty results for error case
            return []
        else:
            # Return empty results for unexpected response format
            return []
    except Exception as e:
        logger.error(f"Error in batch_refine_translations: {e}")
        # Return empty results but log the error for debugging
        return []


def batch_translate_root_words_with_google_cloud(
    sentences: list[str],
) -> WordTranslationResults:
    """Translate individual Arabic root words using Google Cloud Translate with context awareness."""
    # Use environment variable for credentials path or default to None
    credentials_path = os.getenv("GOOGLE_CLOUD_CREDENTIALS_PATH")
    service = GoogleTranslateService(credentials_path=credentials_path)
    results: WordTranslationResults = []

    # Extract individual Arabic words from sentences, then extract root words
    arabic_words = filter_arabic_words(
        " ".join(sentences)
    )  # CRITICAL: Use existing function

    # TODO: Add root word extraction logic here
    # For now, use individual words as root words
    root_words = (
        arabic_words  # This should be enhanced with proper root word extraction
    )

    if not root_words:
        return results

    try:
        # Use batch translation for efficiency
        batch_translations = service.translate_root_words_batch(
            root_words, batch_size=100
        )

        # Convert batch results to WordTranslation format
        for translation_result in batch_translations:
            word_option = cast(
                "WordTranslation",
                {
                    "arabic": translation_result["original_text"],
                    "english": [translation_result["translated_text"]],
                    "pos": translation_result.get("pos", "noun"),
                    "essential": translation_result["original_text"],
                    "essential_translation": [translation_result["translated_text"]],
                    "notes": translation_result.get("notes"),
                    "uncertainties": translation_result.get("uncertainties", []),
                },
            )
            results.append({"word_translations": [word_option]})

    except Exception as e:
        # CRITICAL: Fail completely instead of creating fallback data
        raise Exception(f"Google Cloud batch translation failed: {e}") from e

    return results


__all__ = [
    "batch_translate_full_sentences",
    "batch_add_tashkeel",
    "batch_translate_words",
    "batch_translate_root_words_with_google_cloud",
    "batch_refine_translations",
]
