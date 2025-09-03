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

# Import functions lazily to avoid circular imports
_translation_engine_functions: tuple[Any, Any, Any, Any] | None = None


def _get_translation_engine_functions() -> tuple[Any, Any, Any, Any]:
    """Lazy import to avoid circular dependencies with caching."""
    global _translation_engine_functions
    if _translation_engine_functions is None:
        from pipeline.translation_engine import (
            batch_add_tashkeel,
            batch_refine_translations,
            batch_translate_full_sentences,
            batch_translate_words,
        )

        _translation_engine_functions = (
            batch_add_tashkeel,
            batch_refine_translations,
            batch_translate_full_sentences,
            batch_translate_words,
        )

    return _translation_engine_functions


def run_full_translation(
    batch_sentences: list[str],
    batch_contexts: list[str | None],
    conversation_manager: ResponsesAPIManager | None = None,
) -> TranslationResults:
    """Translate a batch of sentences and validate the results."""
    batch_translate_full_sentences = _get_translation_engine_functions()[2]
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
    batch_add_tashkeel = _get_translation_engine_functions()[0]
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
    batch_translate_words = _get_translation_engine_functions()[3]
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
        # Handle both WordTranslationResult objects and dictionaries
        if hasattr(opts, "word_translations"):
            word_opts_list = opts.word_translations
        else:
            word_opts_list = opts.get("word_translations", [])

        all_word_uncertainties.append(
            [
                u
                for word_opts in word_opts_list
                for u in (
                    word_opts.uncertainties
                    if hasattr(word_opts, "uncertainties")
                    else word_opts.get("uncertainties", [])
                )
            ],
        )
        refinement_input.append(
            RefinementInput(
                original=batch_sentences[i],
                translation=translation_results[i],
                tashkeel=tashkeel_results[i],
                word_translations_options=word_opts_list,
                previous_uncertainties={
                    "translation": translation_results[i].uncertainties
                    if hasattr(translation_results[i], "uncertainties")
                    else translation_results[i].get("uncertainties", []),
                    "tashkeel": tashkeel_results[i].uncertainties
                    if hasattr(tashkeel_results[i], "uncertainties")
                    else tashkeel_results[i].get("uncertainties", []),
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
    if hasattr(refinement, "improved_word_translations"):
        refined_words_data = refinement.improved_word_translations
    else:
        refined_words_data = refinement.get("improved_word_translations", [])

    final_word_translations: list[WordTranslation] = []

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
        # Handle both WordTranslationResult objects and dictionaries
        if hasattr(word_options_result, "word_translations"):
            word_opts_list = word_options_result.word_translations
        else:
            word_opts_list = word_options_result.get("word_translations", [])

        for word_opts in word_opts_list:
            # Get translation options - require valid data
            if hasattr(word_opts, "english"):
                english = word_opts.english
            elif isinstance(word_opts, dict):
                english = word_opts.get("english", [])
            else:
                english = []

            if hasattr(word_opts, "essential_translation"):
                essential_translation = word_opts.essential_translation
            elif isinstance(word_opts, dict):
                essential_translation = word_opts.get("essential_translation", [])
            else:
                essential_translation = []

            # Require valid translation options
            if not english:
                arabic_name = getattr(word_opts, "arabic", None) or (
                    word_opts.get("arabic", "unknown")
                    if isinstance(word_opts, dict)
                    else "unknown"
                )
                raise ValueError(
                    f"Missing English translation options for word: {arabic_name}"
                )
            if not essential_translation:
                arabic_name = getattr(word_opts, "arabic", None) or (
                    word_opts.get("arabic", "unknown")
                    if isinstance(word_opts, dict)
                    else "unknown"
                )
                raise ValueError(
                    f"Missing essential translation options for word: {arabic_name}"
                )

            # Handle both single values and lists
            if isinstance(english, list):
                english = english[0]
            if isinstance(essential_translation, list):
                essential_translation = essential_translation[0]

            # Get other fields from word_opts object or dictionary
            if hasattr(word_opts, "arabic"):
                arabic = word_opts.arabic
                pos = word_opts.pos
                essential = word_opts.essential
                notes = word_opts.notes
            elif isinstance(word_opts, dict):
                arabic = word_opts.get("arabic", "")
                pos = word_opts.get("pos")
                essential = word_opts.get("essential")
                notes = word_opts.get("notes") or ""
            else:
                # Enforce correct type – only dict or model instances allowed
                raise TypeError(
                    f"Invalid word translation option type: {type(word_opts)}"
                )

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
            word_uncertainties = []
            if hasattr(word_opts, "uncertainties"):
                word_uncertainties = word_opts.uncertainties
            elif isinstance(word_opts, dict):
                word_uncertainties = word_opts.get("uncertainties", [])

            # Validate uncertainties to ensure they're in the correct format
            from pipeline.translation_engine import _validate_uncertainties

            validated_uncertainties = _validate_uncertainties(word_uncertainties)

            final_word_translations.append(
                WordTranslation(
                    arabic=arabic,
                    english=english,
                    pos=pos,
                    essential=essential,
                    essential_translation=essential_translation,
                    notes=notes or "",
                    uncertainties=validated_uncertainties,
                ),
            )

    # Require valid translation - no fallbacks allowed
    if not refined_translation.strip():
        raise ValueError(f"Translation is empty for sentence: {original_sentence}")

    # Get notes from translation result
    notes = []
    if hasattr(translation_result, "notes") and translation_result.notes:
        notes.append(translation_result.notes)
    elif hasattr(translation_result, "get") and translation_result.get("notes"):
        notes.append(translation_result.get("notes"))

    # Add refinement changes
    if hasattr(refinement, "changes_made"):
        notes.append("Refinement Changes:")
        notes.extend([f"- {change}" for change in refinement.changes_made])
    elif hasattr(refinement, "get") and refinement.get("changes_made"):
        notes.append("Refinement Changes:")
        notes.extend([f"- {change}" for change in refinement.get("changes_made")])

    # Handle uncertainties
    if hasattr(refinement, "resolved_uncertainties"):
        resolved = refinement.resolved_uncertainties
    else:
        resolved = refinement.get("resolved_uncertainties", [])

    if hasattr(refinement, "remaining_uncertainties"):
        remaining = refinement.remaining_uncertainties
    else:
        remaining = refinement.get("remaining_uncertainties", [])

    if resolved or remaining:
        notes.append("\nUncertainty Resolution:")
        if resolved:
            notes.append("- Resolved:")
            for r in resolved:
                if hasattr(r, "step"):
                    notes.append(f"  * Step: {r.step}, Explanation: {r.explanation}")
                else:
                    notes.append(
                        f"  * Step: {r.get('step', 'N/A')}, Explanation: {r.get('explanation', 'No explanation')}"
                    )
        if remaining:
            notes.append("- Remaining:")
            for r in remaining:
                if hasattr(r, "type"):
                    notes.append(
                        f"  * Type: {r.type}, Desc: {r.description} ({r.reason_unresolved})"
                    )
                else:
                    notes.append(
                        f"  * Type: {r.get('type', 'N/A')}, Desc: {r.get('description', 'Unknown issue')} ({r.get('reason_unresolved', 'No reason provided')})"
                    )

    sentence_translation = SentenceTranslation(
        index=start_index + i,
        original=original_sentence,
        tashkeel=refined_tashkeel,
        word_by_word=final_word_translations,
        full_translation=refined_translation,
        notes="\n".join(notes) if notes else None,
        verification_status=VerificationStatus.SUCCESS
        if (hasattr(refinement, "changes_made") and refinement.changes_made)
        or (hasattr(refinement, "get") and refinement.get("changes_made"))
        else "success",
        verification_issues=[
            f"{u.get('type', 'N/A')}: {u.get('description', 'Unspecified issue')}"
            for u in remaining
        ]
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
    inputs, _ = build_refinement_input(
        batch_sentences,
        translation_results,
        tashkeel_results,
        word_options_results,
    )
    batch_refine_translations = _get_translation_engine_functions()[1]
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


__all__ = [
    "run_full_translation",
    "apply_tashkeel",
    "translate_words",
    "refine_translations",
]
