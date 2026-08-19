"""Behavioral tests for standalone word-by-word translation."""

from unittest.mock import patch

import pytest

from data.models import TashkeelResult, TranslationResult, WordTranslationResult


def _inputs(sentence: str = "مرحبا"):
    return (
        [sentence],
        [TashkeelResult(tashkeel="مَرْحَبًا", uncertainties=[])],
        [
            TranslationResult(
                translation="Hello", notes="", uncertainties=[], word_by_word=[]
            )
        ],
    )


def _response(**word_overrides):
    word = {
        "arabic": "مَرْحَبًا",
        "english": "hello",
        "pos": "interjection",
        "essential": "مرحبا",
        "essential_translation": "hello",
        "notes": "A greeting",
        "uncertainties": [],
    }
    word.update(word_overrides)
    return {"success": True, "data": {"word_translations": [word]}}


class TestBatchTranslateWords:
    @patch("pipeline.engine.word_translation.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_successful_word_translation(self, mock_tracker, mock_api):
        from pipeline.engine.word_translation import batch_translate_words

        mock_api.return_value = _response()
        result = batch_translate_words(*_inputs())

        assert len(result) == 1
        assert isinstance(result[0], WordTranslationResult)
        assert result[0].word_translations[0].arabic == "مَرْحَبًا"
        mock_tracker.set_phase.assert_called_once_with("Word-by-Word Translation")

    @patch("pipeline.engine.word_translation.call_response_api")
    def test_surrounding_sentences_are_semantic_context(self, mock_api):
        from pipeline.engine.word_translation import batch_translate_words

        mock_api.return_value = _response()
        batch_translate_words(
            *_inputs("الكتاب الجديد"),
            all_sentences=["هذا الكتاب", "الكتاب الجديد", "الكتاب القديم"],
            indices=[1],
        )

        prompt = mock_api.call_args.args[0][1]["content"]
        assert "Context from surrounding sentences" in prompt
        assert "هذا الكتاب" in prompt
        assert "الكتاب القديم" in prompt

    @patch("pipeline.engine.word_translation.time.sleep")
    @patch("pipeline.engine.word_translation.call_response_api")
    def test_retry_then_success(self, mock_api, mock_sleep):
        from pipeline.engine.word_translation import batch_translate_words

        mock_api.side_effect = [RuntimeError("one"), RuntimeError("two"), _response()]
        result = batch_translate_words(*_inputs())

        assert len(result) == 1
        assert mock_api.call_count == 3
        assert mock_sleep.call_count == 2

    @patch("pipeline.engine.word_translation.time.sleep")
    @patch("pipeline.engine.word_translation.call_response_api")
    def test_max_retries_raise(self, mock_api, mock_sleep):
        from pipeline.engine.word_translation import batch_translate_words

        mock_api.side_effect = RuntimeError("persistent")
        with pytest.raises(RuntimeError, match="after 3 attempts"):
            batch_translate_words(*_inputs())
        assert mock_api.call_count == 3
        assert mock_sleep.call_count == 2

    @patch("pipeline.engine.word_translation.time.sleep")
    @patch("pipeline.engine.word_translation.call_response_api")
    def test_missing_essential_field_is_rejected(self, mock_api, mock_sleep):
        from pipeline.engine.word_translation import batch_translate_words

        response = _response()
        del response["data"]["word_translations"][0]["essential"]
        mock_api.return_value = response
        with pytest.raises(RuntimeError, match="after 3 attempts"):
            batch_translate_words(*_inputs())
        assert mock_sleep.call_count == 2

    @patch("pipeline.engine.word_translation.call_response_api")
    def test_translation_option_lists_are_preserved(self, mock_api):
        from pipeline.engine.word_translation import batch_translate_words

        mock_api.return_value = _response(
            english=["hello", "welcome"],
            essential_translation=["hello", "welcome"],
        )
        word = batch_translate_words(*_inputs())[0].word_translations[0]
        assert word.english == ["hello", "welcome"]
        assert word.essential_translation == ["hello", "welcome"]

    @patch("pipeline.engine.word_translation.call_response_api")
    def test_empty_input_does_not_call_api(self, mock_api):
        from pipeline.engine.word_translation import batch_translate_words

        assert batch_translate_words([], [], []) == []
        mock_api.assert_not_called()
