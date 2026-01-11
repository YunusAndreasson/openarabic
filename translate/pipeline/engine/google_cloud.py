"""Google Cloud Translate integration for root word translation."""

import logging

from data.config import GOOGLE_CLOUD_CREDENTIALS_PATH
from data.models import WordTranslation, WordTranslationResult
from data.pipeline_types import WordTranslationResults
from utils.google_translate_service import GoogleTranslateService
from utils.text import filter_arabic_words

logger = logging.getLogger(__name__)


def batch_translate_root_words_with_google_cloud(
    sentences: list[str],
) -> WordTranslationResults:
    """Translate individual Arabic root words using Google Cloud Translate with context awareness."""
    # Set phase for Google Cloud translation tracking
    from utils.responses_api import token_tracker

    token_tracker.set_phase("Google Cloud Translation")
    # Use credentials path from config
    credentials_path = GOOGLE_CLOUD_CREDENTIALS_PATH
    service = GoogleTranslateService(credentials_path=credentials_path)
    results: WordTranslationResults = []

    # Extract Arabic words from sentences (root extraction not implemented)
    arabic_words = filter_arabic_words(" ".join(sentences))
    root_words = arabic_words

    if not root_words:
        return results

    try:
        # Use batch translation for efficiency
        batch_translations = service.translate_root_words_batch(
            root_words, batch_size=100
        )

        # Convert batch results to WordTranslation format
        for translation_result in batch_translations:
            original_text = translation_result["original_text"]
            translated_text = translation_result["translated_text"]

            word_option = WordTranslation(
                arabic=original_text,
                english=[translated_text],
                pos=translation_result.get("pos", "noun"),
                essential=original_text,  # Uses word as-is (root extraction not implemented)
                essential_translation=[translated_text],
                notes=translation_result.get("notes", ""),
                uncertainties=translation_result.get("uncertainties", []),
            )

            if not word_option.essential:
                raise ValueError(
                    f"Google Cloud translation missing 'essential' for '{original_text}'"
                )

            results.append(WordTranslationResult(word_translations=[word_option]))

    except Exception as e:
        # CRITICAL: Fail completely instead of creating fallback data
        raise Exception(f"Google Cloud batch translation failed: {e}") from e

    return results


__all__ = ["batch_translate_root_words_with_google_cloud"]
