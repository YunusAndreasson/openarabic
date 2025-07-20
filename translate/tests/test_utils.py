"""Tests for utility functions."""

import pytest

from translate.utils.text_utils import (
    filter_arabic_words,
    get_optimized_context,
)
from translate.utils.validation import (
    TranslationValidationError,
    validate_translation_results,
)


class TestTextUtils:
    """Test text utility functions."""

    def test_filter_arabic_words(self):
        """Test Arabic word filtering."""
        text = "مرحبا بالعالم هذا نص تجريبي"
        words = filter_arabic_words(text)
        assert len(words) > 0
        assert all(isinstance(word, str) for word in words)
        assert all(len(word) > 0 for word in words)

    def test_get_optimized_context(self):
        """Test context optimization."""
        sentences = [
            "مرحبا بالعالم",
            "هذا نص تجريبي",
            "لاختبار الترجمة",
        ]
        context = get_optimized_context(sentences, 1)
        assert context is not None
        assert isinstance(context, str)

    def test_get_optimized_context_edge_cases(self):
        """Test context optimization edge cases."""
        # Empty sentences
        context = get_optimized_context([], 0)
        assert context is None

        # Single sentence
        context = get_optimized_context(["مرحبا"], 0)
        assert context == "No surrounding context available."

        # Index out of bounds
        context = get_optimized_context(["مرحبا", "بالعالم"], 5)
        assert context is None


class TestValidation:
    """Test validation functions."""

    def test_validate_translation_results_success(self):
        """Test successful validation."""
        original_sentences = ["مرحبا", "بالعالم"]
        results = [
            {"translation": "Hello"},
            {"translation": "world"},
        ]
        # Should not raise an exception
        validate_translation_results(original_sentences, results, "Test")

    def test_validate_translation_results_count_mismatch(self):
        """Test validation with count mismatch."""
        original_sentences = ["مرحبا", "بالعالم"]
        results = [{"translation": "Hello"}]  # Missing one result

        with pytest.raises(TranslationValidationError):
            validate_translation_results(original_sentences, results, "Test")

    def test_validate_translation_results_invalid_format(self):
        """Test validation with invalid result format."""
        original_sentences = ["مرحبا"]
        results = [{"translation": "[Translation Error] test"}]  # Contains error marker

        with pytest.raises(TranslationValidationError):
            validate_translation_results(original_sentences, results, "Test")

    def test_validate_translation_results_missing_translation(self):
        """Test validation with missing translation field."""
        original_sentences = ["مرحبا"]
        results = [{"translation": ""}]  # Empty translation

        # This should not raise an error as empty translations are allowed
        validate_translation_results(original_sentences, results, "Test")

        # Test with very short translation that should trigger validation
        results = [{"translation": "a"}]  # Too short

        with pytest.raises(TranslationValidationError):
            validate_translation_results(original_sentences, results, "Test")
