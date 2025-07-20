"""Central configuration for the translation tools."""

import os

from elevenlabs import VoiceSettings

# OpenAI model configuration
MODEL_ANALYSIS = "gpt-4.1"
MODEL_TRANSLATION = "gpt-4.1"
MODEL_OTHER = "gpt-4o"
MODEL_VERIFICATION = "o4-mini"

# Batch processing defaults
DEFAULT_BATCH_SIZE = 5
MAX_BATCH_SIZE = 5

# Directory structure
ROOT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."),
)
ARTICLE_DIR = os.path.join(ROOT_DIR, "article")
ARCHIVE_DIR = os.path.join(ROOT_DIR, "archive")
AUDIO_CACHE_DIR = os.path.join(ROOT_DIR, "audio_cache")
AUDIO_TEMP_DIR = os.path.join(ROOT_DIR, "audio")

# Default file paths
DEFAULT_INPUT_FILE = os.path.join(ARTICLE_DIR, "input.txt")
DEFAULT_OUTPUT_FILE = os.path.join(ARTICLE_DIR, "output.json")
DEFAULT_SPLIT_OUTPUT_FILE = os.path.join(ARTICLE_DIR, "input_split.json")

# Voice configuration
ARABIC_VOICE_ID = "nPczCjzI2devNBz1zQrb"
ARABIC_WORD_VOICE_ID = "IES4nrmZdUBHByLBde0P"
ENGLISH_WORD_VOICE_ID = "IKne3meq5aSn9XLyUdCD"
DEFAULT_VOICE_SETTINGS = VoiceSettings(use_speaker_boost=True)

# External services
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_ORG_ID = os.getenv("OPENAI_ORG_ID", "")
