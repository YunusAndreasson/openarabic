"""Central configuration for the translation tools."""

import os

# OpenAI model configuration - Valid model names per project standards

MODEL_ANALYSIS = "gpt-5-mini"
MODEL_TRANSLATION = "gpt-5-mini"
MODEL_OTHER = "gpt-4o"
MODEL_VERIFICATION = "gpt-5-mini"

# Batch processing defaults
DEFAULT_BATCH_SIZE = 12
MAX_BATCH_SIZE = 12

# Directory structure
ROOT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."),
)
ARTICLE_DIR = os.path.join(ROOT_DIR, "article")
ARCHIVE_DIR = os.path.join(ROOT_DIR, "archive")
# Audio directories - consolidated to use Supabase Storage as single source of truth
AUDIO_TEMP_DIR = os.path.join(
    ROOT_DIR, "temp_audio"
)  # Temporary files during generation only

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
ARABIC_VOICE_ID = "R6nda3uM038xEEKi7GFl"  # Keep for sentence audio only

# Arabic voice settings for ElevenLabs API compatibility
ARABIC_VOICE_SETTINGS = {
    "use_speaker_boost": True,  # Enhanced speaker clarity
    "speed": 0.8,  # Optimal speed for Arabic pronunciation
}

# English voice IDs - Primary and fallback options
ENGLISH_VOICE_ID = "NFG5qt843uXKj4pFvR7C"  # Adam - Clear, natural English voice
ENGLISH_VOICE_ID_FALLBACK = "21m00Tcm4TlvDq8ikWAM"  # Rachel - Backup option

# ElevenLabs TTS - Premium Configuration
ELEVENLABS_TTS_MODEL_ID = (
    "eleven_multilingual_v2"  # Latest multilingual model for best quality
)

# Voice settings for ElevenLabs API compatibility
DEFAULT_VOICE_SETTINGS = {
    "use_speaker_boost": True,  # Enhanced speaker clarity
    "speed": 0.8,  # Optimal speed for Arabic pronunciation
}

# English voice settings for bilingual audio
ENGLISH_VOICE_SETTINGS = {
    "use_speaker_boost": True,  # Enhanced speaker clarity
}

# Audio pause configuration for bilingual audio
BILINGUAL_AUDIO_PAUSE_MS = 500  # 500ms pause between English and Arabic

# External services
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_ORG_ID = os.getenv("OPENAI_ORG_ID", "")

# Google Cloud configuration
GOOGLE_CLOUD_PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT_ID", "")
GOOGLE_CLOUD_CREDENTIALS_PATH = os.getenv("GOOGLE_CLOUD_CREDENTIALS_PATH", "")

# Translation settings for individual root words
TRANSLATION_BATCH_SIZE = 20  # Number of root words to process in a batch
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
