"""Helpers for translation processing pipeline orchestration."""

from typing import Any

from data.enums import VerificationStatus
from data.models import (
    RefinementResult,
    SentenceTranslation,
    TashkeelResult,
    TranslationResult,
    WordTranslation,
    WordTranslationResult,
)
from data.pipeline_types import (
    RefinementInput,
    RefinementInputs,
    TashkeelResults,
    TranslationResults,
    WordTranslationResults,
)
from utils.responses_api import ResponsesAPIManager
from utils.validation import (
    validate_final_translation,
    validate_tashkeel_added,
    validate_translation_results,
)


def run_full_translation(
    batch_sentences: list[str],
    batch_contexts: list[str | None],
    conversation_manager: ResponsesAPIManager | None = None,
) -> TranslationResults:
    """Translate a batch of sentences and validate the results."""
    from pipeline.engine import batch_translate_full_sentences

    translations = batch_translate_full_sentences(
        batch_sentences, batch_contexts, conversation_manager
    )
    validate_translation_results(batch_sentences, translations, "Full Translation")
    return translations


def apply_tashkeel(
    batch_sentences: list[str],
    translation_results: TranslationResults,
    all_sentences: list[str] | None = None,
    batch_indices: list[int] | None = None,
    context_cache: Any = None,
    conversation_manager: ResponsesAPIManager | None = None,
) -> TashkeelResults:
    """Add diacritics to sentences and validate the results."""
    from pipeline.engine import batch_add_tashkeel

    tashkeel = batch_add_tashkeel(
        batch_sentences,
        translation_results,
        all_sentences,
        batch_indices,
        context_cache,
        conversation_manager,
    )

    # Validate that tashkeel was actually added and break pipeline if not
    validate_tashkeel_added(batch_sentences, tashkeel, batch_indices)

    return tashkeel


