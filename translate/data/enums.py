"""
Enums for the translation system to provide type safety and consolidate constants.
"""

from enum import Enum, IntEnum


class PartOfSpeech(Enum):
    """Valid parts of speech for Arabic words."""

    VERB = "verb"
    NOUN = "noun"
    PARTICLE = "particle"
    ADJECTIVE = "adjective"
    PRONOUN = "pronoun"
    ADVERB = "adverb"
    PREPOSITION = "preposition"
    CONJUNCTION = "conjunction"
    INTERJECTION = "interjection"
    NUMERAL = "numeral"

    @classmethod
    def values(cls) -> list[str]:
        """Get all valid POS values as a list."""
        return [pos.value for pos in cls]

    @classmethod
    def format_for_prompt(cls) -> str:
        """Format POS values as a readable list for prompts."""
        return ", ".join(f"'{pos.value}'" for pos in sorted(cls, key=lambda x: x.value))


class DifficultyLevel(IntEnum):
    """Difficulty levels for Islamic texts."""

    BASIC = 1
    ELEMENTARY = 2
    INTERMEDIATE = 3
    ADVANCED = 4
    EXPERT = 5

    @property
    def description(self) -> str:
        """Get the description for this difficulty level."""
        descriptions = {
            DifficultyLevel.BASIC: "Basic - Simple vocabulary and grammar",
            DifficultyLevel.ELEMENTARY: "Elementary - Common vocabulary with basic grammar structures",
            DifficultyLevel.INTERMEDIATE: "Intermediate - Mixed vocabulary with moderate grammar complexity",
            DifficultyLevel.ADVANCED: "Advanced - Specialized vocabulary with complex grammar",
            DifficultyLevel.EXPERT: "Expert - Technical/scholarly vocabulary with intricate grammar",
        }
        return descriptions[self]

    @classmethod
    def format_for_prompt(cls) -> str:
        """Format difficulty levels as a readable list for prompts."""
        return "\n".join(
            f"Level {level.value}: {level.description}"
            for level in sorted(cls, key=lambda x: x.value)
        )

    @classmethod
    def values(cls) -> list[int]:
        """Get all valid difficulty level values as a list."""
        return [level.value for level in cls]


class UnitType(Enum):
    """Types of text units for splitting."""

    SIMPLE = "simple"
    COMPOUND = "compound"
    CONDITION = "condition"
    QUOTE = "quote"
    VERSE = "verse"
    PHRASE = "phrase"

    @classmethod
    def values(cls) -> list[str]:
        """Get all valid unit type values as a list."""
        return [unit_type.value for unit_type in cls]


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


class UncertaintyType(Enum):
    """Types of uncertainties in the translation process."""

    TRANSLATION = "translation"
    TASHKEEL = "tashkeel"
    WORD_MEANING = "word_meaning"
    GRAMMAR = "grammar"
    CONTEXT = "context"

    @classmethod
    def values(cls) -> list[str]:
        """Get all valid uncertainty type values as a list."""
        return [uncertainty_type.value for uncertainty_type in cls]


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
