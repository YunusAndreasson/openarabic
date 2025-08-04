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
    WordTranslationOptions,
    WordTranslationResult,
    WordUncertainty,
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
    WORD_BY_WORD_USER_PROMPT,
)
from utils.camel_tools_service import (
    format_tashkeel_suggestions,
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

    # Validate english_options
    eng_opts = word_data.get("english_options", [])
    if not isinstance(eng_opts, list) or not all(isinstance(s, str) for s in eng_opts):
        eng_opts = []

    # Validate essential_translation_options
    ess_opts = word_data.get("essential_translation_options", [])
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


def _validate_uncertainties(uncertainties: list[Any]) -> list[WordUncertainty]:
    """Validate and convert uncertainties to proper format."""
    validated = []
    for item in uncertainties:
        if isinstance(item, dict) and "text" in item and "reason" in item:
            validated.append(WordUncertainty(text=item["text"], reason=item["reason"]))
        elif isinstance(item, str):
            # Convert string to proper format
            validated.append(WordUncertainty(text="unknown", reason=item))
        elif isinstance(item, WordUncertainty):
            validated.append(item)
        else:
            # Skip invalid items
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
    """Translate multiple sentences in a single API call with retry logic"""

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
        # Reference specific sentences from uploaded document
        sentence_indices = list(range(len(sentences)))
        message = (
            f"Please translate sentences {sentence_indices} from the uploaded document"
        )
        response = conversation_manager.continue_with_stage(
            message, response_model=TranslationResult
        )
    else:
        # Use standard implementation when no conversation manager
        response = try_translation(sentences, contexts)

    # Handle Response API response structure
    results: TranslationResults = []

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
        # Multiple sentences - Response API can't handle this in one call
        # We need to process each sentence individually
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

    # Ensure we have results for all sentences
    if len(results) < len(sentences):
        raise RuntimeError(
            f"Missing results: got {len(results)} for {len(sentences)} sentences"
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
    """Add diacritics to sentences using camel_tools suggestions as primary source."""
    if not sentences:
        return []

    # Generate camel-tools tashkeel suggestions for all sentences with context
    camel_suggestions_list = []
    for i, sentence in enumerate(sentences):
        # Get context for this sentence
        context = None
        if context_cache and indices and i < len(indices):
            context = context_cache.get_context(indices[i], for_tashkeel=True)

        suggestions = generate_tashkeel_suggestions_with_context(
            sentence,
            context=context,
            sentence_index=indices[i] if indices and i < len(indices) else i,
        )
        camel_suggestions_list.append(suggestions)

    # Format inputs for the AI, emphasizing use of camel_tools suggestions
    formatted_inputs = []
    for i, (sentence, translation_data, camel_suggestions) in enumerate(
        zip(sentences, translation_results, camel_suggestions_list, strict=False)
    ):
        # Handle both TranslationResult objects and dictionaries
        translation, uncertainties = _get_translation_data(translation_data)

        uncertainty_notes = ""
        if uncertainties:
            uncertainty_notes = "\nTranslation uncertainties:\n" + "\n".join(
                f"- {u}" for u in uncertainties
            )

        # Handle grammar notes (may not exist in current structure)
        grammar_notes_str = ""

        # Generate camel-tools tashkeel suggestions
        camel_suggestions_str = format_tashkeel_suggestions(camel_suggestions)

        # Create a tashkeel-enhanced version of the sentence using camel_tools suggestions
        # Use token-aware replacement to avoid modifying substrings in other words
        enhanced_sentence = sentence
        for original_word, suggested_tashkeel in camel_suggestions.items():
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

        formatted_inputs.append(
            f"Set {i + 1}:\n"
            f"Original Arabic: {sentence}\n"
            f"Camel-tools enhanced: {enhanced_sentence}\n"
            f"Translation: {translation}{uncertainty_notes}{grammar_notes_str}{context_info}"
            f"{f'\n{camel_suggestions_str}' if camel_suggestions_str else ''}"
        )

    # Modified prompt to emphasize using camel_tools suggestions as starting point
    modified_prompt = """IMPORTANT: Use the provided camel-tools tashkeel suggestions as a STARTING POINT, but improve them using context and translation.

The camel-tools suggestions are based on morphological analysis but may not consider sentence context. Your role is to:
1. Start with the camel-tools suggestions as a foundation
2. Use the translation context and surrounding sentences to improve accuracy
3. Override camel-tools suggestions when context indicates different diacritics
4. Add any missing diacritics that camel-tools didn't cover
5. Ensure complete vocalization of all words with context-appropriate diacritics

Add complete diacritical marks (tashkīl) to EVERY word in the Islamic Arabic text. Return your response as valid JSON matching the TashkeelResult structure.

CRITICAL: You MUST provide ALL required fields. The `uncertainties` array must be present for every tashkeel result, even if empty.

For each input text segment, provide:
1. `tashkeel` (string):
   - Start with the camel-tools enhanced version provided
   - Add ALL necessary marks: fatḥa (َ), kasra (ِ), ḍamma (ُ), sukūn (ْ), shadda (ّ), and tanwīn (ً ٍ ٌ).
   - Ensure EVERY eligible letter has appropriate diacritics (full vocalization).
   - Use translation context and provided grammatical notes to resolve vowelization ambiguities.
   - Pay special attention to case endings based on grammatical roles noted.
   - Consider verb forms, tenses, and moods indicated in the notes.
   - Ensure grammatical accuracy (case endings, conjugations).
   - Preserve ALL original punctuation, formatting, and special characters.
2. `uncertainties` (array of objects, optional):
   - List specific words where diacritics are uncertain.
   - Each object should have `word` (the word), `reason` (why it's uncertain), and optionally `related_translation_uncertainty`.
   - Provide the primary interpretation based on context even if uncertain.

Input texts:
"""

    # Use conversation continuity if available
    if conversation_manager and conversation_manager.current_response_id:
        # Reference specific sentences from uploaded document with context emphasis
        sentence_indices = list(range(len(sentences)))
        message = f"Add tashkeel to sentences {sentence_indices} from the uploaded document. Use camel-tools suggestions as starting point but improve them using the full document context and translation."
        response = conversation_manager.continue_with_stage(
            message, response_model=TashkeelResult
        )
    else:
        # Use standard implementation when no conversation manager
        messages = [
            {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": modified_prompt + "\n\n" + "\n\n".join(formatted_inputs),
            },
        ]

        try:
            # Process each sentence individually to get proper tashkeel results
            results: TashkeelResults = []
            for i, sentence in enumerate(sentences):
                # Create individual prompt for each sentence
                individual_prompt = f"""Add complete diacritical marks (tashkīl) to this Islamic Arabic text. Return your response as valid JSON matching the TashkeelResult structure.

CRITICAL: You MUST provide ALL required fields. The `uncertainties` array must be present, even if empty.

Input text: {sentence}

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

                if "error" in response:
                    raise RuntimeError(
                        f"Tashkeel API error for sentence {i}: {response['error']}"
                    )

                # Extract the tashkeel result from the response using helper function
                tashkeel_data = _extract_tashkeel_data(response)
                if tashkeel_data:
                    results.append(TashkeelResult(**tashkeel_data))
                else:
                    raise RuntimeError(
                        f"Invalid tashkeel response format for sentence {i}: {response}"
                    )

        except Exception as e:
            # Handle Arabic-specific processing errors
            for sentence in sentences:
                _handle_arabic_processing_error(sentence, "tashkeel generation", e)

            # Fail the pipeline instead of returning fallback results
            raise RuntimeError(f"Tashkeel generation failed: {e}")

    # Return the results
    return results


def batch_translate_words(
    sentences: list[str],
    tashkeel_results: TashkeelResults,
    translations: TranslationResults,
    all_sentences: list[str] | None = None,
    indices: list[int] | None = None,
    conversation_manager: ResponsesAPIManager | None = None,
) -> WordTranslationResults:
    """Create word-by-word translations for multiple sentences in a batch, returning options"""

    max_retries = 3

    processed_results: WordTranslationResults = [
        {"word_translations": []} for _ in range(len(sentences))
    ]

    for i, (_, tashkeel_data, translation_data) in enumerate(
        zip(sentences, tashkeel_results, translations, strict=False),
    ):
        attempt = 0
        while attempt < max_retries:
            try:
                # Handle both TranslationResult objects and dictionaries
                tashkeel, tashkeel_uncertainties = _get_tashkeel_data(tashkeel_data)
                translation, translation_uncertainties = _get_translation_data(
                    translation_data
                )

                arabic_words = filter_arabic_words(tashkeel)

                semantic_context = ""
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
                    if key_terms:
                        semantic_context = (
                            f"\nRelated terms in context: {', '.join(key_terms)}"
                        )

                tashkeel_notes = ""
                if tashkeel_uncertainties:
                    tashkeel_notes = "\nTashkeel uncertainties:\n" + "\n".join(
                        f"- {getattr(u, 'word', str(u))}: {getattr(u, 'reason', str(u))}"
                        for u in tashkeel_uncertainties
                    )

                translation_notes = ""
                if translation_uncertainties:
                    translation_notes = "\nTranslation uncertainties:\n" + "\n".join(
                        f"- {getattr(u, 'text', str(u))}: {getattr(u, 'reason', str(u))}"
                        for u in translation_uncertainties
                    )
                formatted_input = _build_word_prompt(
                    tashkeel,
                    translation,
                    arabic_words,
                    semantic_context,
                    tashkeel_notes,
                    translation_notes,
                )
                # Use conversation continuity if available
                if conversation_manager and conversation_manager.current_response_id:
                    # Reference specific sentences from uploaded document
                    message = f"Analyze words in sentence {i + 1} from the uploaded document. Tashkeel: {tashkeel}, Translation: {translation}"
                    response = conversation_manager.continue_with_stage(
                        message, response_model=WordTranslationResult
                    )
                else:
                    # Use standard implementation when no conversation manager
                    messages = [
                        {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
                        {
                            "role": "user",
                            "content": WORD_BY_WORD_USER_PROMPT
                            + "\n\n"
                            + formatted_input,
                        },
                    ]
                    response = call_response_api(
                        messages,
                        response_model=WordTranslationResult,
                        model=MODEL_TRANSLATION,
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
                        word_option = WordTranslationOptions(
                            arabic=validated_data["arabic"],
                            english_options=validated_data["english_options"],
                            pos=validated_data["pos"],
                            essential=validated_data["essential"],
                            essential_translation_options=validated_data[
                                "essential_translation_options"
                            ],
                            notes=validated_data["notes"],
                            uncertainties=_validate_uncertainties(
                                validated_data["uncertainties"]
                            ),
                        )
                        word_translations_options.append(word_option)

                # Always ensure we have some result, even if it's fallback
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
                # Handle both WordTranslationOptions objects and dictionaries
                if hasattr(word_opts, "arabic"):
                    arabic = word_opts.arabic
                    english_options = word_opts.english_options
                    essential_translation_options = (
                        word_opts.essential_translation_options
                    )
                    essential = word_opts.essential
                    pos = word_opts.pos
                    notes = word_opts.notes
                else:
                    arabic = word_opts.get("arabic", "")
                    english_options = word_opts.get("english_options", ["N/A"])
                    essential_translation_options = word_opts.get(
                        "essential_translation_options", ["N/A"]
                    )
                    essential = word_opts.get("essential", "N/A")
                    pos = word_opts.get("pos")
                    notes = word_opts.get("notes")

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
            return []
        else:
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

    # Translate each root word individually
    for root_word in root_words:
        try:
            root_word_translation = service.translate_root_word_with_retry(root_word)

            # Convert to WordTranslationOptions format
            word_option = cast(
                "WordTranslationOptions",
                {
                    "arabic": root_word,
                    "english_options": [root_word_translation["translated_text"]],
                    "pos": root_word_translation.get("pos", "noun"),
                    "essential": root_word,
                    "essential_translation_options": [
                        root_word_translation["translated_text"]
                    ],
                    "notes": root_word_translation.get("notes"),
                    "uncertainties": root_word_translation.get("uncertainties", []),
                },
            )
            results.append({"word_translations": [word_option]})
        except Exception as e:
            # Add fallback result
            word_option = cast(
                "WordTranslationOptions",
                {
                    "arabic": root_word,
                    "english_options": ["[Translation Error]"],
                    "pos": "noun",
                    "essential": root_word,
                    "essential_translation_options": ["[Translation Error]"],
                    "notes": f"Google Cloud translation failed: {e}",
                    "uncertainties": [
                        {"text": root_word, "reason": f"Translation error: {e}"}
                    ],
                },
            )
            results.append({"word_translations": [word_option]})

    return results


__all__ = [
    "batch_translate_full_sentences",
    "batch_add_tashkeel",
    "batch_translate_words",
    "batch_translate_root_words_with_google_cloud",
    "batch_refine_translations",
]
