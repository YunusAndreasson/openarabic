"""Tests for utility functions."""

import pytest

from data.models import (
    SentenceTranslation,
    TashkeelResult,
    TranslationResult,
    WordTranslation,
    WordTranslationResult,
)
from utils.text import (
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
            TranslationResult(
                translation="Hello",
                notes="Test translation",
                word_by_word=[],
                uncertainties=[],
            ),
            TranslationResult(
                translation="world",
                notes="Test translation",
                word_by_word=[],
                uncertainties=[],
            ),
        ]
        # Should not raise an exception
        validate_translation_results(original_sentences, results, "Test")

    def test_validate_translation_results_count_mismatch(self):
        """Test validation with count mismatch."""
        original_sentences = ["مرحبا", "بالعالم"]
        results = [
            TranslationResult(
                translation="Hello",
                notes="Test translation",
                word_by_word=[],
                uncertainties=[],
            )
        ]  # Missing one result

        with pytest.raises(TranslationValidationError):
            validate_translation_results(original_sentences, results, "Test")

    def test_validate_translation_results_invalid_format(self):
        """Test validation with invalid result format."""
        original_sentences = ["مرحبا"]
        results = [
            TranslationResult(
                translation="[Translation Error] test",
                notes="Test translation",
                word_by_word=[],
                uncertainties=[],
            )
        ]  # Contains error marker

        with pytest.raises(TranslationValidationError):
            validate_translation_results(original_sentences, results, "Test")

    def test_validate_translation_results_missing_translation(self):
        """Test validation with missing translation field."""
        original_sentences = ["مرحبا"]
        results = [
            TranslationResult(
                translation="",
                notes="Test translation",
                word_by_word=[],
                uncertainties=[],
            )
        ]  # Empty translation

        # This should raise an error as empty translations are not allowed
        with pytest.raises(TranslationValidationError):
            validate_translation_results(original_sentences, results, "Test")

        # Test with very short translation that should trigger validation
        results = [
            TranslationResult(
                translation="a",
                notes="Test translation",
                word_by_word=[],
                uncertainties=[],
            )
        ]  # Too short

        with pytest.raises(TranslationValidationError):
            validate_translation_results(original_sentences, results, "Test")

    def test_validate_translation_results_alternative_translation_key(self):
        """Test validation with 't' key instead of 'translation'."""
        original_sentences = ["مرحبا"]
        results = [
            TranslationResult(
                translation="Hello",
                notes="Test translation",
                word_by_word=[],
                uncertainties=[],
            )
        ]  # Using 't' key

        # Should not raise an exception
        validate_translation_results(original_sentences, results, "Test")

    def test_validate_translation_results_format_error(self):
        """Test validation with format error marker."""
        original_sentences = ["مرحبا"]
        results = [
            TranslationResult(
                translation="[Format Error] test",
                notes="Test translation",
                word_by_word=[],
                uncertainties=[],
            )
        ]

        with pytest.raises(TranslationValidationError):
            validate_translation_results(original_sentences, results, "Test")

    def test_validate_translation_results_batch_error(self):
        """Test validation with batch processing error marker."""
        original_sentences = ["مرحبا"]
        results = [
            TranslationResult(
                translation="[BATCH PROCESSING ERROR] test",
                notes="Test translation",
                word_by_word=[],
                uncertainties=[],
            )
        ]

        with pytest.raises(TranslationValidationError):
            validate_translation_results(original_sentences, results, "Test")

    def test_validate_translation_results_word_options_check(self):
        """Test validation with word options check enabled."""
        original_sentences = ["مرحبا"]
        results = [
            WordTranslationResult(
                word_translations=[
                    WordTranslation(
                        arabic="مرحبا",
                        english=["hello", "hi"],
                        pos="interjection",
                        essential="مرحبا",
                        essential_translation=["hello", "hi"],
                        notes="Greeting word",
                        uncertainties=[],
                    )
                ]
            )
        ]

        # Should not raise an exception
        validate_translation_results(
            original_sentences, results, "Test", check_word_options=True
        )

    def test_validate_translation_results_word_translations_check(self):
        """Test validation with word translations check enabled."""
        original_sentences = ["مرحبا"]
        results = [
            TranslationResult(
                translation="Hello",
                notes="Test translation",
                word_by_word=[
                    WordTranslation(
                        arabic="مرحبا",
                        english="hello",
                        pos="interjection",
                        essential="مرحبا",
                        essential_translation="hello",
                        notes="Greeting word",
                        uncertainties=[],
                    )
                ],
                uncertainties=[],
            )
        ]

        # Should not raise an exception
        validate_translation_results(
            original_sentences, results, "Test", check_word_translations=True
        )

    def test_validate_translation_results_tashkeel_check(self):
        """Test validation with tashkeel check."""
        original_sentences = ["مرحبا"]
        results = [
            TashkeelResult(
                tashkeel="مرحبا",  # Same as original, no diacritics
                uncertainties=[],
            )
        ]

        with pytest.raises(TranslationValidationError):
            validate_translation_results(original_sentences, results, "Test")


