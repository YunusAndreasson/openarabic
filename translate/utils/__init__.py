"""Utility functions for the translation pipeline."""

from .cache_utils import ensure_valid_cache_files
from .config_common import (
    get_audio_config,
    get_environment_config,
    get_storage_url,
    get_voice_config,
    validate_required_config,
)
from .database_common import (
    check_record_exists,
    get_table_record,
    get_table_records,
    insert_table_record,
    update_table_record,
)
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
from .error_handling import (
    handle_import_error,
    safe_audio_operation,
    safe_database_operation,
    safe_execute,
    safe_file_operation,
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
from .responses_api import call_response_api, load_api_keys, token_tracker
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

__all__ = [
    # API utilities
    "call_response_api",
    "load_api_keys",
    "token_tracker",
    # Cache utilities
    "ensure_valid_cache_files",
    # Configuration common utilities
    "get_audio_config",
    "get_environment_config",
    "get_storage_url",
    "get_voice_config",
    "validate_required_config",
    # Database common utilities
    "check_record_exists",
    "get_table_record",
    "get_table_records",
    "insert_table_record",
    "update_table_record",
    # Database utilities
    "archive_files",
    "concatenate_audio_files",
    "generate_sentence_audio",
    "get_or_create_root",
    "get_or_generate_root_audio",
    "insert_article_sentences",
    "save_timing_report",
    "validate_article_data",
    # Error handling utilities
    "handle_import_error",
    "safe_audio_operation",
    "safe_database_operation",
    "safe_execute",
    "safe_file_operation",
    # Exceptions
    "TranslationError",
    "AudioGenerationError",
    "ConfigurationError",
    "DatabaseError",
    "ValidationError",
    # File utilities
    "generate_split_filename",
    "read_json_file",
    "read_text_file",
    "write_json_file",
    # Storage utilities
    "check_article_exists",
    "check_file_exists",
    "generate_audio_filename",
    "generate_content_hash",
    "get_author_id",
    "get_category_id",
    "get_supabase_client",
    "get_word_type_id",
]
