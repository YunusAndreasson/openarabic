"""Translation engine - core operations for the translation pipeline.

This package contains all translation engine operations:
- batch_ops: Batch sentence translation
- google_cloud: Google Cloud Translate integration
- helpers: Data processing helpers
- refinement: Translation refinement and verification
- tashkeel: Diacritical marks operations
- word_translation: Word-by-word translation
"""

# Re-export all functions from split modules
from .batch_ops import batch_translate_full_sentences
from .google_cloud import batch_translate_root_words_with_google_cloud
from .helpers import (
    _extract_response_data,
    _extract_tashkeel_data,
    _get_tashkeel_data,
    _get_translation_data,
    _handle_arabic_processing_error,
    _sanitize_refinement_data,
    _sanitize_word_translation_data,
    _validate_uncertainties,
    _validate_word_data,
)
from .refinement import batch_refine_translations
from .tashkeel import batch_add_tashkeel
from .word_translation import batch_translate_words

__all__ = [
    # Batch operations
    "batch_translate_full_sentences",
    "batch_add_tashkeel",
    "batch_translate_words",
    "batch_translate_root_words_with_google_cloud",
    "batch_refine_translations",
    # Helper functions (for internal use and tests)
    "_validate_uncertainties",
    "_extract_response_data",
    "_extract_tashkeel_data",
    "_get_tashkeel_data",
    "_get_translation_data",
    "_handle_arabic_processing_error",
    "_sanitize_refinement_data",
    "_sanitize_word_translation_data",
    "_validate_word_data",
]
