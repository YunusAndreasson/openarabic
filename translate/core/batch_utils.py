import logging
from typing import List, Dict, Any, Optional

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
        batch_contexts = [
            get_optimized_context(sentences, idx) for idx in batch_indices
        ]

        batches.append(
            {
                "sentences": batch_sentences,  # The actual text for this batch
                "contexts": batch_contexts,
                "start_index": current_batch_start_global_index,  # Global start index of this batch
                "indices": batch_indices,  # Global indices of sentences in this batch
            }
        )

    return batches


def process_batch(
    batch_sentences: List[str],
    start_index: int,
    batch_contexts: List[Optional[str]],
    all_sentences: List[str] = None,
    batch_indices: List[int] = None,
) -> List[SentenceTranslation]:
    """Process a batch of sentences through all translation steps"""
    batch_size = len(batch_sentences)
    if batch_size == 0:
        return []

    # Step 1: Batch full translation with uncertainty tracking - use original text
    translation_results = batch_translate_full_sentences(
        batch_sentences, batch_contexts
    )
    # Validate translation results
    validate_translation_results(
        batch_sentences, translation_results, "Full Translation"
    )

    # Step 2: Batch add tashkeel with translation context and uncertainties - use original text
    tashkeel_results = batch_add_tashkeel(
        batch_sentences,
        translation_results,
        all_sentences,
        batch_indices,
    )
    # Validate tashkeel results
    validate_translation_results(batch_sentences, tashkeel_results, "Tashkeel Addition")

    # Step 3: Batch word-by-word translation (getting options) - use original text
    word_options_results = batch_translate_words(
        batch_sentences,
        tashkeel_results,
        translation_results,
        all_sentences,
        batch_indices,
    )
    # Validate word translation options
    validate_translation_results(
        batch_sentences,
        word_options_results,
        "Word Translation Options",
        check_word_options=True,  # Validate options structure
    )

    # Step 4: Final verification (selecting options) - use original text
    refinement_input = []
    all_word_options_uncertainties = []  # Collect uncertainties from word options step
    for i in range(batch_size):
        word_opts_list = word_options_results[i].get("word_translations", [])
        all_word_options_uncertainties.append(
            [
                u
                for word_opts in word_opts_list
                for u in word_opts.get("uncertainties", [])
            ]
        )
        refinement_input.append(
            {
                "original": batch_sentences[i],
                "translation": translation_results[i],
                "tashkeel": tashkeel_results[i],
                "word_translations_options": word_opts_list,  # Pass the list of option dicts
                "previous_uncertainties": {
                    "translation": translation_results[i].get("uncertainties", []),
                    "tashkeel": tashkeel_results[i].get("uncertainties", []),
                    "word": all_word_options_uncertainties[
                        i
                    ],  # Include uncertainties from word options
                },
            }
        )

    refinement_results = batch_refine_translations(refinement_input)

    # Create structured output for each sentence
    results = []
    for i in range(batch_size):
        index = start_index + i
        refinement = (
            refinement_results["refinements"][i]
            if i < len(refinement_results.get("refinements", []))
            else {}
        )

        # Get the refined components - keep original text until final storage
        refined_tashkeel = refinement.get(
            "improved_tashkeel", tashkeel_results[i].get("tashkeel", "")
        )
        refined_translation = refinement.get(
            "improved_translation", translation_results[i].get("translation", "")
        )

        # Combine notes from all steps
        notes = []
        if translation_results[i].get("notes"):
            notes.append(
                f"Initial Translation Notes: {translation_results[i]['notes']}"
            )
        if refinement.get("changes_made"):
            notes.append("Refinement Changes:")
            notes.extend([f"- {change}" for change in refinement["changes_made"]])

        # Process resolved and remaining uncertainties
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

        # Process refined word translations (extracting the chosen single values)
        final_word_translations = []
        refined_words_data = refinement.get("improved_word_translations", [])
        if refined_words_data and isinstance(refined_words_data, list):
            for word_data in refined_words_data:
                if not isinstance(word_data, dict):
                    continue  # Skip invalid data

                # Extract the single chosen values
                final_word_translations.append(
                    WordTranslation(
                        arabic=word_data.get("arabic", ""),
                        english=word_data.get("english", ""),  # Chosen value
                        pos=word_data.get("pos"),
                        essential=word_data.get("essential"),
                        essential_translation=word_data.get(
                            "essential_translation", ""
                        ),  # Chosen value
                        notes=word_data.get("notes"),
                    )
                )
        else:
            # Fallback: if refinement failed, try to take the first option from the previous step
            logging.warning(
                f"Refinement failed for word translations in sentence {index}. Using first option as fallback."
            )
            word_opts_list = word_options_results[i].get("word_translations", [])
            for word_opts in word_opts_list:
                final_word_translations.append(
                    WordTranslation(
                        arabic=word_opts.get("arabic", ""),
                        english=word_opts.get("english_options", ["[Fallback Error]"])[
                            0
                        ],
                        pos=word_opts.get("pos"),
                        essential=word_opts.get("essential"),
                        essential_translation=word_opts.get(
                            "essential_translation_options", ["[Fallback Error]"]
                        )[0],
                        notes=word_opts.get("notes", "") + " (Refinement fallback)",
                    )
                )

        # Create sentence translation object with original text and final chosen words
        sentence_translation = SentenceTranslation(
            index=index,
            original=batch_sentences[i],
            tashkeel=refined_tashkeel,
            word_by_word=final_word_translations,  # Use the final list of WordTranslation objects
            full_translation=refined_translation,
            notes="\n".join(notes) if notes else None,
            verification_status="Refined"
            if refinement.get("changes_made")
            else "Verified",
            verification_issues=[
                f"{u.get('type', 'N/A')}: {u.get('description', 'Unspecified issue')}"
                for u in remaining
            ]
            if remaining
            else None,
        )

        # Validate final translation structure
        validation_issues = validate_final_translation(sentence_translation)
        if validation_issues:
            sentence_translation.verification_status = "Issues Found"
            # Append validation issues to existing ones if any
            if sentence_translation.verification_issues:
                sentence_translation.verification_issues.extend(validation_issues)
            else:
                sentence_translation.verification_issues = validation_issues
            logging.warning(
                f"Final validation issues in sentence {index}:\n"
                + "\n".join(validation_issues)
            )

        results.append(sentence_translation)

    return results
