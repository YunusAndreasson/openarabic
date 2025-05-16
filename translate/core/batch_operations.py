import logging
from typing import List, Dict, Any, Optional

from translate.core.utils import (
    call_openai_api,
    MODEL_TRANSLATION,
    MODEL_OTHER,
    MODEL_VERIFICATION,
)
from translate.core.text_utils import get_optimized_context, filter_arabic_words
from translate.core.schemas import (
    TRANSLATE_SENTENCES_FUNCTION,
    TASHKEEL_FUNCTION,
    WORD_TRANSLATION_FUNCTION,
    REFINEMENT_FUNCTION,
    GENERAL_SYSTEM_PROMPT,
    SENTENCE_TRANSLATION_USER_PROMPT,
    TASHKEEL_USER_PROMPT,
    WORD_BY_WORD_USER_PROMPT,
    FINAL_VERIFICATION_USER_PROMPT,
)

from translate.core.models import WordTranslationOptions


def batch_translate_full_sentences(
    sentences: List[str], contexts: List[Optional[str]]
) -> List[Dict[str, Any]]:
    """Translate multiple sentences in a single API call with retry logic"""

    def try_translation(
        sentences: List[str],
        contexts: List[Optional[str]],
        retry_without_context: bool = False,
    ) -> Dict[str, Any]:
        """Helper function to attempt translation with or without context"""
        formatted_inputs = []
        for i, (sentence, context) in enumerate(zip(sentences, contexts)):
            # On retry, skip context to reduce complexity
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
        return call_openai_api(
            messages,
            function_schema=TRANSLATE_SENTENCES_FUNCTION,
            function_name="translate_sentences",
            model=MODEL_TRANSLATION,  # Use the translation model
        )

    # First try with context
    response = try_translation(sentences, contexts)

    # If failed or got invalid response, retry without context
    if (
        "error" in response
        or not response.get("translations")
        or not isinstance(response.get("translations"), list)
        or len(response.get("translations", [])) < len(sentences)
    ):
        logging.warning(
            "Translation failed or incomplete with context, retrying without context..."
        )
        response = try_translation(sentences, contexts, retry_without_context=True)

    # Handle the response
    if "translations" in response and isinstance(response["translations"], list):
        # Convert compact format to full format if needed
        results = []
        for i, item in enumerate(response["translations"]):
            if i >= len(sentences):
                break
            if isinstance(item, dict) and "t" in item:  # Compact format
                results.append(
                    {
                        "translation": item["t"],
                        "notes": item.get("n"),
                        "uncertainties": item.get("uncertainties", []),
                    }
                )
            elif (
                isinstance(item, dict) and "translation" in item
            ):  # Already in full format
                results.append(item)
            else:  # Handle unexpected item format
                results.append(
                    {
                        "translation": f"[Format Error for: {sentences[i][:20]}...]",
                        "notes": "Response item has unexpected format",
                        "uncertainties": [],
                    }
                )

        # Make sure we have a result for each input sentence
        while len(results) < len(sentences):
            i = len(results)
            results.append(
                {
                    "translation": f"[Missing Translation for: {sentences[i][:20]}...]",
                    "notes": "Translation missing in API response",
                    "uncertainties": [],
                }
            )

        return results
    elif "error" in response:
        logging.error(f"Error in batch translation: {response['error']}")
        return [
            {
                "translation": "[Translation Error]",
                "notes": response["error"],
                "uncertainties": [],
            }
            for _ in sentences
        ]
    else:
        logging.error("Unexpected response format in batch translation")
        return [
            {
                "translation": "[Format Error]",
                "notes": "Response format error",
                "uncertainties": [],
            }
            for _ in sentences
        ]


