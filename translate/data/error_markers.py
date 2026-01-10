"""Standardized error markers for translation pipeline."""

TRANSLATION_ERROR_MARKERS = [
    "[Translation failed]",
    "[Translation Error]",
    "[Fallback Error]",
    "[API Error]",
    "[Validation Error]",
    "[Format Error]",
    "[BATCH PROCESSING ERROR]",
    "[Error]",
    "[Fallback]",
    "[Missing]",
]

# Error markers that indicate critical failures
CRITICAL_ERROR_MARKERS = [
    "[Translation failed]",
    "[Translation Error]",
    "[API Error]",
    "[BATCH PROCESSING ERROR]",
]

# Error markers that indicate fallback usage
FALLBACK_ERROR_MARKERS = [
    "[Fallback Error]",
    "[Fallback]",
    "[Missing]",
]
