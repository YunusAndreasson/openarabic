from typing import Any

from data.models import SentenceTranslation, WordTranslation
from data.pipeline_types import (
    RefinementInput,
    RefinementInputs,
    RefinementResult,
    TashkeelResult,
    TashkeelResults,
    TranslationResult,
    TranslationResults,
    WordTranslationResult,
    WordTranslationResults,
)
from utils.validation import (
    validate_final_translation,
    validate_translation_results,
)


# Import functions lazily to avoid circular imports
def _get_translation_engine_functions() -> tuple[Any, Any, Any, Any]:
    """Lazy import to avoid circular dependencies."""
    from pipeline.translation_engine import (
        batch_add_tashkeel,
        batch_refine_translations,
        batch_translate_full_sentences,
        batch_translate_words,
    )

    return (
        batch_add_tashkeel,
        batch_refine_translations,
        batch_translate_full_sentences,
        batch_translate_words,
    )


def run_full_translation(
    batch_sentences: list[str],
    batch_contexts: list[str | None],
) -> TranslationResults:
    """Translate a batch of sentences and validate the results."""
    batch_translate_full_sentences = _get_translation_engine_functions()[2]
    translations = batch_translate_full_sentences(batch_sentences, batch_contexts)
    validate_translation_results(batch_sentences, translations, "Full Translation")
    return translations


def apply_tashkeel(
    batch_sentences: list[str],
    translation_results: TranslationResults,
    all_sentences: list[str] | None = None,
    batch_indices: list[int] | None = None,
    context_cache: Any = None,
) -> TashkeelResults:
    """Add diacritics to sentences and validate the results."""
    batch_add_tashkeel = _get_translation_engine_functions()[0]
    tashkeel = batch_add_tashkeel(
        batch_sentences,
        translation_results,
        all_sentences,
        batch_indices,
        context_cache,
    )
    validate_translation_results(batch_sentences, tashkeel, "Tashkeel Addition")
    return tashkeel


def translate_words(
    batch_sentences: list[str],
    tashkeel_results: TashkeelResults,
    translation_results: TranslationResults,
    all_sentences: list[str] | None = None,
    batch_indices: list[int] | None = None,
    context_cache: Any = None,
) -> WordTranslationResults:
    """Generate word-by-word translations and validate them."""
    batch_translate_words = _get_translation_engine_functions()[3]
    word_results = batch_translate_words(
        batch_sentences,
        tashkeel_results,
        translation_results,
        all_sentences,
        batch_indices,
        context_cache,
    )
    validate_translation_results(
        batch_sentences,
        word_results,
        "Word Translation Options",
        check_word_options=True,
    )
    return word_results


def build_refinement_input(
    batch_sentences: list[str],
    translation_results: TranslationResults,
    tashkeel_results: TashkeelResults,
    word_options_results: WordTranslationResults,
) -> tuple[RefinementInputs, list[list[dict[str, Any]]]]:
    """Prepare input payload for refinement step."""
    refinement_input: RefinementInputs = []
    all_word_uncertainties: list[list[dict[str, Any]]] = []
    for i, opts in enumerate(word_options_results):
        word_opts_list = opts.get("word_translations", [])
        all_word_uncertainties.append(
            [
                u
                for word_opts in word_opts_list
                for u in word_opts.get("uncertainties", [])
            ],
        )
        refinement_input.append(
            RefinementInput(
                original=batch_sentences[i],
                translation=translation_results[i],
                tashkeel=tashkeel_results[i],
                word_translations_options=word_opts_list,
                previous_uncertainties={
                    "translation": translation_results[i].get("uncertainties", []),
                    "tashkeel": tashkeel_results[i].get("uncertainties", []),
                    "word": all_word_uncertainties[-1],
                },
            ),
        )
    return refinement_input, all_word_uncertainties


