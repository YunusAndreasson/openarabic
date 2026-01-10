"""Tests for translation_engine.py pure helper functions."""

import pytest

from data.models import TashkeelResult, TranslationResult, Uncertainty, WordTranslation
from pipeline.engine import (
    _extract_response_data,
    _extract_tashkeel_data,
    _get_tashkeel_data,
    _get_translation_data,
    _handle_arabic_processing_error,
    _sanitize_refinement_data,
    _sanitize_word_translation_data,
    _validate_uncertainties,
    _validate_word_data,
)


class TestExtractResponseData:
    """Tests for _extract_response_data function."""

    def test_success_response_with_data(self):
        """Test extracting data from successful response."""
        response = {
            "success": True,
            "data": {"translation": "Hello", "notes": "Greeting"},
        }
        result = _extract_response_data(response)
        assert result == {"translation": "Hello", "notes": "Greeting"}

    def test_failed_response_returns_none(self):
        """Test that failed response returns None."""
        response = {"success": False, "error": "API error"}
        result = _extract_response_data(response)
        assert result is None

    def test_missing_success_field_returns_none(self):
        """Test that missing success field returns None."""
        response = {"data": {"translation": "Hello"}}
        result = _extract_response_data(response)
        assert result is None

    def test_success_but_missing_data_returns_none(self):
        """Test that success=True but missing data returns None."""
        response = {"success": True}
        result = _extract_response_data(response)
        assert result is None


class TestExtractTashkeelData:
    """Tests for _extract_tashkeel_data function."""

    def test_response_api_format(self):
        """Test extracting from Response API format."""
        response = {
            "data": {
                "tashkeel": "مَرْحَباً",
                "uncertainties": [{"word": "مرحبا", "reason": "test"}],
            }
        }
        result = _extract_tashkeel_data(response)
        assert result["tashkeel"] == "مَرْحَباً"
        assert len(result["uncertainties"]) == 1

    def test_direct_format(self):
        """Test extracting from direct format."""
        response = {
            "tashkeel": "كِتَاب",
            "uncertainties": [],
        }
        result = _extract_tashkeel_data(response)
        assert result["tashkeel"] == "كِتَاب"
        assert result["uncertainties"] == []

    def test_response_api_format_missing_uncertainties(self):
        """Test Response API format with missing uncertainties defaults to empty list."""
        response = {"data": {"tashkeel": "نَعَم"}}
        result = _extract_tashkeel_data(response)
        assert result["tashkeel"] == "نَعَم"
        assert result["uncertainties"] == []

    def test_invalid_format_returns_none(self):
        """Test that invalid format returns None."""
        response = {"translation": "hello"}  # No tashkeel field
        result = _extract_tashkeel_data(response)
        assert result is None

    def test_non_dict_returns_none(self):
        """Test that non-dict input returns None."""
        result = _extract_tashkeel_data("not a dict")  # type: ignore[arg-type]
        assert result is None


