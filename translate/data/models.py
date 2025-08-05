import re
import unicodedata

from pydantic import BaseModel, Field, field_validator

from .enums import DifficultyLevel, PartOfSpeech, UncertaintyType, UnitType


class Uncertainty(BaseModel):
    """Unified uncertainty model that handles all types of uncertainties in the translation pipeline"""

    model_config = {"use_enum_values": True}

    # Core uncertainty fields
    text: str | None = Field(
        default=None,
        description="The uncertain text (for word/translation uncertainties)",
    )
    word: str | None = Field(
        default=None,
        description="Word with uncertain diacritics (for tashkeel uncertainties)",
    )
    type: UncertaintyType | None = Field(
        default=None, description="Type of uncertainty (for remaining uncertainties)"
    )
    reason: str = Field(description="Reason for uncertainty")

    # Resolution fields (for resolved uncertainties)
    step: str | None = Field(
        default=None, description="Processing step where uncertainty was resolved"
    )
    resolution: str | None = Field(
        default=None, description="How the uncertainty was resolved"
    )
    explanation: str | None = Field(
        default=None, description="Explanation of the resolution"
    )

    # Related fields
    related_translation_uncertainty: str | None = Field(
        default=None,
        description="Related translation uncertainty (for tashkeel uncertainties)",
    )
    original_uncertainty: dict[str, str] | None = Field(
        default=None,
        description="Original uncertainty with text and reason (for resolved uncertainties)",
    )
    reason_unresolved: str | None = Field(
        default=None,
        description="Reason why uncertainty could not be resolved (for remaining uncertainties)",
    )

    @property
    def is_resolved(self) -> bool:
        """Check if this uncertainty has been resolved"""
        return self.step is not None and self.resolution is not None

    @property
    def is_tashkeel_uncertainty(self) -> bool:
        """Check if this is a tashkeel/diacritical uncertainty"""
        return self.word is not None

    @property
    def is_word_uncertainty(self) -> bool:
        """Check if this is a word/translation uncertainty"""
        return self.text is not None and self.word is None


# Legacy aliases for backward compatibility
WordUncertainty = Uncertainty
TranslationUncertainty = Uncertainty
TashkeelUncertainty = Uncertainty
ResolvedUncertainty = Uncertainty
RemainingUncertainty = Uncertainty


class WordTranslation(BaseModel):
    """Unified word-level translation model that handles both single translations and translation options"""

    model_config = {"use_enum_values": True}

    arabic: str = Field(description="Original Arabic word - preserve exact formatting")
    english: str | list[str] = Field(
        description="English translation(s) - single string for final translation, list for options"
    )
    pos: PartOfSpeech | None = Field(default=None, description="Part of speech")
    essential: str | None = Field(
        default=None,
        description="Essential letters for flashcards - core letters without affixes",
    )
    essential_translation: str | list[str] | None = Field(
        default=None,
        description="Essential translation(s) - single string for final, list for options",
    )
    notes: str = Field(
        default="",
        description="Translation notes and grammar context",
    )
    uncertainties: list[Uncertainty] = Field(
        default_factory=list,
        description="Uncertainties related to this word translation",
    )

    @property
    def is_final(self) -> bool:
        """Check if this is a final translation (single values) or options (lists)"""
        return isinstance(self.english, str) and (
            self.essential_translation is None
            or isinstance(self.essential_translation, str)
        )

    @property
    def has_options(self) -> bool:
        """Check if this contains translation options"""
        return isinstance(self.english, list) or (
            self.essential_translation is not None
            and isinstance(self.essential_translation, list)
        )


# Legacy aliases for backward compatibility
WordByWordItem = WordTranslation
WordTranslationOptions = WordTranslation
WordTranslationOption = WordTranslation
RefinedWordTranslation = WordTranslation


class TranslationResult(BaseModel):
    """Result from sentence translation step"""

    translation: str = Field(description="English translation - REQUIRED field")
    notes: str = Field(description="Translation notes and context - REQUIRED field")
    uncertainties: list[Uncertainty] = Field(
        default_factory=list,
        description="Areas of uncertainty in translation - REQUIRED field, can be empty",
    )
    word_by_word: list[WordTranslation] = Field(
        default_factory=list,
        description="Word-by-word analysis - REQUIRED field, can be empty",
    )


class TashkeelResult(BaseModel):
    """Result from tashkeel addition step"""

    tashkeel: str = Field(
        description="Text with diacritical marks added - REQUIRED field"
    )
    uncertainties: list[Uncertainty] = Field(
        default_factory=list,
        description="Uncertain diacritical marks - REQUIRED field, can be empty",
    )

    @field_validator("tashkeel")
    @classmethod
    def validate_arabic_text(cls, v: str) -> str:
        """Validate and normalize Arabic text for proper processing."""
        if not v or not v.strip():
            raise ValueError("Tashkeel text cannot be empty")

        # Normalize Unicode to handle Arabic script variations
        normalized = unicodedata.normalize("NFC", v)

        # Check for basic Arabic content (allowing diacritics and punctuation)
        arabic_pattern = re.compile(
            r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]"
        )
        if not arabic_pattern.search(normalized):
            raise ValueError("Text must contain Arabic characters")

        return normalized


class WordTranslationResult(BaseModel):
    """Result from word-by-word translation step"""

    word_translations: list[WordTranslation] = Field(
        description="Word translation options before refinement"
    )


class RefinementResult(BaseModel):
    """Result from final refinement step"""

    improved_tashkeel: str = Field(description="Refined diacritical marks")
    improved_translation: str = Field(description="Refined translation")
    improved_word_translations: list[WordTranslation] = Field(
        description="Final refined word translations"
    )
    resolved_uncertainties: list[Uncertainty] | None = Field(
        default=None, description="Uncertainties that were resolved"
    )
    remaining_uncertainties: list[Uncertainty] | None = Field(
        default=None, description="Uncertainties that remain unresolved"
    )
    changes_made: list[str] | None = Field(
        default=None, description="List of changes made during refinement"
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
    """Base metadata about text content"""

    model_config = {"use_enum_values": True}

    title: str = Field(description="Concise English title (3-7 words)")
    summary: str = Field(description="One-sentence summary of main content")
    difficulty_level: DifficultyLevel = Field(description="Difficulty rating (1-5)")
    total_units: int = Field(description="Total number of units")


class SplitResult(TextMetadata):
    """Complete result from text splitting phase"""

    units: list[str] = Field(description="Array of text units/sentences")
    unit_types: list[UnitType] | None = Field(
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

    model_config = {"use_enum_values": True}

    title: str = Field(description="Article title")
    summary: str = Field(description="Article summary")
    difficulty_level: DifficultyLevel = Field(description="Difficulty level")
    category_id: int = Field(description="Category ID in database")
    author_id: int = Field(description="Author ID in database")
    content_hash: str = Field(description="SHA-256 hash of content for deduplication")
    created_at: str = Field(description="ISO format timestamp")


class TranslationValidationError(Exception):
    """Custom exception for translation validation errors"""

    pass