class TestValidateFinalTranslation:
    """Test final translation validation."""

    def test_validate_final_translation_success(self):
        """Test successful final translation validation."""
        word_translations = [
            WordTranslation(
                arabic="مرحبا",
                english="hello",
                pos="interjection",
                essential="مرحبا",
                essential_translation="hello",
                notes="Greeting word",
                uncertainties=[],
            )
        ]

        translation = SentenceTranslation(
            index=0,
            original="مرحبا",
            full_translation="Hello",
            tashkeel="مَرْحَباً",
            notes="Simple greeting",
            word_by_word=word_translations,
            verification_status="pending",
            verification_issues=[],
        )

        # Test that the model can be created without validation errors
        assert translation.verification_status == "pending"

    def test_validate_final_translation_missing_full_translation(self):
        """Test validation with missing full translation."""
        translation = SentenceTranslation(
            index=0,
            original="مرحبا",
            full_translation="",
            tashkeel="مَرْحَباً",
            notes="Empty translation",
            word_by_word=[],
            verification_status="pending",
            verification_issues=[],
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
            notes="Missing tashkeel",
            word_by_word=[],
            verification_status="pending",
            verification_issues=[],
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
            notes="Error in translation",
            word_by_word=[],
            verification_status="pending",
            verification_issues=[],
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
            notes="Missing word translations",
            word_by_word=[],
            verification_status="pending",
            verification_issues=[],
        )

        issues = validate_final_translation(translation)
        assert "Missing word-by-word translations" in issues

    def test_validate_final_translation_word_count_mismatch(self):
        """Test validation with word count mismatch (essential field validation now happens early)."""
        translation = SentenceTranslation(
            index=0,
            original="يَكْتُبُ الْكِتَابَ",
            full_translation="He writes the book",
            tashkeel="يَكْتُبُ الْكِتَابَ",
            notes="Word count mismatch",
            word_by_word=[
                WordTranslation(
                    arabic="يَكْتُبُ",
                    english="he writes",
                    pos="verb",
                    essential="يَكْتُبُ",  # This would fail validation in early pipeline stage
                    essential_translation="writes",
                    notes="Verb 'writes'",
                    uncertainties=[],
                )
            ],
            verification_status="pending",
            verification_issues=[],
        )

        # This should now pass final validation since essential field validation happens early
        issues = validate_final_translation(translation)
        # Should only have word count mismatch issue, not essential field issues
        essential_issues = [issue for issue in issues if "essential" in issue.lower()]
        assert len(essential_issues) == 0, (
            f"Unexpected essential field issues: {essential_issues}"
        )

    def test_validate_final_translation_missing_essential_field(self):
        """Test validation with identical essential/arabic fields (validation now happens early)."""
        translation = SentenceTranslation(
            index=0,
            original="يَكْتُبُ الْكِتَابَ",
            full_translation="He writes the book",
            tashkeel="يَكْتُبُ الْكِتَابَ",
            notes="Testing identical essential/arabic fields for verb",
            word_by_word=[
                WordTranslation(
                    arabic="يَكْتُبُ",
                    english="he writes",
                    pos="verb",
                    essential="يَكْتُبُ",  # This would fail validation in early pipeline stage
                    essential_translation="writes",
                    notes="Verb 'writes'",
                    uncertainties=[],
                )
            ],
            verification_status="pending",
            verification_issues=[],
        )

        # This should now pass final validation since essential field validation happens early
        issues = validate_final_translation(translation)
        # Should only have word count mismatch issue, not essential field issues
        essential_issues = [issue for issue in issues if "essential" in issue.lower()]
        assert len(essential_issues) == 0, (
            f"Unexpected essential field issues: {essential_issues}"
        )

    def test_validate_final_translation_preposition_identical_fields(self):
        """Test validation allows prepositions to have identical essential/arabic fields."""
        translation = SentenceTranslation(
            index=0,
            original="مِنْ بَيْنِ",
            full_translation="From between",
            tashkeel="مِنْ بَيْنِ",
            notes="Preposition with identical essential fields",
            word_by_word=[
                WordTranslation(
                    arabic="مِنْ",
                    english="from",
                    pos="preposition",
                    essential="مِنْ",  # This should be allowed for prepositions
                    essential_translation="from",
                    notes="Preposition 'from'",
                    uncertainties=[],
                ),
                WordTranslation(
                    arabic="بَيْنِ",
                    english="between",
                    pos="noun",
                    essential="بَيْنٌ",  # This should be stripped for nouns
                    essential_translation="between",
                    notes="Noun 'between'",
                    uncertainties=[],
                ),
            ],
            verification_status="pending",
            verification_issues=[],
        )

        # This should pass validation since prepositions can have identical essential/arabic fields
        issues = validate_final_translation(translation)
        # Should only have word count mismatch issue, not essential field issues
        essential_issues = [issue for issue in issues if "essential" in issue.lower()]
        assert len(essential_issues) == 0, (
            f"Unexpected essential field issues: {essential_issues}"
        )

    def test_validate_final_translation_root_noun_identical_fields(self):
        """Test validation allows root nouns to have identical essential/arabic fields."""
        translation = SentenceTranslation(
            index=0,
            original="مُتَضَمَّنٌ فِي",
            full_translation="Contained in",
            tashkeel="مُتَضَمَّنٌ فِي",
            notes="Root noun with identical essential fields",
            word_by_word=[
                WordTranslation(
                    arabic="مُتَضَمَّنٌ",
                    english="contained",
                    pos="noun",
                    essential="مُتَضَمَّنٌ",  # This should be allowed for root nouns
                    essential_translation="contained",
                    notes="Root noun 'contained'",
                    uncertainties=[],
                ),
                WordTranslation(
                    arabic="فِي",
                    english="in",
                    pos="preposition",
                    essential="فِي",  # This should also be allowed for prepositions
                    essential_translation="in",
                    notes="Preposition 'in'",
                    uncertainties=[],
                ),
            ],
            verification_status="pending",
            verification_issues=[],
        )

        # This should pass validation since root nouns and prepositions can have identical essential/arabic fields
        issues = validate_final_translation(translation)
        # Should only have word count mismatch issue, not essential field issues
        essential_issues = [issue for issue in issues if "essential" in issue.lower()]
        assert len(essential_issues) == 0, (
            f"Unexpected essential field issues: {essential_issues}"
        )