def translate_words(
    batch_sentences: list[str],
    tashkeel_results: TashkeelResults,
    translation_results: TranslationResults,
    all_sentences: list[str] | None = None,
    batch_indices: list[int] | None = None,
    context_cache: Any = None,
    conversation_manager: ResponsesAPIManager | None = None,
) -> WordTranslationResults:
    """Generate word-by-word translations and validate them."""
    from pipeline.engine import batch_translate_words

    word_results = batch_translate_words(
        batch_sentences,
        tashkeel_results,
        translation_results,
        all_sentences,
        batch_indices,
        conversation_manager,
    )
    # Validate word translation results strictly via existing validator
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
        word_opts_list = opts.word_translations

        # Convert Uncertainty objects to dicts for storage
        word_uncertainties_dicts: list[dict[str, Any]] = [
            u.model_dump()
            for word_opts in word_opts_list
            for u in word_opts.uncertainties
        ]
        all_word_uncertainties.append(word_uncertainties_dicts)

        # Convert uncertainties to dicts for TypedDict compatibility
        translation_uncertainties: list[dict[str, Any]] = [
            u.model_dump() for u in translation_results[i].uncertainties
        ]
        tashkeel_uncertainties: list[dict[str, Any]] = [
            u.model_dump() for u in tashkeel_results[i].uncertainties
        ]

        refinement_input.append(
            RefinementInput(
                original=batch_sentences[i],
                translation=translation_results[i],
                tashkeel=tashkeel_results[i],
                word_translations_options=word_opts_list,
                previous_uncertainties={
                    "translation": translation_uncertainties,
                    "tashkeel": tashkeel_uncertainties,
                    "word": word_uncertainties_dicts,
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
    # Get tashkeel data - prefer refined version, use original if not available
    refined_tashkeel = (
        refinement.improved_tashkeel or tashkeel_result.tashkeel or original_sentence
    )

    # Get translation data - prefer refined version, require valid translation
    refined_translation = (
        refinement.improved_translation or translation_result.translation
    )
    if not refined_translation:
        raise ValueError(f"Translation failed for sentence: {original_sentence}")

    # Handle refined word translations
    refined_words_data = refinement.improved_word_translations

    final_word_translations: list[WordTranslation] = []

    if refined_words_data and isinstance(refined_words_data, list):
        # refined_words_data is list[WordTranslation] - use directly
        final_word_translations = list(refined_words_data)
    else:
        # Use word translations from the result
        word_opts_list = word_options_result.word_translations

        for word_opts in word_opts_list:
            # Get translation options - require valid data
            english = word_opts.english
            essential_translation = word_opts.essential_translation

            # Require valid translation options
            if not english:
                raise ValueError(
                    f"Missing English translation options for word: {word_opts.arabic}"
                )
            if not essential_translation:
                raise ValueError(
                    f"Missing essential translation options for word: {word_opts.arabic}"
                )

            # Handle both single values and lists
            english_final: str
            if isinstance(english, list):
                english_final = english[0]
            else:
                english_final = english

            essential_trans_final: str
            if isinstance(essential_translation, list):
                essential_trans_final = essential_translation[0]
            else:
                essential_trans_final = essential_translation

            # Get other fields from word_opts
            arabic = word_opts.arabic
            pos = word_opts.pos
            essential = word_opts.essential
            notes = word_opts.notes

            # Validate essential field - must be present and different from arabic
            if not essential:
                raise ValueError(
                    f"Missing 'essential' field for word '{arabic}'. "
                    f"The AI must provide a stripped root form without complex affixes/case endings. "
                    f"Expected: root form (e.g., 'كَتَبَ' from 'يَكْتُبُ'), "
                    f"Got: missing field"
                )

            # Note: Essential field validation (identical to arabic) is handled in early pipeline stage
            # to fail fast and avoid redundant checks

            # Preserve uncertainties from the original word translation
            word_uncertainties = word_opts.uncertainties

            # Validate uncertainties to ensure they're in the correct format
            from pipeline.engine import _validate_uncertainties

            validated_uncertainties = _validate_uncertainties(word_uncertainties)

            final_word_translations.append(
                WordTranslation(
                    arabic=arabic,
                    english=english_final,
                    pos=pos,
                    essential=essential,
                    essential_translation=essential_trans_final,
                    notes=notes or "",
                    uncertainties=validated_uncertainties,
                ),
            )

    # Require valid translation - no fallbacks allowed
    if not refined_translation.strip():
        raise ValueError(f"Translation is empty for sentence: {original_sentence}")

    # Get notes from translation result
    notes_list: list[str] = []
    if translation_result.notes:
        notes_list.append(translation_result.notes)

    # Add refinement changes
    if refinement.changes_made:
        notes_list.append("Refinement Changes:")
        notes_list.extend([f"- {change}" for change in refinement.changes_made])

    # Handle uncertainties
    resolved = refinement.resolved_uncertainties
    remaining = refinement.remaining_uncertainties

    if resolved or remaining:
        notes_list.append("\nUncertainty Resolution:")
        if resolved:
            notes_list.append("- Resolved:")
            for r in resolved:
                notes_list.append(f"  * Step: {r.step}, Explanation: {r.explanation}")
        if remaining:
            notes_list.append("- Remaining:")
            for r in remaining:
                notes_list.append(
                    f"  * Type: {r.type}, Reason: {r.reason} ({r.reason_unresolved})"
                )

    sentence_translation = SentenceTranslation(
        index=start_index + i,
        original=original_sentence,
        tashkeel=refined_tashkeel,
        word_by_word=final_word_translations,
        full_translation=refined_translation,
        notes="\n".join(notes_list) if notes_list else "",
        verification_status=VerificationStatus.SUCCESS,
        verification_issues=[f"{u.type}: {u.reason}" for u in remaining]
        if remaining
        else [],
    )

    validation_issues = validate_final_translation(sentence_translation)
    if validation_issues:
        sentence_translation.verification_status = VerificationStatus.NEEDS_REVIEW
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
    conversation_manager: ResponsesAPIManager | None = None,
) -> list[SentenceTranslation]:
    """Refine translations using previous results and return final objects."""
    from pipeline.engine import batch_refine_translations

    inputs, _ = build_refinement_input(
        batch_sentences,
        translation_results,
        tashkeel_results,
        word_options_results,
    )
    refinement_results = batch_refine_translations(inputs, conversation_manager)
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


def run_deepseek_correction(
    translations: list[SentenceTranslation],
) -> list[SentenceTranslation]:
    """Run DeepSeek correction on refined translations.

    This is Step 5 of the pipeline - reviews and auto-corrects translations
    using DeepSeek, focusing on morpheme-to-word alignment issues.

    Args:
        translations: List of refined SentenceTranslation objects

    Returns:
        list[SentenceTranslation]: Translations with corrections applied
    """
    from pipeline.engine.deepseek_correction import correct_translations_with_deepseek

    return correct_translations_with_deepseek(translations)


__all__ = [
    "apply_tashkeel",
    "refine_translations",
    "run_deepseek_correction",
    "run_full_translation",
    "translate_words",
]
