import logging
import time
from typing import Any, cast

from data.config import (
    MODEL_OTHER,
    MODEL_TRANSLATION,
    MODEL_VERIFICATION,
)
from data.models import WordTranslationOptions
from data.pipeline_types import (
    RefinementInput,
    RefinementInputs,
    RefinementResult,
    RefinementResults,
    TashkeelResult,
    TashkeelResults,
    TranslationResult,
    TranslationResults,
    WordTranslationOption,
    WordTranslationResult,
    WordTranslationResults,
)
from data.schemas import (
    FINAL_VERIFICATION_USER_PROMPT,
    GENERAL_SYSTEM_PROMPT,
    REFINEMENT_TOOL,
    SENTENCE_TRANSLATION_USER_PROMPT,
    TASHKEEL_TOOL,
    TRANSLATE_SENTENCES_TOOL,
    WORD_BY_WORD_USER_PROMPT,
    WORD_TRANSLATION_TOOL,
)
from utils.camel_tools_service import (
    format_tashkeel_suggestions,
    generate_tashkeel_suggestions,
)
from utils.context_cache import ContextCache
from utils.google_translate_service import GoogleTranslateService
from utils.responses_api import call_response_api
from utils.text_utils import filter_arabic_words

logger = logging.getLogger(__name__)


def _validate_uncertainties(uncertainties: list[Any]) -> list[dict[str, str]]:
    """Validate and convert uncertainties to proper format."""
    validated = []
    for item in uncertainties:
        if isinstance(item, dict) and "text" in item and "reason" in item:
            validated.append(item)
        elif isinstance(item, str):
            # Convert string to proper format
            validated.append({"text": "unknown", "reason": item})
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
) -> TranslationResults:
    """Translate multiple sentences in a single API call with retry logic"""

    def try_translation(
        sentences: list[str],
        contexts: list[str | None],
        retry_without_context: bool = False,
    ) -> dict[str, Any]:
        """Helper function to attempt translation with or without context"""
        formatted_inputs: list[str] = []
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
        return call_response_api(
            messages,
            tools=[TRANSLATE_SENTENCES_TOOL],
            model=MODEL_TRANSLATION,
        )

    response = try_translation(sentences, contexts)

    if (
        "error" in response
        or not response.get("translations")
        or not isinstance(response.get("translations"), list)
        or len(response.get("translations", [])) < len(sentences)
    ):
        response = try_translation(sentences, contexts, retry_without_context=True)

    if "translations" in response and isinstance(response["translations"], list):
        results: TranslationResults = []
        for i, item in enumerate(response["translations"]):
            if i >= len(sentences):
                break
            if isinstance(item, dict) and "t" in item:
                results.append(
                    TranslationResult(
                        translation=item["t"],
                        notes=item.get("n") or None,
                        uncertainties=item.get("uncertainties", []),
                        word_by_word=item.get("word_by_word", []),
                    ),
                )
            elif isinstance(item, dict) and "translation" in item:
                results.append(
                    TranslationResult(
                        translation=item["translation"],
                        notes=item.get("notes") or None,
                        uncertainties=item.get("uncertainties", []),
                        word_by_word=item.get("word_by_word", []),
                    )
                )
            else:
                results.append(
                    TranslationResult(
                        translation=f"[Format Error for: {sentences[i][:20]}...]",
                        notes="Response item has unexpected format",
                        uncertainties=[],
                        word_by_word=[],
                    ),
                )

        while len(results) < len(sentences):
            i = len(results)
            results.append(
                TranslationResult(
                    translation=f"[Missing Translation for: {sentences[i][:20]}...]",
                    notes="Translation missing in API response",
                    uncertainties=[],
                    word_by_word=[],
                ),
            )

        return results
    elif "error" in response:
        return [
            TranslationResult(
                translation="[Translation Error]",
                notes=response["error"],
                uncertainties=[],
                word_by_word=[],
            )
            for _ in sentences
        ]
    else:
        return [
            TranslationResult(
                translation="[Format Error]",
                notes="Response format error",
                uncertainties=[],
                word_by_word=[],
            )
            for _ in sentences
        ]


