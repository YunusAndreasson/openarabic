"""Tests for pipeline/engine/batch_ops.py batch sentence translation."""

from unittest.mock import patch

import pytest

from data.models import TranslationResult


class TestBatchTranslateFullSentences:
    """Tests for batch_translate_full_sentences function."""

    @patch("pipeline.engine.batch_ops.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_single_sentence_translation_success(self, mock_tracker, mock_api):
        """Test successful translation of a single sentence."""
        from pipeline.engine.batch_ops import batch_translate_full_sentences

        mock_api.return_value = {
            "success": True,
            "data": {
                "translation": "Hello world",
                "notes": "A greeting",
                "uncertainties": [],
                "word_by_word": [],
            },
        }

        result = batch_translate_full_sentences(
            sentences=["مرحبا بالعالم"],
            contexts=[None],
        )

        assert len(result) == 1
        assert isinstance(result[0], TranslationResult)
        assert result[0].translation == "Hello world"
        mock_tracker.set_phase.assert_called_with("Sentence Translation")

    @patch("pipeline.engine.batch_ops.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_multiple_sentences_translation_success(self, mock_tracker, mock_api):
        """Test successful translation of multiple sentences."""
        from pipeline.engine.batch_ops import batch_translate_full_sentences

        # Each sentence is translated by its own standalone API call.
        mock_api.side_effect = [
            {
                "success": True,
                "data": {
                    "translation": "Hello",
                    "notes": "Greeting",
                    "uncertainties": [],
                    "word_by_word": [],
                },
            },
            {
                "success": True,
                "data": {
                    "translation": "Goodbye",
                    "notes": "Farewell",
                    "uncertainties": [],
                    "word_by_word": [],
                },
            },
            {
                "success": True,
                "data": {
                    "translation": "Thank you",
                    "notes": "Gratitude",
                    "uncertainties": [],
                    "word_by_word": [],
                },
            },
        ]

        result = batch_translate_full_sentences(
            sentences=["مرحبا", "مع السلامة", "شكرا"],
            contexts=[None, None, None],
        )

        assert len(result) == 3
        assert result[0].translation == "Hello"
        assert result[1].translation == "Goodbye"
        assert result[2].translation == "Thank you"

    @patch("pipeline.engine.batch_ops.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_sentences_with_context(self, mock_tracker, mock_api):
        """Test that context is properly included in API calls."""
        from pipeline.engine.batch_ops import batch_translate_full_sentences

        mock_api.return_value = {
            "success": True,
            "data": {
                "translation": "Hello",
                "notes": "Test",
                "uncertainties": [],
                "word_by_word": [],
            },
        }

        batch_translate_full_sentences(
            sentences=["مرحبا"],
            contexts=["Islamic greeting context"],
        )

        # Check that context was included in the API call
        call_args = mock_api.call_args
        messages = call_args[0][0]
        user_message = messages[1]["content"]
        assert (
            "Context (for understanding only — do NOT translate):\nIslamic greeting context"
            in user_message
        )

    @patch("pipeline.engine.batch_ops.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_context_length_mismatch_padding(self, mock_tracker, mock_api):
        """Test that context list shorter than sentences is padded with None."""
        from pipeline.engine.batch_ops import batch_translate_full_sentences

        mock_api.return_value = {
            "success": True,
            "data": {
                "translation": "Hello",
                "notes": "Test",
                "uncertainties": [],
                "word_by_word": [],
            },
        }

        # 2 sentences but only 1 context - should not raise
        batch_translate_full_sentences(
            sentences=["مرحبا", "شكرا"],
            contexts=["context1"],  # Only 1 context for 2 sentences
        )

        # Should complete without error
        assert mock_api.called

    @patch("pipeline.engine.batch_ops.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_api_failure_raises_runtime_error(self, mock_tracker, mock_api):
        """Test that API failure raises RuntimeError."""
        from pipeline.engine.batch_ops import batch_translate_full_sentences

        mock_api.return_value = {
            "success": False,
            "error": "API rate limit exceeded",
        }

        with pytest.raises(RuntimeError, match="Failed to translate sentence"):
            batch_translate_full_sentences(
                sentences=["مرحبا"],
                contexts=[None],
            )

    @patch("pipeline.engine.batch_ops.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_empty_sentences_list(self, mock_tracker, mock_api):
        """Test behavior with empty sentences list."""
        from pipeline.engine.batch_ops import batch_translate_full_sentences

        # Empty response for empty input
        mock_api.return_value = {
            "success": True,
            "data": {},
        }

        result = batch_translate_full_sentences(
            sentences=[],
            contexts=[],
        )

        # Empty input should return empty result
        assert result == []

    @patch("pipeline.engine.batch_ops.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_token_tracker_phase_set(self, mock_tracker, mock_api):
        """Test that token_tracker.set_phase is called with correct phase."""
        from pipeline.engine.batch_ops import batch_translate_full_sentences

        mock_api.return_value = {
            "success": True,
            "data": {
                "translation": "Hello",
                "notes": "Test",
                "uncertainties": [],
                "word_by_word": [],
            },
        }

        batch_translate_full_sentences(
            sentences=["مرحبا"],
            contexts=[None],
        )

        mock_tracker.set_phase.assert_called_with("Sentence Translation")

    @patch("pipeline.engine.batch_ops.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_result_count_matches_input(self, mock_tracker, mock_api):
        """Test that result count matches sentence count."""
        from pipeline.engine.batch_ops import batch_translate_full_sentences

        # One standalone call per sentence.
        mock_api.side_effect = [
            {
                "success": True,
                "data": {
                    "translation": "One",
                    "notes": "",
                    "uncertainties": [],
                    "word_by_word": [],
                },
            },
            {
                "success": True,
                "data": {
                    "translation": "Two",
                    "notes": "",
                    "uncertainties": [],
                    "word_by_word": [],
                },
            },
        ]

        result = batch_translate_full_sentences(
            sentences=["واحد", "اثنان"],
            contexts=[None, None],
        )

        assert len(result) == 2
