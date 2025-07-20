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
    Validate translation results for common errors and data integrity.

    Args:
        original_sentences: List of original Arabic sentences
        results: List of translation results to validate
        step_name: Name of the translation step (for error messages)
        check_word_translations: Whether to perform final word translation specific checks
        check_word_options: Whether to perform word option specific checks

    Raises:
        TranslationValidationError: If validation fails
    """
    if len(results) != len(original_sentences):
        raise TranslationValidationError(
            f"{step_name}: Result count mismatch. Expected {len(original_sentences)}, got {len(results)}",
        )

    errors: list[str] = []
    for i, (original, result) in enumerate(
        zip(original_sentences, results, strict=False),
    ):
        if isinstance(result, dict):
            translation = (
                result.get("translation", "")
                if "translation" in result
                else result.get("t", "")
            )
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

            if check_word_options and "word_translations" in result:
                word_trans = result["word_translations"]
                if isinstance(word_trans, list):
                    for j, word in enumerate(word_trans):
                        if isinstance(word, dict):
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

            if check_word_translations and "word_by_word" in result:
                word_trans = result["word_by_word"]
                if isinstance(word_trans, list):
                    for j, word in enumerate(word_trans):
                        if isinstance(word, dict):
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

            if "tashkeel" in result:
                tashkeel = result["tashkeel"]
                if tashkeel == original and not any(c in original for c in "ًٌٍَُِّْ"):
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

    if not translation.full_translation:
        issues.append("Missing full translation")
    if not translation.tashkeel:
        issues.append("Missing tashkeel")

    if any(
        err in translation.full_translation
        for err in ["[Translation Error]", "[Format Error]", "[BATCH PROCESSING ERROR]"]
    ):
        issues.append("Translation contains error marker")

    if translation.word_by_word:
        orig_word_count = len(
            [w for w in translation.original.split() if len(w.strip()) > 0],
        )
        if len(translation.word_by_word) < orig_word_count * 0.5:
            issues.append(
                f"Word translation count mismatch: got {len(translation.word_by_word)}, expected ~{orig_word_count}",
            )

        for i, word in enumerate(translation.word_by_word):
            if not word.arabic:
                issues.append(f"Final Word {i + 1}: Missing Arabic text")
            if not word.english:
                issues.append(f"Final Word {i + 1}: Missing chosen English text")
            if not word.essential:
                issues.append(f"Final Word {i + 1}: Missing essential letters")
            if not word.essential_translation:
                issues.append(
                    f"Final Word {i + 1}: Missing chosen essential translation",
                )

    else:
        issues.append("Missing word-by-word translations")

    return issues
