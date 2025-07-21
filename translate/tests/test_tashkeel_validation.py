"""
Tests for tashkeel validation functionality.
"""

import pytest

from translate.data.models import TranslationValidationError
from translate.data.pipeline_types import TashkeelResult, TashkeelResults
from translate.utils.validation import validate_tashkeel_added


class TestTashkeelValidation:
    """Test cases for tashkeel validation."""

    def test_validate_tashkeel_added_success(self):
        """Test successful tashkeel validation when diacritics are added."""
        original_sentences = ["قال النبي", "في المسجد"]
        tashkeel_results: TashkeelResults = [
            TashkeelResult(tashkeel="قَالَ النَّبِيُّ", uncertainties=[]),
            TashkeelResult(tashkeel="فِي المَسْجِدِ", uncertainties=[]),
        ]

        # Should not raise an exception
        validate_tashkeel_added(original_sentences, tashkeel_results)

    def test_validate_tashkeel_added_failure(self):
        """Test tashkeel validation failure when no diacritics are added."""
        original_sentences = ["قال النبي", "في المسجد"]
        tashkeel_results: TashkeelResults = [
            TashkeelResult(
                tashkeel="قال النبي", uncertainties=[]
            ),  # No diacritics added
            TashkeelResult(
                tashkeel="في المسجد", uncertainties=[]
            ),  # No diacritics added
        ]

        with pytest.raises(TranslationValidationError) as exc_info:
            validate_tashkeel_added(original_sentences, tashkeel_results)

        error_message = str(exc_info.value)
        assert "Tashkeel validation failed" in error_message
        assert "2 sentences did not have tashkeel added" in error_message
        assert "Line 1: Original='قال النبي' -> Tashkeel='قال النبي'" in error_message
        assert "Line 2: Original='في المسجد' -> Tashkeel='في المسجد'" in error_message

    def test_validate_tashkeel_added_partial_failure(self):
        """Test tashkeel validation when some sentences have diacritics and others don't."""
        original_sentences = ["قال النبي", "في المسجد", "بسم الله"]
        tashkeel_results: TashkeelResults = [
            TashkeelResult(tashkeel="قَالَ النَّبِيُّ", uncertainties=[]),  # Diacritics added
            TashkeelResult(
                tashkeel="في المسجد", uncertainties=[]
            ),  # No diacritics added
            TashkeelResult(tashkeel="بِسْمِ اللَّهِ", uncertainties=[]),  # Diacritics added
        ]

        with pytest.raises(TranslationValidationError) as exc_info:
            validate_tashkeel_added(original_sentences, tashkeel_results)

        error_message = str(exc_info.value)
        assert "Tashkeel validation failed" in error_message
        assert "1 sentences did not have tashkeel added" in error_message
        assert "Line 2: Original='في المسجد' -> Tashkeel='في المسجد'" in error_message

    def test_validate_tashkeel_added_with_sentence_indices(self):
        """Test tashkeel validation with custom sentence indices."""
        original_sentences = ["قال النبي"]
        tashkeel_results: TashkeelResults = [
            TashkeelResult(
                tashkeel="قال النبي", uncertainties=[]
            ),  # No diacritics added
        ]
        sentence_indices = [5]  # Custom index

        with pytest.raises(TranslationValidationError) as exc_info:
            validate_tashkeel_added(
                original_sentences, tashkeel_results, sentence_indices
            )

        error_message = str(exc_info.value)
        assert (
            "Line 6: Original='قال النبي' -> Tashkeel='قال النبي'" in error_message
        )  # Index + 1

    def test_validate_tashkeel_added_original_has_diacritics(self):
        """Test tashkeel validation when original text already has some diacritics."""
        original_sentences = ["قَالَ النَّبِيُّ"]  # Already has some diacritics
        tashkeel_results: TashkeelResults = [
            TashkeelResult(
                tashkeel="قَالَ النَّبِيُّ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ", uncertainties=[]
            ),  # More diacritics added
        ]

        # Should not raise an exception (more diacritics added)
        validate_tashkeel_added(original_sentences, tashkeel_results)

    def test_validate_tashkeel_added_different_diacritics(self):
        """Test tashkeel validation when different diacritics are used."""
        original_sentences = ["قَالَ النَّبِيُّ"]  # Has some diacritics
        tashkeel_results: TashkeelResults = [
            TashkeelResult(tashkeel="قَالَ النَّبِيُّ", uncertainties=[]),  # Same diacritics
        ]

        # Should not raise an exception (same diacritics, but text is different)
        validate_tashkeel_added(original_sentences, tashkeel_results)

    def test_validate_tashkeel_added_empty_results(self):
        """Test tashkeel validation with empty results."""
        original_sentences = []
        tashkeel_results: TashkeelResults = []

        # Should not raise an exception
        validate_tashkeel_added(original_sentences, tashkeel_results)

    def test_validate_tashkeel_added_missing_tashkeel_field(self):
        """Test tashkeel validation when tashkeel field is missing."""
        original_sentences = ["قال النبي"]
        tashkeel_results: TashkeelResults = [
            TashkeelResult(tashkeel="", uncertainties=[]),  # Empty tashkeel
        ]

        with pytest.raises(TranslationValidationError) as exc_info:
            validate_tashkeel_added(original_sentences, tashkeel_results)

        error_message = str(exc_info.value)
        assert "Tashkeel validation failed" in error_message
        assert "Line 1: Original='قال النبي' -> Tashkeel=''" in error_message
