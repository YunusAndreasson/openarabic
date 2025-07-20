"""Custom exceptions for the translation pipeline."""


class TranslationError(Exception):
    """Custom exception for translation failures"""

    pass


class AudioGenerationError(Exception):
    """Custom exception for audio generation failures"""

    pass


class ConfigurationError(Exception):
    """Custom exception for configuration issues"""

    pass


class DatabaseError(Exception):
    """Custom exception for database operations"""

    pass


class ValidationError(Exception):
    """Custom exception for data validation failures"""

    pass
