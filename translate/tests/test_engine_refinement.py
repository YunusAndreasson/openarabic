"""Tests for pipeline/engine/refinement.py translation refinement."""

from unittest.mock import patch

from data.models import (
    RefinementResult,
    TashkeelResult,
    TranslationResult,
    WordTranslation,
)


class TestBatchRefineTranslations:
    """Tests for batch_refine_translations function."""

    @patch("pipeline.engine.refinement.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_successful_refinement(self, mock_tracker, mock_api):
        """Test successful translation refinement."""
        from pipeline.engine.refinement import batch_refine_translations

        mock_api.return_value = {
            "refinements": [
                {
                    "improved_tashkeel": "مَرْحَبًا بِالْعَالَمِ",
                    "improved_translation": "Hello world",
                    "improved_word_translations": [],
                    "resolved_uncertainties": [],
                    "remaining_uncertainties": [],
                    "changes_made": ["Fixed diacritics"],
                }
            ]
        }

        word_translation = WordTranslation(
            arabic="مَرْحَبًا",
            english="hello",
            pos="interjection",
            essential="مرحبا",
            essential_translation="hello",
            notes="",
            uncertainties=[],
        )

        refinement_input = [
            {
                "original": "مرحبا بالعالم",
                "translation": TranslationResult(
                    translation="Hello world",
                    notes="",
                    uncertainties=[],
                    word_by_word=[],
                ),
                "tashkeel": TashkeelResult(
                    tashkeel="مَرْحَبًا بِالْعَالَمِ",
                    uncertainties=[],
                ),
                "word_translations_options": [word_translation],
                "previous_uncertainties": {"translation": [], "tashkeel": []},
            }
        ]

        result = batch_refine_translations(refinement_input)

        assert len(result) == 1
        assert isinstance(result[0], RefinementResult)
        assert result[0].improved_tashkeel == "مَرْحَبًا بِالْعَالَمِ"
        assert result[0].improved_translation == "Hello world"
        mock_tracker.set_phase.assert_called_with("Verification")

    @patch("utils.responses_api.token_tracker")
    def test_refinement_with_conversation_manager(
        self, mock_tracker, mock_conversation_manager
    ):
        """Test refinement using conversation manager path."""
        from pipeline.engine.refinement import batch_refine_translations

        mock_conversation_manager.continue_with_stage.return_value = {
            "refinements": [
                {
                    "improved_tashkeel": "مَرْحَبًا",
                    "improved_translation": "Hello",
                    "improved_word_translations": [],
                    "resolved_uncertainties": [],
                    "remaining_uncertainties": [],
                    "changes_made": [],
                }
            ]
        }

        word_translation = WordTranslation(
            arabic="مَرْحَبًا",
            english="hello",
            pos="interjection",
            essential="مرحبا",
            essential_translation="hello",
            notes="",
            uncertainties=[],
        )

        refinement_input = [
            {
                "original": "مرحبا",
                "translation": TranslationResult(
                    translation="Hello",
                    notes="",
                    uncertainties=[],
                    word_by_word=[],
                ),
                "tashkeel": TashkeelResult(
                    tashkeel="مَرْحَبًا",
                    uncertainties=[],
                ),
                "word_translations_options": [word_translation],
                "previous_uncertainties": {"translation": [], "tashkeel": []},
            }
        ]

        result = batch_refine_translations(
            refinement_input,
            conversation_manager=mock_conversation_manager,
        )

        assert len(result) == 1
        mock_conversation_manager.continue_with_stage.assert_called_once()

    @patch("pipeline.engine.refinement.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_word_translation_object_formatting(self, mock_tracker, mock_api):
        """Test that WordTranslation objects are formatted correctly in prompt."""
        from pipeline.engine.refinement import batch_refine_translations

        mock_api.return_value = {
            "refinements": [
                {
                    "improved_tashkeel": "كِتَاب",
                    "improved_translation": "Book",
                    "improved_word_translations": [],
                    "resolved_uncertainties": [],
                    "remaining_uncertainties": [],
                    "changes_made": [],
                }
            ]
        }

        # Word with list options
        word_translation = WordTranslation(
            arabic="كِتَاب",
            english=["book", "tome"],  # List format
            pos="noun",
            essential="كتاب",
            essential_translation=["book", "tome"],  # List format
            notes="A common noun",
            uncertainties=[],
        )

        refinement_input = [
            {
                "original": "كتاب",
                "translation": TranslationResult(
                    translation="Book",
                    notes="",
                    uncertainties=[],
                    word_by_word=[],
                ),
                "tashkeel": TashkeelResult(
                    tashkeel="كِتَاب",
                    uncertainties=[],
                ),
                "word_translations_options": [word_translation],
                "previous_uncertainties": {"translation": [], "tashkeel": []},
            }
        ]

        batch_refine_translations(refinement_input)

        # Verify API was called with formatted word translations
        assert mock_api.called

    @patch("pipeline.engine.refinement.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_word_translation_dict_formatting(self, mock_tracker, mock_api):
        """Test that word translation dicts are formatted correctly in prompt."""
        from pipeline.engine.refinement import batch_refine_translations

        mock_api.return_value = {
            "refinements": [
                {
                    "improved_tashkeel": "كِتَاب",
                    "improved_translation": "Book",
                    "improved_word_translations": [],
                    "resolved_uncertainties": [],
                    "remaining_uncertainties": [],
                    "changes_made": [],
                }
            ]
        }

        # Word as dict format
        word_dict = {
            "arabic": "كِتَاب",
            "english_options": ["book", "tome"],
            "pos": "noun",
            "essential": "كتاب",
            "essential_translation_options": ["book"],
            "notes": "",
        }

        refinement_input = [
            {
                "original": "كتاب",
                "translation": TranslationResult(
                    translation="Book",
                    notes="",
                    uncertainties=[],
                    word_by_word=[],
                ),
                "tashkeel": TashkeelResult(
                    tashkeel="كِتَاب",
                    uncertainties=[],
                ),
                "word_translations_options": [word_dict],
                "previous_uncertainties": {"translation": [], "tashkeel": []},
            }
        ]

        batch_refine_translations(refinement_input)

        assert mock_api.called

    @patch("pipeline.engine.refinement.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_api_error_returns_empty_list(self, mock_tracker, mock_api):
        """Test that API error returns empty results (no crash)."""
        from pipeline.engine.refinement import batch_refine_translations

        mock_api.return_value = {
            "error": "API rate limit exceeded",
        }

        word_translation = WordTranslation(
            arabic="مَرْحَبًا",
            english="hello",
            pos="interjection",
            essential="مرحبا",
            essential_translation="hello",
            notes="",
            uncertainties=[],
        )

        refinement_input = [
            {
                "original": "مرحبا",
                "translation": TranslationResult(
                    translation="Hello",
                    notes="",
                    uncertainties=[],
                    word_by_word=[],
                ),
                "tashkeel": TashkeelResult(
                    tashkeel="مَرْحَبًا",
                    uncertainties=[],
                ),
                "word_translations_options": [word_translation],
                "previous_uncertainties": {"translation": [], "tashkeel": []},
            }
        ]

        result = batch_refine_translations(refinement_input)

        # Should return empty list, not crash
        assert result == []

    @patch("pipeline.engine.refinement.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_unexpected_response_format_returns_empty(self, mock_tracker, mock_api):
        """Test handling of unexpected API response format."""
        from pipeline.engine.refinement import batch_refine_translations

        mock_api.return_value = {
            "unexpected_key": "unexpected_value",
        }

        word_translation = WordTranslation(
            arabic="مَرْحَبًا",
            english="hello",
            pos="interjection",
            essential="مرحبا",
            essential_translation="hello",
            notes="",
            uncertainties=[],
        )

        refinement_input = [
            {
                "original": "مرحبا",
                "translation": TranslationResult(
                    translation="Hello",
                    notes="",
                    uncertainties=[],
                    word_by_word=[],
                ),
                "tashkeel": TashkeelResult(
                    tashkeel="مَرْحَبًا",
                    uncertainties=[],
                ),
                "word_translations_options": [word_translation],
                "previous_uncertainties": {"translation": [], "tashkeel": []},
            }
        ]

        result = batch_refine_translations(refinement_input)

        assert result == []

    @patch("pipeline.engine.refinement.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_non_dict_refinement_item_creates_fallback(self, mock_tracker, mock_api):
        """Test that non-dict items in refinements create fallback results."""
        from pipeline.engine.refinement import batch_refine_translations

        mock_api.return_value = {
            "refinements": [
                {
                    "improved_tashkeel": "مَرْحَبًا",
                    "improved_translation": "Hello",
                    "improved_word_translations": [],
                    "resolved_uncertainties": [],
                    "remaining_uncertainties": [],
                    "changes_made": [],
                },
                "invalid_string_item",  # Non-dict item
            ]
        }

        word_translation = WordTranslation(
            arabic="مَرْحَبًا",
            english="hello",
            pos="interjection",
            essential="مرحبا",
            essential_translation="hello",
            notes="",
            uncertainties=[],
        )

        refinement_input = [
            {
                "original": "مرحبا",
                "translation": TranslationResult(
                    translation="Hello",
                    notes="",
                    uncertainties=[],
                    word_by_word=[],
                ),
                "tashkeel": TashkeelResult(
                    tashkeel="مَرْحَبًا",
                    uncertainties=[],
                ),
                "word_translations_options": [word_translation],
                "previous_uncertainties": {"translation": [], "tashkeel": []},
            },
            {
                "original": "شكرا",
                "translation": TranslationResult(
                    translation="Thank you",
                    notes="",
                    uncertainties=[],
                    word_by_word=[],
                ),
                "tashkeel": TashkeelResult(
                    tashkeel="شُكْرًا",
                    uncertainties=[],
                ),
                "word_translations_options": [word_translation],
                "previous_uncertainties": {"translation": [], "tashkeel": []},
            },
        ]

        result = batch_refine_translations(refinement_input)

        # Second item should have fallback with error
        assert len(result) == 2
        assert "Response format error" in result[1].changes_made

    @patch("pipeline.engine.refinement.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_exception_during_processing_returns_empty(self, mock_tracker, mock_api):
        """Test that exceptions return empty list without crashing."""
        from pipeline.engine.refinement import batch_refine_translations

        # Force exception during processing
        mock_api.side_effect = Exception("Unexpected error")

        word_translation = WordTranslation(
            arabic="مَرْحَبًا",
            english="hello",
            pos="interjection",
            essential="مرحبا",
            essential_translation="hello",
            notes="",
            uncertainties=[],
        )

        refinement_input = [
            {
                "original": "مرحبا",
                "translation": TranslationResult(
                    translation="Hello",
                    notes="",
                    uncertainties=[],
                    word_by_word=[],
                ),
                "tashkeel": TashkeelResult(
                    tashkeel="مَرْحَبًا",
                    uncertainties=[],
                ),
                "word_translations_options": [word_translation],
                "previous_uncertainties": {"translation": [], "tashkeel": []},
            }
        ]

        result = batch_refine_translations(refinement_input)

        assert result == []

    @patch("pipeline.engine.refinement.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_refinement_data_sanitized(self, mock_tracker, mock_api):
        """Test that refinement data is sanitized before RefinementResult creation."""
        from pipeline.engine.refinement import batch_refine_translations

        mock_api.return_value = {
            "refinements": [
                {
                    "improved_tashkeel": "  مَرْحَبًا  ",  # Extra whitespace
                    "improved_translation": "  Hello  ",
                    "improved_word_translations": [],
                    "resolved_uncertainties": [],
                    "remaining_uncertainties": [],
                    "changes_made": ["  Fixed  ", "  Updated  "],
                }
            ]
        }

        word_translation = WordTranslation(
            arabic="مَرْحَبًا",
            english="hello",
            pos="interjection",
            essential="مرحبا",
            essential_translation="hello",
            notes="",
            uncertainties=[],
        )

        refinement_input = [
            {
                "original": "مرحبا",
                "translation": TranslationResult(
                    translation="Hello",
                    notes="",
                    uncertainties=[],
                    word_by_word=[],
                ),
                "tashkeel": TashkeelResult(
                    tashkeel="مَرْحَبًا",
                    uncertainties=[],
                ),
                "word_translations_options": [word_translation],
                "previous_uncertainties": {"translation": [], "tashkeel": []},
            }
        ]

        result = batch_refine_translations(refinement_input)

        assert len(result) == 1
        # Whitespace should be stripped
        assert result[0].improved_tashkeel == "مَرْحَبًا"
        assert result[0].improved_translation == "Hello"

    @patch("pipeline.engine.refinement.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_multiple_sets_in_input(self, mock_tracker, mock_api):
        """Test refinement with multiple sentence sets."""
        from pipeline.engine.refinement import batch_refine_translations

        mock_api.return_value = {
            "refinements": [
                {
                    "improved_tashkeel": "مَرْحَبًا",
                    "improved_translation": "Hello",
                    "improved_word_translations": [],
                    "resolved_uncertainties": [],
                    "remaining_uncertainties": [],
                    "changes_made": [],
                },
                {
                    "improved_tashkeel": "شُكْرًا",
                    "improved_translation": "Thank you",
                    "improved_word_translations": [],
                    "resolved_uncertainties": [],
                    "remaining_uncertainties": [],
                    "changes_made": [],
                },
                {
                    "improved_tashkeel": "مَعَ السَّلَامَةِ",
                    "improved_translation": "Goodbye",
                    "improved_word_translations": [],
                    "resolved_uncertainties": [],
                    "remaining_uncertainties": [],
                    "changes_made": [],
                },
            ]
        }

        word_translation = WordTranslation(
            arabic="مَرْحَبًا",
            english="hello",
            pos="interjection",
            essential="مرحبا",
            essential_translation="hello",
            notes="",
            uncertainties=[],
        )

        refinement_input = [
            {
                "original": "مرحبا",
                "translation": TranslationResult(
                    translation="Hello",
                    notes="",
                    uncertainties=[],
                    word_by_word=[],
                ),
                "tashkeel": TashkeelResult(
                    tashkeel="مَرْحَبًا",
                    uncertainties=[],
                ),
                "word_translations_options": [word_translation],
                "previous_uncertainties": {"translation": [], "tashkeel": []},
            },
            {
                "original": "شكرا",
                "translation": TranslationResult(
                    translation="Thank you",
                    notes="",
                    uncertainties=[],
                    word_by_word=[],
                ),
                "tashkeel": TashkeelResult(
                    tashkeel="شُكْرًا",
                    uncertainties=[],
                ),
                "word_translations_options": [word_translation],
                "previous_uncertainties": {"translation": [], "tashkeel": []},
            },
            {
                "original": "مع السلامة",
                "translation": TranslationResult(
                    translation="Goodbye",
                    notes="",
                    uncertainties=[],
                    word_by_word=[],
                ),
                "tashkeel": TashkeelResult(
                    tashkeel="مَعَ السَّلَامَةِ",
                    uncertainties=[],
                ),
                "word_translations_options": [word_translation],
                "previous_uncertainties": {"translation": [], "tashkeel": []},
            },
        ]

        result = batch_refine_translations(refinement_input)

        assert len(result) == 3
        assert result[0].improved_translation == "Hello"
        assert result[1].improved_translation == "Thank you"
        assert result[2].improved_translation == "Goodbye"

    @patch("pipeline.engine.refinement.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_token_tracker_phase_set(self, mock_tracker, mock_api):
        """Test that token_tracker.set_phase is called correctly."""
        from pipeline.engine.refinement import batch_refine_translations

        mock_api.return_value = {
            "refinements": [
                {
                    "improved_tashkeel": "مَرْحَبًا",
                    "improved_translation": "Hello",
                    "improved_word_translations": [],
                    "resolved_uncertainties": [],
                    "remaining_uncertainties": [],
                    "changes_made": [],
                }
            ]
        }

        word_translation = WordTranslation(
            arabic="مَرْحَبًا",
            english="hello",
            pos="interjection",
            essential="مرحبا",
            essential_translation="hello",
            notes="",
            uncertainties=[],
        )

        refinement_input = [
            {
                "original": "مرحبا",
                "translation": TranslationResult(
                    translation="Hello",
                    notes="",
                    uncertainties=[],
                    word_by_word=[],
                ),
                "tashkeel": TashkeelResult(
                    tashkeel="مَرْحَبًا",
                    uncertainties=[],
                ),
                "word_translations_options": [word_translation],
                "previous_uncertainties": {"translation": [], "tashkeel": []},
            }
        ]

        batch_refine_translations(refinement_input)

        mock_tracker.set_phase.assert_called_with("Verification")