def create_sentence_translation(
    i: int,
    start_index: int,
    original_sentence: str,
    refinement: RefinementResult,
    translation_result: TranslationResult,
    tashkeel_result: TashkeelResult,
    word_options_result: WordTranslationResult,
) -> SentenceTranslation:
    refined_tashkeel = refinement.get(
        "improved_tashkeel", tashkeel_result.get("tashkeel", "")
    )
    refined_translation = refinement.get(
        "improved_translation", translation_result.get("translation", "")
    )

    notes: list[str] = []
    if translation_result.get("notes"):
        notes.append(f"Initial Translation Notes: {translation_result['notes']}")
    if refinement.get("changes_made"):
        notes.append("Refinement Changes:")
        notes.extend([f"- {change}" for change in refinement["changes_made"]])

    resolved = refinement.get("resolved_uncertainties", [])
    remaining = refinement.get("remaining_uncertainties", [])

    if resolved or remaining:
        notes.append("\nUncertainty Resolution:")
        if resolved:
            notes.append("- Resolved:")
            for r in resolved:
                notes.append(
                    f"  * Step: {r.get('step', 'N/A')}, Explanation: {r.get('explanation', 'No explanation')}"
                )
        if remaining:
            notes.append("- Remaining:")
            for r in remaining:
                notes.append(
                    f"  * Type: {r.get('type', 'N/A')}, Desc: {r.get('description', 'Unknown issue')} ({r.get('reason_unresolved', 'No reason provided')})"
                )

    final_word_translations: list[WordTranslation] = []
    refined_words_data = refinement.get("improved_word_translations", [])
    if refined_words_data and isinstance(refined_words_data, list):
        for word_data in refined_words_data:
            if not isinstance(word_data, dict):
                continue
            final_word_translations.append(
                WordTranslation(
                    arabic=word_data.get("arabic", ""),
                    english=word_data.get("english", ""),
                    pos=word_data.get("pos"),
                    essential=word_data.get("essential"),
                    essential_translation=word_data.get("essential_translation", ""),
                    notes=word_data.get("notes"),
                ),
            )
    else:
        word_opts_list = word_options_result.get("word_translations", [])
        for word_opts in word_opts_list:
            final_word_translations.append(
                WordTranslation(
                    arabic=word_opts.get("arabic", ""),
                    english=word_opts.get("english_options", ["[Fallback Error]"])[0],
                    pos=word_opts.get("pos"),
                    essential=word_opts.get("essential"),
                    essential_translation=word_opts.get(
                        "essential_translation_options", ["[Fallback Error]"]
                    )[0],
                    notes=(word_opts.get("notes") or "") + " (Refinement fallback)",
                ),
            )

    sentence_translation = SentenceTranslation(
        index=start_index + i,
        original=original_sentence,
        tashkeel=refined_tashkeel,
        word_by_word=final_word_translations,
        full_translation=refined_translation,
        notes="\n".join(notes) if notes else None,
        verification_status="Refined" if refinement.get("changes_made") else "Verified",
        verification_issues=[
            f"{u.get('type', 'N/A')}: {u.get('description', 'Unspecified issue')}"
            for u in remaining
        ]
        if remaining
        else None,
    )

    validation_issues = validate_final_translation(sentence_translation)
    if validation_issues:
        sentence_translation.verification_status = "Issues Found"
        if sentence_translation.verification_issues:
            sentence_translation.verification_issues.extend(validation_issues)
        else:
            sentence_translation.verification_issues = validation_issues

    return sentence_translation


def refine_translations(
    batch_sentences: list[str],
    start_index: int,
    translation_results: TranslationResults,
    tashkeel_results: TashkeelResults,
    word_options_results: WordTranslationResults,
) -> list[SentenceTranslation]:
    """Refine translations using previous results and return final objects."""
    inputs, _ = build_refinement_input(
        batch_sentences,
        translation_results,
        tashkeel_results,
        word_options_results,
    )
    batch_refine_translations = _get_translation_engine_functions()[1]
    refinement_results = batch_refine_translations(inputs)
    results: list[SentenceTranslation] = []
    for i in range(len(batch_sentences)):
        refinement = (
            refinement_results[i]
            if i < len(refinement_results)
            else RefinementResult(
                improved_tashkeel="",
                improved_translation="",
                improved_word_translations=[],
                resolved_uncertainties=[],
                remaining_uncertainties=[],
                changes_made=[],
            )
        )
        results.append(
            create_sentence_translation(
                i,
                start_index,
                batch_sentences[i],
                refinement,
                translation_results[i],
                tashkeel_results[i],
                word_options_results[i],
            ),
        )
    return results


__all__ = [
    "run_full_translation",
    "apply_tashkeel",
    "translate_words",
    "refine_translations",
]
