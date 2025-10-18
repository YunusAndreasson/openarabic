"""
Pydantic models for word translation validation.

These models define the structure for validation requests and responses
when using the DeepSeek API through OpenRouter.
"""

from pydantic import BaseModel, Field


class WordValidationRequest(BaseModel):
    """Request data for validating a single word translation."""

    word_id: int = Field(description="Database ID of the sentence_word record")
    arabic_word: str = Field(description="Arabic word form to validate")
    current_english: str = Field(description="Current English translation")
    current_grammar_note: str | None = Field(
        description="Current grammar note (may be null)"
    )
    sentence_arabic: str = Field(description="Full Arabic sentence for context")
    sentence_english: str = Field(description="Full English sentence for context")


class WordValidationResponse(BaseModel):
    """Response data from validating a single word translation."""

    word_id: int = Field(description="Database ID of the sentence_word record")
    is_correct: bool = Field(
        description="Whether the translation is completely correct"
    )
    issues: list[str] = Field(
        default_factory=list,
        description="List of specific issues found (empty if no issues)",
    )
    suggested_english: str | None = Field(
        default=None,
        description="Suggested English translation if issues found (null if correct)",
    )
    suggested_grammar_note: str | None = Field(
        default=None,
        description="Suggested grammar note if issues found (null if correct)",
    )
    reasoning: str = Field(
        description="Detailed explanation of the validation decision"
    )


class ValidationBatchResponse(BaseModel):
    """Response containing validation results for a batch of words."""

    validations: list[WordValidationResponse] = Field(
        description="List of validation results, one per input word"
    )


class ValidationImprovement(BaseModel):
    """Model for saving validation improvements to database."""

    sentence_word_id: int = Field(description="Foreign key to sentence_words table")
    original_english: str = Field(description="Original English translation")
    original_grammar_note: str | None = Field(description="Original grammar note")
    suggested_english: str = Field(description="Suggested improved translation")
    suggested_grammar_note: str | None = Field(description="Suggested improved note")
    status: str = Field(
        default="pending",
        description="Review status: pending/approved/rejected",
    )
