"""Unit tests for Google Cloud Translate service."""

from unittest.mock import MagicMock, patch

import pytest

from utils.exceptions import TranslationError
from utils.google_translate_service import GoogleTranslateService


class TestGoogleTranslateService:
    """Test cases for GoogleTranslateService."""

    @patch("utils.google_translate_service.GOOGLE_CLOUD_PROJECT_ID", "test_project")
    @patch("utils.google_translate_service.translate_v3.TranslationServiceClient")
    def test_translate_single_root_word_success(self, mock_client_class):
        """Test successful translation of a single root word."""
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client

        mock_translation = MagicMock()
        mock_translation.translated_text = "Hello"
        mock_translation.confidence = 0.95
        mock_translation.detected_language_code = "ar"

        mock_response = MagicMock()
        mock_response.translations = [mock_translation]
        mock_client.translate_text.return_value = mock_response

        service = GoogleTranslateService()
        result = service.translate_single_root_word("مرحبا")

        assert result["translated_text"] == "Hello"
        assert result["confidence"] == 0.95
        assert result["original_text"] == "مرحبا"

    @patch("utils.google_translate_service.GOOGLE_CLOUD_PROJECT_ID", "test_project")
    @patch("utils.google_translate_service.translate_v3.TranslationServiceClient")
    def test_translate_single_root_word_api_error(self, mock_client_class):
        """Test handling of API errors."""
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        mock_client.translate_text.side_effect = Exception("API Error")

        service = GoogleTranslateService()
        with pytest.raises(TranslationError, match="Failed to translate root word"):
            service.translate_single_root_word("مرحبا")

    @patch("utils.google_translate_service.GOOGLE_CLOUD_PROJECT_ID", "")
    def test_init_missing_project_id(self):
        """Test initialization fails when project ID is missing."""
        with pytest.raises(
            ValueError, match="GOOGLE_CLOUD_PROJECT_ID environment variable is not set"
        ):
            GoogleTranslateService()
