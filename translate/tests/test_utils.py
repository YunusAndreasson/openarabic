"""Tests for utility functions."""

import pytest

from data.models import SentenceTranslation, WordTranslation
from utils.text_utils import (
    filter_arabic_words,
    get_optimized_context,
)
from utils.validation import (
    TranslationValidationError,
    validate_final_translation,
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

    def test_validate_translation_results_alternative_translation_key(self):
        """Test validation with 't' key instead of 'translation'."""
        original_sentences = ["مرحبا"]
        results = [{"t": "Hello"}]  # Using 't' key

        # Should not raise an exception
        validate_translation_results(original_sentences, results, "Test")

    def test_validate_translation_results_format_error(self):
        """Test validation with format error marker."""
        original_sentences = ["مرحبا"]
        results = [{"translation": "[Format Error] test"}]

        with pytest.raises(TranslationValidationError):
            validate_translation_results(original_sentences, results, "Test")

    def test_validate_translation_results_batch_error(self):
        """Test validation with batch processing error marker."""
        original_sentences = ["مرحبا"]
        results = [{"translation": "[BATCH PROCESSING ERROR] test"}]

        with pytest.raises(TranslationValidationError):
            validate_translation_results(original_sentences, results, "Test")

    def test_validate_translation_results_word_options_check(self):
        """Test validation with word options check enabled."""
        original_sentences = ["مرحبا"]
        results = [
            {
                "translation": "Hello",
                "word_translations": [
                    {
                        "arabic": "مرحبا",
                        "english_options": ["hello", "hi"],
                        "essential": "مرحبا",
                        "essential_translation_options": ["hello", "hi"],
                    }
                ],
            }
        ]

        # Should not raise an exception
        validate_translation_results(
            original_sentences, results, "Test", check_word_options=True
        )

    def test_validate_translation_results_word_options_missing_arabic(self):
        """Test validation with missing Arabic text in word options."""
        original_sentences = ["مرحبا"]
        results = [
            {
                "translation": "Hello",
                "word_translations": [
                    {
                        "arabic": "",
                        "english_options": ["hello", "hi"],
                        "essential": "مرحبا",
                        "essential_translation_options": ["hello", "hi"],
                    }
                ],
            }
        ]

        with pytest.raises(TranslationValidationError):
            validate_translation_results(
                original_sentences, results, "Test", check_word_options=True
            )

    def test_validate_translation_results_word_options_missing_english(self):
        """Test validation with missing English options in word options."""
        original_sentences = ["مرحبا"]
        results = [
            {
                "translation": "Hello",
                "word_translations": [
                    {
                        "arabic": "مرحبا",
                        "english_options": [],
                        "essential": "مرحبا",
                        "essential_translation_options": ["hello", "hi"],
                    }
                ],
            }
        ]

        with pytest.raises(TranslationValidationError):
            validate_translation_results(
                original_sentences, results, "Test", check_word_options=True
            )

    def test_validate_translation_results_word_translations_check(self):
        """Test validation with word translations check enabled."""
        original_sentences = ["مرحبا"]
        results = [
            {
                "translation": "Hello",
                "word_by_word": [
                    {
                        "arabic": "مرحبا",
                        "english": "hello",
                        "essential": "مرحبا",
                        "essential_translation": "hello",
                    }
                ],
            }
        ]

        # Should not raise an exception
        validate_translation_results(
            original_sentences, results, "Test", check_word_translations=True
        )

    def test_validate_translation_results_word_translations_missing_arabic(self):
        """Test validation with missing Arabic text in word translations."""
        original_sentences = ["مرحبا"]
        results = [
            {
                "translation": "Hello",
                "word_by_word": [
                    {
                        "arabic": "",
                        "english": "hello",
                        "essential": "مرحبا",
                        "essential_translation": "hello",
                    }
                ],
            }
        ]

        with pytest.raises(TranslationValidationError):
            validate_translation_results(
                original_sentences, results, "Test", check_word_translations=True
            )

    def test_validate_translation_results_tashkeel_check(self):
        """Test validation with tashkeel check."""
        original_sentences = ["مرحبا"]
        results = [
            {
                "translation": "Hello",
                "tashkeel": "مرحبا",  # Same as original, no diacritics
            }
        ]

        with pytest.raises(TranslationValidationError):
            validate_translation_results(original_sentences, results, "Test")

    def test_validate_translation_results_tashkeel_with_diacritics(self):
        """Test validation with tashkeel that has diacritics."""
        original_sentences = ["مرحبا"]
        results = [
            {
                "translation": "Hello",
                "tashkeel": "مَرْحَباً",  # Has diacritics
            }
        ]

        # Should not raise an exception
        validate_translation_results(original_sentences, results, "Test")

    def test_validate_translation_results_tashkeel_original_has_diacritics(self):
        """Test validation when original has diacritics."""
        original_sentences = ["مَرْحَباً"]
        results = [
            {
                "translation": "Hello",
                "tashkeel": "مَرْحَباً",  # Same as original, but original has diacritics
            }
        ]

        # Should not raise an exception
        validate_translation_results(original_sentences, results, "Test")


class TestValidateFinalTranslation:
    """Test final translation validation."""

    def test_validate_final_translation_success(self):
        """Test successful final translation validation."""
        word_translations = [
            WordTranslation(
                arabic="مرحبا",
                english="hello",
                essential="مرحبا",
                essential_translation="hello",
            )
        ]

        translation = SentenceTranslation(
            index=0,
            original="مرحبا",
            full_translation="Hello",
            tashkeel="مَرْحَباً",
            word_by_word=word_translations,
        )

        issues = validate_final_translation(translation)
        assert issues == []

    def test_validate_final_translation_missing_full_translation(self):
        """Test validation with missing full translation."""
        translation = SentenceTranslation(
            index=0,
            original="مرحبا",
            full_translation="",
            tashkeel="مَرْحَباً",
            word_by_word=[],
        )

        issues = validate_final_translation(translation)
        assert "Missing full translation" in issues

    def test_validate_final_translation_missing_tashkeel(self):
        """Test validation with missing tashkeel."""
        translation = SentenceTranslation(
            index=0,
            original="مرحبا",
            full_translation="Hello",
            tashkeel="",
            word_by_word=[],
        )

        issues = validate_final_translation(translation)
        assert "Missing tashkeel text" in issues

    def test_validate_final_translation_error_marker(self):
        """Test validation with error marker in translation."""
        translation = SentenceTranslation(
            index=0,
            original="مرحبا",
            full_translation="[Translation Error] Hello",
            tashkeel="مَرْحَباً",
            word_by_word=[],
        )

        issues = validate_final_translation(translation)
        assert "Translation contains error marker" in issues

    def test_validate_final_translation_missing_word_translations(self):
        """Test validation with missing word translations."""
        translation = SentenceTranslation(
            index=0,
            original="مرحبا بالعالم",
            full_translation="Hello world",
            tashkeel="مَرْحَباً بِالْعَالَمِ",
            word_by_word=[],
        )

        issues = validate_final_translation(translation)
        assert "Missing word-by-word translations" in issues

    def test_validate_final_translation_word_count_mismatch(self):
        """Test validation with word count mismatch."""
        word_translations = [
            WordTranslation(
                arabic="مرحبا",
                english="hello",
                essential="مرحبا",
                essential_translation="hello",
            )
        ]

        translation = SentenceTranslation(
            index=0,
            original="مرحبا بالعالم هذا نص",  # 4 words
            full_translation="Hello world this text",
            tashkeel="مَرْحَباً بِالْعَالَمِ هَذَا نَصّ",
            word_by_word=word_translations,  # Only 1 word translation
        )

        issues = validate_final_translation(translation)
        assert any("Word translation count mismatch" in issue for issue in issues)

    def test_validate_final_translation_missing_word_fields(self):
        """Test validation with missing word fields."""
        word_translations = [
            WordTranslation(
                arabic="",
                english="hello",
                essential="مرحبا",
                essential_translation="hello",
            )
        ]

        translation = SentenceTranslation(
            index=0,
            original="مرحبا",
            full_translation="Hello",
            tashkeel="مَرْحَباً",
            word_by_word=word_translations,
        )

        issues = validate_final_translation(translation)
        assert "Word 0: Missing Arabic text" in issues