class TestValidateWordData:
    """Tests for _validate_word_data function."""

    def test_valid_word_with_all_fields(self):
        """Test validation with all fields present."""
        word_data = {
            "arabic": "يَكْتُب",
            "english": "writes",
            "pos": "verb",
            "essential": "كَتَب",
            "essential_translation": "to write",
            "notes": "Present tense",
            "uncertainties": [],
        }
        result = _validate_word_data(word_data)
        assert result["arabic"] == "يَكْتُب"
        assert result["english_options"] == ["writes"]
        assert result["essential"] == "كَتَب"
        assert result["essential_translation_options"] == ["to write"]

    def test_english_options_list_format(self):
        """Test with english_options as list."""
        word_data = {
            "arabic": "كِتَاب",
            "english_options": ["book", "tome"],
            "pos": "noun",
            "essential": "كتب",
            "essential_translation_options": ["book"],
        }
        result = _validate_word_data(word_data)
        assert result["english_options"] == ["book", "tome"]

    def test_missing_essential_raises_error(self):
        """Test that missing essential field raises ValueError."""
        word_data = {
            "arabic": "كِتَاب",
            "english": "book",
            "pos": "noun",
            # Missing essential
        }
        with pytest.raises(ValueError, match="Missing 'essential' field"):
            _validate_word_data(word_data)

    def test_empty_essential_raises_error(self):
        """Test that empty essential field raises ValueError."""
        word_data = {
            "arabic": "كِتَاب",
            "english": "book",
            "pos": "noun",
            "essential": "",
        }
        with pytest.raises(ValueError, match="Missing 'essential' field"):
            _validate_word_data(word_data)

    def test_preposition_allows_identical_arabic_essential(self):
        """Test that prepositions allow identical arabic/essential."""
        word_data = {
            "arabic": "فِي",
            "english": "in",
            "pos": "preposition",
            "essential": "فِي",  # Same as arabic
        }
        result = _validate_word_data(word_data)
        assert result["essential"] == "فِي"

    def test_pronoun_allows_identical_fields(self):
        """Test that pronouns allow identical arabic/essential."""
        word_data = {
            "arabic": "هُوَ",
            "english": "he",
            "pos": "pronoun",
            "essential": "هُوَ",
        }
        result = _validate_word_data(word_data)
        assert result["essential"] == "هُوَ"

    def test_verb_allows_identical_fields(self):
        """Test that verbs allow identical arabic/essential."""
        word_data = {
            "arabic": "بَاعَ",
            "english": "sold",
            "pos": "verb",
            "essential": "بَاعَ",
        }
        result = _validate_word_data(word_data)
        assert result["essential"] == "بَاعَ"

    def test_non_dict_returns_empty(self):
        """Test that non-dict input returns empty dict."""
        result = _validate_word_data("not a dict")  # type: ignore[arg-type]
        assert result == {}

    def test_invalid_english_options_format(self):
        """Test that invalid english_options format is cleaned."""
        word_data = {
            "arabic": "كِتَاب",
            "english_options": [123, "book"],  # Invalid mixed types
            "pos": "noun",
            "essential": "كتب",
        }
        result = _validate_word_data(word_data)
        assert result["english_options"] == []

    def test_missing_pos_defaults_to_unknown(self):
        """Test that missing POS defaults to 'unknown'."""
        word_data = {
            "arabic": "كِتَاب",
            "english": "book",
            "essential": "كتب",
        }
        result = _validate_word_data(word_data)
        assert result["pos"] == "unknown"


class TestGetTranslationData:
    """Tests for _get_translation_data function."""

    def test_translation_result_object(self):
        """Test extracting from TranslationResult object."""
        obj = TranslationResult(
            translation="Hello world",
            notes="Test",
            uncertainties=[],
            word_by_word=[],
        )
        translation, uncertainties = _get_translation_data(obj)
        assert translation == "Hello world"
        assert uncertainties == []

    def test_dict_format(self):
        """Test extracting from dict."""
        obj = {
            "translation": "Hello",
            "uncertainties": [{"text": "test", "reason": "reason"}],
        }
        translation, uncertainties = _get_translation_data(obj)
        assert translation == "Hello"
        assert len(uncertainties) == 1

    def test_missing_fields_in_dict(self):
        """Test dict with missing fields returns defaults."""
        obj: dict[str, str] = {}
        translation, uncertainties = _get_translation_data(obj)
        assert translation == ""
        assert uncertainties == []


class TestGetTashkeelData:
    """Tests for _get_tashkeel_data function."""

    def test_tashkeel_result_object(self):
        """Test extracting from TashkeelResult object."""
        obj = TashkeelResult(
            tashkeel="مَرْحَباً بِالْعَالَمِ",
            uncertainties=[],
        )
        tashkeel, uncertainties = _get_tashkeel_data(obj)
        assert tashkeel == "مَرْحَباً بِالْعَالَمِ"
        assert uncertainties == []

    def test_dict_format(self):
        """Test extracting from dict."""
        obj = {
            "tashkeel": "كِتَاب",
            "uncertainties": [],
        }
        tashkeel, _uncertainties = _get_tashkeel_data(obj)
        assert tashkeel == "كِتَاب"

    def test_missing_fields_in_dict(self):
        """Test dict with missing fields returns defaults."""
        obj: dict[str, str] = {}
        tashkeel, uncertainties = _get_tashkeel_data(obj)
        assert tashkeel == ""
        assert uncertainties == []


