# Literal import removed - no longer using "unknown" fallbacks

from pydantic import BaseModel, Field, field_validator, model_validator

from .enums import (
    DifficultyLevel,
    PartOfSpeech,
    UncertaintyType,
    VerificationStatus,
)


class Uncertainty(BaseModel):
    """Unified uncertainty model that handles all types of uncertainties in the translation pipeline"""

    model_config = {"use_enum_values": True, "extra": "forbid"}

    # Core uncertainty fields - simplified since database handles constraints
    text: str = Field(
        description="The uncertain text (for word/translation uncertainties)",
    )
    word: str = Field(
        description="Word with uncertain diacritics (for tashkeel uncertainties)",
    )
    type: UncertaintyType = Field(description="Type of uncertainty")
    reason: str = Field(description="Reason for uncertainty")

    # Resolution fields - simplified
    step: str = Field(description="Processing step where uncertainty was resolved")
    resolution: str = Field(description="How the uncertainty was resolved")
    explanation: str = Field(description="Explanation of the resolution")

    # Related fields - simplified
    related_translation_uncertainty: str = Field(
        description="Related translation uncertainty"
    )
    original_uncertainty: str = Field(description="Original uncertainty data")
    reason_unresolved: str = Field(
        description="Reason why uncertainty could not be resolved"
    )

    @property
    def is_resolved(self) -> bool:
        """Check if this uncertainty has been resolved"""
        return bool(self.step and self.resolution)

    @property
    def is_tashkeel_uncertainty(self) -> bool:
        """Check if this is a tashkeel/diacritical uncertainty"""
        return bool(self.word)

    @property
    def is_word_uncertainty(self) -> bool:
        """Check if this is a word/translation uncertainty"""
        return bool(self.text and not self.word)


# Legacy aliases for backward compatibility
WordUncertainty = Uncertainty
TranslationUncertainty = Uncertainty
TashkeelUncertainty = Uncertainty
ResolvedUncertainty = Uncertainty
RemainingUncertainty = Uncertainty


