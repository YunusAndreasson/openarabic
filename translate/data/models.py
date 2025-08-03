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
    notes: str = Field(
        description="Any special notes about the translation",
    )


class WordTranslationOptions(BaseModel):
    """Intermediate model to hold options before refinement"""

    arabic: str
    english_options: list[str] = Field(default_factory=list)
    pos: str
    essential: str
    essential_translation_options: list[str] = Field(default_factory=list)
    notes: str
    uncertainties: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Keep uncertainties tied to the options step",
    )


class TranslationUncertainty(BaseModel):
    """Uncertainty in translation"""

    text: str = Field(description="Text with uncertainty")
    reason: str = Field(description="Reason for uncertainty")


class TranslationResult(BaseModel):
    """Result from sentence translation step"""

    translation: str = Field(description="English translation")
    notes: str = Field(description="Translation notes and context")
    uncertainties: list[TranslationUncertainty] = Field(
        default_factory=list, description="Areas of uncertainty in translation"
    )
    word_by_word: list[dict[str, Any]] = Field(
        default_factory=list, description="Word-by-word analysis"
    )


class TashkeelUncertainty(BaseModel):
    """Uncertainty in tashkeel/diacritical marks"""

    word: str = Field(description="Word with uncertain diacritics")
    reason: str = Field(description="Reason for uncertainty")
    related_translation_uncertainty: str | None = Field(
        default=None, description="Related translation uncertainty"
    )


class TashkeelResult(BaseModel):
    """Result from tashkeel addition step"""

    tashkeel: str = Field(description="Text with diacritical marks added")
    uncertainties: list[TashkeelUncertainty] = Field(
        default_factory=list, description="Uncertain diacritical marks"
    )


class WordTranslationResult(BaseModel):
    """Result from word-by-word translation step"""

    word_translations: list[WordTranslationOptions] = Field(
        description="Word translation options before refinement"
    )


class RefinementResult(BaseModel):
    """Result from final refinement step"""

    improved_tashkeel: str = Field(description="Refined diacritical marks")
    improved_translation: str = Field(description="Refined translation")
    improved_word_translations: list[WordTranslation] = Field(
        description="Final refined word translations"
    )
    resolved_uncertainties: list[dict[str, str]] = Field(
        default_factory=list, description="Uncertainties that were resolved"
    )
    remaining_uncertainties: list[dict[str, str]] = Field(
        default_factory=list, description="Uncertainties that remain unresolved"
    )
    changes_made: list[str] = Field(
        default_factory=list, description="List of changes made during refinement"
    )


class SentenceTranslation(BaseModel):
    """Complete sentence translation with all components"""

    index: int
    original: str
    tashkeel: str = Field(description="Original with diacritical marks")
    word_by_word: list[WordTranslation] = Field(description="Stores final chosen words")
    full_translation: str
    notes: str
    verification_status: str | None = Field(default=None)
    verification_issues: list[str] | None = Field(default=None)


class TextMetadata(BaseModel):
    """Metadata about the entire text"""

    title: str
    summary: str
    difficulty_level: int
    total_units: int


class SplitResult(BaseModel):
    """Complete result from text splitting phase"""

    units: list[str] = Field(description="Array of text units/sentences")
    title: str = Field(description="Concise English title (3-7 words)")
    summary: str = Field(description="One-sentence summary of main content")
    difficulty_level: int = Field(ge=1, le=5, description="Difficulty rating (1-5)")
    total_units: int = Field(description="Total number of units")
    unit_types: list[str] | None = Field(
        default=None,
        description="Type of each unit (simple, compound, condition, quote, verse, phrase, etc.)",
    )


class WordTiming(BaseModel):
    """Word-level timing information from audio generation"""

    word: str = Field(description="Original Arabic word")
    cleaned_word: str = Field(description="Cleaned word for matching")
    start_time: str = Field(description="Start time in seconds")
    end_time: str = Field(description="End time in seconds")


class AudioResult(BaseModel):
    """Result from audio generation"""

    url: str = Field(description="Audio file URL in storage")
    word_timings: list[WordTiming] = Field(
        default_factory=list, description="Word-level timing information"
    )
    filename: str | None = Field(default=None, description="Generated filename")
    duration: float | None = Field(
        default=None, description="Audio duration in seconds"
    )


class ArticleData(BaseModel):
    """Data structure for article insertion"""

    title: str = Field(description="Article title")
    summary: str = Field(description="Article summary")
    difficulty_level: int = Field(ge=1, le=5, description="Difficulty level")
    category_id: int = Field(description="Category ID in database")
    author_id: int = Field(description="Author ID in database")
    content_hash: str = Field(description="SHA-256 hash of content for deduplication")
    created_at: str = Field(description="ISO format timestamp")


class TranslationValidationError(Exception):
    """Custom exception for translation validation errors"""

    pass