class TestValidateUncertainties:
    """Tests for _validate_uncertainties function."""

    def test_standard_dict_format(self):
        """Test standard format with text and reason."""
        uncertainties = [
            {"text": "some text", "reason": "some reason", "word": "word1"}
        ]
        result = _validate_uncertainties(uncertainties)
        assert len(result) == 1
        assert result[0].text == "some text"
        assert result[0].reason == "some reason"
        assert result[0].word == "word1"

    def test_tashkeel_format(self):
        """Test tashkeel format with word and reason."""
        uncertainties = [{"word": "مرحبا", "reason": "unclear diacritics"}]
        result = _validate_uncertainties(uncertainties)
        assert len(result) == 1
        assert result[0].word == "مرحبا"
        assert result[0].reason == "unclear diacritics"
        assert result[0].text == "unknown"

    def test_minimal_format(self):
        """Test minimal format with just reason."""
        uncertainties = [{"reason": "general uncertainty"}]
        result = _validate_uncertainties(uncertainties)
        assert len(result) == 1
        assert result[0].reason == "general uncertainty"

    def test_string_uncertainty(self):
        """Test string uncertainty is converted properly."""
        uncertainties = ["This is an uncertainty string"]
        result = _validate_uncertainties(uncertainties)
        assert len(result) == 1
        assert result[0].reason == "This is an uncertainty string"
        assert result[0].text == "unknown"

    def test_existing_uncertainty_object(self):
        """Test that existing Uncertainty objects are preserved."""
        original = Uncertainty(
            text="test",
            reason="test reason",
            word="word",
            type="type",
            step="step",
            resolution="resolved",
            explanation="explained",
            related_translation_uncertainty="related",
            original_uncertainty="original",
            reason_unresolved="none",
        )
        uncertainties = [original]
        result = _validate_uncertainties(uncertainties)
        assert len(result) == 1
        assert result[0] is original

    def test_invalid_items_skipped(self):
        """Test that invalid items are skipped."""
        uncertainties = [
            {"text": "valid", "reason": "valid"},
            123,  # Invalid: not dict, string, or Uncertainty
            None,  # Invalid
            {"text": "another valid", "reason": "valid"},
        ]
        result = _validate_uncertainties(uncertainties)
        assert len(result) == 2

    def test_empty_list(self):
        """Test empty list returns empty list."""
        result = _validate_uncertainties([])
        assert result == []

    def test_dict_missing_reason_skipped(self):
        """Test dict without reason is skipped."""
        uncertainties = [{"text": "no reason field"}]
        result = _validate_uncertainties(uncertainties)
        assert len(result) == 0


class TestSanitizeRefinementData:
    """Tests for _sanitize_refinement_data function."""

    def test_valid_refinement_data(self):
        """Test sanitization with valid data."""
        item = {
            "improved_tashkeel": "  مَرْحَباً  ",
            "improved_translation": "  Hello  ",
            "improved_word_translations": [],
            "resolved_uncertainties": [],
            "remaining_uncertainties": [],
            "changes_made": ["Fixed tashkeel", "Updated translation"],
        }
        result = _sanitize_refinement_data(item)
        assert result["improved_tashkeel"] == "مَرْحَباً"
        assert result["improved_translation"] == "Hello"
        assert result["changes_made"] == ["Fixed tashkeel", "Updated translation"]

    def test_empty_fields(self):
        """Test sanitization with empty/missing fields."""
        item: dict[str, str] = {}
        result = _sanitize_refinement_data(item)
        assert result["improved_tashkeel"] == ""
        assert result["improved_translation"] == ""
        assert result["improved_word_translations"] == []
        assert result["resolved_uncertainties"] == []
        assert result["remaining_uncertainties"] == []
        assert result["changes_made"] == []

    def test_none_values_handled(self):
        """Test None values are handled gracefully."""
        item = {
            "improved_tashkeel": None,
            "improved_translation": None,
            "changes_made": None,
        }
        result = _sanitize_refinement_data(item)
        assert result["improved_tashkeel"] == ""
        assert result["improved_translation"] == ""
        assert result["changes_made"] == []

    def test_word_translations_sanitized(self):
        """Test that word translations are sanitized."""
        item = {
            "improved_word_translations": [
                {
                    "arabic": "كِتَاب",
                    "english": "book",
                    "pos": "noun",
                    "essential": "كتب",
                    "essential_translation": "book",
                }
            ]
        }
        result = _sanitize_refinement_data(item)
        assert len(result["improved_word_translations"]) == 1
        assert isinstance(result["improved_word_translations"][0], WordTranslation)

    def test_existing_word_translation_objects_preserved(self):
        """Test that existing WordTranslation objects are preserved."""
        wt = WordTranslation(
            arabic="كِتَاب",
            english="book",
            pos="noun",
            essential="كتب",
            essential_translation="book",
            notes=None,
            uncertainties=[],
        )
        item = {"improved_word_translations": [wt]}
        result = _sanitize_refinement_data(item)
        assert result["improved_word_translations"][0] is wt

    def test_changes_made_non_list_handled(self):
        """Test non-list changes_made is handled."""
        item = {"changes_made": "single change"}
        result = _sanitize_refinement_data(item)
        assert result["changes_made"] == []


