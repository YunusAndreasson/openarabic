"""
Validation utilities for translation pipeline results.
"""

import logging
from collections.abc import Callable
from typing import Any

from data import TRANSLATION_ERROR_MARKERS
from data.config import VALIDATION_MAX_RETRIES
from data.models import SentenceTranslation, TranslationValidationError
from data.pipeline_types import (
    TashkeelResults,
    TranslationResults,
    WordTranslationResults,
)
from utils.arabic_text import validate_essential_has_diacritics

logger = logging.getLogger(__name__)


def validate_tashkeel_added(
    original_sentences: list[str],
    tashkeel_results: TashkeelResults,
    sentence_indices: list[int] | None = None,
) -> None:
    """Validate that tashkeel was actually added to the text and break the pipeline if it wasn't.

    Args:
        original_sentences: Original sentences without diacritics
        tashkeel_results: Results from tashkeel processing
        sentence_indices: Optional list of sentence indices for error reporting

    Raises:
        TranslationValidationError: If tashkeel was not added to any sentence
    """
    # Arabic diacritical marks that should be present in tashkeel (include dagger alif \u0670)
    diacritical_marks = "ًٌٍَُِّْٰ"

    failed_sentences: list[tuple[int, str, str]] = []

    for i, (original, tashkeel_result) in enumerate(
        zip(original_sentences, tashkeel_results, strict=False),
    ):
        # Expect TashkeelResult Pydantic model
        tashkeel_text = tashkeel_result.tashkeel

        sentence_index = sentence_indices[i] if sentence_indices else i

        # Check if tashkeel was actually added
        tashkeel_added = False

        # If tashkeel is empty, it's definitely not added
        if not tashkeel_text.strip():
            tashkeel_added = False
        else:
            # Method 1: Check if tashkeel text is different from original
            if tashkeel_text != original:
                tashkeel_added = True
            else:
                # Method 2: Check if diacritical marks were added
                original_has_diacritics = any(c in original for c in diacritical_marks)
                tashkeel_has_diacritics = any(
                    c in tashkeel_text for c in diacritical_marks
                )

                if tashkeel_has_diacritics and not original_has_diacritics:
                    tashkeel_added = True
                elif tashkeel_has_diacritics and original_has_diacritics:
                    # Both have diacritics, check if tashkeel has more or different ones
                    original_diacritic_count = sum(
                        1 for c in original if c in diacritical_marks
                    )
                    tashkeel_diacritic_count = sum(
                        1 for c in tashkeel_text if c in diacritical_marks
                    )

                    if (
                        tashkeel_diacritic_count > original_diacritic_count
                        or tashkeel_text != original
                    ):
                        tashkeel_added = True
                    else:
                        # If original has diacritics and tashkeel is identical,
                        # we should still validate that the tashkeel is correct
                        # but not fail the validation since the original already had proper tashkeel
                        tashkeel_added = True
                else:
                    # If original has no diacritics and tashkeel is identical,
                    # the tashkeel service failed to add diacritics
                    tashkeel_added = False

        # Secondary heuristic: if any reasonably long token in the tashkeel text contains
        # a diacritic, consider tashkeel added for this sentence.
        if not tashkeel_added and tashkeel_text.strip():
            for token in tashkeel_text.split():
                if len(token) >= 3 and any(c in diacritical_marks for c in token):
                    tashkeel_added = True
                    break

        if not tashkeel_added:
            failed_sentences.append((sentence_index, original, tashkeel_text))

    if failed_sentences:
        # Log detailed information about failures
        for sentence_index, original, tashkeel in failed_sentences:
            logger.error(
                f"Line {sentence_index + 1}: Original='{original}' -> Tashkeel='{tashkeel}'"
            )

        # Only fail if ALL sentences failed tashkeel validation
        # This is more lenient to allow partial success
        if len(failed_sentences) == len(original_sentences):
            raise TranslationValidationError(
                f"Tashkeel validation failed: {len(failed_sentences)} sentences did not have tashkeel added:\n"
                + "\n".join(
                    f"Line {i + 1}: '{orig}' -> '{tash}'"
                    for i, orig, tash in failed_sentences
                )
            )
        # Log warning for partial failures but don't break the pipeline
        logger.warning(
            f"Tashkeel validation partially failed: {len(failed_sentences)} out of {len(original_sentences)} sentences did not have tashkeel added"
        )


