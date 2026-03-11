"""Pydantic models for inline DeepSeek translation correction.

These models define the structure for correction requests and responses
when using DeepSeek to review and fix OpenAI translations.
"""

from pydantic import BaseModel, ConfigDict, Field

# =============================================================================
# Input Models - What we send to DeepSeek
# =============================================================================


class ArticleContext(BaseModel):
    """Article-level context for translation correction."""

    model_config = ConfigDict(frozen=True)

    title: str = Field(default="", description="Article title")
    summary: str = Field(default="", description="Article summary/description")

    def is_empty(self) -> bool:
        """Check if context has any meaningful content."""
        return not self.title and not self.summary


class SentenceContext(BaseModel):
    """Minimal context for a surrounding sentence (prev/next)."""

    model_config = ConfigDict(frozen=True)

    arabic: str = Field(description="Original Arabic text")
    english: str = Field(description="English translation")


class WordInput(BaseModel):
    """Word translation data for correction input."""

    model_config = ConfigDict(frozen=True)

    arabic: str
    english: str
    essential: str
    essential_translation: str


class SentenceCorrectionInput(BaseModel):
    """Input data for a sentence requiring correction."""

    model_config = ConfigDict(frozen=True)

    sentence_index: int
    original_arabic: str
    tashkeel: str
    full_translation: str
    previous_sentence: SentenceContext | None = None
    next_sentence: SentenceContext | None = None
    word_translations: list[WordInput]


# =============================================================================
# Output Models - What DeepSeek returns
# =============================================================================


class WordCorrection(BaseModel):
    """Correction for a single word translation (only include words that were changed)."""

    model_config = ConfigDict(strict=True, extra="forbid")

    arabic: str = Field(description="Original Arabic word (used to match)")
    corrected_english: str = Field(
        description="Fixed English translation (may be multi-word for morphemes)"
    )
    corrected_essential: str = Field(description="Fixed essential/root form in Arabic")
    corrected_essential_translation: str = Field(
        description="Fixed English translation of essential form"
    )
    correction_reason: str = Field(description="Why correction was needed")


class SentenceCorrectionResponse(BaseModel):
    """Correction response for a complete sentence translation."""

    model_config = ConfigDict(strict=True, extra="forbid")

    sentence_index: int = Field(description="Index of the sentence in the batch")
    corrected_full_translation: str = Field(
        description="Fixed full English translation of the sentence"
    )
    corrected_tashkeel: str | None = Field(
        default=None, description="Fixed Arabic with diacritics (if needed)"
    )
    word_corrections: list[WordCorrection] = Field(
        default_factory=list,
        description="Only words that were corrected (omit unchanged words)",
    )
    issues_unfixable: list[str] = Field(
        default_factory=list, description="Issues that could not be auto-corrected"
    )


class DeepSeekCorrectionBatchResponse(BaseModel):
    """Batch response containing corrections for multiple sentences."""

    model_config = ConfigDict(strict=True, extra="forbid")

    corrections: list[SentenceCorrectionResponse] = Field(
        description="List of corrections, one per input sentence"
    )
