from typing import Any

from pydantic import BaseModel, Field


class WordTranslation(BaseModel):
    """Word-level translation with grammatical details"""

    arabic: str
    english: str = Field(description="Final chosen English translation")
    pos: str | None = Field(default=None, description="Part of speech")
    essential: str | None = Field(
        default=None,
        description="Essential letters for flashcards",
    )
    essential_translation: str | None = Field(
        default=None,
        description="Final chosen one-word English meaning",
    )
    notes: str | None = Field(
        default=None,
        description="Any special notes about the translation",
    )


class WordTranslationOptions(BaseModel):
    """Intermediate model to hold options before refinement"""

    arabic: str
    english_options: list[str] = Field(default_factory=list)
    pos: str | None = Field(default=None)
    essential: str | None = Field(default=None)
    essential_translation_options: list[str] = Field(default_factory=list)
    notes: str | None = Field(default=None)
    uncertainties: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Keep uncertainties tied to the options step",
    )


class SentenceTranslation(BaseModel):
    """Complete sentence translation with all components"""

    index: int
    original: str
    tashkeel: str = Field(description="Original with diacritical marks")
    word_by_word: list[WordTranslation] = Field(description="Stores final chosen words")
    full_translation: str
    notes: str | None = Field(default=None)
    verification_status: str | None = Field(default=None)
    verification_issues: list[str] | None = Field(default=None)


class TextMetadata(BaseModel):
    """Metadata about the entire text"""

    title: str
    summary: str
    difficulty_level: int
    total_units: int


class TranslationValidationError(Exception):
    """Custom exception for translation validation errors"""

    pass
