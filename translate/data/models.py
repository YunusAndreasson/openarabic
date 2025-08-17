import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from .enums import (
    DifficultyLevel,
    PartOfSpeech,
    UncertaintyType,
    VerificationStatus,
)


class Uncertainty(BaseModel):
    """Unified uncertainty model that handles all types of uncertainties in the translation pipeline"""

    model_config = {"use_enum_values": True, "extra": "forbid"}

    # Core uncertainty fields - using union with "unknown" instead of None
    text: str | Literal["unknown"] = Field(
        default="unknown",
        description="The uncertain text (for word/translation uncertainties)",
    )
    word: str | Literal["unknown"] = Field(
        default="unknown",
        description="Word with uncertain diacritics (for tashkeel uncertainties)",
    )
    type: UncertaintyType | Literal["unknown"] = Field(
        default="unknown",
        description="Type of uncertainty (for remaining uncertainties)",
    )
    reason: str = Field(default="unknown", description="Reason for uncertainty")

    # Resolution fields - using union with "unknown" instead of None
    step: str | Literal["unknown"] = Field(
        default="unknown",
        description="Processing step where uncertainty was resolved",
    )
    resolution: str | Literal["unknown"] = Field(
        default="unknown", description="How the uncertainty was resolved"
    )
    explanation: str | Literal["unknown"] = Field(
        default="unknown", description="Explanation of the resolution"
    )

    # Related fields - using union with "unknown" instead of None
    related_translation_uncertainty: str | Literal["unknown"] = Field(
        default="unknown",
        description="Related translation uncertainty (for tashkeel uncertainties)",
    )
    original_uncertainty: dict[str, str] | Literal["unknown"] = Field(
        default="unknown",
        description="Original uncertainty with text and reason (for resolved uncertainties)",
    )
    reason_unresolved: str | Literal["unknown"] = Field(
        default="unknown",
        description="Reason why uncertainty could not be resolved (for remaining uncertainties)",
    )

    @property
    def is_resolved(self) -> bool:
        """Check if this uncertainty has been resolved"""
        return self.step != "unknown" and self.resolution != "unknown"

    @property
    def is_tashkeel_uncertainty(self) -> bool:
        """Check if this is a tashkeel/diacritical uncertainty"""
        return self.word != "unknown"

    @property
    def is_word_uncertainty(self) -> bool:
        """Check if this is a word/translation uncertainty"""
        return self.text != "unknown" and self.word == "unknown"


# Legacy aliases for backward compatibility
WordUncertainty = Uncertainty
TranslationUncertainty = Uncertainty
TashkeelUncertainty = Uncertainty
ResolvedUncertainty = Uncertainty
RemainingUncertainty = Uncertainty


class WordTranslation(BaseModel):
    """Unified word-level translation model that handles both single translations and translation options"""

    model_config = {"use_enum_values": True, "extra": "forbid"}

    arabic: str = Field(description="Original Arabic word - preserve exact formatting")
    english: str | list[str] = Field(
        description="English translation(s) - single string for final translation, list for options"
    )
    pos: PartOfSpeech | Literal["unknown"] = Field(description="Part of speech")
    essential: str | Literal["unknown"] = Field(
        description="Essential letters for flashcards - core letters without affixes"
    )
    essential_translation: str | list[str] | Literal["unknown"] = Field(
        description="Essential translation(s) - single string for final, list for options"
    )
    notes: str = Field(description="Translation notes and grammar context")
    uncertainties: list[Uncertainty] = Field(
        description="Uncertainties related to this word translation"
    )

    @property
    def is_final(self) -> bool:
        """Check if this is a final translation (single values) or options (lists)"""
        return isinstance(self.english, str) and (
            self.essential_translation == "unknown"
            or isinstance(self.essential_translation, str)
        )

    @property
    def has_options(self) -> bool:
        """Check if this contains translation options"""
        return isinstance(self.english, list) or (
            self.essential_translation != "unknown"
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
        description="Areas of uncertainty in translation - REQUIRED field, can be empty"
    )
    word_by_word: list[WordTranslation] = Field(
        description="Word-by-word translations - REQUIRED field"
    )