def batch_add_tashkeel(
    sentences: List[str],
    translation_results: List[Dict[str, Any]],
    all_sentences: List[str] = None,
    indices: List[int] = None,
) -> List[Dict[str, str]]:
    """Add diacritical marks to multiple sentences in a batch"""
    formatted_inputs = []
    for i, (sentence, translation_data) in enumerate(
        zip(sentences, translation_results)
    ):
        # Add grammatical context if available
        grammar_context = ""
        if all_sentences and indices and i < len(indices):
            context = get_optimized_context(
                all_sentences, indices[i], for_tashkeel=True
            )
            if context:
                grammar_context = f"\nGrammatical context: {context}"

        # Extract translation and uncertainties
        translation = translation_data.get("translation", "")
        uncertainties = translation_data.get("uncertainties", [])
        uncertainty_notes = ""
        if uncertainties:
            uncertainty_notes = "\nTranslation uncertainties:\n" + "\n".join(
                f"- {u.get('text', '')}: {u.get('reason', '')}" for u in uncertainties
            )

        # Extract word-level grammatical notes if available
        grammar_notes = []
        if "word_by_word" in translation_data:
            for word in translation_data["word_by_word"]:
                if word.get("notes") and word.get("arabic"):
                    grammar_notes.append(f"{word['arabic']}: {word['notes']}")
        grammar_notes_str = ""
        if grammar_notes:
            grammar_notes_str = "\nGrammatical notes:\n" + "\n".join(
                f"- {note}" for note in grammar_notes
            )

        formatted_inputs.append(
            f"Set {i + 1}:\n"
            f"Arabic: {sentence}{grammar_context}\n"
            f"Translation: {translation}{uncertainty_notes}{grammar_notes_str}"
        )

    messages = [
        {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": TASHKEEL_USER_PROMPT + "\n\n" + "\n\n".join(formatted_inputs),
        },
    ]

    response = call_openai_api(
        messages,
        function_schema=TASHKEEL_FUNCTION,
        function_name="add_tashkeel",
        model=MODEL_OTHER,  # Use MODEL_OTHER for tashkeel
    )

    if "tashkeels" in response and isinstance(response["tashkeels"], list):
        results = []
        for i, item in enumerate(response["tashkeels"]):
            if i >= len(sentences):
                break
            if isinstance(item, dict):
                if "t" in item:  # Compact format
                    results.append(
                        {
                            "tashkeel": item["t"],
                            "uncertainties": item.get("uncertainties", []),
                        }
                    )
                elif "tashkeel" in item:  # Full format
                    results.append(item)
                else:
                    results.append({"tashkeel": sentences[i], "uncertainties": []})
            else:
                results.append({"tashkeel": sentences[i], "uncertainties": []})

        # Make sure we have a result for each input sentence
        while len(results) < len(sentences):
            i = len(results)
            results.append({"tashkeel": sentences[i], "uncertainties": []})

        return results
    elif "error" in response:
        logging.error(f"Error adding tashkeel: {response['error']}")
        return [{"tashkeel": sentence, "uncertainties": []} for sentence in sentences]
    else:
        logging.error("Unexpected response format when adding tashkeel")
        return [{"tashkeel": sentence, "uncertainties": []} for sentence in sentences]


