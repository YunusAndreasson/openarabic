"""Integration tests for the main workflow."""

import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline.split_file import split_file
from pipeline.translate import translate_file
from utils.file_utils import generate_pipeline_filename


class TestPipelineModules:
    """Test the pipeline module functions."""

    @patch("pipeline.split_file.split_text_into_sentences")
    def test_split_file_success(self, mock_split_text):
        """Test split_file success."""
        input_file = None
        output_file = None

        try:
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".txt", delete=False
            ) as f:
                f.write("مرحبا بالعالم. هذا نص تجريبي.")
                input_file = f.name

            # Create output filename using the utility function
            output_file = generate_pipeline_filename(
                input_file, "01_test_author", "_split", tempfile.gettempdir()
            )

            # Mock the split_text_into_sentences function
            from data.models import SplitResult

            mock_split_text.return_value = SplitResult(
                units=[],
                title="Test",
                summary="Test summary",
                difficulty_level="beginner",
                category="aqeedah",
                total_units=0,
            )

            split_file(input_file, output_file)
            assert os.path.exists(output_file)
            mock_split_text.assert_called_once()

        finally:
            # Clean up all created files
            if input_file and os.path.exists(input_file):
                Path(input_file).unlink(missing_ok=True)
            if output_file and os.path.exists(output_file):
                Path(output_file).unlink(missing_ok=True)

    @patch("pipeline.translate.process_batches")
    @patch("pipeline.translate.load_split_data")
    def test_translate_file_success(self, mock_load_split, mock_process_batches):
        """Test translate_file success."""
        input_file = None
        output_file = None

        try:
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".json", delete=False
            ) as f:
                f.write(
                    '{"units": [], "title": "Test", "summary": "Test", "difficulty_level": "beginner", "category": "aqeedah", "total_units": 0}'
                )
                input_file = f.name

            output_file = input_file.replace(".json", "_translated.json")

            # Mock the load_split_data function
            from data.models import SplitResult

            mock_load_split.return_value = SplitResult(
                units=[],
                title="Test",
                summary="Test summary",
                difficulty_level="beginner",
                category="aqeedah",
                total_units=0,
            )

            # Mock the process_batches function
            mock_process_batches.return_value = ([], [])

            # Disable conversation continuity to avoid API calls
            result = translate_file(input_file, output_file, batch_size=2)
            assert result is True
            mock_load_split.assert_called_once()

        finally:
            # Clean up all created files
            if input_file and os.path.exists(input_file):
                Path(input_file).unlink(missing_ok=True)
            if output_file and os.path.exists(output_file):
                Path(output_file).unlink(missing_ok=True)


class TestEndToEndWorkflow:
    """Test end-to-end workflow with mocked components."""

    @patch("pipeline.translate.process_batches")
    @patch("pipeline.translate.load_split_data")
    @patch("pipeline.split_file.split_text_into_sentences")
    def test_full_workflow_mocked(
        self, mock_split_text, mock_load_split, mock_process_batches
    ):
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

            split_file_path = generate_pipeline_filename(
                input_file, "01_test_author", "_split", tempfile.gettempdir()
            )
            output_file = split_file_path.replace("_split.json", "_translated.json")

            # Mock the split_text_into_sentences function
            from data.models import SplitResult

            mock_split_text.return_value = SplitResult(
                units=[],
                title="Test",
                summary="Test summary",
                difficulty_level="beginner",
                category="aqeedah",
                total_units=0,
            )

            # Mock the load_split_data function
            mock_load_split.return_value = SplitResult(
                units=[],
                title="Test",
                summary="Test summary",
                difficulty_level="beginner",
                category="aqeedah",
                total_units=0,
            )

            # Mock the process_batches function
            mock_process_batches.return_value = ([], [])

            # Test split phase
            split_file(input_file, split_file_path)
            assert os.path.exists(split_file_path)
            mock_split_text.assert_called_once()

            # Test translation phase (disable conversation continuity to avoid API calls)
            result = translate_file(
                split_file_path,
                output_file,
                batch_size=2,
            )
            assert result is True
            mock_load_split.assert_called_once()

        finally:
            # Clean up all created files
            if input_file and os.path.exists(input_file):
                Path(input_file).unlink(missing_ok=True)
            if split_file_path and os.path.exists(split_file_path):
                Path(split_file_path).unlink(missing_ok=True)
            if output_file and os.path.exists(output_file):
                Path(output_file).unlink(missing_ok=True)
