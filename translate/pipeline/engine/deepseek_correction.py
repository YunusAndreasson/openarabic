"""DeepSeek correction engine for translation pipeline.

This module provides auto-correction of OpenAI translations using DeepSeek
as a second opinion. It focuses on fixing morpheme-to-word alignment issues
that OpenAI sometimes misses.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from data.deepseek_correction_models import (
    DeepSeekCorrectionBatchResponse,
    SentenceCorrectionResponse,
    WordCorrection,
)
from data.enums import VerificationStatus
from data.models import SentenceTranslation, WordTranslation
from utils.batch_context import get_batch_prefix, pipeline_stats

if TYPE_CHECKING:
    from utils.openrouter_client import OpenRouterClient

logger = logging.getLogger(__name__)

# Configuration
CORRECTION_BATCH_SIZE = 5  # Sentences per API call


def _get_str_value(value: str | list[str]) -> str:
    """Extract string from str or list[str]."""
    return value if isinstance(value, str) else value[0]


def _mark_batch_needs_review(batch: list[SentenceTranslation], message: str) -> None:
    """Mark all translations in batch as needing review."""
    for t in batch:
        t.verification_status = VerificationStatus.NEEDS_REVIEW
        t.verification_issues.append(message)


def correct_translations_with_deepseek(
    translations: list[SentenceTranslation],
) -> list[SentenceTranslation]:
    """Correct translations using DeepSeek as a second opinion.

    This is Step 5 of the translation pipeline, running after refinement
    but before saving to JSON. DeepSeek reviews and auto-corrects issues,
    particularly morpheme-to-word alignment problems.

    Args:
        translations: List of SentenceTranslation objects from refinement step

    Returns:
        Updated translations with corrections applied and verification_status updated
    """
    if not translations:
        return translations

    try:
        # Import here to avoid circular imports and check if API key is available
        from utils.openrouter_client import OpenRouterClient
        from utils.responses_api import token_tracker

        token_tracker.set_phase("DeepSeek Correction")
        logger.info(f"  → {get_batch_prefix()}DeepSeek correction...")
        client = OpenRouterClient()

        # Process in batches using slicing
        for i in range(0, len(translations), CORRECTION_BATCH_SIZE):
            _correct_batch(translations[i : i + CORRECTION_BATCH_SIZE], client)

        return translations

    except ValueError as e:
        if "API key not found" in str(e):
            logger.warning("DeepSeek correction skipped: API key not configured")
            return translations
        raise
    except Exception as e:
        logger.warning(f"DeepSeek correction failed, keeping original: {e}")
        for t in translations:
            if t.verification_status == VerificationStatus.SUCCESS:
                t.verification_status = VerificationStatus.NEEDS_REVIEW
                t.verification_issues.append(f"DeepSeek correction failed: {e}")
        return translations


def _correct_batch(batch: list[SentenceTranslation], client: OpenRouterClient) -> None:
    """Correct a batch of translations and apply changes."""
    from data.config import VALIDATION_MAX_RETRIES

    sentences_data = [_prepare_sentence_data(t) for t in batch]

    # Call DeepSeek with retry logic
    for retry_count in range(VALIDATION_MAX_RETRIES):
        try:
            response = client.correct_translations_batch(sentences_data, retry_count)
            if response:
                break
        except ValueError as e:
            if retry_count == VALIDATION_MAX_RETRIES - 1:
                logger.warning(f"DeepSeek correction failed after retries: {e}")
                _mark_batch_needs_review(batch, "DeepSeek correction parsing failed")
                return
            logger.warning(f"Retry {retry_count + 1}: {e}")
    else:
        _mark_batch_needs_review(batch, "DeepSeek correction returned no response")
        return

    # Parse response and apply corrections
    try:
        validated = DeepSeekCorrectionBatchResponse(**response)
        # Build index map for O(1) lookup instead of O(n) search per correction
        batch_by_index = {t.index: t for t in batch}

        for correction in validated.corrections:
            if translation := batch_by_index.get(correction.sentence_index):
                _apply_corrections(translation, correction)

    except Exception as e:
        logger.warning(f"Failed to parse correction response: {e}")
        _mark_batch_needs_review(batch, f"Correction response parsing failed: {e}")


def _prepare_sentence_data(translation: SentenceTranslation) -> dict:
    """Prepare sentence data for correction API."""
    return {
        "sentence_index": translation.index,
        "original_arabic": translation.original,
        "tashkeel": translation.tashkeel,
        "full_translation": translation.full_translation,
        "word_translations": [
            {
                "arabic": w.arabic,
                "english": _get_str_value(w.english),
                "pos": w.pos.value if hasattr(w.pos, "value") else str(w.pos),
                "essential": w.essential,
                "essential_translation": _get_str_value(w.essential_translation),
            }
            for w in translation.word_by_word
        ],
    }


def _apply_corrections(
    translation: SentenceTranslation, correction: SentenceCorrectionResponse
) -> None:
    """Apply DeepSeek corrections to a translation."""
    corrections_applied = 0

    # Apply full translation correction
    if correction.corrected_full_translation != translation.full_translation:
        old, new = translation.full_translation, correction.corrected_full_translation
        logger.info(f"Sentence {translation.index}: translation: '{old}' → '{new}'")
        translation.full_translation = new
        corrections_applied += 1

    # Apply tashkeel correction if provided and different
    if (
        correction.corrected_tashkeel
        and correction.corrected_tashkeel != translation.tashkeel
    ):
        old = translation.tashkeel
        new = correction.corrected_tashkeel
        logger.info(f"Sentence {translation.index}: tashkeel: '{old}' → '{new}'")
        translation.tashkeel = new
        corrections_applied += 1

    # Apply word-by-word corrections
    corrections_applied += _apply_word_corrections(
        translation.word_by_word, correction.word_corrections
    )

    # Update verification status based on quality score
    _update_verification_status(translation, correction)

    # Track corrections in pipeline stats
    pipeline_stats.record_correction(corrections_applied)

    # Log summary
    log_fn = logger.info if corrections_applied else logger.debug
    n, q = corrections_applied, correction.overall_quality
    log_fn(f"Sentence {translation.index}: {n} fixes, q={q:.2f}")


def _update_verification_status(
    translation: SentenceTranslation, correction: SentenceCorrectionResponse
) -> None:
    """Update verification status based on correction results."""
    match correction:
        case _ if correction.issues_unfixable:
            translation.verification_status = VerificationStatus.NEEDS_REVIEW
            translation.verification_issues.extend(correction.issues_unfixable)
            pipeline_stats.record_needs_review(translation.index)
        case _ if correction.overall_quality >= 0.8:
            translation.verification_status = VerificationStatus.SUCCESS
        case _ if correction.overall_quality >= 0.5:
            translation.verification_status = VerificationStatus.PARTIAL
            translation.verification_issues.extend(
                f"Corrected: {issue}" for issue in correction.issues_found
            )
        case _:
            translation.verification_status = VerificationStatus.NEEDS_REVIEW
            translation.verification_issues.extend(correction.issues_found)
            pipeline_stats.record_needs_review(translation.index)


def _apply_word_corrections(
    words: list[WordTranslation], corrections: list[WordCorrection]
) -> int:
    """Apply word-level corrections. Returns count of corrections applied."""
    # Build index map for O(1) lookup
    words_by_arabic = {w.arabic: w for w in words}
    corrections_applied = 0

    for wc in corrections:
        if not wc.was_corrected:
            continue

        if not (word := words_by_arabic.get(wc.arabic)):
            logger.warning(f"Could not find word to correct: {wc.arabic}")
            continue

        old_english = _get_str_value(word.english)
        if wc.corrected_english != old_english:
            logger.debug(f"  '{wc.arabic}': '{old_english}' → '{wc.corrected_english}'")
            word.english = wc.corrected_english
            corrections_applied += 1

        if wc.corrected_essential != word.essential:
            word.essential = wc.corrected_essential
            corrections_applied += 1

        old_essential_trans = _get_str_value(word.essential_translation)
        if wc.corrected_essential_translation != old_essential_trans:
            word.essential_translation = wc.corrected_essential_translation
            corrections_applied += 1

    return corrections_applied


__all__ = ["correct_translations_with_deepseek"]
