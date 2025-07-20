import logging
import time
from typing import Any

from data.config import (
    MODEL_OTHER,
    MODEL_TRANSLATION,
    MODEL_VERIFICATION,
)
from data.models import WordTranslationOptions
from data.schemas import (
    FINAL_VERIFICATION_USER_PROMPT,
    GENERAL_SYSTEM_PROMPT,
    REFINEMENT_FUNCTION,
    SENTENCE_TRANSLATION_USER_PROMPT,
    TASHKEEL_FUNCTION,
    TASHKEEL_USER_PROMPT,
    TRANSLATE_SENTENCES_FUNCTION,
    WORD_BY_WORD_USER_PROMPT,
    WORD_TRANSLATION_FUNCTION,
)
from utils.api_utils import call_openai_api
from utils.context_cache import ContextCache
from utils.exceptions import TranslationError
from utils.text_utils import filter_arabic_words, get_optimized_context

logger = logging.getLogger(__name__)


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
) -> list[dict[str, Any]]:
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
        return call_openai_api(
            messages,
            function_schema=TRANSLATE_SENTENCES_FUNCTION,
            function_name="translate_sentences",
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
        results: list[dict[str, Any]] = []
        for i, item in enumerate(response["translations"]):
            if i >= len(sentences):
                break
            if isinstance(item, dict) and "t" in item:
                results.append(
                    {
                        "translation": item["t"],
                        "notes": item.get("n"),
                        "uncertainties": item.get("uncertainties", []),
                    },
                )
            elif isinstance(item, dict) and "translation" in item:
                results.append(item)
            else:
                results.append(
                    {
                        "translation": f"[Format Error for: {sentences[i][:20]}...]",
                        "notes": "Response item has unexpected format",
                        "uncertainties": [],
                    },
                )

        while len(results) < len(sentences):
            i = len(results)
            results.append(
                {
                    "translation": f"[Missing Translation for: {sentences[i][:20]}...]",
                    "notes": "Translation missing in API response",
                    "uncertainties": [],
                },
            )

        return results
    elif "error" in response:
        return [
            {
                "translation": "[Translation Error]",
                "notes": response["error"],
                "uncertainties": [],
            }
            for _ in sentences
        ]
    else:
        return [
            {
                "translation": "[Format Error]",
                "notes": "Response format error",
                "uncertainties": [],
            }
            for _ in sentences
        ]


def batch_add_tashkeel(
    sentences: list[str],
    translation_results: list[dict[str, Any]],
    all_sentences: list[str] | None = None,
    indices: list[int] | None = None,
    context_cache: ContextCache | None = None,
) -> list[dict[str, str]]:
    """Add diacritical marks to multiple sentences in a batch"""
    formatted_inputs: list[str] = []
    for i, (sentence, translation_data) in enumerate(
        zip(sentences, translation_results, strict=False),
    ):
        grammar_context = ""
        if all_sentences and indices and i < len(indices):
            if context_cache:
                context = context_cache.get_context(indices[i], for_tashkeel=True)
            else:
                context = get_optimized_context(
                    all_sentences,
                    indices[i],
                    for_tashkeel=True,
                )
            if context:
                grammar_context = f"\nGrammatical context: {context}"

        translation = translation_data.get("translation", "")
        uncertainties = translation_data.get("uncertainties", [])
        uncertainty_notes = ""
        if uncertainties:
            uncertainty_notes = "\nTranslation uncertainties:\n" + "\n".join(
                f"- {u.get('text', '')}: {u.get('reason', '')}" for u in uncertainties
            )

        grammar_notes: list[str] = []
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
            f"Translation: {translation}{uncertainty_notes}{grammar_notes_str}",
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
        model=MODEL_OTHER,
    )

    if "tashkeels" in response and isinstance(response["tashkeels"], list):
        results = []
        for i, item in enumerate(response["tashkeels"]):
            if i >= len(sentences):
                break
            if isinstance(item, dict):
                if "t" in item:
                    results.append(
                        {
                            "tashkeel": item["t"],
                            "uncertainties": item.get("uncertainties", []),
                        },
                    )
                elif "tashkeel" in item:
                    results.append(item)
                else:
                    results.append({"tashkeel": sentences[i], "uncertainties": []})
            else:
                results.append({"tashkeel": sentences[i], "uncertainties": []})

        while len(results) < len(sentences):
            i = len(results)
            results.append({"tashkeel": sentences[i], "uncertainties": []})

        return results
    elif "error" in response:
        return [{"tashkeel": sentence, "uncertainties": []} for sentence in sentences]
    else:
        return [{"tashkeel": sentence, "uncertainties": []} for sentence in sentences]


def batch_translate_words(
    sentences: list[str],
    tashkeel_results: list[dict[str, Any]],
    translations: list[dict[str, Any]],
    all_sentences: list[str] | None = None,
    indices: list[int] | None = None,
    context_cache: ContextCache | None = None,
) -> list[dict[str, Any]]:
    """Create word-by-word translations for multiple sentences in a batch, returning options"""

    max_retries = 3

    processed_results: list[dict[str, Any]] = [
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
                response = call_openai_api(
                    messages,
                    function_schema=WORD_TRANSLATION_FUNCTION,
                    function_name="translate_words",
                    model=MODEL_TRANSLATION,
                )
                if "results" in response and isinstance(response["results"], list):
                    result = response["results"][0] if response["results"] else {}
                    word_translations_options = []
                    raw_word_translations = result.get("word_translations", [])
                    if not isinstance(raw_word_translations, list):
                        raw_word_translations = []
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
                                pos=word_data.get("pos"),
                                essential=essential_letters,
                                essential_translation_options=ess_opts,
                                notes=word_data.get("notes"),
                                uncertainties=word_data.get("uncertainties", []),
                            ).model_dump(),
                        )
                    if word_translations_options:
                        processed_results[i] = {
                            "word_translations": word_translations_options,
                        }
                        break

                raise Exception("No valid word translations returned from model.")
            except Exception as err:
                attempt += 1
                logger.error(f"Sentence {i} failed, retrying attempt {attempt}")
                if attempt >= max_retries:
                    logger.error(
                        f"[FATAL] Sentence {i} failed {max_retries} times. Aborting batch.",
                    )
                    raise TranslationError(
                        f"Sentence {i} failed {max_retries} times."
                    ) from err
                time.sleep(1)
    return processed_results


def batch_refine_translations(
    refinement_input: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    """Refine all translation components, selecting best options"""
    try:
        formatted_inputs = []
        for i, data in enumerate(refinement_input):
            original = data["original"]
            translation_data = data["translation"]
            tashkeel_data = data["tashkeel"]
            word_translations_options = data["word_translations_options"]
            previous_uncertainties = data["previous_uncertainties"]

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
            "function_schema": REFINEMENT_FUNCTION,
            "function_name": "refine_translations",
            "model": MODEL_VERIFICATION,
            "temperature": temp_to_use,
        }
        response = call_openai_api(**api_kwargs)
        if "refinements" in response and isinstance(response["refinements"], list):
            return {"refinements": response["refinements"]}
        elif "error" in response:
            return {"refinements": []}
        else:
            return {"refinements": []}
    except Exception:
        return {"refinements": []}


__all__ = [
    "batch_translate_full_sentences",
    "batch_add_tashkeel",
    "batch_translate_words",
    "batch_refine_translations",
]
