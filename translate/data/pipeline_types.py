"""
Type aliases for pipeline data structures to improve type safety.
These match the existing schema structures exactly.
"""

from typing import Any, NotRequired, TypedDict

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


# Split phase structures
class SplitAPIResponse(TypedDict):
    """API response structure for split phase"""

    title: str
    summary: str
    difficulty_level: int
    units: list[str]


class SplitErrorResponse(TypedDict):
    """Error response structure for split phase"""

    error: str


# Database insertion structures
class ArticleInsertData(TypedDict):
    """Data structure for article insertion"""

    title: str
    summary: str
    difficulty_level: int
    category_id: int
    author_id: int
    content_hash: str


# Generic API response structure
class APIResponse(TypedDict):
    success: bool
    data: NotRequired[dict[str, Any] | None]
    error: NotRequired[str | None]


# Word data structure for database operations
class WordData(TypedDict):
    arabic: str
    english: str
    essential: str
    essential_translation: str
    pos: str  # Required in schema
    notes: str  # Required
    root: str  # Required in schema


# Type aliases for common collections
# These are used for internal processing and MUST contain Pydantic models
TranslationResults = list[TranslationResult]
TashkeelResults = list[TashkeelResult]
WordTranslationResults = list[WordTranslationResult]
RefinementResults = list[RefinementResult]

# Internal processing types (TypedDict for performance)
RefinementInputs = list[RefinementInput]
SplitResults = list[str]  # List of split units