def batch_translate_words(
    sentences: List[str],
    tashkeel_results: List[Dict[str, Any]],
    translations: List[Dict[str, Any]],
    all_sentences: List[str] = None,
    indices: List[int] = None,
) -> List[Dict[str, Any]]:  # Returns results with options
    """Create word-by-word translations for multiple sentences in a batch, returning options"""

    # Initialize results list to ensure we have a placeholder for each sentence
    processed_results = [{"word_translations": []} for _ in range(len(sentences))]

    # First try to process all sentences in a batch
    try:
        formatted_inputs = []
        for i, (sentence, tashkeel_data, translation_data) in enumerate(
            zip(sentences, tashkeel_results, translations)
        ):
            # Filter to get only Arabic words for word-by-word translation
            tashkeel = tashkeel_data.get("tashkeel", "")
            arabic_words = filter_arabic_words(tashkeel)

            # Add semantic context for word-level analysis if available
            semantic_context = ""
            if all_sentences and indices and i < len(indices):
                orig_index = indices[i]

                # Extract key terms from nearby sentences for semantic context
                key_terms = set()

                # Words from the current sentence to look for in context
                important_words = [w for w in arabic_words if len(w) > 3]

                # Check previous and next sentences for related terms
                for j in range(
                    max(0, orig_index - 1), min(len(all_sentences), orig_index + 2)
                ):
                    if j != orig_index:  # Skip current sentence
                        for word in important_words:
                            if word in all_sentences[j]:
                                key_terms.add(word)

                if key_terms:
                    semantic_context = (
                        f"\nRelated terms in context: {', '.join(key_terms)}"
                    )

            # Extract tashkeel and its uncertainties
            tashkeel_uncertainties = tashkeel_data.get("uncertainties", [])
            tashkeel_notes = ""
            if tashkeel_uncertainties:
                tashkeel_notes = "\nTashkeel uncertainties:\n" + "\n".join(
                    f"- {u.get('word', '')}: {u.get('reason', '')}"
                    for u in tashkeel_uncertainties
                )

            # Extract translation and its uncertainties
            translation = translation_data.get("translation", "")
            translation_uncertainties = translation_data.get("uncertainties", [])
            translation_notes = ""
            if translation_uncertainties:
                translation_notes = "\nTranslation uncertainties:\n" + "\n".join(
                    f"- {u.get('text', '')}: {u.get('reason', '')}"
                    for u in translation_uncertainties
                )

            formatted_inputs.append(
                f"Set {i + 1}:\n"
                f"Arabic words to translate:\n{' '.join(arabic_words)}\n"
                f"Full context (with tashkeel): {tashkeel}\n"
                f"Translation: {translation}"
                f"{semantic_context}"
                f"{tashkeel_notes}"
                f"{translation_notes}"
            )

        messages = [
            {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": WORD_BY_WORD_USER_PROMPT
                + "\n\n"
                + "\n\n".join(formatted_inputs),
            },
        ]

        response = call_openai_api(
            messages,
            function_schema=WORD_TRANSLATION_FUNCTION,
            function_name="translate_words",
            model=MODEL_TRANSLATION,  # Use the translation model for word translations
        )

        if "results" in response and isinstance(response["results"], list):
            # Process successful batch results
            for i, result in enumerate(response["results"]):
                if i >= len(sentences):
                    break

                word_translations_options = []  # List to hold WordTranslationOptions
                raw_word_translations = result.get("word_translations", [])

                if not isinstance(raw_word_translations, list):
                    logging.warning(
                        f"Invalid word_translations format for sentence {i}, expected list but got {type(raw_word_translations)}"
                    )
                    raw_word_translations = []  # Ensure it's a list

                elif not raw_word_translations:
                    logging.warning(f"Empty word_translations for sentence {i}")

                for word_data in raw_word_translations:
                    if not isinstance(word_data, dict):
                        logging.warning(
                            f"Invalid word data format in sentence {i}, expected dict but got {type(word_data)}"
                        )
                        continue  # Skip invalid entries

                    # Get options, ensuring they are lists of strings
                    eng_opts = word_data.get("english_options", [])
                    if not isinstance(eng_opts, list) or not all(
                        isinstance(s, str) for s in eng_opts
                    ):
                        logging.warning(
                            f"Invalid english_options format in sentence {i}, ensuring it's a list of strings"
                        )
                        eng_opts = []  # Default to empty list if format is wrong

                    ess_opts = word_data.get("essential_translation_options", [])
                    if not isinstance(ess_opts, list) or not all(
                        isinstance(s, str) for s in ess_opts
                    ):
                        logging.warning(
                            f"Invalid essential_translation_options format in sentence {i}, ensuring it's a list of strings"
                        )
                        ess_opts = []  # Default to empty list

                    # Get other fields
                    arabic_text = word_data.get("arabic", "")
                    essential_letters = word_data.get("essential")

                    # Fallback if essential is missing (critical for word card)
                    if not essential_letters:
                        essential_letters = arabic_text
                        logging.warning(
                            f"Missing essential letters for word '{arabic_text}' in sentence {i}, falling back to original word"
                        )

                    word_translations_options.append(
                        WordTranslationOptions(
                            arabic=arabic_text,
                            english_options=eng_opts,
                            pos=word_data.get("pos"),
                            essential=essential_letters,
                            essential_translation_options=ess_opts,
                            notes=word_data.get("notes"),
                            uncertainties=word_data.get("uncertainties", []),
                        ).model_dump()  # Store as dict for refinement input
                    )

                if word_translations_options:
                    processed_results[i] = {
                        "word_translations": word_translations_options
                    }
                    logging.info(
                        f"Successfully extracted word translations for sentence {i}"
                    )

        elif "error" in response:
            logging.error(f"API error in batch word translation: {response['error']}")
            # We'll handle individual sentences below instead of failing the whole batch
        else:
            logging.error("Unexpected response format in batch word translation")
            # We'll handle individual sentences below

    except Exception as e:
        logging.error(f"Exception in batch word translation: {str(e)}")
        # Continue to individual processing

    # Process any sentences with empty word translations individually
    for i, result in enumerate(processed_results):
        if not result.get("word_translations"):
            logging.info(f"Retrying word translation for sentence {i} individually")
            try:
                # Process this sentence individually with a slightly different prompt
                sentences[i]
                tashkeel_data = tashkeel_results[i]
                translation_data = translations[i]

                tashkeel = tashkeel_data.get("tashkeel", "")
                arabic_words = filter_arabic_words(tashkeel)
                translation = translation_data.get("translation", "")

                # Simplified prompt for individual retry
                individual_prompt = f"""
Translate these Arabic words (with tashkeel) individually:
{" ".join(arabic_words)}

Full sentence context (with tashkeel): {tashkeel}
Translation: {translation}

Provide a detailed word-by-word translation with options.
"""

                messages = [
                    {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": WORD_BY_WORD_USER_PROMPT
                        + "\n\n"
                        + individual_prompt,
                    },
                ]

                # Use smaller model for individual retry if available
                retry_model = (
                    MODEL_OTHER
                    if MODEL_OTHER != MODEL_TRANSLATION
                    else MODEL_TRANSLATION
                )

                individual_response = call_openai_api(
                    messages,
                    function_schema=WORD_TRANSLATION_FUNCTION,
                    function_name="translate_words",
                    model=retry_model,
                    temperature=0.4,  # Slightly higher temperature for retry
                )

                if (
                    "results" in individual_response
                    and isinstance(individual_response["results"], list)
                    and len(individual_response["results"]) > 0
                ):
                    result = individual_response["results"][0]
                    word_translations_options = []

                    raw_word_translations = result.get("word_translations", [])
                    if isinstance(raw_word_translations, list):
                        for word_data in raw_word_translations:
                            if not isinstance(word_data, dict):
                                continue

                            # Process options as before
                            eng_opts = word_data.get("english_options", [])
                            if not isinstance(eng_opts, list) or not all(
                                isinstance(s, str) for s in eng_opts
                            ):
                                eng_opts = []

                            ess_opts = word_data.get(
                                "essential_translation_options", []
                            )
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
                                    pos=word_data.get("pos"),
                                    essential=essential_letters,
                                    essential_translation_options=ess_opts,
                                    notes=word_data.get("notes", "")
                                    + " (Individual retry)",
                                    uncertainties=word_data.get("uncertainties", []),
                                ).model_dump()
                            )

                    if word_translations_options:
                        processed_results[i] = {
                            "word_translations": word_translations_options
                        }
                        logging.info(
                            f"Successfully recovered word translations for sentence {i} individually"
                        )
                    else:
                        # Last resort: create minimal word translations to prevent complete failure
                        fallback_translations = []
                        for word in arabic_words:
                            fallback_translations.append(
                                WordTranslationOptions(
                                    arabic=word,
                                    english_options=["[Translation needed]"],
                                    pos="noun",  # Default assumption
                                    essential=word,
                                    essential_translation_options=[
                                        "[Translation needed]"
                                    ],
                                    notes="Generated as fallback after multiple failures",
                                    uncertainties=[
                                        {
                                            "text": word,
                                            "reason": "Failed translation attempts",
                                        }
                                    ],
                                ).model_dump()
                            )
                        processed_results[i] = {
                            "word_translations": fallback_translations
                        }
                        logging.warning(
                            f"Created fallback word translations for sentence {i}"
                        )

            except Exception as individual_error:
                logging.error(
                    f"Individual word translation retry failed for sentence {i}: {str(individual_error)}"
                )
                # We already have a placeholder empty list from initialization

    return processed_results


