"""Central configuration for the translation tools."""

import os

from elevenlabs import VoiceSettings

# OpenAI model configuration - Valid model names per project standards
# Use gpt-4o-mini for high-volume phases and gpt-4o for verification
MODEL_ANALYSIS = "gpt-5"  # Fast, cost-effective text splitting
MODEL_TRANSLATION = "gpt-5"  # Reliable Arabic translation with structured output
MODEL_OTHER = "gpt-4o"  # Tashkeel generation and other structured steps
MODEL_VERIFICATION = "gpt-5"  # Quality-critical verification phase

# Batch processing defaults
DEFAULT_BATCH_SIZE = 12
MAX_BATCH_SIZE = 12

# Directory structure
ROOT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."),
)
ARTICLE_DIR = os.path.join(ROOT_DIR, "article")
ARCHIVE_DIR = os.path.join(ROOT_DIR, "archive")
AUDIO_CACHE_DIR = os.path.join(ROOT_DIR, "audio_cache")
AUDIO_TEMP_DIR = os.path.join(ROOT_DIR, "audio")

# Pipeline directory structure
INBOX_DIR = os.path.join(ROOT_DIR, "0_inbox")
SPLIT_DIR = os.path.join(ROOT_DIR, "1_split")
TRANSLATE_DIR = os.path.join(ROOT_DIR, "2_translate")
INSERT_DIR = os.path.join(ROOT_DIR, "3_insert")

# Default file paths (legacy support)
DEFAULT_INPUT_FILE = os.path.join(ARTICLE_DIR, "input.txt")
DEFAULT_OUTPUT_FILE = os.path.join(ARTICLE_DIR, "output.json")
DEFAULT_SPLIT_OUTPUT_FILE = os.path.join(ARTICLE_DIR, "input_split.json")

# Voice configuration
# Switch to male Arabic-capable voices by default (no env overrides).
# Common public male multilingual voice example (Arabic-capable): "yoZ06aMxZJJ28mfd3POQ" (Josh)
ARABIC_VOICE_ID = "yoZ06aMxZJJ28mfd3POQ"
ARABIC_WORD_VOICE_ID = ARABIC_VOICE_ID
ENGLISH_WORD_VOICE_ID = "IKne3meq5aSn9XLyUdCD"

# ElevenLabs TTS model (Multilingual v3)
ELEVENLABS_TTS_MODEL_ID = "eleven_multilingual_v3"

DEFAULT_VOICE_SETTINGS = VoiceSettings(use_speaker_boost=True)

# External services
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_ORG_ID = os.getenv("OPENAI_ORG_ID", "")

# Google Cloud Translate configuration
GOOGLE_CLOUD_PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT_ID", "")

# Translation settings for individual root words
TRANSLATION_BATCH_SIZE = 100  # Number of root words to process in a batch
TRANSLATION_RETRY_ATTEMPTS = 3
TRANSLATION_TIMEOUT = 30

# Author mapping for inbox folders and file prefixes
AUTHOR_FOLDER_MAPPING = {
    "1_al_imam_an_nawawi": "al-Imam an-Nawawi",
    "2_ibn_al_qayyim_al_jawziyyah": "Ibn al-Qayyim al-Jawziyyah",
    "3_ibn_taymiyyah": "Ibn Taymiyyah",
    "4_ibn_al_jawzi": "Ibn al-Jawzi",
    "5_ibn_kathir": "Ibn Kathir",
    "6_al_imam_al_bukhari": "al-Imam al-Bukhari",
    "7_al_imam_muslim": "al-Imam Muslim",
    "8_ibn_hajar_al_asqalani": "Ibn Hajar al-Asqalani",
    "9_al_imam_malik": "al-Imam Malik",
    "10_al_imam_ash_shafii": "al-Imam ash-Shafii",
    "11_al_imam_ahmad_ibn_hanbal": "al-Imam Ahmad ibn Hanbal",
    "12_al_imam_at_tirmidhi": "al-Imam at-Tirmidhi",
    "13_al_imam_as_suyuti": "al-Imam as-Suyuti",
    "14_at_tabari": "at-Tabari",
    "15_al_imam_al_dhahabi": "al-Imam al-Dhahabi",
}

# Derive author number mapping from folder mapping for single source of truth
AUTHOR_NUMBER_MAPPING = {
    folder.split("_")[0]: author_name
    for folder, author_name in AUTHOR_FOLDER_MAPPING.items()
}
