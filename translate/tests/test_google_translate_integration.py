"""Integration tests for Google Cloud Translate pipeline integration."""

from unittest.mock import MagicMock, patch

import pytest

from pipeline.translation_engine import batch_translate_root_words_with_google_cloud


class TestGoogleTranslateIntegration:
    """Integration tests for Google Cloud Translate pipeline integration."""

    @patch("pipeline.engine.google_cloud.GoogleTranslateService")
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
        mock_service.translate_root_words_batch.return_value = [
            mock_translation_result,
            mock_translation_result,
        ]

        sentences = ["مرحبا عالم"]

        results = batch_translate_root_words_with_google_cloud(sentences)

        assert len(results) == 2
        assert results[0].word_translations[0].arabic == "مرحبا"
        assert results[0].word_translations[0].english == ["Hello"]

    @patch("pipeline.engine.google_cloud.GoogleTranslateService")
    def test_batch_translate_root_words_with_google_cloud_translation_error(
        self, mock_service_class
    ):
        """Test handling of translation errors in pipeline integration."""
        mock_service = MagicMock()
        mock_service_class.return_value = mock_service
        mock_service.translate_root_words_batch.side_effect = Exception("API Error")

        sentences = ["مرحبا"]

        # Expect the function to raise an exception instead of creating fallback data
        with pytest.raises(
            Exception,
            match="Google Cloud batch translation failed: API Error",
        ):
            batch_translate_root_words_with_google_cloud(sentences)
