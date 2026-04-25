"""Central configuration for the translation tools."""

import os
import tempfile
from typing import TypedDict


class VoiceSettingsDict(TypedDict, total=False):
    """Type definition for ElevenLabs VoiceSettings parameters."""

    stability: float
    similarity_boost: float
    use_speaker_boost: bool
    speed: float


# OpenAI model configuration - Valid model names per project standards

MODEL_ANALYSIS = "gpt-5-mini"
MODEL_TRANSLATION = "gpt-5-mini"
MODEL_OTHER = "gpt-5-mini"
MODEL_VERIFICATION = "gpt-5-mini"

# Claude CLI configuration - use Claude CLI (via Max subscription) instead of OpenAI API
USE_CLAUDE_CLI = False
CLAUDE_CLI_MODEL = "haiku"  # "sonnet", "opus", or "haiku"

# Directory structure
ROOT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."),
)
ARTICLE_DIR = os.path.join(ROOT_DIR, "article")
ARCHIVE_DIR = os.path.join(ROOT_DIR, "archive")
# Temporary audio files (system temp dir, auto-cleaned by OS)
AUDIO_TEMP_DIR = os.path.join(tempfile.gettempdir(), "openarabic-audio")

# Pipeline directory structure
INBOX_DIR = os.path.join(ROOT_DIR, "0_inbox")
SPLIT_DIR = os.path.join(ROOT_DIR, "1_split")
TRANSLATE_DIR = os.path.join(ROOT_DIR, "2_translate")

# Default file paths (legacy support)
DEFAULT_INPUT_FILE = os.path.join(ARTICLE_DIR, "input.txt")
DEFAULT_OUTPUT_FILE = os.path.join(ARTICLE_DIR, "output.json")
DEFAULT_SPLIT_OUTPUT_FILE = os.path.join(ARTICLE_DIR, "input_split.json")

# Voice configuration
ARABIC_VOICE_ID = "R6nda3uM038xEEKi7GFl"  # Keep for sentence audio only

# Arabic voice settings for ElevenLabs API compatibility
ARABIC_VOICE_SETTINGS: VoiceSettingsDict = {
    "use_speaker_boost": True,  # Enhanced speaker clarity
    "speed": 1.0,  # Natural speed (pacing controlled by [slowly] audio tag)
}

# English voice IDs
ENGLISH_VOICE_ID = "NFG5qt843uXKj4pFvR7C"  # Adam - Clear, natural English voice

# ElevenLabs TTS - Premium Configuration
ELEVENLABS_TTS_MODEL_ID = "eleven_v3"  # Latest multilingual model for best quality

# Voice settings for ElevenLabs API compatibility
DEFAULT_VOICE_SETTINGS: VoiceSettingsDict = {
    "use_speaker_boost": True,  # Enhanced speaker clarity
    "speed": 1.0,  # Natural speed (pacing controlled by [slowly] audio tag)
}

# English voice settings for bilingual audio - Optimized for quality and stability
ENGLISH_VOICE_SETTINGS: VoiceSettingsDict = {
    "stability": 0.5,  # Natural stability (must be 0.0, 0.5, or 1.0 per ElevenLabs API)
    "similarity_boost": 1.0,  # Maximum similarity to original voice
    "use_speaker_boost": True,  # Enhanced speaker clarity
    "speed": 0.90,  # Slower for better clarity
}

# Audio pause configuration for bilingual audio
BILINGUAL_AUDIO_PAUSE_MS = 500  # 500ms pause between English and Arabic

# External services
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
_supabase_url = os.getenv("SUPABASE_URL", "")
# Supabase storage requires trailing slash
SUPABASE_URL = (
    _supabase_url
    if not _supabase_url or _supabase_url.endswith("/")
    else _supabase_url + "/"
)
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_ORG_ID = os.getenv("OPENAI_ORG_ID", "")

# Google Cloud configuration
GOOGLE_CLOUD_PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT_ID", "")
GOOGLE_CLOUD_CREDENTIALS_PATH = os.getenv("GOOGLE_CLOUD_CREDENTIALS_PATH", "")

# Translation settings for individual root words
TRANSLATION_RETRY_ATTEMPTS = 3

# Author mapping for inbox folders and file prefixes
AUTHOR_FOLDER_MAPPING = {
    "1_al_imam_an_nawawi": "an-Nawawi",
    "2_ibn_al_qayyim": "Ibn al-Qayyim",
    "3_ibn_taymiyyah": "Ibn Taymiyyah",
    "4_ibn_al_jawzi": "Ibn al-Jawzi",
    "5_ibn_kathir": "Ibn Kathir",
    "6_al_imam_al_bukhari": "al-Imam al-Bukhari",
    "7_al_imam_muslim": "Muslim",
    "8_ibn_hajar_al_asqalani": "Ibn Hajar",
    "9_al_imam_malik": "Malik",
    "10_al_imam_ash_shafii": "ash-Shafii",
    "11_al_imam_ahmad_ibn_hanbal": "Ahmad ibn Hanbal",
    "12_al_imam_at_tirmidhi": "at-Tirmidhi",
    "13_al_imam_as_suyuti": "as-Suyuti",
    "14_at_tabari": "at-Tabari",
    "15_al_imam_al_dhahabi": "adh-Dhahabi",
}

# Derive author number mapping from folder mapping for single source of truth
AUTHOR_NUMBER_MAPPING = {
    folder.split("_")[0]: author_name
    for folder, author_name in AUTHOR_FOLDER_MAPPING.items()
}

# Valid article categories - must match database categories
VALID_CATEGORIES = {
    "aqeedah": "Islamic creed and belief",
    "fiqh": "Islamic jurisprudence",
    "hadith": "Prophetic traditions",
    "quran": "Quranic studies",
    "seerah": "Biography of Prophet Muhammad",
    "ihsan": "Spiritual excellence and worship",
    "tafsir": "Quranic exegesis",
}

# OpenRouter configuration for validation
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEEPSEEK_MODEL = "deepseek/deepseek-v3.2"  # Latest DeepSeek v3.2 model
VALIDATION_MAX_RETRIES = 3

# Split phase configuration
MAX_UNIT_WORD_COUNT = 15  # Maximum words per unit; longer units are re-split

# Batch processing configuration
MAX_TRANSLATION_BATCH_SIZE = 12  # Maximum sentences per translation batch
DEEPSEEK_CORRECTION_BATCH_SIZE = 5  # Sentences per DeepSeek correction batch
MAX_PARALLEL_API_CALLS = 6  # Max concurrent API calls for standalone stages

# API optimization
API_SERVICE_TIER = "default"  # Standard tier for regular latency
