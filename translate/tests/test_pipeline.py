"""Tests for pipeline components."""

import json
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

from translate.data.enums import DifficultyLevel
from translate.pipeline.split_file import split_file
from translate.pipeline.translate import translate_file
from translate.utils.api_utils import call_openai_api


class TestSplitFile:
    """Test file splitting functionality."""

    def test_split_file_creates_output(self):
        """Test that split_file creates output file."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("مرحبا بالعالم. هذا نص تجريبي. لاختبار الترجمة.")
            input_file = f.name

        output_file = input_file.replace(".txt", "_split.json")

        try:
            # Mock the API call to avoid actual API usage
            with patch("translate.pipeline.split_file.call_openai_api") as mock_api:
                mock_api.return_value = {
                    "title": "Test Article",
                    "summary": "A test article",
                    "difficulty_level": DifficultyLevel.BASIC.value,
                    "units": [
                        "مرحبا بالعالم.",
                        "هذا نص تجريبي.",
                        "لاختبار الترجمة.",
                    ],
                }

                split_file(input_file, output_file)

                assert Path(output_file).exists()

                with open(output_file, encoding="utf-8") as f:
                    data = json.load(f)

                assert "title" in data
                assert "summary" in data
                assert "difficulty_level" in data
                assert "units" in data
                assert len(data["units"]) == 3

        finally:
            # Cleanup
            Path(input_file).unlink(missing_ok=True)
            Path(output_file).unlink(missing_ok=True)

    def test_split_file_handles_empty_input(self):
        """Test split_file with empty input."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("")
            input_file = f.name

        output_file = input_file.replace(".txt", "_split.json")

        try:
            with patch("translate.pipeline.split_file.call_openai_api") as mock_api:
                mock_api.return_value = {
                    "title": "Empty Article",
                    "summary": "Empty content",
                    "difficulty_level": DifficultyLevel.BASIC.value,
                    "units": [],
                }

                split_file(input_file, output_file)

                assert Path(output_file).exists()

        finally:
            Path(input_file).unlink(missing_ok=True)
            Path(output_file).unlink(missing_ok=True)


class TestTranslateFile:
    """Test translation functionality."""

    def test_translate_file_creates_output(self):
        """Test that translate_file creates output file."""
        # Create a mock split file
        split_data = {
            "title": "Test Article",
            "summary": "A test article",
            "difficulty_level": DifficultyLevel.BASIC.value,
            "units": [
                "مرحبا بالعالم.",
                "هذا نص تجريبي.",
            ],
            "total_units": 2,
        }

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(split_data, f)
            split_file_path = f.name

        output_file = split_file_path.replace("_split.json", "_translated.json")

        try:
            with patch("translate.pipeline.translate.process_batch") as mock_api:
                mock_api.return_value = []  # Return empty results to simulate failure

                result = translate_file(split_file_path, output_file, batch_size=1)

                assert result is False  # Should return False on failure

        finally:
            Path(split_file_path).unlink(missing_ok=True)
            Path(output_file).unlink(missing_ok=True)


class TestAPIUtils:
    """Test API utility functions."""

    @patch("translate.utils.api_utils.client")
    def test_call_openai_api_success(self, mock_client):
        """Test successful API call."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '{"translation": "Hello world"}'
        mock_response.usage = MagicMock()
        mock_response.usage.model_dump.return_value = {
            "prompt_tokens": 10,
            "completion_tokens": 5,
            "total_tokens": 15,
        }

        mock_client.chat.completions.create.return_value = mock_response

        messages = [{"role": "user", "content": "Translate: مرحبا"}]
        result = call_openai_api(messages, temperature=0.3)

        assert "translation" in result
        assert result["translation"] == "Hello world"

    @patch("translate.utils.api_utils.client")
    def test_call_openai_api_retry_on_failure(self, mock_client):
        """Test API call retries on failure."""
        # Mock the successful response
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '{"translation": "Hello world"}'
        mock_response.usage = MagicMock()
        mock_response.usage.model_dump.return_value = {
            "prompt_tokens": 10,
            "completion_tokens": 5,
            "total_tokens": 15,
        }
        mock_client.chat.completions.create.side_effect = [
            Exception("API Error"),
            Exception("API Error"),
            mock_response,
        ]

        messages = [{"role": "user", "content": "Translate: مرحبا"}]
        result = call_openai_api(messages, max_retries=3)

        assert "translation" in result
        assert mock_client.chat.completions.create.call_count == 3
