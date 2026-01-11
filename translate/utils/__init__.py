"""Utility functions for the translation pipeline."""

# Cache utilities removed - using Supabase Storage as single source of truth
from .config_common import (
    get_audio_config,
    get_environment_config,
    get_storage_url,
    get_voice_config,
    validate_required_config,
)
from .database import (
    archive_files,
    get_or_create_root,
    get_or_generate_root_audio,
    insert_article_sentences,
    validate_article_data,
)
from .database_common import (
    get_table_record,
    insert_table_record,
    update_table_record,
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
from .file_discovery import (
    find_input_files_in_inbox,
    find_split_files,
)
from .file_utils import (
    generate_split_filename,
    read_json_file,
    read_text_file,
    write_json_file,
)
from .responses_api import call_response_api, load_api_keys, token_tracker
from .storage import (
    check_article_exists,
    check_file_exists,
    generate_content_hash,
    get_author_id,
    get_category_id,
    get_supabase_client,
    get_word_type_id,
)

__all__ = [
    "AudioGenerationError",
    "ConfigurationError",
    "DatabaseError",
    # Exceptions
    "TranslationError",
    "ValidationError",
    # Database utilities
    "archive_files",
    # API utilities
    "call_response_api",
    # Storage utilities
    "check_article_exists",
    "check_file_exists",
    # File discovery utilities
    "find_input_files_in_inbox",
    "find_split_files",
    "generate_content_hash",
    # File utilities
    "generate_split_filename",
    # Cache utilities removed - using Supabase Storage as single source of truth
    # Configuration common utilities
    "get_audio_config",
    "get_author_id",
    "get_category_id",
    "get_environment_config",
    "get_or_create_root",
    "get_or_generate_root_audio",
    "get_storage_url",
    "get_supabase_client",
    # Database common utilities
    "get_table_record",
    "get_voice_config",
    "get_word_type_id",
    # Error handling utilities
    "handle_import_error",
    "insert_article_sentences",
    "insert_table_record",
    "load_api_keys",
    "read_json_file",
    "read_text_file",
    "safe_audio_operation",
    "safe_database_operation",
    "safe_execute",
    "safe_file_operation",
    "token_tracker",
    "update_table_record",
    "validate_article_data",
    "validate_required_config",
    "write_json_file",
]
