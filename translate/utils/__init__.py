"""Utility functions for the translation pipeline."""

from .api_utils import call_openai_api, load_api_keys, token_tracker
from .cache_utils import ensure_valid_cache_files
from .database_utils import (
    archive_files,
    concatenate_audio_files,
    generate_sentence_audio,
    get_or_create_root,
    get_or_generate_root_audio,
    insert_article_sentences,
    save_timing_report,
    validate_article_data,
)
from .exceptions import (
    AudioGenerationError,
    ConfigurationError,
    DatabaseError,
    TranslationError,
    ValidationError,
)
from .file_utils import (
    generate_split_filename,
    read_json_file,
    read_text_file,
    write_json_file,
)
from .storage_utils import (
    check_article_exists,
    check_file_exists,
    generate_audio_filename,
    generate_content_hash,
    get_author_id,
    get_category_id,
    get_supabase_client,
    get_word_type_id,
)
from .translation_processor import process_batch

__all__ = [
    "call_openai_api",
    "load_api_keys",
    "token_tracker",
    "ensure_valid_cache_files",
    "archive_files",
    "concatenate_audio_files",
    "generate_sentence_audio",
    "get_or_create_root",
    "get_or_generate_root_audio",
    "insert_article_sentences",
    "save_timing_report",
    "validate_article_data",
    "generate_split_filename",
    "read_json_file",
    "read_text_file",
    "write_json_file",
    "check_article_exists",
    "check_file_exists",
    "generate_audio_filename",
    "generate_content_hash",
    "get_author_id",
    "get_category_id",
    "get_supabase_client",
    "get_word_type_id",
    "process_batch",
    "TranslationError",
    "AudioGenerationError",
    "ConfigurationError",
    "DatabaseError",
    "ValidationError",
]