class TestSanitizeWordTranslationData:
    """Tests for _sanitize_word_translation_data function."""

    def test_valid_word_translation(self):
        """Test sanitization of valid word translation data."""
        wt_data = {
            "arabic": "  كِتَاب  ",
            "english": "  book  ",
            "pos": "noun",
            "essential": "  كتب  ",
            "essential_translation": "book",
            "notes": "  A common noun  ",
        }
        result = _sanitize_word_translation_data(wt_data)
        assert result.arabic == "كِتَاب"
        assert result.english == "book"
        assert result.essential == "كتب"
        assert result.notes == "A common noun"

    def test_list_english_extracts_first(self):
        """Test that list english extracts first element."""
        wt_data = {
            "arabic": "كِتَاب",
            "english": ["book", "tome", "volume"],
            "pos": "noun",
            "essential": "كتب",
            "essential_translation": ["book"],
        }
        result = _sanitize_word_translation_data(wt_data)
        assert result.english == "book"
        assert result.essential_translation == "book"

    def test_empty_list_english_raises_validation_error(self):
        """Test empty list english raises validation error."""
        from pydantic import ValidationError

        wt_data = {
            "arabic": "كِتَاب",
            "english": [],  # Empty list
            "pos": "noun",
            "essential": "كتب",
            "essential_translation": [],  # Empty list
        }
        # WordTranslation requires non-empty english and essential_translation
        with pytest.raises(ValidationError):
            _sanitize_word_translation_data(wt_data)

    def test_invalid_pos_defaults_to_noun(self):
        """Test that invalid POS defaults to NOUN."""
        wt_data = {
            "arabic": "كِتَاب",
            "english": "book",
            "pos": "invalid_pos_type",
            "essential": "كتب",
            "essential_translation": "book",
        }
        result = _sanitize_word_translation_data(wt_data)
        # Check against the enum name since use_enum_values=True
        from data.enums import PartOfSpeech

        assert result.pos == PartOfSpeech.NOUN.value

    def test_missing_essential_falls_back_to_arabic(self):
        """Test that missing essential falls back to arabic."""
        wt_data = {
            "arabic": "كِتَاب",
            "english": "book",
            "pos": "noun",
            "essential": "",  # Empty - will fall back to arabic
            "essential_translation": "book",
        }
        result = _sanitize_word_translation_data(wt_data)
        # The function sets essential = arabic.strip() when essential is empty
        assert result.essential == "كِتَاب"

    def test_none_notes_handled(self):
        """Test that None notes is handled."""
        wt_data = {
            "arabic": "كِتَاب",
            "english": "book",
            "pos": "noun",
            "essential": "كتب",
            "essential_translation": "book",
            "notes": None,
        }
        result = _sanitize_word_translation_data(wt_data)
        assert result.notes is None

    def test_uncertainties_validated(self):
        """Test that uncertainties are validated."""
        wt_data = {
            "arabic": "كِتَاب",
            "english": "book",
            "pos": "noun",
            "essential": "كتب",
            "essential_translation": "book",
            "uncertainties": [{"text": "test", "reason": "reason"}],
        }
        result = _sanitize_word_translation_data(wt_data)
        assert len(result.uncertainties) == 1
        assert isinstance(result.uncertainties[0], Uncertainty)


class TestHandleArabicProcessingError:
    """Tests for _handle_arabic_processing_error function."""

    def test_short_text_logged(self, caplog):
        """Test that short text is logged correctly."""
        import logging

        with caplog.at_level(logging.ERROR):
            _handle_arabic_processing_error(
                "مرحبا",
                "translation",
                Exception("Unicode error"),
            )
        assert "Unicode/encoding issue" in caplog.text

    def test_long_text_truncated(self, caplog):
        """Test that long text is truncated in log."""
        import logging

        long_text = "مرحبا " * 20  # Long Arabic text
        with caplog.at_level(logging.ERROR):
            _handle_arabic_processing_error(
                long_text,
                "parsing",
                Exception("JSON parsing error"),
            )
        assert "..." in caplog.text
        assert "JSON parsing" in caplog.text

    def test_non_matching_error_no_log(self, caplog):
        """Test that non-matching errors don't log."""
        import logging

        with caplog.at_level(logging.ERROR):
            _handle_arabic_processing_error(
                "مرحبا",
                "test",
                Exception("Generic error"),
            )
        # Should not log anything for non-Unicode/non-JSON errors
        assert caplog.text == ""