def validate_translation_results(
    original_sentences: list[str],
    results: TranslationResults | TashkeelResults | WordTranslationResults,
    step_name: str,
    check_word_translations: bool = False,
    check_word_options: bool = False,
) -> None:
    """
    Validate translation results and raise ValidationError if issues found.
    """
    if len(results) != len(original_sentences):
        raise TranslationValidationError(
            f"{step_name}: Result count mismatch. Expected {len(original_sentences)}, got {len(results)}",
        )

    errors: list[str] = []
    for i, (original, result) in enumerate(
        zip(original_sentences, results, strict=False),
    ):
        # Expect Pydantic model - convert to dict for validation
        result_dict = result.model_dump()

        # Handle different result types
        if "word_translations" in result_dict:
            # This is a word translation result - skip translation field validation
            pass
        else:
            # This is a sentence translation result - validate translation field
            translation = result_dict.get("translation", "") or result_dict.get("t", "")

            # Check for error markers in translation
            if any(err in translation for err in TRANSLATION_ERROR_MARKERS):
                errors.append(f"Sentence {i}: Contains error marker in translation")

            # Check for empty or very short translation
            if not translation.strip():
                errors.append(f"Sentence {i}: Missing translation")
            elif len(translation.strip()) < 3:
                errors.append(f"Sentence {i}: Suspiciously short translation")

        # Check word options if requested
        if check_word_options and "word_translations" in result_dict:
            word_trans = result_dict["word_translations"]
            if isinstance(word_trans, list) and all(
                isinstance(word, dict) for word in word_trans
            ):
                for j, word in enumerate(word_trans):
                    arabic = word.get("arabic", "")
                    english = word.get("english", [])
                    essential_translation = word.get("essential_translation", [])
                    if not arabic:
                        errors.append(
                            f"Sentence {i}, Word {j}: Missing Arabic text",
                        )
                    if not english:
                        errors.append(
                            f"Sentence {i}, Word {j}: Missing English options",
                        )
                    if not word.get("essential"):
                        errors.append(
                            f"Sentence {i}, Word {j}: Missing essential letters",
                        )
                    if not essential_translation:
                        errors.append(
                            f"Sentence {i}, Word {j}: Missing essential translation options",
                        )

        # Check word translations if requested
        if check_word_translations and "word_by_word" in result_dict:
            word_trans = result_dict["word_by_word"]
            if not word_trans:
                errors.append(f"Sentence {i}: Missing word-by-word translations")
            elif isinstance(word_trans, list) and all(
                isinstance(word, dict) for word in word_trans
            ):
                for j, word in enumerate(word_trans):
                    arabic = word.get("arabic", "")
                    english = word.get("english", "")
                    essential = word.get("essential", "")
                    essential_translation = word.get(
                        "essential_translation",
                        "",
                    )
                    if not arabic:
                        errors.append(
                            f"Sentence {i}, Word {j}: Missing final Arabic text",
                        )
                    if not english:
                        errors.append(
                            f"Sentence {i}, Word {j}: Missing final English text",
                        )
                    if not essential:
                        errors.append(
                            f"Sentence {i}, Word {j}: Missing final essential letters",
                        )
                    if not essential_translation:
                        errors.append(
                            f"Sentence {i}, Word {j}: Missing final essential translation",
                        )
                    pos = word.get("pos", "")
                    if not pos:
                        errors.append(
                            f"Sentence {i}, Word {j}: Missing part of speech",
                        )

        # Check tashkeel
        if "tashkeel" in result_dict:
            tashkeel = result_dict["tashkeel"]
            if not tashkeel.strip():
                errors.append(f"Sentence {i}: Missing tashkeel")
            elif tashkeel == original and not any(c in original for c in "ًٌٍَُِّْ"):
                errors.append(
                    f"Sentence {i}: Tashkeel appears to be missing (identical to input)",
                )

    if errors:
        raise TranslationValidationError(
            f"{step_name} validation failed:\n" + "\n".join(errors),
        )


def validate_final_translation(translation: SentenceTranslation) -> list[str]:
    """
    Validate a final translation result and return any issues found.
    """
    issues: list[str] = []

    # Check basic fields
    if not translation.original.strip():
        issues.append("Missing original Arabic text")

    if not translation.tashkeel.strip():
        issues.append("Missing tashkeel text")

    if not translation.full_translation.strip():
        issues.append("Missing full translation")
    elif any(err in translation.full_translation for err in TRANSLATION_ERROR_MARKERS):
        issues.append("Translation contains error marker")

    # Check word-by-word translations
    if not translation.word_by_word:
        issues.append("Missing word-by-word translations")
    else:
        orig_word_count = len(translation.original.split())
        if (
            len(translation.word_by_word) < orig_word_count * 0.8
        ):  # Allow some flexibility
            issues.append(
                f"Word translation count mismatch: got {len(translation.word_by_word)}, expected ~{orig_word_count}"
            )

        # Validate individual word translations
        for i, word_trans in enumerate(translation.word_by_word):
            if not word_trans.arabic.strip():
                issues.append(f"Word {i}: Missing Arabic text")
            # Handle english which can be str or list[str]
            english = word_trans.english
            if isinstance(english, str):
                if not english.strip():
                    issues.append(f"Word {i}: Missing English translation")
            elif not english:  # Empty list
                issues.append(f"Word {i}: Missing English translation")
            if not word_trans.essential.strip():
                issues.append(f"Word {i}: Missing essential letters")

            # Note: Essential field validation (identical to arabic) is handled in early pipeline stage
            # to fail fast and avoid redundant checks

            # Validate that essential words have appropriate diacritics
            is_valid_diacritics, diacritic_reason = validate_essential_has_diacritics(
                word_trans.arabic, word_trans.essential
            )
            if not is_valid_diacritics:
                issues.append(f"Word {i}: {diacritic_reason}")

            # Check for error markers in word translations
            english_to_check = [english] if isinstance(english, str) else english
            if any(
                err in eng
                for eng in english_to_check
                for err in TRANSLATION_ERROR_MARKERS
            ):
                issues.append(f"Word {i}: Contains error marker in translation")

    # Check verification status if present
    if translation.verification_status and translation.verification_status not in [
        "success",
        "needs_review",
        "failed",
        "pending",
        "partial",
    ]:
        issues.append(f"Invalid verification status: {translation.verification_status}")

    return issues


