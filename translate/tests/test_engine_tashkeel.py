"""Tests for pipeline/engine/tashkeel.py diacritical marks generation."""

from unittest.mock import MagicMock, patch

import pytest

from data.models import TashkeelResult, TranslationResult


class TestBatchAddTashkeel:
    """Tests for batch_add_tashkeel function."""

    @patch("pipeline.engine.tashkeel.generate_tashkeel_suggestions_with_context")
    @patch("pipeline.engine.tashkeel.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_successful_tashkeel_generation(
        self, mock_tracker, mock_api, mock_camel
    ):
        """Test successful tashkeel generation without conversation manager."""
        from pipeline.engine.tashkeel import batch_add_tashkeel

        mock_camel.return_value = {"مرحبا": "مَرْحَبًا"}
        mock_api.return_value = {
            "success": True,
            "data": {
                "tashkeel": "مَرْحَبًا بِالْعَالَمِ",
                "uncertainties": [],
            },
        }

        translation_results = [
            TranslationResult(
                translation="Hello world",
                notes="",
                uncertainties=[],
                word_by_word=[],
            )
        ]

        result = batch_add_tashkeel(
            sentences=["مرحبا بالعالم"],
            translation_results=translation_results,
        )

        assert len(result) == 1
        assert isinstance(result[0], TashkeelResult)
        assert result[0].tashkeel == "مَرْحَبًا بِالْعَالَمِ"
        mock_tracker.set_phase.assert_called_with("Tashkeel Generation")

    @patch("pipeline.engine.tashkeel.generate_tashkeel_suggestions_with_context")
    @patch("utils.responses_api.token_tracker")
    def test_tashkeel_with_conversation_manager(
        self, mock_tracker, mock_camel, mock_conversation_manager
    ):
        """Test tashkeel generation with conversation manager."""
        from pipeline.engine.tashkeel import batch_add_tashkeel

        mock_camel.return_value = {}
        mock_conversation_manager.continue_with_stage.return_value = {
            "success": True,
            "data": {
                "tashkeel": "مَرْحَبًا",
                "uncertainties": [],
            },
        }

        translation_results = [
            TranslationResult(
                translation="Hello",
                notes="",
                uncertainties=[],
                word_by_word=[],
            )
        ]

        result = batch_add_tashkeel(
            sentences=["مرحبا"],
            translation_results=translation_results,
            conversation_manager=mock_conversation_manager,
        )

        assert len(result) == 1
        assert result[0].tashkeel == "مَرْحَبًا"
        mock_conversation_manager.continue_with_stage.assert_called_once()

    @patch("pipeline.engine.tashkeel.generate_tashkeel_suggestions_with_context")
    @patch("pipeline.engine.tashkeel.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_camel_tools_suggestions_applied(
        self, mock_tracker, mock_api, mock_camel
    ):
        """Test that camel_tools suggestions are substituted in sentence."""
        from pipeline.engine.tashkeel import batch_add_tashkeel

        # camel_tools provides suggestions
        mock_camel.return_value = {"كتاب": "كِتَاب"}
        mock_api.return_value = {
            "success": True,
            "data": {
                "tashkeel": "كِتَاب جَدِيد",
                "uncertainties": [],
            },
        }

        translation_results = [
            TranslationResult(
                translation="New book",
                notes="",
                uncertainties=[],
                word_by_word=[],
            )
        ]

        result = batch_add_tashkeel(
            sentences=["كتاب جديد"],
            translation_results=translation_results,
        )

        assert len(result) == 1
        # Verify camel_tools was called
        mock_camel.assert_called()

    @patch("pipeline.engine.tashkeel.generate_tashkeel_suggestions_with_context")
    @patch("pipeline.engine.tashkeel.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_context_cache_used_when_provided(
        self, mock_tracker, mock_api, mock_camel
    ):
        """Test that ContextCache provides context for tashkeel."""
        from pipeline.engine.tashkeel import batch_add_tashkeel

        mock_camel.return_value = {}
        mock_api.return_value = {
            "success": True,
            "data": {
                "tashkeel": "مَرْحَبًا",
                "uncertainties": [],
            },
        }

        # Create mock context cache
        mock_context_cache = MagicMock()
        mock_context_cache.get_context.return_value = "Context from cache"

        translation_results = [
            TranslationResult(
                translation="Hello",
                notes="",
                uncertainties=[],
                word_by_word=[],
            )
        ]

        batch_add_tashkeel(
            sentences=["مرحبا"],
            translation_results=translation_results,
            indices=[0],
            context_cache=mock_context_cache,
        )

        # Verify context cache was accessed
        mock_context_cache.get_context.assert_called()

    @patch("pipeline.engine.tashkeel.generate_tashkeel_suggestions_with_context")
    @patch("pipeline.engine.tashkeel.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_tashkeel_api_failure_raises_error(
        self, mock_tracker, mock_api, mock_camel
    ):
        """Test that API failure raises RuntimeError."""
        from pipeline.engine.tashkeel import batch_add_tashkeel

        mock_camel.return_value = {}
        mock_api.return_value = {
            "success": False,
            "error": "API error",
        }

        translation_results = [
            TranslationResult(
                translation="Hello",
                notes="",
                uncertainties=[],
                word_by_word=[],
            )
        ]

        with pytest.raises(RuntimeError, match="Failed to generate tashkeel"):
            batch_add_tashkeel(
                sentences=["مرحبا"],
                translation_results=translation_results,
            )

    @patch("pipeline.engine.tashkeel.generate_tashkeel_suggestions_with_context")
    @patch("pipeline.engine.tashkeel.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_result_count_mismatch_raises_error(
        self, mock_tracker, mock_api, mock_camel
    ):
        """Test RuntimeError when results don't match sentence count."""
        from pipeline.engine.tashkeel import batch_add_tashkeel

        mock_camel.return_value = {}
        # Return results for 1 sentence when we have 2
        mock_api.side_effect = [
            {
                "success": True,
                "data": {
                    "tashkeel": "مَرْحَبًا",
                    "uncertainties": [],
                },
            },
            {
                "success": False,
                "error": "Failed",
            },
        ]

        translation_results = [
            TranslationResult(
                translation="Hello",
                notes="",
                uncertainties=[],
                word_by_word=[],
            ),
            TranslationResult(
                translation="Goodbye",
                notes="",
                uncertainties=[],
                word_by_word=[],
            ),
        ]

        with pytest.raises(RuntimeError, match="Failed to generate tashkeel"):
            batch_add_tashkeel(
                sentences=["مرحبا", "مع السلامة"],
                translation_results=translation_results,
            )

    @patch("pipeline.engine.tashkeel.generate_tashkeel_suggestions_with_context")
    @patch("pipeline.engine.tashkeel.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_empty_context_handled(
        self, mock_tracker, mock_api, mock_camel
    ):
        """Test handling when context_cache returns empty/None context."""
        from pipeline.engine.tashkeel import batch_add_tashkeel

        mock_camel.return_value = {}
        mock_api.return_value = {
            "success": True,
            "data": {
                "tashkeel": "مَرْحَبًا",
                "uncertainties": [],
            },
        }

        mock_context_cache = MagicMock()
        mock_context_cache.get_context.return_value = None

        translation_results = [
            TranslationResult(
                translation="Hello",
                notes="",
                uncertainties=[],
                word_by_word=[],
            )
        ]

        result = batch_add_tashkeel(
            sentences=["مرحبا"],
            translation_results=translation_results,
            indices=[0],
            context_cache=mock_context_cache,
        )

        # Should complete successfully even with no context
        assert len(result) == 1

    @patch("pipeline.engine.tashkeel.generate_tashkeel_suggestions_with_context")
    @patch("pipeline.engine.tashkeel.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_indices_passed_to_camel_tools(
        self, mock_tracker, mock_api, mock_camel
    ):
        """Test that sentence indices are passed to camel_tools."""
        from pipeline.engine.tashkeel import batch_add_tashkeel

        mock_camel.return_value = {}
        mock_api.return_value = {
            "success": True,
            "data": {
                "tashkeel": "مَرْحَبًا",
                "uncertainties": [],
            },
        }

        translation_results = [
            TranslationResult(
                translation="Hello",
                notes="",
                uncertainties=[],
                word_by_word=[],
            )
        ]

        batch_add_tashkeel(
            sentences=["مرحبا"],
            translation_results=translation_results,
            indices=[5],  # Specific index
        )

        # Verify camel_tools was called with correct index
        call_args = mock_camel.call_args
        assert call_args[1]["sentence_index"] == 5

    @patch("pipeline.engine.tashkeel.generate_tashkeel_suggestions_with_context")
    @patch("pipeline.engine.tashkeel.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_token_tracker_phase_set(
        self, mock_tracker, mock_api, mock_camel
    ):
        """Test that token_tracker.set_phase is called correctly."""
        from pipeline.engine.tashkeel import batch_add_tashkeel

        mock_camel.return_value = {}
        mock_api.return_value = {
            "success": True,
            "data": {
                "tashkeel": "مَرْحَبًا",
                "uncertainties": [],
            },
        }

        translation_results = [
            TranslationResult(
                translation="Hello",
                notes="",
                uncertainties=[],
                word_by_word=[],
            )
        ]

        batch_add_tashkeel(
            sentences=["مرحبا"],
            translation_results=translation_results,
        )

        mock_tracker.set_phase.assert_called_with("Tashkeel Generation")

    @patch("pipeline.engine.tashkeel.generate_tashkeel_suggestions_with_context")
    @patch("utils.responses_api.token_tracker")
    def test_conversation_manager_failure_raises_error(
        self, mock_tracker, mock_camel, mock_conversation_manager
    ):
        """Test that conversation manager failure raises RuntimeError."""
        from pipeline.engine.tashkeel import batch_add_tashkeel

        mock_camel.return_value = {}
        mock_conversation_manager.continue_with_stage.return_value = {
            "success": False,
            "error": "Conversation error",
        }

        translation_results = [
            TranslationResult(
                translation="Hello",
                notes="",
                uncertainties=[],
                word_by_word=[],
            )
        ]

        with pytest.raises(RuntimeError, match="Failed to generate tashkeel"):
            batch_add_tashkeel(
                sentences=["مرحبا"],
                translation_results=translation_results,
                conversation_manager=mock_conversation_manager,
            )
