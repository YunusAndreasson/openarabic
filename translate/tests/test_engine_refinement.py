"""Behavioral tests for standalone translation refinement."""

from unittest.mock import patch

from data.models import (
    RefinementResult,
    TashkeelResult,
    TranslationResult,
    WordTranslation,
)


def _refinement_input(*, english: str | list[str] = "hello"):
    return [
        {
            "original": "مرحبا",
            "translation": TranslationResult(
                translation="Hello", notes="", uncertainties=[], word_by_word=[]
            ),
            "tashkeel": TashkeelResult(tashkeel="مَرْحَبًا", uncertainties=[]),
            "word_translations_options": [
                WordTranslation(
                    arabic="مَرْحَبًا",
                    english=english,
                    pos="interjection",
                    essential="مرحبا",
                    essential_translation=["hello", "welcome"],
                    notes="A greeting",
                    uncertainties=[],
                )
            ],
            "previous_uncertainties": {"translation": [], "tashkeel": []},
        }
    ]


def _response(translation: str = "Hello"):
    return {
        "success": True,
        "data": {
            "improved_tashkeel": "مَرْحَبًا",
            "improved_translation": translation,
            "improved_word_translations": [],
            "resolved_uncertainties": [],
            "remaining_uncertainties": [],
            "changes_made": ["Verified translation"],
        },
    }


class TestBatchRefineTranslations:
    @patch("pipeline.engine.refinement.call_response_api")
    @patch("utils.responses_api.token_tracker")
    def test_successful_refinement(self, mock_tracker, mock_api):
        from pipeline.engine.refinement import batch_refine_translations

        mock_api.return_value = _response()
        result = batch_refine_translations(_refinement_input())

        assert result == [
            RefinementResult(
                improved_tashkeel="مَرْحَبًا",
                improved_translation="Hello",
                improved_word_translations=[],
                resolved_uncertainties=[],
                remaining_uncertainties=[],
                changes_made=["Verified translation"],
            )
        ]
        mock_tracker.set_phase.assert_called_once_with("Verification")
        mock_api.assert_called_once()

    @patch("pipeline.engine.refinement.call_response_api")
    def test_formats_word_options_in_prompt(self, mock_api):
        from pipeline.engine.refinement import batch_refine_translations

        mock_api.return_value = _response()
        batch_refine_translations(_refinement_input(english=["hello", "welcome"]))

        prompt = mock_api.call_args.kwargs["messages"][1]["content"]
        assert "English Options: [hello, welcome]" in prompt
        assert "Essential Options: [hello, welcome]" in prompt
        assert "POS: interjection" in prompt

    @patch("pipeline.engine.refinement.time.sleep")
    @patch("pipeline.engine.refinement.call_response_api")
    def test_invalid_response_retries_then_returns_explicit_fallback(
        self, mock_api, mock_sleep
    ):
        from pipeline.engine.refinement import batch_refine_translations

        mock_api.return_value = {"success": True, "data": []}
        result = batch_refine_translations(_refinement_input())

        assert len(result) == 1
        assert result[0].improved_translation == ""
        assert result[0].changes_made == [
            "Refinement failed: No refinement data returned for sentence 0"
        ]
        assert mock_api.call_count == 3
        assert mock_sleep.call_count == 2

    @patch("pipeline.engine.refinement.call_response_api")
    def test_direct_response_is_supported_and_sanitized(self, mock_api):
        from pipeline.engine.refinement import batch_refine_translations

        mock_api.return_value = {
            "improved_tashkeel": "  مَرْحَبًا  ",
            "improved_translation": "  Hello  ",
            "improved_word_translations": [],
            "resolved_uncertainties": [],
            "remaining_uncertainties": [],
            "changes_made": [],
        }
        result = batch_refine_translations(_refinement_input())

        assert result[0].improved_tashkeel == "مَرْحَبًا"
        assert result[0].improved_translation == "Hello"

    @patch("pipeline.engine.refinement.call_response_api")
    def test_empty_input_does_not_call_api(self, mock_api):
        from pipeline.engine.refinement import batch_refine_translations

        assert batch_refine_translations([]) == []
        mock_api.assert_not_called()
