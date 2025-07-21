"""
Validation utilities for translation pipeline.
"""

from data.models import SentenceTranslation, TranslationValidationError
from data.pipeline_types import (
    TashkeelResults,
    TranslationResults,
    WordTranslationResults,
)


def validate_translation_results(
    original_sentences: list[str],
    results: TranslationResults | TashkeelResults | WordTranslationResults,
    step_name: str,
    check_word_translations: bool = False,
    check_word_options: bool = False,
) -> None:
    """
    Validate translation results and raise TranslationValidationError if issues found.
    """
    if len(results) != len(original_sentences):
        raise TranslationValidationError(
            f"{step_name}: Result count mismatch. Expected {len(original_sentences)}, got {len(results)}",
        )

    errors: list[str] = []
    for i, (original, result) in enumerate(
        zip(original_sentences, results, strict=False),
    ):
        # Handle different result formats
        if isinstance(result, dict):
            # Get translation text from either "translation" or "t" field
            translation = result.get("translation", "") or result.get("t", "")

            # Check for error markers in translation
            if any(
                err in translation
                for err in [
                    "[Translation Error]",
                    "[Format Error]",
                    "[BATCH PROCESSING ERROR]",
                ]
            ):
                errors.append(f"Sentence {i}: Contains error marker in translation")

            if translation and len(translation.strip()) < 3:
                errors.append(f"Sentence {i}: Suspiciously short translation")

            # Check word options if requested
            if check_word_options and "word_translations" in result:
                word_trans = result["word_translations"]
                if isinstance(word_trans, list) and all(
                    isinstance(word, dict) for word in word_trans
                ):
                    for j, word in enumerate(word_trans):
                        arabic = word.get("arabic", "")
                        eng_options = word.get("english_options", [])
                        ess_opts = word.get("essential_translation_options", [])
                        if not arabic:
                            errors.append(
                                f"Sentence {i}, Word {j}: Missing Arabic text",
                            )
                        if not eng_options:
                            errors.append(
                                f"Sentence {i}, Word {j}: Missing English options",
                            )
                        if not word.get("essential"):
                            errors.append(
                                f"Sentence {i}, Word {j}: Missing essential letters",
                            )
                        if not ess_opts:
                            errors.append(
                                f"Sentence {i}, Word {j}: Missing essential translation options",
                            )

            # Check word translations if requested
            if check_word_translations and "word_by_word" in result:
                word_trans = result["word_by_word"]
                if isinstance(word_trans, list) and all(
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

            # Check tashkeel
            if "tashkeel" in result:
                tashkeel = result["tashkeel"]
                if tashkeel == original and not any(c in original for c in "ًٌٍَُِّْ"):
                    errors.append(
                        f"Sentence {i}: Tashkeel appears to be missing (identical to input)",
                    )
        else:
            # Handle other result formats or unexpected structures
            errors.append(f"Sentence {i}: Unexpected result format")

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
            if not word_trans.english.strip():
                issues.append(f"Word {i}: Missing English translation")
            if not word_trans.essential.strip():
                issues.append(f"Word {i}: Missing essential letters")

    # Check verification status if present
    if translation.verification_status and translation.verification_status not in [
        "verified",
        "needs_review",
        "failed",
    ]:
        issues.append(f"Invalid verification status: {translation.verification_status}")

    return issues
