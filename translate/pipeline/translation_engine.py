"""Translation engine - facade module for backwards compatibility.

This module re-exports all translation engine functions from the engine subpackage
to maintain backwards compatibility with existing imports.

New code should import directly from pipeline.engine instead.
"""

# Re-export all functions from the engine subpackage
from .engine import (
    _extract_response_data,
    _extract_tashkeel_data,
    _get_tashkeel_data,
    _get_translation_data,
    _handle_arabic_processing_error,
    _sanitize_refinement_data,
    _sanitize_word_translation_data,
    _validate_uncertainties,
    _validate_word_data,
    batch_add_tashkeel,
    batch_refine_translations,
    batch_translate_full_sentences,
    batch_translate_root_words_with_google_cloud,
    batch_translate_words,
)

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
