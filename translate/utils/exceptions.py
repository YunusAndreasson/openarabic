"""Custom exceptions for the translation pipeline."""


class TranslationError(Exception):
    """Custom exception for translation failures"""


class AudioGenerationError(Exception):
    """Custom exception for audio generation failures"""


class ConfigurationError(Exception):
    """Custom exception for configuration issues"""


class DatabaseError(Exception):
    """Custom exception for database operations"""


class ValidationError(Exception):
    """Custom exception for data validation failures"""
