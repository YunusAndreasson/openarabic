"""Translation refinement and verification operations."""

import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from data.config import MAX_PARALLEL_API_CALLS, MODEL_VERIFICATION
from data.models import (
    RefinementResult,
    TashkeelResult,
    TranslationResult,
    WordTranslation,
)
from data.pipeline_types import RefinementInput, RefinementInputs, RefinementResults
from data.schemas import FINAL_VERIFICATION_USER_PROMPT, GENERAL_SYSTEM_PROMPT
from utils.batch_context import get_batch_prefix, pipeline_stats
from utils.responses_api import call_response_api

from .helpers import (
    _get_tashkeel_data,
    _get_translation_data,
    _sanitize_refinement_data,
)

logger = logging.getLogger(__name__)


def _format_refinement_input(data: RefinementInput) -> str:
    """Format a single sentence's data for the refinement prompt."""
    original = data["original"]
    translation_data: TranslationResult = data["translation"]
    tashkeel_data: TashkeelResult = data["tashkeel"]
    word_translations_options: list[WordTranslation] = data["word_translations_options"]
    previous_uncertainties = data["previous_uncertainties"]

    word_trans_formatted = []
    for word_opts in word_translations_options:
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
        if hasattr(word_opts, "uncertainties"):
            word_uncertainties = word_opts.uncertainties
            arabic = word_opts.arabic
        else:
            word_uncertainties = word_opts.get("uncertainties", [])  # type: ignore[attr-defined]
            arabic = word_opts.get("arabic", "")  # type: ignore[attr-defined]

        if isinstance(word_uncertainties, list):
            for u in word_uncertainties:
                if hasattr(u, "text"):
                    all_uncertainties.append(
                        f"Word ({arabic}): {getattr(u, 'text', '')} ({getattr(u, 'reason', 'No reason')})",
                    )

    translation, _ = _get_translation_data(translation_data)
    tashkeel, _ = _get_tashkeel_data(tashkeel_data)

    formatted = (
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
        )
    )
    return formatted


def _parse_refinement_response(response: dict[str, Any], i: int) -> RefinementResult:
    """Parse an API response into a RefinementResult."""
    data = None
    if response.get("success") and "data" in response:
        resp_data: Any = response["data"]
        if isinstance(resp_data, dict):
            data = resp_data
    # Fallback: response itself might be the result
    if data is None and isinstance(response, dict):
        if "improved_translation" in response:
            data = response

    if data is None:
        raise RuntimeError(f"No refinement data returned for sentence {i}")

    sanitized = _sanitize_refinement_data(data)
    return RefinementResult(
        improved_tashkeel=sanitized.get("improved_tashkeel", ""),
        improved_translation=sanitized.get("improved_translation", ""),
        improved_word_translations=sanitized.get("improved_word_translations", []),
        resolved_uncertainties=sanitized.get("resolved_uncertainties", []),
        remaining_uncertainties=sanitized.get("remaining_uncertainties", []),
        changes_made=sanitized.get("changes_made", []),
    )


def _refine_single_sentence(
    i: int,
    data: RefinementInput,
) -> tuple[int, RefinementResult]:
    """Refine a single sentence with retry logic (standalone API call)."""
    max_retries = 3
    attempt = 0
    while attempt < max_retries:
        try:
            formatted = _format_refinement_input(data)
            messages = [
                {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": FINAL_VERIFICATION_USER_PROMPT + "\n\n" + formatted,
                },
            ]
            response = call_response_api(
                messages=messages,
                response_model=RefinementResult,
                model=MODEL_VERIFICATION,
            )
            result = _parse_refinement_response(response, i)
            return i, result
        except Exception as err:
            attempt += 1
            if attempt >= max_retries:
                logger.error(
                    f"Refinement failed for sentence {i} after {max_retries} attempts: {err}"
                )
                # Return empty refinement so pipeline continues with stage 3 data
                return i, RefinementResult(
                    improved_tashkeel="",
                    improved_translation="",
                    improved_word_translations=[],
                    resolved_uncertainties=[],
                    remaining_uncertainties=[],
                    changes_made=[f"Refinement failed: {err!s}"],
                )
            pipeline_stats.record_retry(i)
            logger.warning(
                f"  ⚠ Refinement sentence {i} failed (attempt {attempt}/{max_retries}): {err}"
            )
            time.sleep(1)
    # Unreachable, but satisfies type checker
    raise RuntimeError(f"Refinement failed for sentence {i}")


def batch_refine_translations(
    refinement_input: RefinementInputs,
) -> RefinementResults:
    """Refine all translation components using per-sentence parallel calls."""
    from utils.responses_api import token_tracker

    token_tracker.set_phase("Verification")
    logger.info(f"  → {get_batch_prefix()}Refining translations...")

    indexed_results: list[tuple[int, RefinementResult]] = []

    with ThreadPoolExecutor(max_workers=MAX_PARALLEL_API_CALLS) as executor:
        futures = {
            executor.submit(_refine_single_sentence, i, data): i
            for i, data in enumerate(refinement_input)
        }
        for future in as_completed(futures):
            idx = futures[future]
            try:
                indexed_results.append(future.result())
            except Exception as e:
                logger.error(f"Refinement failed for sentence {idx}: {e}")
                # Return empty refinement so pipeline continues with stage 3 data
                indexed_results.append(
                    (
                        idx,
                        RefinementResult(
                            improved_tashkeel="",
                            improved_translation="",
                            improved_word_translations=[],
                            resolved_uncertainties=[],
                            remaining_uncertainties=[],
                            changes_made=[f"Refinement failed: {e!s}"],
                        ),
                    )
                )

    # Sort by index to maintain original order
    indexed_results.sort(key=lambda x: x[0])
    results: RefinementResults = [result for _, result in indexed_results]

    if len(results) != len(refinement_input):
        logger.error(
            f"Refinement result count mismatch - got {len(results)} for {len(refinement_input)} sentences"
        )

    return results


__all__ = ["batch_refine_translations"]