def test_article_audio_summary_exclusion():
    """Test that article summary is not included in audio generation."""
    # This test verifies that the create_article_audio function does not generate
    # audio for the article summary, even when a summary is provided

    import tempfile
    from unittest.mock import patch

    # Sample data
    sentences = [
        {
            "arabic_text": "هذا نص تجريبي",
            "english_text": "This is a test text",
            "tashkeel": "هذا نص تجريبي",
        }
    ]
    article_title = "Test Article"
    article_summary = "This is a test summary that should NOT be included in audio"

    # Track what text is being processed
    generated_texts = []

    def mock_generate_speech(text, voice_id, voice_settings=None):
        generated_texts.append(text)
        return {
            "audio": b"fake_audio_data",
            "duration": 1.0,
            "voice_id": voice_id,
            "text": text,
        }

    # Mock the generate_speech function
    with patch("audio.article_audio.generate_speech", side_effect=mock_generate_speech):
        # Mock the storage operations to avoid actual file operations
        with patch("audio.article_audio.get_supabase_client") as _mock_client:
            with patch("audio.article_audio.get_storage_url") as mock_url:
                mock_url.return_value = "https://fake-url.com/audio.mp3"

                # Import and call the function
                from audio import create_article_audio

                with tempfile.TemporaryDirectory() as temp_dir:
                    _result = create_article_audio(
                        sentences=sentences,
                        article_title=article_title,
                        article_summary=article_summary,
                        output_dir=temp_dir,
                    )

        # Verify that generate_speech was called
        assert len(generated_texts) > 0, "generate_speech should have been called"

        # Verify that the summary text was NOT included in any call
        summary_found = any(article_summary in text for text in generated_texts)
        assert not summary_found, (
            f"Summary text should not be in generated audio calls. Found in: {generated_texts}"
        )

        # Verify that the title text WAS included
        title_found = any(article_title in text for text in generated_texts)
        assert title_found, (
            f"Title text should be in generated audio calls. Not found in: {generated_texts}"
        )

        # Verify that sentence text WAS included
        sentence_found = any("هذا نص تجريبي" in text for text in generated_texts)
        assert sentence_found, (
            f"Sentence text should be in generated audio calls. Not found in: {generated_texts}"
        )
