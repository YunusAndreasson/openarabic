"""Google Cloud Translate service for individual root word translation."""

import os
import time
from itertools import batched  # Python 3.12+
from typing import Any

from google.cloud import translate_v3

from data.config import (
    GOOGLE_CLOUD_PROJECT_ID,
    TRANSLATION_RETRY_ATTEMPTS,
)
from utils.exceptions import TranslationError


class GoogleTranslateService:
    """Google Cloud Translate service for individual root word translation."""

    def __init__(
        self, project_id: str | None = None, credentials_path: str | None = None
    ):
        """Initialize the Google Cloud Translate service."""
        self.project_id = project_id or GOOGLE_CLOUD_PROJECT_ID

        if not self.project_id:
            raise ValueError("GOOGLE_CLOUD_PROJECT_ID environment variable is not set")

        # Use service account credentials if provided, otherwise use default credentials
        if credentials_path and os.path.exists(credentials_path):
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path

        self.client = translate_v3.TranslationServiceClient()
        self.parent = f"projects/{self.project_id}/locations/global"

    def translate_single_root_word(
        self,
        root_word: str,
        source_lang: str = "ar",
        target_lang: str = "en",
        context: str | None = None,
    ) -> dict:
        """Translate a single Arabic root word to English with optional context."""
        try:
            # Use context if provided, otherwise translate just the word
            if context and context.strip():
                # TODO: Implement proper context-aware translation using glossaries
                # For now, use context as a hint but still translate the word
                content_to_translate = root_word
            else:
                content_to_translate = root_word

            response = self.client.translate_text(
                contents=[content_to_translate],
                parent=self.parent,
                mime_type="text/plain",
                source_language_code=source_lang,
                target_language_code=target_lang,
            )

            if not response.translations:
                raise TranslationError(
                    f"No translation returned for root word: {root_word}"
                )

            translation = response.translations[0]

            translation_result: dict[str, Any] = {
                "translated_text": translation.translated_text,
                "detected_language": getattr(
                    translation, "detected_language_code", source_lang
                ),
                "original_text": root_word,
                "source_language": source_lang,
                "target_language": target_lang,
                "pos": "noun",
                "notes": f"Google Cloud Translate v3 translation{' (context available but not implemented)' if context else ''}",
                "uncertainties": [],
            }

            # Add uncertainty if translation is empty
            if (
                not translation.translated_text
                or translation.translated_text.strip() == ""
            ):
                translation_result["uncertainties"].append(
                    {
                        "text": root_word,
                        "reason": "Empty translation returned",
                    }
                )

            return translation_result

        except Exception as e:
            raise TranslationError(
                f"Failed to translate root word '{root_word}': {e}"
            ) from e

    def translate_root_words_batch(
        self,
        root_words: list[str],
        source_lang: str = "ar",
        target_lang: str = "en",
        batch_size: int = 100,
        max_retries: int = TRANSLATION_RETRY_ATTEMPTS,
    ) -> list[dict]:
        """Translate multiple Arabic root words in batches for efficiency.

        Uses itertools.batched (Python 3.12+) for efficient chunking.
        """
        results = []

        # Process words in batches using itertools.batched (Python 3.12+)
        for batch_num, batch_tuple in enumerate(batched(root_words, batch_size)):
            batch = list(batch_tuple)
            batch_start_index = batch_num * batch_size

            # Retry logic for each batch
            for attempt in range(max_retries):
                try:
                    response = self.client.translate_text(
                        contents=batch,
                        parent=self.parent,
                        mime_type="text/plain",
                        source_language_code=source_lang,
                        target_language_code=target_lang,
                    )

                    if not response.translations:
                        raise TranslationError(
                            f"No translations returned for batch starting at index {batch_start_index}"
                        )

                    # Process each translation in the batch
                    for j, translation in enumerate(response.translations):
                        original_word = batch[j]

                        translation_result: dict[str, Any] = {
                            "translated_text": translation.translated_text,
                            "detected_language": getattr(
                                translation, "detected_language_code", source_lang
                            ),
                            "original_text": original_word,
                            "source_language": source_lang,
                            "target_language": target_lang,
                            "pos": "noun",
                            "notes": "Google Cloud Translate v3 batch translation",
                            "uncertainties": [],
                        }

                        # Add uncertainty if translation is empty
                        if (
                            not translation.translated_text
                            or translation.translated_text.strip() == ""
                        ):
                            translation_result["uncertainties"].append(
                                {
                                    "text": original_word,
                                    "reason": "Empty translation returned",
                                }
                            )

                        results.append(translation_result)

                    # Success - break out of retry loop
                    break

                except Exception as e:
                    if attempt == max_retries - 1:
                        raise TranslationError(
                            f"Failed to translate batch starting at index {batch_start_index} after {max_retries} attempts: {e}"
                        ) from e
                    time.sleep(2**attempt)  # Exponential backoff

        return results

    def translate_root_word_with_retry(
        self,
        root_word: str,
        max_retries: int = TRANSLATION_RETRY_ATTEMPTS,
        context: str | None = None,
    ) -> dict:
        """Translate root word with retry logic."""
        for attempt in range(max_retries):
            try:
                return self.translate_single_root_word(root_word, context=context)
            except Exception as e:
                if attempt == max_retries - 1:
                    raise TranslationError(
                        f"Failed to translate root word '{root_word}' after {max_retries} attempts: {e}"
                    ) from e
                time.sleep(2**attempt)
        raise TranslationError(
            f"Failed to translate root word '{root_word}' after {max_retries} attempts"
        )


__all__ = ["GoogleTranslateService"]
