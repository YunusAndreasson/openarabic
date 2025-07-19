from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class WordTranslation(BaseModel):
    """Word-level translation with grammatical details"""

    arabic: str
    english: str = Field(description="Final chosen English translation")
    pos: Optional[str] = Field(default=None, description="Part of speech")
    essential: Optional[str] = Field(
        default=None, description="Essential letters for flashcards"
    )
    essential_translation: Optional[str] = Field(
        default=None, description="Final chosen one-word English meaning"
    )
    notes: Optional[str] = Field(
        default=None, description="Any special notes about the translation"
    )


class WordTranslationOptions(BaseModel):
    """Intermediate model to hold options before refinement"""

    arabic: str
    english_options: List[str] = Field(default_factory=list)
    pos: Optional[str] = Field(default=None)
    essential: Optional[str] = Field(default=None)
    essential_translation_options: List[str] = Field(default_factory=list)
    notes: Optional[str] = Field(default=None)
    uncertainties: List[Dict[str, Any]] = Field(
        default_factory=list, description="Keep uncertainties tied to the options step"
    )


class SentenceTranslation(BaseModel):
    """Complete sentence translation with all components"""

    index: int
    original: str
    tashkeel: str = Field(description="Original with diacritical marks")
    word_by_word: List[WordTranslation] = Field(description="Stores final chosen words")
    full_translation: str
    notes: Optional[str] = Field(default=None)
    verification_status: Optional[str] = Field(default=None)
    verification_issues: Optional[List[str]] = Field(default=None)


class TextMetadata(BaseModel):
    """Metadata about the entire text"""

    title: str
    summary: str
    difficulty_level: int
    total_units: int


class TranslationValidationError(Exception):
    """Custom exception for translation validation errors"""

    pass