class WordTranslation(BaseModel):
    """Unified word-level translation model that handles both single translations and translation options"""

    model_config = {"use_enum_values": True, "extra": "forbid"}

    arabic: str = Field(description="Original Arabic word. Preserve exact formatting.")
    english: str | list[str] = Field(
        description="English translation(s). For options, include 1–3 concise choices ordered by likelihood."
    )
    pos: PartOfSpeech = Field(description="Part of speech from the allowed set.")
    essential: str = Field(
        description=(
            "Essential letters with diacritics (kesra, fetha, damma, etc),"
            " removing only complex affixes/case endings."
        )
    )
    essential_translation: str | list[str] = Field(
        description=(
            "Essential root meaning(s). For options, include 1–3 concise choices"
            " ordered by likelihood."
        )
    )
    notes: str | None = Field(
        default=None, description="Grammar/translation notes. Optional."
    )
    uncertainties: list[Uncertainty] = Field(
        default_factory=list, description="Uncertainties for this word. May be empty."
    )

    @property
    def is_final(self) -> bool:
        """Check if this is a final translation (single values) or options (lists)"""
        return isinstance(self.english, str) and isinstance(
            self.essential_translation, str
        )

    @property
    def has_options(self) -> bool:
        """Check if this contains translation options"""
        return isinstance(self.english, list) or (
            isinstance(self.essential_translation, list)
        )

    # --- Validators ---
    @field_validator("arabic")
    @classmethod
    def _strip_arabic(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("arabic must be a non-empty string")
        return v

    @field_validator("notes")
    @classmethod
    def _strip_notes(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        if not v:
            return None  # Convert empty string to None
        return v

    @field_validator("english")
    @classmethod
    def _validate_english(cls, v: str | list[str]) -> str | list[str]:
        if isinstance(v, list):
            if not v:
                raise ValueError("english options list cannot be empty")
            return v
        v = v.strip()
        if not v:
            raise ValueError("english must be a non-empty string")
        return v

    @field_validator("essential_translation")
    @classmethod
    def _validate_essential_translation(cls, v: str | list[str]) -> str | list[str]:
        if isinstance(v, list):
            if not v:
                raise ValueError("essential_translation options list cannot be empty")
            return v
        v = v.strip()
        if not v:
            raise ValueError("essential_translation must be a non-empty string")
        return v

    @field_validator("uncertainties")
    @classmethod
    def _ensure_uncertainties_present(cls, v: list[Uncertainty]) -> list[Uncertainty]:
        return v or []


# Legacy aliases for backward compatibility
WordByWordItem = WordTranslation
WordTranslationOptions = WordTranslation
WordTranslationOption = WordTranslation
RefinedWordTranslation = WordTranslation


class TranslationResult(BaseModel):
    """Result from sentence translation step"""

    translation: str = Field(description="English translation")
    notes: str = Field(description="Translation notes and context")
    uncertainties: list[Uncertainty] = Field(
        description="Areas of uncertainty in translation (may be empty)"
    )
    word_by_word: list[WordTranslation] = Field(description="Word-by-word translations")


class TashkeelResult(BaseModel):
    """Result from tashkeel addition step"""

    tashkeel: str = Field(
        description="Text with diacritical marks added - REQUIRED field"
    )
    uncertainties: list[Uncertainty] = Field(
        description="Uncertainties in tashkeel addition (may be empty)"
    )

    @field_validator("tashkeel")
    @classmethod
    def validate_arabic_text(cls, v: str) -> str:
        """Validate that tashkeel text is not empty"""
        v = v.strip()
        if not v:
            raise ValueError("Tashkeel text cannot be empty")
        return v


class WordTranslationResult(BaseModel):
    """Result from word-by-word translation step"""

    word_translations: list[WordTranslation] = Field(
        description="Word-by-word translations - REQUIRED field"
    )

    @field_validator("word_translations")
    @classmethod
    def _validate_word_translations(
        cls, v: list[WordTranslation]
    ) -> list[WordTranslation]:
        # Require at least one word translation
        if not v:
            raise ValueError("word_translations must contain at least one item")
        return v


class RefinementResult(BaseModel):
    """Result from final refinement step"""

    improved_tashkeel: str = Field(
        description="Refined diacritical marks with ambiguities resolved."
    )
    improved_translation: str = Field(
        description="Refined translation with ambiguities resolved."
    )
    improved_word_translations: list[WordTranslation] = Field(
        description=(
            "Final refined word translations. Each item must be finalized (single"
            " best choices, no option arrays)."
        )
    )
    resolved_uncertainties: list[Uncertainty] = Field(
        description="Uncertainties that were resolved (may be empty)"
    )
    remaining_uncertainties: list[Uncertainty] = Field(
        description="Uncertainties that remain unresolved (may be empty)"
    )
    changes_made: list[str] = Field(
        description="List of changes made during refinement (may be empty)"
    )

    @model_validator(mode="after")
    def _validate_finalized_word_translations(self) -> "RefinementResult":
        for wt in self.improved_word_translations:
            if wt.has_options or not wt.is_final:
                raise ValueError(
                    "Each improved_word_translation must be finalized with single 'english' and 'essential_translation' values"
                )
        return self


class SentenceTranslation(BaseModel):
    """Complete sentence translation with all components"""

    index: int = Field(description="Sentence index", ge=0)
    original: str = Field(description="Original Arabic text")
    tashkeel: str = Field(description="Original with diacritical marks")
    word_by_word: list[WordTranslation] = Field(description="Stores final chosen words")
    full_translation: str = Field(description="Complete English translation")
    notes: str = Field(description="Translation notes and context")
    verification_status: VerificationStatus = Field(
        description="Status of translation verification"
    )
    verification_issues: list[str] = Field(
        description="Issues found during verification (may be empty)"
    )


class TextMetadata(BaseModel):
    """Base metadata about text content"""

    model_config = {"use_enum_values": True, "extra": "forbid"}

    title: str = Field(description="Concise English title (3–7 words)")
    summary: str = Field(description="One-sentence summary of main content")
    difficulty_level: DifficultyLevel = Field(description="Difficulty rating (1–5)")
    total_units: int = Field(default=0, description="Total number of units", ge=0)


class SplitResult(TextMetadata):
    """Complete result from text splitting phase"""

    units: list[str] = Field(
        default_factory=list, description="Array of text units/sentences"
    )

    @model_validator(mode="after")
    def _sync_total_units(self) -> "SplitResult":
        self.total_units = len(self.units)
        return self


class AudioResult(BaseModel):
    """Result from audio generation"""

    url: str = Field(description="Audio file URL in storage")
    filename: str = Field(description="Generated filename")
    duration: float = Field(
        description="Audio duration in seconds", ge=0.0
    )


class BilingualAudioResult(BaseModel):
    """Result from bilingual audio generation (English + Arabic)"""

    url: str = Field(description="Bilingual audio file URL in storage")
    filename: str = Field(description="Generated filename")
    duration: float = Field(
        description="Total audio duration in seconds", ge=0.0
    )
    english_duration: float = Field(
        description="English audio duration in seconds", ge=0.0
    )
    arabic_duration: float = Field(
        description="Arabic audio duration in seconds", ge=0.0
    )
    pause_duration: float = Field(
        description="Pause duration between English and Arabic in seconds",
        default=0.5,
        ge=0.0,
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
    image_url: str = Field(description="URL to article image")
    audio_url: str = Field(
        description="URL to article audio. Required for database insertion."
    )


class TranslationValidationError(Exception):
    """Custom exception for translation validation errors"""

    pass
