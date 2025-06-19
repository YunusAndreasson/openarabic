import logging
from typing import List, Dict, Any, Optional, Tuple

from translate.core.text_utils import get_optimized_context
from translate.core.models import SentenceTranslation, WordTranslation
from translate.core.batch_operations import (
    batch_translate_full_sentences,
    batch_add_tashkeel,
    batch_translate_words,
    batch_refine_translations,
)
from translate.core.validation import (
    validate_translation_results,
    validate_final_translation,
)


def create_batches(
    sentences: List[str], start_index: int, batch_size: int
) -> List[Dict[str, Any]]:
    """Create batches of sentences with their contexts"""
    batches = []

    def gather_context(indices: List[int]) -> List[Optional[str]]:
        """Get optimized context for each index."""
        return [get_optimized_context(sentences, idx) for idx in indices]

    # Iterate through the sentences starting from the start_index
    num_remaining = len(sentences) - start_index
    for i in range(0, num_remaining, batch_size):
        current_batch_start_global_index = start_index + i
        batch_sentences = sentences[
            current_batch_start_global_index : current_batch_start_global_index
            + batch_size
        ]

        if not batch_sentences:  # Should not happen with correct logic, but safeguard
            continue

        batch_indices = list(
            range(
                current_batch_start_global_index,
                current_batch_start_global_index + len(batch_sentences),
            )
        )
        # Context uses global indices relative to the full 'sentences' list
        batch_contexts = gather_context(batch_indices)

        batches.append(
            {
                "sentences": batch_sentences,  # The actual text for this batch
                "contexts": batch_contexts,
                "start_index": current_batch_start_global_index,  # Global start index of this batch
                "indices": batch_indices,  # Global indices of sentences in this batch
            }
        )

    return batches


def run_full_translation(
    batch_sentences: List[str],
    batch_contexts: List[Optional[str]],
) -> List[Dict[str, Any]]:
    """Translate a batch of sentences and validate the results."""
    translations = batch_translate_full_sentences(batch_sentences, batch_contexts)
    validate_translation_results(batch_sentences, translations, "Full Translation")
    return translations


def apply_tashkeel(
    batch_sentences: List[str],
    translation_results: List[Dict[str, Any]],
    all_sentences: List[str] = None,
    batch_indices: List[int] = None,
) -> List[Dict[str, Any]]:
    """Add diacritics to sentences and validate the results."""
    tashkeel = batch_add_tashkeel(
        batch_sentences, translation_results, all_sentences, batch_indices
    )
    validate_translation_results(batch_sentences, tashkeel, "Tashkeel Addition")
    return tashkeel


def translate_words(
    batch_sentences: List[str],
    tashkeel_results: List[Dict[str, Any]],
    translation_results: List[Dict[str, Any]],
    all_sentences: List[str] = None,
    batch_indices: List[int] = None,
) -> List[Dict[str, Any]]:
    """Generate word-by-word translations and validate them."""
    word_results = batch_translate_words(
        batch_sentences,
        tashkeel_results,
        translation_results,
        all_sentences,
        batch_indices,
    )
    validate_translation_results(
        batch_sentences,
        word_results,
        "Word Translation Options",
        check_word_options=True,
    )
    return word_results


def build_refinement_input(
    batch_sentences: List[str],
    translation_results: List[Dict[str, Any]],
    tashkeel_results: List[Dict[str, Any]],
    word_options_results: List[Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], List[List[Dict[str, Any]]]]:
    """Prepare input payload for refinement step."""
    refinement_input = []
    all_word_uncertainties: List[List[Dict[str, Any]]] = []
    for i, opts in enumerate(word_options_results):
        word_opts_list = opts.get("word_translations", [])
        all_word_uncertainties.append(
            [u for word_opts in word_opts_list for u in word_opts.get("uncertainties", [])]
        )
        refinement_input.append(
            {
                "original": batch_sentences[i],
                "translation": translation_results[i],
                "tashkeel": tashkeel_results[i],
                "word_translations_options": word_opts_list,
                "previous_uncertainties": {
                    "translation": translation_results[i].get("uncertainties", []),
                    "tashkeel": tashkeel_results[i].get("uncertainties", []),
                    "word": all_word_uncertainties[-1],
                },
            }
        )
    return refinement_input, all_word_uncertainties


def create_sentence_translation(
    i: int,
    start_index: int,
    refinement: Dict[str, Any],
    translation_result: Dict[str, Any],
    tashkeel_result: Dict[str, Any],
    word_options_result: Dict[str, Any],
) -> SentenceTranslation:
    refined_tashkeel = refinement.get(
        "improved_tashkeel", tashkeel_result.get("tashkeel", "")
    )
    refined_translation = refinement.get(
        "improved_translation", translation_result.get("translation", "")
    )

    notes = []
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
                    f"  * Step: {r.get('step', 'N/A')}, "
                    f"Explanation: {r.get('explanation', 'No explanation')}"
                )
        if remaining:
            notes.append("- Remaining:")
            for r in remaining:
                notes.append(
                    f"  * Type: {r.get('type', 'N/A')}, "
                    f"Desc: {r.get('description', 'Unknown issue')} "
                    f"({r.get('reason_unresolved', 'No reason provided')})"
                )

    final_word_translations = []
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
                )
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
                    notes=word_opts.get("notes", "") + " (Refinement fallback)",
                )
            )

    sentence_translation = SentenceTranslation(
        index=start_index + i,
        original=batch_sentences[i],
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
    batch_sentences: List[str],
    start_index: int,
    translation_results: List[Dict[str, Any]],
    tashkeel_results: List[Dict[str, Any]],
    word_options_results: List[Dict[str, Any]],
) -> List[SentenceTranslation]:
    """Refine translations using previous results and return final objects."""
    inputs, _ = build_refinement_input(
        batch_sentences, translation_results, tashkeel_results, word_options_results
    )
    refinement_results = batch_refine_translations(inputs)
    results: List[SentenceTranslation] = []
    for i in range(len(batch_sentences)):
        refinement = (
            refinement_results.get("refinements", [])[i]
            if i < len(refinement_results.get("refinements", []))
            else {}
        )
        results.append(
            create_sentence_translation(
                i,
                start_index,
                refinement,
                translation_results[i],
                tashkeel_results[i],
                word_options_results[i],
            )
        )
    return results


def process_batch(
    batch_sentences: List[str],
    start_index: int,
    batch_contexts: List[Optional[str]],
    all_sentences: List[str] = None,
    batch_indices: List[int] = None,
) -> List[SentenceTranslation]:
    """Process a batch of sentences by orchestrating each translation phase."""
    if not batch_sentences:
        return []

    translations = run_full_translation(batch_sentences, batch_contexts)
    tashkeel = apply_tashkeel(batch_sentences, translations, all_sentences, batch_indices)
    word_options = translate_words(
        batch_sentences,
        tashkeel,
        translations,
        all_sentences,
        batch_indices,
    )

    return refine_translations(
        batch_sentences,
        start_index,
        translations,
        tashkeel,
        word_options,
    )


__all__ = [
    "create_batches",
    "process_batch",
    "run_full_translation",
    "apply_tashkeel",
    "translate_words",
    "refine_translations",
]
