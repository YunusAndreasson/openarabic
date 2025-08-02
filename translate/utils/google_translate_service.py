"""Google Cloud Translate service for individual root word translation."""

import os
import time
from typing import Any, Optional

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
        context: Optional[str] = None,
    ) -> dict:
        """Translate a single Arabic root word to English with optional context."""
        try:
            # For now, translate just the word without context
            # TODO: Implement proper context-aware translation using glossaries
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

    def translate_root_word_with_retry(
        self,
        root_word: str,
        max_retries: int = TRANSLATION_RETRY_ATTEMPTS,
        context: Optional[str] = None,
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
