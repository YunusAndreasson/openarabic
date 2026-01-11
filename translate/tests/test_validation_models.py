"""Tests for validation Pydantic models."""

import pytest
from pydantic import ValidationError

from data.validation_models import (
    RootExampleSentence,
    RootValidationBatchResponse,
    RootValidationRequest,
    RootValidationResponse,
    ValidationBatchResponse,
    ValidationImprovement,
    WordValidationRequest,
    WordValidationResponse,
)


class TestWordValidationRequest:
    """Tests for WordValidationRequest model."""

    def test_valid_request(self):
        """Test valid request with all required fields."""
        request = WordValidationRequest(
            word_id=123,
            arabic_word="كِتَاب",
            current_english="book",
            current_grammar_note="Noun, singular",
            sentence_arabic="هذا كِتَاب جَمِيل",
            sentence_english="This is a beautiful book",
        )
        assert request.word_id == 123
        assert request.arabic_word == "كِتَاب"
        assert request.current_english == "book"
        assert request.current_grammar_note == "Noun, singular"

    def test_request_with_null_grammar_note(self):
        """Test request with null grammar note."""
        request = WordValidationRequest(
            word_id=456,
            arabic_word="يَكْتُب",
            current_english="writes",
            current_grammar_note=None,
            sentence_arabic="هُوَ يَكْتُب رِسَالَة",
            sentence_english="He writes a letter",
        )
        assert request.current_grammar_note is None

    def test_request_rejects_extra_fields(self):
        """Test strict mode rejects extra fields."""
        with pytest.raises(ValidationError) as exc_info:
            WordValidationRequest(
                word_id=123,
                arabic_word="كِتَاب",
                current_english="book",
                current_grammar_note=None,
                sentence_arabic="هذا كِتَاب",
                sentence_english="This is a book",
                extra_field="not allowed",  # type: ignore[call-arg]
            )
        assert "extra_field" in str(exc_info.value)

    def test_request_requires_all_fields(self):
        """Test that all required fields must be provided."""
        with pytest.raises(ValidationError):
            WordValidationRequest(
                word_id=123,
                arabic_word="كِتَاب",
                # Missing required fields
            )  # type: ignore[call-arg]


class TestWordValidationResponse:
    """Tests for WordValidationResponse model."""

    def test_valid_response_correct(self):
        """Test valid response for correct translation."""
        response = WordValidationResponse(
            word_id=123,
            is_correct=True,
            issues=[],
            suggested_english=None,
            suggested_grammar_note=None,
            reasoning="Translation is accurate and contextually appropriate.",
        )
        assert response.is_correct is True
        assert response.issues == []
        assert response.suggested_english is None

    def test_valid_response_with_issues(self):
        """Test valid response with issues found."""
        response = WordValidationResponse(
            word_id=456,
            is_correct=False,
            issues=["Translation too literal", "Missing contextual meaning"],
            suggested_english="he is writing",
            suggested_grammar_note="Present tense, masculine singular",
            reasoning="The current translation lacks verb form details.",
        )
        assert response.is_correct is False
        assert len(response.issues) == 2
        assert response.suggested_english == "he is writing"

    def test_response_default_issues(self):
        """Test default empty list for issues."""
        response = WordValidationResponse(
            word_id=789,
            is_correct=True,
            reasoning="All good.",
        )
        assert response.issues == []
        assert response.suggested_english is None
        assert response.suggested_grammar_note is None


class TestValidationBatchResponse:
    """Tests for ValidationBatchResponse model."""

    def test_batch_with_multiple_validations(self):
        """Test batch response with multiple validation results."""
        validations = [
            WordValidationResponse(
                word_id=1,
                is_correct=True,
                reasoning="Correct.",
            ),
            WordValidationResponse(
                word_id=2,
                is_correct=False,
                issues=["Incorrect"],
                suggested_english="fixed",
                reasoning="Needs fix.",
            ),
        ]
        batch = ValidationBatchResponse(validations=validations)
        assert len(batch.validations) == 2
        assert batch.validations[0].is_correct is True
        assert batch.validations[1].is_correct is False

    def test_empty_batch(self):
        """Test batch response with empty validations."""
        batch = ValidationBatchResponse(validations=[])
        assert batch.validations == []


