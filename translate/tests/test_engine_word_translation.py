"""Tests for pipeline/engine/word_translation.py word-by-word translation."""

from unittest.mock import patch

import pytest

from data.models import TashkeelResult, TranslationResult, WordTranslationResult


class TestBatchTranslateWords:
    """Tests for batch_translate_words function."""

    @patch("utils.responses_api.token_tracker")
    def test_successful_word_translation(self, mock_tracker, mock_conversation_manager):
        """Test successful word-by-word translation with conversation manager."""
        from pipeline.engine.word_translation import batch_translate_words

        mock_conversation_manager.continue_with_stage.return_value = {
            "success": True,
            "data": {
                "word_translations": [
                    {
                        "arabic": "مَرْحَبًا",
                        "english": "hello",
                        "pos": "interjection",
                        "essential": "مرحبا",
                        "essential_translation": "hello",
                        "notes": "A greeting",
                        "uncertainties": [],
                    }
                ]
            },
        }

        tashkeel_results = [TashkeelResult(tashkeel="مَرْحَبًا", uncertainties=[])]
        translation_results = [
            TranslationResult(
                translation="Hello",
                notes="Test",
                uncertainties=[],
                word_by_word=[],
            )
        ]

        result = batch_translate_words(
            sentences=["مرحبا"],
            tashkeel_results=tashkeel_results,
            translations=translation_results,
            conversation_manager=mock_conversation_manager,
        )

        assert len(result) == 1
        assert isinstance(result[0], WordTranslationResult)
        assert len(result[0].word_translations) == 1
        assert result[0].word_translations[0].arabic == "مَرْحَبًا"
        mock_tracker.set_phase.assert_called_with("Word-by-Word Translation")

    @patch("utils.responses_api.token_tracker")
    def test_word_translation_with_semantic_context(
        self, mock_tracker, mock_conversation_manager
    ):
        """Test that surrounding sentences provide semantic context."""
        from pipeline.engine.word_translation import batch_translate_words

        mock_conversation_manager.continue_with_stage.return_value = {
            "success": True,
            "data": {
                "word_translations": [
                    {
                        "arabic": "الْكِتَابِ",
                        "english": "the book",
                        "pos": "noun",
                        "essential": "كتاب",
                        "essential_translation": "book",
                        "notes": "",
                        "uncertainties": [],
                    }
                ]
            },
        }

        tashkeel_results = [TashkeelResult(tashkeel="الْكِتَابِ", uncertainties=[])]
        translation_results = [
            TranslationResult(
                translation="The book",
                notes="",
                uncertainties=[],
                word_by_word=[],
            )
        ]

        # Provide all_sentences and indices for context
        all_sentences = [
            "هذا الكتاب",
            "الكتاب الجديد",  # This is the sentence being translated
            "الكتاب القديم",
        ]

        result = batch_translate_words(
            sentences=["الكتاب الجديد"],
            tashkeel_results=tashkeel_results,
            translations=translation_results,
            all_sentences=all_sentences,
            indices=[1],
            conversation_manager=mock_conversation_manager,
        )

        assert len(result) == 1
        # Verify context was passed to the API
        call_args = mock_conversation_manager.continue_with_stage.call_args
        message = call_args[0][0]
        assert "Context from surrounding sentences" in message

    @patch("pipeline.engine.word_translation.time.sleep")
    @patch("utils.responses_api.token_tracker")
    def test_missing_conversation_manager_raises_error(self, mock_tracker, mock_sleep):
        """Test that missing conversation manager raises error after retries."""
        from pipeline.engine.word_translation import batch_translate_words

        tashkeel_results = [TashkeelResult(tashkeel="مَرْحَبًا", uncertainties=[])]
        translation_results = [
            TranslationResult(
                translation="Hello",
                notes="",
                uncertainties=[],
                word_by_word=[],
            )
        ]

        # The RuntimeError is caught and retried, so we get "after 3 attempts" error
        with pytest.raises(Exception, match="after 3 attempts"):
            batch_translate_words(
                sentences=["مرحبا"],
                tashkeel_results=tashkeel_results,
                translations=translation_results,
                conversation_manager=None,
            )

    @patch("pipeline.engine.word_translation.time.sleep")
    @patch("utils.responses_api.token_tracker")
    def test_conversation_manager_without_response_id_raises_error(
        self, mock_tracker, mock_sleep, mock_conversation_manager
    ):
        """Test error when conversation_manager has no current_response_id."""
        from pipeline.engine.word_translation import batch_translate_words

        mock_conversation_manager.current_response_id = None

        tashkeel_results = [TashkeelResult(tashkeel="مَرْحَبًا", uncertainties=[])]
        translation_results = [
            TranslationResult(
                translation="Hello",
                notes="",
                uncertainties=[],
                word_by_word=[],
            )
        ]

        # The RuntimeError is caught and retried, so we get "after 3 attempts" error
        with pytest.raises(Exception, match="after 3 attempts"):
            batch_translate_words(
                sentences=["مرحبا"],
                tashkeel_results=tashkeel_results,
                translations=translation_results,
                conversation_manager=mock_conversation_manager,
            )

    @patch("pipeline.engine.word_translation.time.sleep")
    @patch("utils.responses_api.token_tracker")
    def test_retry_on_failure(
        self, mock_tracker, mock_sleep, mock_conversation_manager
    ):
        """Test that translation retries up to max_retries on failure."""
        from pipeline.engine.word_translation import batch_translate_words

        # First 2 calls fail, third succeeds
        mock_conversation_manager.continue_with_stage.side_effect = [
            Exception("Temporary failure 1"),
            Exception("Temporary failure 2"),
            {
                "success": True,
                "data": {
                    "word_translations": [
                        {
                            "arabic": "مَرْحَبًا",
                            "english": "hello",
                            "pos": "interjection",
                            "essential": "مرحبا",
                            "essential_translation": "hello",
                            "notes": "",
                            "uncertainties": [],
                        }
                    ]
                },
            },
        ]

        tashkeel_results = [TashkeelResult(tashkeel="مَرْحَبًا", uncertainties=[])]
        translation_results = [
            TranslationResult(
                translation="Hello",
                notes="",
                uncertainties=[],
                word_by_word=[],
            )
        ]

        result = batch_translate_words(
            sentences=["مرحبا"],
            tashkeel_results=tashkeel_results,
            translations=translation_results,
            conversation_manager=mock_conversation_manager,
        )

        assert len(result) == 1
        assert mock_conversation_manager.continue_with_stage.call_count == 3
        assert mock_sleep.call_count == 2  # Sleep between retries

    @patch("pipeline.engine.word_translation.time.sleep")
    @patch("utils.responses_api.token_tracker")
    def test_max_retries_exceeded_raises_error(
        self, mock_tracker, mock_sleep, mock_conversation_manager
    ):
        """Test that exceeding max_retries raises Exception."""
        from pipeline.engine.word_translation import batch_translate_words

        # All calls fail
        mock_conversation_manager.continue_with_stage.side_effect = Exception(
            "Persistent failure"
        )

        tashkeel_results = [TashkeelResult(tashkeel="مَرْحَبًا", uncertainties=[])]
        translation_results = [
            TranslationResult(
                translation="Hello",
                notes="",
                uncertainties=[],
                word_by_word=[],
            )
        ]

        with pytest.raises(Exception, match="after 3 attempts"):
            batch_translate_words(
                sentences=["مرحبا"],
                tashkeel_results=tashkeel_results,
                translations=translation_results,
                conversation_manager=mock_conversation_manager,
            )

    @patch("utils.responses_api.token_tracker")
    def test_missing_essential_field_raises_error(
        self, mock_tracker, mock_conversation_manager
    ):
        """Test that missing 'essential' field in word data raises ValueError."""
        from pipeline.engine.word_translation import batch_translate_words

        mock_conversation_manager.continue_with_stage.return_value = {
            "success": True,
            "data": {
                "word_translations": [
                    {
                        "arabic": "مَرْحَبًا",
                        "english": "hello",
                        "pos": "interjection",
                        # Missing 'essential' field
                        "essential_translation": "hello",
                        "notes": "",
                        "uncertainties": [],
                    }
                ]
            },
        }

        tashkeel_results = [TashkeelResult(tashkeel="مَرْحَبًا", uncertainties=[])]
        translation_results = [
            TranslationResult(
                translation="Hello",
                notes="",
                uncertainties=[],
                word_by_word=[],
            )
        ]

        with pytest.raises(Exception, match="after 3 attempts"):
            batch_translate_words(
                sentences=["مرحبا"],
                tashkeel_results=tashkeel_results,
                translations=translation_results,
                conversation_manager=mock_conversation_manager,
            )

    @patch("utils.responses_api.token_tracker")
    def test_word_translation_validates_pos_types(
        self, mock_tracker, mock_conversation_manager
    ):
        """Test that various POS types are correctly handled."""
        from pipeline.engine.word_translation import batch_translate_words

        # Test with preposition - allows identical arabic/essential
        mock_conversation_manager.continue_with_stage.return_value = {
            "success": True,
            "data": {
                "word_translations": [
                    {
                        "arabic": "فِي",
                        "english": "in",
                        "pos": "preposition",
                        "essential": "فِي",  # Same as arabic - allowed for preposition
                        "essential_translation": "in",
                        "notes": "",
                        "uncertainties": [],
                    }
                ]
            },
        }

        tashkeel_results = [TashkeelResult(tashkeel="فِي", uncertainties=[])]
        translation_results = [
            TranslationResult(
                translation="In",
                notes="",
                uncertainties=[],
                word_by_word=[],
            )
        ]

        result = batch_translate_words(
            sentences=["في"],
            tashkeel_results=tashkeel_results,
            translations=translation_results,
            conversation_manager=mock_conversation_manager,
        )

        assert len(result) == 1
        assert result[0].word_translations[0].pos == "preposition"

    @patch("utils.responses_api.token_tracker")
    def test_empty_word_translations_raises_error(
        self, mock_tracker, mock_conversation_manager
    ):
        """Test that empty word_translations list raises RuntimeError."""
        from pipeline.engine.word_translation import batch_translate_words

        mock_conversation_manager.continue_with_stage.return_value = {
            "success": True,
            "data": {"word_translations": []},
        }

        tashkeel_results = [TashkeelResult(tashkeel="مَرْحَبًا", uncertainties=[])]
        translation_results = [
            TranslationResult(
                translation="Hello",
                notes="",
                uncertainties=[],
                word_by_word=[],
            )
        ]

        with pytest.raises(Exception, match="after 3 attempts"):
            batch_translate_words(
                sentences=["مرحبا"],
                tashkeel_results=tashkeel_results,
                translations=translation_results,
                conversation_manager=mock_conversation_manager,
            )

    @patch("utils.responses_api.token_tracker")
    def test_result_count_mismatch_raises_error(
        self, mock_tracker, mock_conversation_manager
    ):
        """Test RuntimeError when results don't match sentence count."""
        from pipeline.engine.word_translation import batch_translate_words

        # Only return result for first sentence
        mock_conversation_manager.continue_with_stage.side_effect = [
            {
                "success": True,
                "data": {
                    "word_translations": [
                        {
                            "arabic": "مَرْحَبًا",
                            "english": "hello",
                            "pos": "interjection",
                            "essential": "مرحبا",
                            "essential_translation": "hello",
                            "notes": "",
                            "uncertainties": [],
                        }
                    ]
                },
            },
            {
                "success": True,
                "data": {"word_translations": []},  # Empty for second
            },
        ]

        tashkeel_results = [
            TashkeelResult(tashkeel="مَرْحَبًا", uncertainties=[]),
            TashkeelResult(tashkeel="شُكْرًا", uncertainties=[]),
        ]
        translation_results = [
            TranslationResult(
                translation="Hello",
                notes="",
                uncertainties=[],
                word_by_word=[],
            ),
            TranslationResult(
                translation="Thank you",
                notes="",
                uncertainties=[],
                word_by_word=[],
            ),
        ]

        with pytest.raises(Exception):
            batch_translate_words(
                sentences=["مرحبا", "شكرا"],
                tashkeel_results=tashkeel_results,
                translations=translation_results,
                conversation_manager=mock_conversation_manager,
            )

    @patch("utils.responses_api.token_tracker")
    def test_english_options_list_format(self, mock_tracker, mock_conversation_manager):
        """Test handling of english_options as a list."""
        from pipeline.engine.word_translation import batch_translate_words

        mock_conversation_manager.continue_with_stage.return_value = {
            "success": True,
            "data": {
                "word_translations": [
                    {
                        "arabic": "كِتَاب",
                        "english_options": ["book", "tome"],
                        "pos": "noun",
                        "essential": "كتاب",
                        "essential_translation_options": ["book", "tome"],
                        "notes": "",
                        "uncertainties": [],
                    }
                ]
            },
        }

        tashkeel_results = [TashkeelResult(tashkeel="كِتَاب", uncertainties=[])]
        translation_results = [
            TranslationResult(
                translation="Book",
                notes="",
                uncertainties=[],
                word_by_word=[],
            )
        ]

        result = batch_translate_words(
            sentences=["كتاب"],
            tashkeel_results=tashkeel_results,
            translations=translation_results,
            conversation_manager=mock_conversation_manager,
        )

        assert len(result) == 1
        # english should be the list
        assert result[0].word_translations[0].english == ["book", "tome"]

    @patch("utils.responses_api.token_tracker")
    def test_token_tracker_phase_set(self, mock_tracker, mock_conversation_manager):
        """Test that token_tracker.set_phase is called correctly."""
        from pipeline.engine.word_translation import batch_translate_words

        mock_conversation_manager.continue_with_stage.return_value = {
            "success": True,
            "data": {
                "word_translations": [
                    {
                        "arabic": "مَرْحَبًا",
                        "english": "hello",
                        "pos": "interjection",
                        "essential": "مرحبا",
                        "essential_translation": "hello",
                        "notes": "",
                        "uncertainties": [],
                    }
                ]
            },
        }

        tashkeel_results = [TashkeelResult(tashkeel="مَرْحَبًا", uncertainties=[])]
        translation_results = [
            TranslationResult(
                translation="Hello",
                notes="",
                uncertainties=[],
                word_by_word=[],
            )
        ]

        batch_translate_words(
            sentences=["مرحبا"],
            tashkeel_results=tashkeel_results,
            translations=translation_results,
            conversation_manager=mock_conversation_manager,
        )

        mock_tracker.set_phase.assert_called_with("Word-by-Word Translation")
