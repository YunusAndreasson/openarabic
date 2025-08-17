"""Integration tests for the main workflow."""

import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import (
    run_split_file,
    run_translation,
)


class TestMainWorkflow:
    """Test the main workflow functions."""

    @patch("main.split_text")
    def test_run_split_file_success(self, mock_split_text):
        """Test run_split_file success."""
        input_file = None
        output_file = None

        try:
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".txt", delete=False
            ) as f:
                f.write("مرحبا بالعالم. هذا نص تجريبي.")
                input_file = f.name

            # Mock the split_text function to actually create the output file
            def mock_split_text_side_effect(input_file, output_file):
                with open(output_file, "w") as f:
                    f.write('{"units": []}')

            mock_split_text.side_effect = mock_split_text_side_effect

            result = run_split_file(input_file, "test_author")
            output_file = result
            assert result.endswith("_split.json")
            mock_split_text.assert_called_once()

        finally:
            # Clean up all created files
            if input_file and os.path.exists(input_file):
                Path(input_file).unlink(missing_ok=True)
            if output_file and os.path.exists(output_file):
                Path(output_file).unlink(missing_ok=True)

    @patch("main.translate_text")
    def test_run_translation_success(self, mock_translate_text):
        """Test run_translation success."""
        input_file = None
        output_file = None

        try:
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".json", delete=False
            ) as f:
                f.write('{"units": []}')
                input_file = f.name

            output_file = input_file.replace("_split.json", "_translated.json")

            # Mock the translate_text function
            mock_translate_text.return_value = True

            run_translation(input_file, output_file, batch_size=2)
            mock_translate_text.assert_called_once_with(
                input_file, output_file, 2, use_conversation_continuity=True
            )

        finally:
            # Clean up all created files
            if input_file and os.path.exists(input_file):
                Path(input_file).unlink(missing_ok=True)
            if output_file and os.path.exists(output_file):
                Path(output_file).unlink(missing_ok=True)


class TestEndToEndWorkflow:
    """Test end-to-end workflow with mocked components."""

    @patch("main.split_text")
    @patch("main.translate_text")
    def test_full_workflow_mocked(self, mock_translate_text, mock_split_text):
        """Test full workflow with mocked components."""
        input_file = None
        split_file_path = None
        output_file = None

        try:
            # Create temporary files
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".txt", delete=False
            ) as f:
                f.write("مرحبا بالعالم. هذا نص تجريبي.")
                input_file = f.name

            split_file_path = input_file.replace(".txt", "_split.json")
            output_file = input_file.replace(".txt", "_translated.json")

            # Mock the functions to actually create output files
            def mock_split_text_side_effect(input_file, output_file):
                with open(output_file, "w") as f:
                    f.write('{"units": []}')

            def mock_translate_text_side_effect(
                input_file, output_file, batch_size, use_conversation_continuity=True
            ):
                with open(output_file, "w") as f:
                    f.write('{"translations": []}')
                return True

            mock_split_text.side_effect = mock_split_text_side_effect
            mock_translate_text.side_effect = mock_translate_text_side_effect

            # Test split phase
            result = run_split_file(input_file, "test_author")
            split_file_path = result  # Update with actual path
            assert result.endswith("_split.json")
            mock_split_text.assert_called_once()

            # Test translation phase
            run_translation(split_file_path, output_file, batch_size=2)
            mock_translate_text.assert_called_once()

        finally:
            # Clean up all created files
            if input_file and os.path.exists(input_file):
                Path(input_file).unlink(missing_ok=True)
            if split_file_path and os.path.exists(split_file_path):
                Path(split_file_path).unlink(missing_ok=True)
            if output_file and os.path.exists(output_file):
                Path(output_file).unlink(missing_ok=True)
