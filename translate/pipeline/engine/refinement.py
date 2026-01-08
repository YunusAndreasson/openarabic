"""Translation refinement and verification operations."""

import logging

from data.config import MODEL_VERIFICATION
from data.models import (
    RefinementResult,
    TashkeelResult,
    TranslationResult,
    WordTranslationResult,
)
from data.pipeline_types import RefinementInput, RefinementInputs, RefinementResults
from data.schemas import FINAL_VERIFICATION_USER_PROMPT, GENERAL_SYSTEM_PROMPT
from utils.responses_api import ResponsesAPIManager, call_response_api

from .helpers import (
    _get_tashkeel_data,
    _get_translation_data,
    _sanitize_refinement_data,
)

logger = logging.getLogger(__name__)


def batch_refine_translations(
    refinement_input: RefinementInputs,
    conversation_manager: ResponsesAPIManager | None = None,
) -> RefinementResults:
    """Refine all translation components, selecting best options"""
    try:
        # Set phase for verification tracking
        from utils.responses_api import token_tracker

        token_tracker.set_phase("Verification")
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
                try:
                    if isinstance(item, dict):
                        # Sanitize and validate the data before creating RefinementResult
                        sanitized_item = _sanitize_refinement_data(item)
                        results.append(
                            RefinementResult(
                                improved_tashkeel=sanitized_item.get(
                                    "improved_tashkeel", ""
                                ),
                                improved_translation=sanitized_item.get(
                                    "improved_translation", ""
                                ),
                                improved_word_translations=sanitized_item.get(
                                    "improved_word_translations", []
                                ),
                                resolved_uncertainties=sanitized_item.get(
                                    "resolved_uncertainties", []
                                ),
                                remaining_uncertainties=sanitized_item.get(
                                    "remaining_uncertainties", []
                                ),
                                changes_made=sanitized_item.get("changes_made", []),
                            )
                        )
                    else:
                        # Skip non-dict items in response
                        # Create empty refinement result if response is malformed
                        results.append(
                            RefinementResult(
                                improved_tashkeel="",
                                improved_translation="",
                                improved_word_translations=[],
                                resolved_uncertainties=[],
                                remaining_uncertainties=[],
                                changes_made=["Response format error"],
                            )
                        )
                except Exception as e:
                    logger.error(f"Error creating RefinementResult from item: {e}")
                    # Create fallback result with error information
                    results.append(
                        RefinementResult(
                            improved_tashkeel="",
                            improved_translation="Error processing refinement",
                            improved_word_translations=[],
                            resolved_uncertainties=[],
                            remaining_uncertainties=[],
                            changes_made=[f"Processing error: {str(e)}"],
                        )
                    )
            return results
        elif "error" in response:
            logger.error(
                f"REFINEMENT FAILED: API returned error - {response.get('error', 'unknown error')}"
            )
            return []
        else:
            logger.error("REFINEMENT FAILED: Unexpected response format from API")
            return []
    except Exception as e:
        logger.error(
            f"REFINEMENT FAILED: Exception during batch_refine_translations - {e}"
        )
        return []


__all__ = ["batch_refine_translations"]