def validate_translation_before_processing(translation: SentenceTranslation) -> None:
    """
    Validate translation before processing and raise exception if critical issues found.
    This prevents processing of invalid data.
    """
    issues = validate_final_translation(translation)

    # Define critical issues that should prevent processing
    critical_issues = [
        "Missing original Arabic text",
        "Missing full translation",
        "Translation contains error marker",
        "Missing word-by-word translations",
    ]

    critical_found = [
        issue
        for issue in issues
        if any(critical in issue for critical in critical_issues)
    ]

    if critical_found:
        raise TranslationValidationError(
            "Critical validation issues found, cannot process translation:\n"
            + "\n".join(critical_found)
        )

    if issues:
        logger.warning(f"Translation has non-critical issues: {issues}")


def validate_batch_before_processing(translations: list[SentenceTranslation]) -> None:
    """
    Validate a batch of translations before processing and raise exception if any have critical issues.
    """
    for i, translation in enumerate(translations):
        try:
            validate_translation_before_processing(translation)
        except TranslationValidationError as e:
            raise TranslationValidationError(
                f"Translation {i} (index {translation.index}) failed validation: {e!s}"
            ) from e


def validate_no_placeholder_data(translation: SentenceTranslation) -> None:
    """
    Strict validation that prevents any placeholder or error marker data from being inserted.
    This is the final guard rail before database insertion.
    """
    critical_errors = []

    # Check full translation for error markers
    if any(
        err in (translation.full_translation or "") for err in TRANSLATION_ERROR_MARKERS
    ):
        critical_errors.append(
            f"Full translation contains error marker: {translation.full_translation}"
        )

    # Check word-by-word translations for error markers
    for i, word_trans in enumerate(translation.word_by_word):
        if any(err in (word_trans.english or "") for err in TRANSLATION_ERROR_MARKERS):
            critical_errors.append(
                f"Word {i} English translation contains error marker: {word_trans.english}"
            )

        if any(
            err in (word_trans.essential_translation or "")
            for err in TRANSLATION_ERROR_MARKERS
        ):
            critical_errors.append(
                f"Word {i} essential translation contains error marker: {word_trans.essential_translation}"
            )

    # Check for placeholder patterns
    placeholder_patterns = [
        "[Translation failed]",
        "[Error]",
        "[API Error]",
        "[BATCH PROCESSING ERROR]",
        "[Format Error]",
        "[Validation Error]",
    ]

    for pattern in placeholder_patterns:
        if pattern in (translation.full_translation or ""):
            critical_errors.append(f"Full translation contains placeholder: {pattern}")

        for i, word_trans in enumerate(translation.word_by_word):
            if pattern in (word_trans.english or ""):
                critical_errors.append(
                    f"Word {i} English contains placeholder: {pattern}"
                )
            if pattern in (word_trans.essential_translation or ""):
                critical_errors.append(
                    f"Word {i} essential translation contains placeholder: {pattern}"
                )

    if critical_errors:
        raise TranslationValidationError(
            "CRITICAL: Placeholder/error data detected - cannot insert into database:\n"
            + "\n".join(critical_errors)
        )


def validate_batch_no_placeholder_data(translations: list[SentenceTranslation]) -> None:
    """
    Validate a batch of translations to ensure no placeholder data is present.
    This is the final guard rail before database insertion.
    """
    for i, translation in enumerate(translations):
        try:
            validate_no_placeholder_data(translation)
        except TranslationValidationError as e:
            raise TranslationValidationError(
                f"Translation {i} (index {translation.index}) contains placeholder data: {e!s}"
            ) from e


def validate_with_retry(
    validation_func: Callable[[list[dict[str, Any]], int], dict[str, Any]],
    data: list[dict[str, Any]],
    verbose: bool = False,
) -> dict[str, Any] | None:
    """Execute a validation function with retry logic for parse errors.

    Args:
        validation_func: Function that takes (data, retry_count) and returns a dict
        data: List of data dictionaries to validate
        verbose: Enable verbose logging

    Returns:
        dict: Parsed validation response or None if all retries fail
    """
    logger = logging.getLogger(__name__)
    for retry_count in range(VALIDATION_MAX_RETRIES):
        try:
            return validation_func(data, retry_count)
        except ValueError as e:
            if retry_count < VALIDATION_MAX_RETRIES - 1:
                if verbose:
                    logger.warning(f"Parse error on attempt {retry_count + 1}, retrying: {e}")
            else:
                if verbose:
                    logger.error(f"Parse error after {VALIDATION_MAX_RETRIES} attempts: {e}")
                return None
        except Exception as e:
            if verbose:
                logger.error(f"Validation API call failed: {e}")
            return None
    return None
