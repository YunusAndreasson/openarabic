"""
Enums for the translation system to provide type safety and consolidate constants.
"""

from enum import Enum


class PartOfSpeech(str, Enum):
    """Part of speech for Arabic words"""

    NOUN = "noun"
    VERB = "verb"
    ADJECTIVE = "adjective"
    ADVERB = "adverb"
    PRONOUN = "pronoun"
    PREPOSITION = "preposition"
    CONJUNCTION = "conjunction"
    INTERJECTION = "interjection"
    PARTICLE = "particle"
    NUMERAL = "numeral"
    PROPER_NOUN = "proper_noun"
    DEMONSTRATIVE_PRONOUN = "demonstrative_pronoun"
    RELATIVE_PRONOUN = "relative_pronoun"


class DifficultyLevel(int, Enum):
    """Difficulty level for text content"""

    BASIC = 1
    ELEMENTARY = 2
    INTERMEDIATE = 3
    ADVANCED = 4
    EXPERT = 5


class UnitType(str, Enum):
    """Type of text unit for splitting"""

    SIMPLE = "simple"
    COMPOUND = "compound"
    CONDITION = "condition"
    QUOTE = "quote"
    VERSE = "verse"
    PHRASE = "phrase"
    NARRATOR_CHAIN = "narrator_chain"
    PRAYER = "prayer"
    HADITH = "hadith"
    COMMENTARY = "commentary"


class PipelinePhase(Enum):
    """Phases of the translation pipeline."""

    SPLIT = "split"
    TRANSLATION = "translation"
    TASHKEEL = "tashkeel"
    WORD_ANALYSIS = "word_analysis"
    REFINEMENT = "refinement"
    AUDIO = "audio"
    DATABASE = "database"

    @classmethod
    def values(cls) -> list[str]:
        """Get all valid pipeline phase values as a list."""
        return [phase.value for phase in cls]


class UncertaintyType(str, Enum):
    """Type of uncertainty in translation"""

    GRAMMAR = "grammar"
    VOCABULARY = "vocabulary"
    CONTEXT = "context"
    TASHKEEL = "tashkeel"
    TRANSLATION = "translation"
    CULTURAL = "cultural"
    TECHNICAL = "technical"
    AMBIGUITY = "ambiguity"


class VerificationStatus(str, Enum):
    """Status of translation verification"""

    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"
    NEEDS_REVIEW = "needs_review"


class ErrorType(Enum):
    """Types of errors in the translation process."""

    API_ERROR = "api_error"
    VALIDATION_ERROR = "validation_error"
    DATABASE_ERROR = "database_error"
    AUDIO_ERROR = "audio_error"
    FORMAT_ERROR = "format_error"
    TRANSLATION_ERROR = "translation_error"

    @classmethod
    def values(cls) -> list[str]:
        """Get all valid error type values as a list."""
        return [error_type.value for error_type in cls]
