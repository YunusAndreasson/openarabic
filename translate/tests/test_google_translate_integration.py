"""Integration tests for Google Cloud Translate pipeline integration."""

from unittest.mock import MagicMock, patch

from data.pipeline_types import TashkeelResult, TranslationResult
from pipeline.translation_engine import batch_translate_root_words_with_google_cloud
from utils.exceptions import TranslationError


class TestGoogleTranslateIntegration:
    """Integration tests for Google Cloud Translate pipeline integration."""

    @patch("pipeline.translation_engine.GoogleTranslateService")
    def test_batch_translate_root_words_with_google_cloud_success(
        self, mock_service_class
    ):
        """Test successful integration of Google Cloud Translate with pipeline."""
        mock_service = MagicMock()
        mock_service_class.return_value = mock_service

        # Create a proper mock return value
        mock_translation_result = {
            "translated_text": "Hello",
            "confidence": 0.95,
            "detected_language": "ar",
            "original_text": "مرحبا",
            "source_language": "ar",
            "target_language": "en",
            "pos": "noun",
            "notes": "Google Cloud Translate v3 root word translation",
            "uncertainties": [],
        }
        mock_service.translate_root_word_with_retry.return_value = (
            mock_translation_result
        )

        sentences = ["مرحبا عالم"]
        tashkeel_results = [TashkeelResult(tashkeel="مرحبا عالم", uncertainties=[])]
        translations = [
            TranslationResult(
                translation="Hello world", notes=None, uncertainties=[], word_by_word=[]
            )
        ]

        results = batch_translate_root_words_with_google_cloud(
            sentences, tashkeel_results, translations
        )

        assert len(results) == 2
        assert results[0]["word_translations"][0]["arabic"] == "مرحبا"
        assert results[0]["word_translations"][0]["english_options"] == ["Hello"]

    @patch("pipeline.translation_engine.GoogleTranslateService")
    def test_batch_translate_root_words_with_google_cloud_translation_error(
        self, mock_service_class
    ):
        """Test handling of translation errors in pipeline integration."""
        mock_service = MagicMock()
        mock_service_class.return_value = mock_service
        mock_service.translate_root_word_with_retry.side_effect = TranslationError(
            "API Error"
        )

        sentences = ["مرحبا"]
        tashkeel_results = [TashkeelResult(tashkeel="مرحبا", uncertainties=[])]
        translations = [
            TranslationResult(
                translation="Hello", notes=None, uncertainties=[], word_by_word=[]
            )
        ]

        results = batch_translate_root_words_with_google_cloud(
            sentences, tashkeel_results, translations
        )

        assert len(results) == 1
        assert results[0]["word_translations"][0]["english_options"] == [
            "[Translation Error]"
        ]