class TestValidationImprovement:
    """Tests for ValidationImprovement model."""

    def test_valid_improvement(self):
        """Test valid improvement record."""
        improvement = ValidationImprovement(
            sentence_word_id=100,
            original_english="write",
            original_grammar_note="verb",
            suggested_english="to write",
            suggested_grammar_note="Infinitive verb form",
        )
        assert improvement.sentence_word_id == 100
        assert improvement.status == "pending"  # Default value

    def test_improvement_with_custom_status(self):
        """Test improvement with custom status."""
        improvement = ValidationImprovement(
            sentence_word_id=200,
            original_english="book",
            original_grammar_note=None,
            suggested_english="the book",
            suggested_grammar_note="Definite noun",
            status="approved",
        )
        assert improvement.status == "approved"

    def test_improvement_null_grammar_notes(self):
        """Test improvement with null grammar notes."""
        improvement = ValidationImprovement(
            sentence_word_id=300,
            original_english="and",
            original_grammar_note=None,
            suggested_english="and/then",
            suggested_grammar_note=None,
        )
        assert improvement.original_grammar_note is None
        assert improvement.suggested_grammar_note is None


class TestRootExampleSentence:
    """Tests for RootExampleSentence model."""

    def test_valid_example(self):
        """Test valid example sentence."""
        example = RootExampleSentence(
            word_form="كَاتِب",
            sentence_arabic="الكَاتِب يَكْتُب كِتَاباً",
            sentence_english="The writer writes a book",
        )
        assert example.word_form == "كَاتِب"
        assert "كَاتِب" in example.sentence_arabic

    def test_example_rejects_extra_fields(self):
        """Test strict mode rejects extra fields."""
        with pytest.raises(ValidationError):
            RootExampleSentence(
                word_form="كَاتِب",
                sentence_arabic="sentence",
                sentence_english="translation",
                extra="not allowed",  # type: ignore[call-arg]
            )


class TestRootValidationRequest:
    """Tests for RootValidationRequest model."""

    def test_valid_request(self):
        """Test valid root validation request."""
        request = RootValidationRequest(
            root_id=50,
            current_letters="ك-ت-ب",
            current_meaning="to write",
            examples=[
                RootExampleSentence(
                    word_form="كِتَاب",
                    sentence_arabic="قَرَأْتُ الكِتَاب",
                    sentence_english="I read the book",
                ),
                RootExampleSentence(
                    word_form="كَاتِب",
                    sentence_arabic="هُوَ كَاتِب",
                    sentence_english="He is a writer",
                ),
            ],
        )
        assert request.root_id == 50
        assert len(request.examples) == 2

    def test_request_empty_examples(self):
        """Test request with empty examples list."""
        request = RootValidationRequest(
            root_id=60,
            current_letters="ف-ع-ل",
            current_meaning="to do",
        )
        assert request.examples == []

    def test_request_default_examples(self):
        """Test default empty examples list."""
        request = RootValidationRequest(
            root_id=70,
            current_letters="ق-ر-أ",
            current_meaning="to read",
        )
        assert request.examples == []


class TestRootValidationResponse:
    """Tests for RootValidationResponse model."""

    def test_valid_response_correct(self):
        """Test valid response for correct root."""
        response = RootValidationResponse(
            root_id=50,
            is_correct=True,
            issues=[],
            suggested_english=None,
            suggested_tashkeel=None,
            reasoning="Root translation is accurate.",
        )
        assert response.is_correct is True
        assert response.suggested_tashkeel is None

    def test_valid_response_with_suggestions(self):
        """Test valid response with tashkeel suggestion."""
        response = RootValidationResponse(
            root_id=60,
            is_correct=False,
            issues=["Tashkeel incomplete", "Meaning too narrow"],
            suggested_english="to write, compose",
            suggested_tashkeel="كَتَبَ",
            reasoning="Root needs expanded meaning.",
        )
        assert response.is_correct is False
        assert response.suggested_tashkeel == "كَتَبَ"
        assert len(response.issues) == 2


class TestRootValidationBatchResponse:
    """Tests for RootValidationBatchResponse model."""

    def test_batch_with_validations(self):
        """Test batch response with root validations."""
        validations = [
            RootValidationResponse(
                root_id=1,
                is_correct=True,
                reasoning="Good.",
            ),
            RootValidationResponse(
                root_id=2,
                is_correct=False,
                issues=["Issue"],
                suggested_english="fix",
                reasoning="Needs work.",
            ),
        ]
        batch = RootValidationBatchResponse(validations=validations)
        assert len(batch.validations) == 2

    def test_empty_batch(self):
        """Test empty batch response."""
        batch = RootValidationBatchResponse(validations=[])
        assert batch.validations == []
