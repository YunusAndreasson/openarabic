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
