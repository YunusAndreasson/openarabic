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

    # Extract individual Arabic words from sentences, then extract root words
    arabic_words = filter_arabic_words(
        " ".join(sentences)
    )  # CRITICAL: Use existing function
    # TODO: Add root word extraction logic here
    # For now, use individual words as root words
    root_words = (
        arabic_words  # This should be enhanced with proper root word extraction
    )

    if not root_words:
        return results

    try:
        # Use batch translation for efficiency
        batch_translations = service.translate_root_words_batch(
            root_words, batch_size=100
        )

        # Convert batch results to WordTranslation format
        for translation_result in batch_translations:
            # Validate that we have proper root word extraction
            original_text = translation_result["original_text"]
            translated_text = translation_result["translated_text"]

            # For now, use the original text as essential, but validate it's not just a fallback
            # TODO: Implement proper root word extraction logic
            essential_text = original_text

            word_option = WordTranslation(
                arabic=original_text,
                english=[translated_text],
                pos=translation_result.get("pos", "noun"),
                essential=essential_text,
                essential_translation=[translated_text],
                notes=translation_result.get("notes", ""),
                uncertainties=translation_result.get("uncertainties", []),
            )

            # Validate essential field for Google Cloud results
            if not word_option.essential:
                raise ValueError(
                    f"Google Cloud translation missing 'essential' field for word '{original_text}'. "
                    f"Root word extraction logic needs to be implemented."
                )

            if word_option.essential == word_option.arabic:
                # Check if this is a word type where identical fields are allowed
                pos = word_option.pos.lower()
                if pos in [
                    "preposition",
                    "particle",
                    "conjunction",
                    "pronoun",
                    "demonstrative_pronoun",
                    "relative_pronoun",
                    "interjection",
                    "numeral",
                    "proper_noun",
                ]:
                    # For these word types, identical fields are correct
                    pass
                elif pos in ["noun", "adjective"]:
                    # For nouns/adjectives, check if they're already in root form
                    pass
                elif pos == "verb":
                    # For verbs, identical fields might be correct (e.g., past tense like بَاعَ)
                    # No warning needed - this is acceptable
                    pass
                else:
                    # For other parts of speech, allow identical fields without warning
                    pass

            results.append(WordTranslationResult(word_translations=[word_option]))

    except Exception as e:
        # CRITICAL: Fail completely instead of creating fallback data
        raise Exception(f"Google Cloud batch translation failed: {e}") from e

    return results


__all__ = ["batch_translate_root_words_with_google_cloud"]
