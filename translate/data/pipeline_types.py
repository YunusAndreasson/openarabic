"""
Type aliases for pipeline data structures to improve type safety.
These match the existing schema structures exactly.

Python 3.12+ modernization: using `type` statement (PEP 695) for type aliases.
"""

from typing import Any, TypedDict

# Import Pydantic models for type definitions
from .models import (
    RefinementResult,
    TashkeelResult,
    TranslationResult,
    WordTranslation,
    WordTranslationResult,
)


# Batch processing structure
class TranslationBatch(TypedDict):
    sentences: list[str]
    contexts: list[str]  # ContextCache returns list[str], not list[str | None]
    start_index: int
    indices: list[int]


# Refinement input structure
class RefinementInput(TypedDict):
    original: str
    translation: TranslationResult  # Use actual Pydantic model
    tashkeel: TashkeelResult  # Use actual Pydantic model
    word_translations_options: list[
        WordTranslation
    ]  # List of individual word translations
    previous_uncertainties: dict[
        str, list[dict[str, Any]]
    ]  # Keep as dict for flexibility


# Word data structure for database operations
class WordData(TypedDict):
    arabic: str
    english: str
    essential: str
    essential_translation: str
    pos: str  # Required in schema
    notes: str  # Required
    root: str  # Required in schema


# Type aliases for common collections (Python 3.12+ type statement - PEP 695)
# These are used for internal processing and MUST contain Pydantic models
type TranslationResults = list[TranslationResult]
type TashkeelResults = list[TashkeelResult]
type WordTranslationResults = list[WordTranslationResult]
type RefinementResults = list[RefinementResult]

# Internal processing types (TypedDict for performance)
type RefinementInputs = list[RefinementInput]
