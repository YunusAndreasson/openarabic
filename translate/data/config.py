"""Central configuration for the translation tools."""

import os

from elevenlabs import VoiceSettings

# OpenAI model configuration - Optimized for Arabic processing based on research
# gpt-4o: Proven Arabic handling, faster and more cost-effective for general structured outputs
# o1-mini: Superior Arabic reasoning, fewer hallucinations, accuracy-critical verification
# Trade-off: o1-mini is 16-30x slower but much better for Arabic verification
MODEL_ANALYSIS = (
    "gpt-4o-mini"  # Fast, cost-effective text splitting (minimal Arabic complexity)
)
MODEL_TRANSLATION = (
    "gpt-4o"  # Reliable Arabic translation with good structured output compliance
)
MODEL_OTHER = "gpt-4o"  # Solid Arabic tashkeel generation with schema enforcement
MODEL_VERIFICATION = "o1-mini"  # Superior Arabic reasoning and verification - worth the cost for accuracy

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
# Using multilingual voices that support Arabic text
ARABIC_VOICE_ID = (
    "21m00Tcm4TlvDq8ikWAM"  # Rachel - multilingual voice supporting Arabic
)
ARABIC_WORD_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Rachel for Arabic words
ENGLISH_WORD_VOICE_ID = "IKne3meq5aSn9XLyUdCD"  # Keep existing English voice
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

# Author number to name mapping for flat file structure
AUTHOR_NUMBER_MAPPING = {
    "1": "al-Imam an-Nawawi",
    "2": "Ibn al-Qayyim al-Jawziyyah",
    "3": "Ibn Taymiyyah",
    "4": "Ibn al-Jawzi",
    "5": "Ibn Kathir",
    "6": "al-Imam al-Bukhari",
    "7": "al-Imam Muslim",
    "8": "Ibn Hajar al-Asqalani",
    "9": "al-Imam Malik",
    "10": "al-Imam ash-Shafii",
    "11": "al-Imam Ahmad ibn Hanbal",
    "12": "al-Imam at-Tirmidhi",
    "13": "al-Imam as-Suyuti",
    "14": "at-Tabari",
    "15": "al-Imam al-Dhahabi",
}
