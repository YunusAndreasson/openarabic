"""
Type aliases for pipeline data structures to improve type safety.
These match the existing schema structures exactly.
"""

from typing import Any, TypedDict


# Translation result structure (matches TRANSLATE_SENTENCES_FUNCTION schema)
class TranslationUncertainty(TypedDict):
    text: str
    reason: str


class TranslationResult(TypedDict, total=False):
    translation: str
    notes: str | None
    uncertainties: list[TranslationUncertainty]
    word_by_word: list[dict[str, Any]]  # Optional field for later stages


# Tashkeel result structure (matches TASHKEEL_FUNCTION schema)
class TashkeelUncertainty(TypedDict, total=False):
    word: str
    reason: str
    related_translation_uncertainty: str | None


class TashkeelResult(TypedDict):
    tashkeel: str
    uncertainties: list[TashkeelUncertainty]


# Word translation options structure (matches WORD_TRANSLATION_FUNCTION schema)
class WordTranslationOption(TypedDict):
    arabic: str
    english_options: list[str]
    pos: str | None
    essential: str
    essential_translation_options: list[str]
    notes: str | None
    uncertainties: list[
        dict[str, Any]
    ]  # Schema defines as "type": "object" - keeping flexible


class WordTranslationResult(TypedDict):
    word_translations: list[WordTranslationOption]


# Refinement result structure (matches REFINEMENT_FUNCTION schema)
class RefinedWordTranslation(TypedDict):
    arabic: str
    english: str
    pos: str | None
    essential: str
    essential_translation: str
    notes: str | None


class ResolvedUncertainty(TypedDict):
    step: str
    original_uncertainty: dict[str, Any]
    resolution: str
    explanation: str


class RemainingUncertainty(TypedDict):
    type: str
    description: str
    reason_unresolved: str


class RefinementResult(TypedDict):
    improved_tashkeel: str
    improved_translation: str
    improved_word_translations: list[RefinedWordTranslation]
    resolved_uncertainties: list[ResolvedUncertainty]
    remaining_uncertainties: list[RemainingUncertainty]
    changes_made: list[str]


# Batch processing structure
class TranslationBatch(TypedDict):
    sentences: list[str]
    contexts: list[str]  # ContextCache returns list[str], not list[str | None]
    start_index: int
    indices: list[int]


# Refinement input structure
class RefinementInput(TypedDict):
    original: str
    translation: TranslationResult
    tashkeel: TashkeelResult
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


# Audio generation structures
class AudioAPIResponse(TypedDict):
    """API response structure for audio generation"""

    audio: bytes
    alignment: dict[str, Any] | None
    audio_base_64: str | None


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
    filename: str | None
    duration: float | None


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


class TimingStats(TypedDict):
    """Performance timing statistics"""

    total_time: float
    sentences_processed: int
    average_time_per_sentence: float
    errors: int


# API response wrapper
class APIResponse(TypedDict):
    success: bool
    data: dict[str, Any] | None
    error: str | None


# Word data structure for database operations
class WordData(TypedDict, total=False):
    arabic: str
    english: str
    essential: str
    essential_translation: str
    pos: str | None
    notes: str | None
    root: str | None


# Type aliases for common patterns
TranslationResults = list[TranslationResult]
TashkeelResults = list[TashkeelResult]
WordTranslationResults = list[WordTranslationResult]
RefinementResults = list[RefinementResult]
RefinementInputs = list[RefinementInput]
SplitResults = list[str]  # List of split units
AudioResults = list[AudioGenerationResult]
