"""Integration tests for the main workflow."""

import json
import tempfile
from pathlib import Path
from unittest.mock import patch

from main import (
    confirm_step,
    review_split_file,
    review_translation,
    run_split_file,
    run_translation,
)


class TestMainWorkflow:
    """Test the main workflow functions."""

    def test_confirm_step_yes(self, monkeypatch):
        """Test confirm_step with yes response."""
        monkeypatch.setattr("builtins.input", lambda prompt: "y")
        result = confirm_step("Continue?")
        assert result is True

    def test_confirm_step_no(self, monkeypatch):
        """Test confirm_step with no response."""
        monkeypatch.setattr("builtins.input", lambda prompt: "n")
        result = confirm_step("Continue?")
        assert result is False

    def test_confirm_step_invalid_then_valid(self, monkeypatch):
        """Test confirm_step with invalid then valid response."""
        responses = iter(["invalid", "y"])
        monkeypatch.setattr("builtins.input", lambda prompt: next(responses))
        result = confirm_step("Continue?")
        assert result is True

    def test_review_split_file_success(self, monkeypatch):
        """Test review_split_file with valid data."""
        # Create a temporary split file
        split_data = {
            "title": "Test Article",
            "summary": "A test article for translation",
            "difficulty_level": "intermediate",
            "units": [
                {"text": "مرحبا بالعالم."},
                {"text": "هذا نص تجريبي."},
                {"text": "لاختبار الترجمة."},
            ],
        }

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(split_data, f)
            split_file_path = f.name

        try:
            # Mock user input to continue
            monkeypatch.setattr("builtins.input", lambda prompt: "y")

            result = review_split_file(split_file_path)
            assert result is True

        finally:
            Path(split_file_path).unlink(missing_ok=True)

    def test_review_split_file_not_found(self):
        """Test review_split_file with non-existent file."""
        result = review_split_file("nonexistent_file.json")
        assert result is False

    def test_review_translation_success(self, monkeypatch):
        """Test review_translation with valid data."""
        # Create a temporary translation file
        translation_data = {
            "metadata": {
                "title": "Test Article",
                "summary": "A test article for translation",
                "difficulty_level": "intermediate",
            },
            "translations": [
                {
                    "original": "مرحبا بالعالم.",
                    "full_translation": "Hello world.",
                },
                {
                    "original": "هذا نص تجريبي.",
                    "full_translation": "This is a test text.",
                },
            ],
        }

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump(translation_data, f)
            translation_file_path = f.name

        try:
            # Mock user input to continue
            monkeypatch.setattr("builtins.input", lambda prompt: "y")

            result = review_translation(translation_file_path)
            assert result is True

        finally:
            Path(translation_file_path).unlink(missing_ok=True)

    def test_review_translation_not_found(self):
        """Test review_translation with non-existent file."""
        result = review_translation("nonexistent_file.json")
        assert result is False

    @patch("main.split_text")
    def test_run_split_file_success(self, mock_split_text):
        """Test run_split_file success."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("مرحبا بالعالم. هذا نص تجريبي.")
            input_file = f.name

        output_file = input_file.replace(".txt", "_split.json")

        try:
            # Mock the split_text function to actually create the output file
            def mock_split_text_side_effect(input_file, output_file):
                with open(output_file, "w") as f:
                    f.write('{"units": []}')

            mock_split_text.side_effect = mock_split_text_side_effect

            result = run_split_file(input_file)
            assert result == output_file
            mock_split_text.assert_called_once_with(input_file, output_file)

        finally:
            Path(input_file).unlink(missing_ok=True)
            Path(output_file).unlink(missing_ok=True)

    @patch("main.translate_text")
    def test_run_translation_success(self, mock_translate_text):
        """Test run_translation success."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            f.write('{"units": []}')
            input_file = f.name

        output_file = input_file.replace("_split.json", "_translated.json")

        try:
            # Mock the translate_text function
            mock_translate_text.return_value = True

            run_translation(input_file, output_file, batch_size=2)
            mock_translate_text.assert_called_once_with(input_file, output_file, 2)

        finally:
            Path(input_file).unlink(missing_ok=True)
            Path(output_file).unlink(missing_ok=True)


class TestEndToEndWorkflow:
    """Test end-to-end workflow with mocked components."""

    @patch("main.split_text")
    @patch("main.translate_text")
    def test_full_workflow_mocked(self, mock_translate_text, mock_split_text):
        """Test full workflow with mocked components."""
        # Create temporary files
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("مرحبا بالعالم. هذا نص تجريبي.")
            input_file = f.name

        split_file_path = input_file.replace(".txt", "_split.json")
        output_file = input_file.replace(".txt", "_translated.json")

        try:
            # Mock the functions to actually create output files
            def mock_split_text_side_effect(input_file, output_file):
                with open(output_file, "w") as f:
                    f.write('{"units": []}')

            def mock_translate_text_side_effect(input_file, output_file, batch_size):
                with open(output_file, "w") as f:
                    f.write('{"translations": []}')
                return True

            mock_split_text.side_effect = mock_split_text_side_effect
            mock_translate_text.side_effect = mock_translate_text_side_effect

            # Test split phase
            result = run_split_file(input_file)
            assert result == split_file_path
            mock_split_text.assert_called_once()

            # Test translation phase
            run_translation(split_file_path, output_file, batch_size=2)
            mock_translate_text.assert_called_once()

        finally:
            # Cleanup
            Path(input_file).unlink(missing_ok=True)
            Path(split_file_path).unlink(missing_ok=True)
            Path(output_file).unlink(missing_ok=True)
