"""Tests for Google Cloud Translate service."""

from unittest.mock import Mock, patch

import pytest

from utils.exceptions import TranslationError
from utils.google_translate_service import GoogleTranslateService


class TestGoogleTranslateService:
    """Test cases for GoogleTranslateService."""

    def setup_method(self):
        """Set up test fixtures."""
        with (
            patch(
                "utils.google_translate_service.GOOGLE_CLOUD_PROJECT_ID", "test-project"
            ),
            patch(
                "utils.google_translate_service.translate_v3.TranslationServiceClient"
            ),
        ):
            self.service = GoogleTranslateService()

    def test_init_with_project_id(self):
        """Test initialization with project ID."""
        service = GoogleTranslateService(project_id="custom-project")
        assert service.project_id == "custom-project"
        assert service.parent == "projects/custom-project/locations/global"

    def test_init_without_project_id(self):
        """Test initialization without project ID raises error."""
        with patch("utils.google_translate_service.GOOGLE_CLOUD_PROJECT_ID", ""):
            with pytest.raises(
                ValueError,
                match="GOOGLE_CLOUD_PROJECT_ID environment variable is not set",
            ):
                GoogleTranslateService()

    @patch("utils.google_translate_service.translate_v3.TranslationServiceClient")
    def test_translate_single_root_word_success(self, mock_client_class):
        """Test successful translation without context."""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        mock_translation = Mock()
        mock_translation.translated_text = "book"
        mock_translation.detected_language_code = "ar"

        mock_response = Mock()
        mock_response.translations = [mock_translation]
        mock_client.translate_text.return_value = mock_response

        result = self.service.translate_single_root_word("كتاب")

        assert result["translated_text"] == "book"
        assert result["detected_language"] == "ar"
        assert result["original_text"] == "كتاب"
        assert "Google Cloud Translate v3 translation" in result["notes"]
        assert "confidence" not in result  # No confidence score

    @patch("utils.google_translate_service.translate_v3.TranslationServiceClient")
    def test_translate_single_root_word_with_context(self, mock_client_class):
        """Test translation with context parameter (currently not implemented)."""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        mock_translation = Mock()
        mock_translation.translated_text = "book"
        mock_translation.detected_language_code = "ar"

        mock_response = Mock()
        mock_response.translations = [mock_translation]
        mock_client.translate_text.return_value = mock_response

        result = self.service.translate_single_root_word("كتاب", context="في المكتبة")

        # Verify only the word was translated (context not implemented yet)
        mock_client.translate_text.assert_called_once()
        call_args = mock_client.translate_text.call_args
        assert "كتاب" in call_args[1]["contents"]
        assert "في المكتبة" not in call_args[1]["contents"]  # Context not used yet

        assert result["translated_text"] == "book"
        assert "context available but not implemented" in result["notes"]

    @patch("utils.google_translate_service.translate_v3.TranslationServiceClient")
    def test_translate_single_root_word_empty_response(self, mock_client_class):
        """Test handling of empty translation response."""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        mock_response = Mock()
        mock_response.translations = []
        mock_client.translate_text.return_value = mock_response

        with pytest.raises(
            TranslationError, match="No translation returned for root word"
        ):
            self.service.translate_single_root_word("كتاب")

    @patch("utils.google_translate_service.translate_v3.TranslationServiceClient")
    def test_translate_single_root_word_empty_translation(self, mock_client_class):
        """Test handling of empty translation text."""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        mock_translation = Mock()
        mock_translation.translated_text = ""
        mock_translation.detected_language_code = "ar"

        mock_response = Mock()
        mock_response.translations = [mock_translation]
        mock_client.translate_text.return_value = mock_response

        result = self.service.translate_single_root_word("كتاب")

        assert result["translated_text"] == ""
        assert len(result["uncertainties"]) == 1
        assert result["uncertainties"][0]["reason"] == "Empty translation returned"

    @patch("utils.google_translate_service.translate_v3.TranslationServiceClient")
    def test_translate_root_word_with_retry_success(self, mock_client_class):
        """Test successful retry after initial failure."""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        mock_translation = Mock()
        mock_translation.translated_text = "book"
        mock_translation.detected_language_code = "ar"

        mock_response = Mock()
        mock_response.translations = [mock_translation]

        # First call fails, second succeeds
        mock_client.translate_text.side_effect = [
            Exception("Temporary error"),
            mock_response,
        ]

        result = self.service.translate_root_word_with_retry("كتاب", max_retries=2)

        assert result["translated_text"] == "book"
        assert mock_client.translate_text.call_count == 2