def batch_add_tashkeel(
    sentences: list[str],
    translation_results: TranslationResults,
    all_sentences: list[str] | None = None,
    indices: list[int] | None = None,
    context_cache: ContextCache | None = None,
) -> TashkeelResults:
    """Add diacritics to sentences using camel_tools suggestions as primary source."""
    if not sentences:
        return []

    # Generate camel-tools tashkeel suggestions for all sentences
    camel_suggestions_list = []
    for sentence in sentences:
        suggestions = generate_tashkeel_suggestions(sentence)
        camel_suggestions_list.append(suggestions)

    # Format inputs for the AI, emphasizing use of camel_tools suggestions
    formatted_inputs = []
    for i, (sentence, translation_data, camel_suggestions) in enumerate(
        zip(sentences, translation_results, camel_suggestions_list, strict=False)
    ):
        translation = translation_data.get("translation", "")
        uncertainty_notes = ""
        if translation_data.get("uncertainties"):
            uncertainty_notes = "\nTranslation uncertainties:\n" + "\n".join(
                f"- {u}" for u in translation_data["uncertainties"]
            )

        grammar_notes = translation_data.get("grammar_notes", [])
        grammar_notes_str = ""
        if grammar_notes:
            grammar_notes_str = "\nGrammatical notes:\n" + "\n".join(
                f"- {note}" for note in grammar_notes
            )

        # Generate camel-tools tashkeel suggestions
        camel_suggestions_str = format_tashkeel_suggestions(camel_suggestions)

        # Create a tashkeel-enhanced version of the sentence using camel_tools suggestions
        enhanced_sentence = sentence
        for original_word, suggested_tashkeel in camel_suggestions.items():
            if (
                suggested_tashkeel != original_word
            ):  # Only replace if camel_tools provided a suggestion
                enhanced_sentence = enhanced_sentence.replace(
                    original_word, suggested_tashkeel
                )

        formatted_inputs.append(
            f"Set {i + 1}:\n"
            f"Original Arabic: {sentence}\n"
            f"Camel-tools enhanced: {enhanced_sentence}\n"
            f"Translation: {translation}{uncertainty_notes}{grammar_notes_str}"
            f"{f'\n{camel_suggestions_str}' if camel_suggestions_str else ''}",
        )

    # Modified prompt to emphasize using camel_tools suggestions
    modified_prompt = """IMPORTANT: Use the provided camel-tools tashkeel suggestions as your PRIMARY source for diacritics.

The camel-tools suggestions are based on morphological analysis and should be used as the foundation. Your role is to:
1. Use the camel-tools suggestions where provided
2. Add any missing diacritics that camel-tools didn't cover
3. Verify and improve the overall tashkeel based on the translation context
4. Ensure complete vocalization of all words

Add complete diacritical marks (tashkīl) to EVERY word in the Islamic Arabic text using the `TASHKEEL_TOOL` schema. Return your response as valid JSON.

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

    messages = [
        {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": modified_prompt + "\n\n" + "\n\n".join(formatted_inputs),
        },
    ]

    response = call_response_api(
        messages,
        tools=[TASHKEEL_TOOL],
        model=MODEL_OTHER,
    )

    if "tashkeels" in response and isinstance(response["tashkeels"], list):
        results: TashkeelResults = []
        for i, item in enumerate(response["tashkeels"]):
            if i >= len(sentences):
                break
            if isinstance(item, dict):
                if "t" in item:
                    results.append(
                        TashkeelResult(
                            tashkeel=item["t"],
                            uncertainties=item.get("uncertainties", []),
                        ),
                    )
                elif "tashkeel" in item:
                    results.append(
                        TashkeelResult(
                            tashkeel=item["tashkeel"],
                            uncertainties=item.get("uncertainties", []),
                        )
                    )
                else:
                    results.append(
                        TashkeelResult(tashkeel=sentences[i], uncertainties=[])
                    )
            else:
                results.append(TashkeelResult(tashkeel=sentences[i], uncertainties=[]))

        while len(results) < len(sentences):
            i = len(results)
            results.append(TashkeelResult(tashkeel=sentences[i], uncertainties=[]))

        return results
    elif "error" in response:
        return [
            TashkeelResult(tashkeel=sentence, uncertainties=[])
            for sentence in sentences
        ]
    else:
        return [
            TashkeelResult(tashkeel=sentence, uncertainties=[])
            for sentence in sentences
        ]


def batch_translate_words(
    sentences: list[str],
    tashkeel_results: TashkeelResults,
    translations: TranslationResults,
    all_sentences: list[str] | None = None,
    indices: list[int] | None = None,
    context_cache: ContextCache | None = None,
) -> WordTranslationResults:
    """Create word-by-word translations for multiple sentences in a batch, returning options"""

    max_retries = 3

    processed_results: WordTranslationResults = [
        {"word_translations": []} for _ in range(len(sentences))
    ]

    for i, (_sentence, tashkeel_data, translation_data) in enumerate(
        zip(sentences, tashkeel_results, translations, strict=False),
    ):
        attempt = 0
        while attempt < max_retries:
            try:
                tashkeel = tashkeel_data.get("tashkeel", "")
                arabic_words = filter_arabic_words(tashkeel)
                translation = translation_data.get("translation", "")
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
                tashkeel_uncertainties = tashkeel_data.get("uncertainties", [])
                tashkeel_notes = ""
                if tashkeel_uncertainties:
                    tashkeel_notes = "\nTashkeel uncertainties:\n" + "\n".join(
                        f"- {u.get('word', '')}: {u.get('reason', '')}"
                        for u in tashkeel_uncertainties
                    )
                translation_uncertainties = translation_data.get("uncertainties", [])
                translation_notes = ""
                if translation_uncertainties:
                    translation_notes = "\nTranslation uncertainties:\n" + "\n".join(
                        f"- {u.get('text', '')}: {u.get('reason', '')}"
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
                messages = [
                    {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": WORD_BY_WORD_USER_PROMPT + "\n\n" + formatted_input,
                    },
                ]
                response = call_response_api(
                    messages,
                    tools=[WORD_TRANSLATION_TOOL],
                    model=MODEL_TRANSLATION,
                )

                # Handle Response API format - data is returned directly, not wrapped in "results"
                if "results" in response and isinstance(response["results"], list):
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
                    # Response API returns data directly
                    result = response
                else:
                    # Try to find word_translations in the response
                    result = response if isinstance(response, dict) else {}

                word_translations_options = []
                raw_word_translations = result.get("word_translations", [])
                if not isinstance(raw_word_translations, list):
                    raw_word_translations = []

                # If we got no word translations, create fallback ones
                if not raw_word_translations:
                    logger.warning(
                        f"No word translations returned for sentence {i}, creating fallback"
                    )
                    # Create basic fallback word translations
                    for word in arabic_words:
                        word_translations_options.append(
                            WordTranslationOptions(
                                arabic=word,
                                english_options=[f"[{word}]"],
                                pos=None,
                                essential=word,
                                essential_translation_options=[f"[{word}]"],
                                notes="Fallback translation due to API failure",
                                uncertainties=[
                                    {
                                        "text": word,
                                        "reason": "API returned empty result",
                                    }
                                ],
                            ).model_dump(),
                        )
                else:
                    for word_data in raw_word_translations:
                        if not isinstance(word_data, dict):
                            continue
                        eng_opts = word_data.get("english_options", [])
                        if not isinstance(eng_opts, list) or not all(
                            isinstance(s, str) for s in eng_opts
                        ):
                            eng_opts = []
                        ess_opts = word_data.get("essential_translation_options", [])
                        if not isinstance(ess_opts, list) or not all(
                            isinstance(s, str) for s in ess_opts
                        ):
                            ess_opts = []
                        arabic_text = word_data.get("arabic", "")
                        essential_letters = word_data.get("essential", arabic_text)
                        word_translations_options.append(
                            WordTranslationOptions(
                                arabic=arabic_text,
                                english_options=eng_opts,
                                pos=word_data.get("pos") or None,
                                essential=essential_letters,
                                essential_translation_options=ess_opts,
                                notes=word_data.get("notes") or None,
                                uncertainties=_validate_uncertainties(
                                    word_data.get("uncertainties", [])
                                ),
                            ).model_dump(),
                        )

                # Always ensure we have some result, even if it's fallback
                if word_translations_options:
                    processed_results[i] = {
                        "word_translations": word_translations_options,
                    }
                    break
                else:
                    # CRITICAL: Fail completely instead of creating placeholder data
                    logger.error(
                        f"All translation attempts failed for sentence {i} after {max_retries} attempts - failing completely"
                    )
                    raise Exception(
                        f"Translation failed for sentence {i} after {max_retries} attempts. "
                        f"Placeholder data creation is not allowed."
                    )

            except Exception as err:
                attempt += 1
                logger.error(
                    f"Word translation attempt {attempt} failed for sentence {i}: {err}"
                )
                if attempt >= max_retries:
                    # CRITICAL: Fail completely instead of creating placeholder data
                    logger.error(
                        f"All translation attempts failed for sentence {i} after {max_retries} attempts - failing completely"
                    )
                    raise Exception(
                        f"Translation failed for sentence {i} after {max_retries} attempts. "
                        f"Placeholder data creation is not allowed. Error: {str(err)}"
                    ) from err
                time.sleep(1)

    return processed_results


def batch_refine_translations(
    refinement_input: RefinementInputs,
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
                entry = f"{word_opts.get('arabic', '')}:"
                eng_opts_str = ", ".join(word_opts.get("english_options", ["N/A"]))
                ess_opts_str = ", ".join(
                    word_opts.get("essential_translation_options", ["N/A"]),
                )
                entry += f"\n  - English Options: [{eng_opts_str}]"
                entry += f"\n  - Essential: {word_opts.get('essential', 'N/A')}"
                entry += f"\n  - Essential Options: [{ess_opts_str}]"
                if word_opts.get("pos"):
                    entry += f"\n  - POS: {word_opts.get('pos')}"
                if word_opts.get("notes"):
                    entry += f"\n  - Notes: {word_opts.get('notes')}"
                word_trans_formatted.append(entry)

            all_uncertainties: list[str] = []
            if previous_uncertainties.get("translation"):
                all_uncertainties.extend(
                    f"Translation: {u.get('text', '')} ({u.get('reason', 'No reason')})"
                    for u in previous_uncertainties["translation"]
                    if isinstance(u, dict)
                )
            if previous_uncertainties.get("tashkeel"):
                all_uncertainties.extend(
                    f"Diacritics: {u.get('word', '')} ({u.get('reason', 'No reason')})"
                    for u in previous_uncertainties["tashkeel"]
                    if isinstance(u, dict)
                )
            for word_opts in word_translations_options:
                word_uncertainties = word_opts.get("uncertainties", [])
                if isinstance(word_uncertainties, list):
                    for u in word_uncertainties:
                        if isinstance(u, dict):
                            all_uncertainties.append(
                                f"Word ({word_opts.get('arabic', '')}): {u.get('text', '')} ({u.get('reason', 'No reason')})",
                            )

            formatted_inputs.append(
                f"Set {i + 1}:\n"
                f"Original: {original}\n"
                f"Initial Translation: {translation_data.get('translation', '')}\n"
                f"Initial Tashkeel: {tashkeel_data.get('tashkeel', '')}\n"
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
        temp_to_use = 1.0 if MODEL_VERIFICATION == "gpt-4o-mini" else 0.3
        api_kwargs = {
            "messages": messages,
            "tools": [REFINEMENT_TOOL],
            "model": MODEL_VERIFICATION,
            "temperature": temp_to_use,
        }

        response = call_response_api(**api_kwargs)

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
        logger.error(f"Exception in batch_refine_translations: {e}")
        return []


def batch_translate_root_words_with_google_cloud(
    sentences: list[str],
    tashkeel_results: TashkeelResults,
    translations: TranslationResults,
    all_sentences: list[str] | None = None,
    indices: list[int] | None = None,
    context_cache: ContextCache | None = None,
) -> WordTranslationResults:
    """Translate individual Arabic root words using Google Cloud Translate with context awareness."""
    service = GoogleTranslateService(credentials_path="openarabic-3711db289212.json")
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
                "WordTranslationOption",
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
            logger.error(f"Failed to translate root word '{root_word}': {e}")
            # Add fallback result
            word_option = cast(
                "WordTranslationOption",
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