def batch_refine_translations(
    refinement_input: List[Dict[str, Any]],
) -> Dict[str, List]:
    """Refine all translation components, selecting best options"""
    formatted_inputs = []

    for i, data in enumerate(refinement_input):
        # Extract all components, including word options
        original = data["original"]
        translation_data = data["translation"]
        tashkeel_data = data["tashkeel"]
        word_translations_options = data[
            "word_translations_options"
        ]  # Input now has options
        previous_uncertainties = data["previous_uncertainties"]

        # Format word translations options for the prompt
        word_trans_formatted = []
        for word_opts in word_translations_options:  # Iterate through option objects
            entry = f"{word_opts.get('arabic', '')}:"
            eng_opts_str = ", ".join(word_opts.get("english_options", ["N/A"]))
            ess_opts_str = ", ".join(
                word_opts.get("essential_translation_options", ["N/A"])
            )
            entry += f"\n  - English Options: [{eng_opts_str}]"
            entry += f"\n  - Essential: {word_opts.get('essential', 'N/A')}"
            entry += f"\n  - Essential Options: [{ess_opts_str}]"
            if word_opts.get("pos"):
                entry += f"\n  - POS: {word_opts.get('pos')}"
            if word_opts.get("notes"):
                entry += f"\n  - Notes: {word_opts.get('notes')}"
            word_trans_formatted.append(entry)

        # Format all uncertainties for resolution (combine from all steps)
        all_uncertainties = []
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
        # Include uncertainties from the word options step
        for word_opts in word_translations_options:
            word_uncertainties = word_opts.get("uncertainties", [])
            if isinstance(word_uncertainties, list):
                for u in word_uncertainties:
                    if isinstance(u, dict):
                        all_uncertainties.append(
                            f"Word ({word_opts.get('arabic', '')}): {u.get('text', '')} ({u.get('reason', 'No reason')})"
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
            )
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

    # Set temperature based on the verification model
    temp_to_use = 1.0 if MODEL_VERIFICATION == "o4-mini" else 0.3

    api_kwargs = {
        "messages": messages,
        "function_schema": REFINEMENT_FUNCTION,
        "function_name": "refine_translations",
        "model": MODEL_VERIFICATION,
        "temperature": temp_to_use,  # Explicitly set the correct temperature
    }

    response = call_openai_api(**api_kwargs)

    if "refinements" in response and isinstance(response["refinements"], list):
        return {"refinements": response["refinements"]}
    elif "error" in response:
        logging.error(f"Error in refinement: {response['error']}")
        return {"refinements": []}
    else:
        logging.error("Unexpected response format in refinement")
        return {"refinements": []}
