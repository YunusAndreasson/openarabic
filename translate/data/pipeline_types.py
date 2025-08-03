"""
Type aliases for pipeline data structures to improve type safety.
These match the existing schema structures exactly.
"""

from typing import Any, NotRequired, TypedDict


# Word translation options structure (matches WORD_TRANSLATION_TOOL schema)
class WordTranslationOption(TypedDict):
    arabic: str
    english_options: list[str]
    pos: str  # Required in schema
    essential: str
    essential_translation_options: list[str]
    notes: str  # Required in schema
    uncertainties: list[dict[str, str]]  # text and reason


# Refinement result structure (matches REFINEMENT_TOOL schema)
class RefinedWordTranslation(TypedDict):
    arabic: str
    english: str
    pos: str  # Required in schema
    essential: str
    essential_translation: str
    notes: str  # Required in schema


class ResolvedUncertainty(TypedDict):
    step: str
    original_uncertainty: dict[str, str]  # text and reason
    resolution: str
    explanation: str


class RemainingUncertainty(TypedDict):
    type: str
    description: str
    reason_unresolved: str


# Batch processing structure
class TranslationBatch(TypedDict):
    sentences: list[str]
    contexts: list[str]  # ContextCache returns list[str], not list[str | None]
    start_index: int
    indices: list[int]


# Refinement input structure
class RefinementInput(TypedDict):
    original: str
    translation: dict[str, Any]  # TranslationResult from models.py
    tashkeel: dict[str, Any]  # TashkeelResult from models.py
    word_translations_options: list[WordTranslationOption]
    previous_uncertainties: dict[str, list[dict[str, Any]]]


# Split phase structures
class SplitAPIResponse(TypedDict):
    """API response structure for split phase"""

    title: str
    summary: str
    difficulty_level: int
    units: list[str]
    unit_types: list[str]


class SplitErrorResponse(TypedDict):
    """Error response structure for split phase"""

    error: str


# Audio phase structures
class AudioAPIResponse(TypedDict):
    """API response structure for audio generation"""

    audio: bytes
    alignment: dict[str, Any]  # Required in schema
    audio_base_64: str  # Required in schema


class WordTimingData(TypedDict):
    """Word timing data from audio alignment"""

    word: str
    cleaned_word: str
    start_time: str
    end_time: str


class AudioGenerationResult(TypedDict):
    """Result from audio generation with word timings"""

    url: str
    word_timings: list[WordTimingData]
    filename: str  # Required in schema
    duration: float  # Required in schema


# Database insertion structures
class ArticleInsertData(TypedDict):
    """Data structure for article insertion"""

    title: str
    summary: str
    difficulty_level: int
    category_id: int
    author_id: int
    content_hash: str
    created_at: str


# Performance tracking structures
class TimingStats(TypedDict):
    """Performance timing statistics"""

    total_time: float
    sentences_processed: int
    average_time_per_sentence: float
    errors: int


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
TranslationResults = list[dict[str, Any]]  # list[TranslationResult] from models.py
TashkeelResults = list[dict[str, Any]]  # list[TashkeelResult] from models.py
WordTranslationResults = list[
    dict[str, Any]
]  # list[WordTranslationResult] from models.py
RefinementResults = list[dict[str, Any]]  # list[RefinementResult] from models.py
RefinementInputs = list[RefinementInput]
SplitResults = list[str]  # List of split units
AudioResults = list[AudioGenerationResult]
