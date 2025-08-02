from .config import (
    ARABIC_VOICE_ID,
    ARABIC_WORD_VOICE_ID,
    ARCHIVE_DIR,
    AUDIO_CACHE_DIR,
    AUDIO_TEMP_DIR,
    DEFAULT_BATCH_SIZE,
    DEFAULT_INPUT_FILE,
    DEFAULT_OUTPUT_FILE,
    DEFAULT_SPLIT_OUTPUT_FILE,
    DEFAULT_VOICE_SETTINGS,
    ELEVENLABS_API_KEY,
    ENGLISH_WORD_VOICE_ID,
    MODEL_ANALYSIS,
    MODEL_OTHER,
    MODEL_TRANSLATION,
    MODEL_VERIFICATION,
    OPENAI_API_KEY,
    OPENAI_ORG_ID,
    ROOT_DIR,
    SUPABASE_KEY,
    SUPABASE_URL,
)
from .models import (
    SentenceTranslation,
    TextMetadata,
    TranslationValidationError,
    WordTranslation,
    WordTranslationOptions,
)
from .schemas import (
    FINAL_VERIFICATION_USER_PROMPT,
    GENERAL_SYSTEM_PROMPT,
    SENTENCE_SPLITTING_USER_PROMPT,
    SENTENCE_TRANSLATION_USER_PROMPT,
    TASHKEEL_USER_PROMPT,
    WORD_BY_WORD_USER_PROMPT,
)

# Import error markers from constants
try:
    from constants.error_markers import (
        CRITICAL_ERROR_MARKERS,
        FALLBACK_ERROR_MARKERS,
        TRANSLATION_ERROR_MARKERS,
    )
except ImportError:
    # Fallback if constants module is not available
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
    CRITICAL_ERROR_MARKERS = [
        "[Translation failed]",
        "[Translation Error]",
        "[API Error]",
        "[BATCH PROCESSING ERROR]",
    ]
    FALLBACK_ERROR_MARKERS = [
        "[Fallback Error]",
        "[Fallback]",
        "[Missing]",
    ]

__all__ = [
    "DEFAULT_BATCH_SIZE",
    "DEFAULT_INPUT_FILE",
    "DEFAULT_OUTPUT_FILE",
    "DEFAULT_SPLIT_OUTPUT_FILE",
    "MODEL_ANALYSIS",
    "MODEL_TRANSLATION",
    "MODEL_OTHER",
    "MODEL_VERIFICATION",
    "OPENAI_API_KEY",
    "OPENAI_ORG_ID",
    "SUPABASE_KEY",
    "SUPABASE_URL",
    "ARABIC_VOICE_ID",
    "ARABIC_WORD_VOICE_ID",
    "AUDIO_CACHE_DIR",
    "AUDIO_TEMP_DIR",
    "DEFAULT_VOICE_SETTINGS",
    "ELEVENLABS_API_KEY",
    "ENGLISH_WORD_VOICE_ID",
    "ROOT_DIR",
    "ARCHIVE_DIR",
    "SentenceTranslation",
    "WordTranslation",
    "TextMetadata",
    "WordTranslationOptions",
    "TranslationValidationError",
    "GENERAL_SYSTEM_PROMPT",
    "SENTENCE_SPLITTING_USER_PROMPT",
    "SENTENCE_TRANSLATION_USER_PROMPT",
    "TASHKEEL_USER_PROMPT",
    "WORD_BY_WORD_USER_PROMPT",
    "FINAL_VERIFICATION_USER_PROMPT",
    "TRANSLATION_ERROR_MARKERS",
    "CRITICAL_ERROR_MARKERS",
    "FALLBACK_ERROR_MARKERS",
]
