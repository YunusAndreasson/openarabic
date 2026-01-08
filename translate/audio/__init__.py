"""Audio generation and processing utilities."""

# Re-export from split modules for backwards compatibility
from .article_audio import create_article_audio
from .caching import get_cache_key, get_cached_audio_url
from .combiner import create_bilingual_audio, create_multi_audio_with_delays
from .elevenlabs import generate_speech
from .root_audio import get_or_generate_root_audio
from .storage import generate_audio_filename
from .word_audio import generate_arabic_word_audio, generate_english_word_audio
from .word_processor import (
    generate_word_audio_with_google_tts,
    process_word_audio_for_article,
    process_word_audio_for_latest_articles,
    process_word_audio_for_sentences,
)

__all__ = [
    # Caching
    "get_cache_key",
    "get_cached_audio_url",
    # Storage
    "generate_audio_filename",
    # ElevenLabs TTS
    "generate_speech",
    # Word audio generation
    "generate_arabic_word_audio",
    "generate_english_word_audio",
    # Audio combining
    "create_bilingual_audio",
    "create_multi_audio_with_delays",
    # Article audio
    "create_article_audio",
    # Word processing
    "generate_word_audio_with_google_tts",
    "process_word_audio_for_article",
    "process_word_audio_for_latest_articles",
    "process_word_audio_for_sentences",
    # Root audio
    "get_or_generate_root_audio",
]
