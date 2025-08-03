"""Tests for pipeline components."""

import json
import tempfile
from pathlib import Path
from unittest.mock import patch

from data.enums import DifficultyLevel
from pipeline.split_file import split_file
from pipeline.translate import translate_file
from utils.responses_api import call_response_api


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
            with patch(
                "utils.responses_api.ResponsesAPIManager.start_conversation"
            ) as mock_start_conversation:
                # Mock the start_conversation method to return structured data
                mock_start_conversation.return_value = {
                    "response_id": "test-id",
                    "data": {
                        "title": "Test Article",
                        "summary": "A test article",
                        "difficulty_level": 1,
                        "units": [
                            "مرحبا بالعالم.",
                            "هذا نص تجريبي.",
                            "لاختبار الترجمة.",
                        ],
                        "unit_types": ["sentence", "sentence", "sentence"],
                    },
                    "success": True,
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
            with patch(
                "utils.responses_api.ResponsesAPIManager.start_conversation"
            ) as mock_start_conversation:
                # Mock the start_conversation method to return structured data
                mock_start_conversation.return_value = {
                    "response_id": "test-id",
                    "data": {
                        "title": "Empty Article",
                        "summary": "Empty content",
                        "difficulty_level": 1,
                        "units": [],
                        "unit_types": [],
                    },
                    "success": True,
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
            with patch("pipeline.translate.process_batch") as mock_api:
                # Create proper SentenceTranslation objects
                from data.models import SentenceTranslation, WordTranslation

                mock_translation = SentenceTranslation(
                    index=0,
                    original="مرحبا بالعالم.",
                    tashkeel="مَرْحَباً بِالْعَالَمِ.",
                    word_by_word=[
                        WordTranslation(
                            arabic="مرحبا",
                            english="hello",
                            pos="interjection",
                            essential="مرحب",
                            essential_translation="hello",
                            notes="Greeting word",
                        )
                    ],
                    full_translation="Hello world.",
                    notes="Test translation",
                )

                mock_api.return_value = [mock_translation]

                result = translate_file(split_file_path, output_file, batch_size=1)

                assert result is True  # Should return True on success

        finally:
            Path(split_file_path).unlink(missing_ok=True)
            Path(output_file).unlink(missing_ok=True)


class TestResponseAPI:
    """Test Response API utility functions."""

    @patch("utils.responses_api.ResponsesAPIManager.start_conversation")
    def test_call_response_api_success(self, mock_start_conversation):
        """Test successful Response API call."""
        # Mock the start_conversation method to return the expected format
        mock_start_conversation.return_value = {
            "response_id": "test-id",
            "text": '```json\n{"translation": "Hello"}\n```',
            "success": True,
        }

        messages = [{"role": "user", "content": "Translate: مرحبا and return as JSON"}]
        result = call_response_api(messages, temperature=0.3)

        # New format: result contains {"text": "...", "success": True}
        assert "text" in result
        assert result["success"] is True
        assert "Hello" in result["text"]

    @patch("utils.responses_api.ResponsesAPIManager.start_conversation")
    def test_call_response_api_retry_on_failure(self, mock_start_conversation):
        """Test Response API call retries on failure."""
        # Mock the start_conversation method to fail twice then succeed
        mock_start_conversation.side_effect = [
            Exception("API Error"),
            Exception("API Error"),
            {
                "response_id": "test-id",
                "text": '```json\n{"translation": "Hello"}\n```',
                "success": True,
            },
        ]

        messages = [{"role": "user", "content": "Translate: مرحبا and return as JSON"}]
        result = call_response_api(messages, max_retries=3)

        # New format: result contains {"text": "...", "success": True}
        assert "text" in result
        assert result["success"] is True
        assert mock_start_conversation.call_count == 3