class TashkeelResult(BaseModel):
    """Result from tashkeel addition step"""

    tashkeel: str = Field(
        description="Text with diacritical marks added - REQUIRED field"
    )
    uncertainties: list[Uncertainty] = Field(
        description="Uncertainties in tashkeel addition - REQUIRED field"
    )

    @field_validator("tashkeel")
    @classmethod
    def validate_arabic_text(cls, v: str) -> str:
        """Validate that tashkeel text contains Arabic characters"""
        if not v or not v.strip():
            raise ValueError("Tashkeel text cannot be empty")

        # Check for Arabic characters (including diacritics)
        arabic_pattern = re.compile(
            r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]"
        )
        if not arabic_pattern.search(v):
            raise ValueError("Tashkeel text must contain Arabic characters")

        return v.strip()


class WordTranslationResult(BaseModel):
    """Result from word-by-word translation step"""

    word_translations: list[WordTranslation] = Field(
        description="Word-by-word translations - REQUIRED field"
    )


class RefinementResult(BaseModel):
    """Result from final refinement step"""

    improved_tashkeel: str = Field(description="Refined diacritical marks")
    improved_translation: str = Field(description="Refined translation")
    improved_word_translations: list[WordTranslation] = Field(
        description="Final refined word translations"
    )
    resolved_uncertainties: list[Uncertainty] | Literal["unknown"] = Field(
        description="Uncertainties that were resolved"
    )
    remaining_uncertainties: list[Uncertainty] | Literal["unknown"] = Field(
        description="Uncertainties that remain unresolved"
    )
    changes_made: list[str] | Literal["unknown"] = Field(
        description="List of changes made during refinement"
    )


class SentenceTranslation(BaseModel):
    """Complete sentence translation with all components"""

    index: int = Field(description="Sentence index", ge=0)
    original: str = Field(description="Original Arabic text")
    tashkeel: str = Field(description="Original with diacritical marks")
    word_by_word: list[WordTranslation] = Field(description="Stores final chosen words")
    full_translation: str = Field(description="Complete English translation")
    notes: str = Field(description="Translation notes and context")
    verification_status: VerificationStatus | Literal["unknown"] = Field(
        description="Status of translation verification"
    )
    verification_issues: list[str] | Literal["unknown"] = Field(
        description="Issues found during verification"
    )


class TextMetadata(BaseModel):
    """Base metadata about text content"""

    model_config = {"use_enum_values": True, "extra": "forbid"}

    title: str | Literal["unknown"] = Field(
        default="unknown", description="Concise English title (3-7 words)"
    )
    summary: str | Literal["unknown"] = Field(
        default="unknown", description="One-sentence summary of main content"
    )
    difficulty_level: DifficultyLevel | Literal["unknown"] = Field(
        default="unknown", description="Difficulty rating (1-5)"
    )
    total_units: int = Field(default=0, description="Total number of units", ge=0)


class SplitResult(TextMetadata):
    """Complete result from text splitting phase"""

    units: list[str] = Field(
        default_factory=list, description="Array of text units/sentences"
    )


class WordTiming(BaseModel):
    """Word-level timing information from audio generation"""

    word: str = Field(description="Original Arabic word")
    cleaned_word: str = Field(description="Cleaned word for matching")
    start_time: str = Field(
        description="Start time in seconds", pattern=r"^\d+(\.\d+)?$"
    )
    end_time: str = Field(description="End time in seconds", pattern=r"^\d+(\.\d+)?$")


class AudioResult(BaseModel):
    """Result from audio generation"""

    url: str = Field(description="Audio file URL in storage")
    word_timings: list[WordTiming] = Field(description="Word-level timing information")
    filename: str | Literal["unknown"] = Field(description="Generated filename")
    duration: float | Literal["unknown"] = Field(
        description="Audio duration in seconds"
    )


class ArticleData(BaseModel):
    """Data structure for article insertion"""

    model_config = {"use_enum_values": True, "extra": "forbid"}

    title: str = Field(description="Article title")
    summary: str = Field(description="Article summary")
    difficulty_level: DifficultyLevel = Field(description="Difficulty level")
    category_id: int = Field(description="Category ID in database", ge=1)
    author_id: int = Field(description="Author ID in database", ge=1)
    content_hash: str = Field(
        description="SHA-256 hash of content for deduplication",
        pattern=r"^[a-f0-9]{64}$",
    )
    created_at: str = Field(
        description="ISO format timestamp",
        pattern=r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(\+00:00|Z)?$",
    )
    image_url: str = Field(description="URL to article image")
    audio_url: str = Field(
        description="URL to article audio. Required for database insertion."
    )


class TranslationValidationError(Exception):
    """Custom exception for translation validation errors"""

    pass
