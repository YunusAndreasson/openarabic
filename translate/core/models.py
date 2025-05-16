from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class WordTranslation(BaseModel):
    """Word-level translation with grammatical details"""

    arabic: str
    english: str  # Final chosen English translation
    pos: Optional[str] = None  # Part of speech
    essential: Optional[str] = None  # Essential letters for flashcards
    essential_translation: Optional[str] = None  # Final chosen one-word English meaning
    notes: Optional[str] = None  # Any special notes about the translation


class WordTranslationOptions(BaseModel):
    """Intermediate model to hold options before refinement"""

    arabic: str
    english_options: List[str] = []
    pos: Optional[str] = None
    essential: Optional[str] = None
    essential_translation_options: List[str] = []
    notes: Optional[str] = None
    uncertainties: List[
        Dict[str, Any]
    ] = []  # Keep uncertainties tied to the options step


class SentenceTranslation(BaseModel):
    """Complete sentence translation with all components"""

    index: int
    original: str
    tashkeel: str  # Original with diacritical marks
    word_by_word: List[WordTranslation]  # Stores final chosen words
    full_translation: str
    notes: Optional[str] = None
    verification_status: Optional[str] = None
    verification_issues: Optional[List[str]] = None


class TextMetadata(BaseModel):
    """Metadata about the entire text"""

    title: str
    summary: str
    difficulty_level: int
    total_units: int


class TranslationResult(BaseModel):
    """Complete translation result including metadata and all sentences"""

    metadata: TextMetadata
    translations: List[SentenceTranslation]


class BatchRequest(BaseModel):
    """Batch translation request format"""

    sentences: List[str]
    contexts: List[Optional[str]]


class TranslationValidationError(Exception):
    """Custom exception for translation validation errors"""

    pass
