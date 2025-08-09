"""Common error handling utilities to eliminate code duplication."""

import logging
from collections.abc import Callable

logger = logging.getLogger(__name__)


def safe_execute(
    operation: Callable[[], object],
    error_context: str,
    log_error: bool = True,
) -> object:
    """Execute an operation and fail loudly with contextual logging."""
    try:
        return operation()
    except Exception as e:
        if log_error:
            logger.error(f"Operation failed for {error_context}: {str(e)}")
        # Always fail fast; callers should handle exceptions explicitly
        raise


def safe_audio_operation(
    operation: Callable[[], object],
    context: str,
    item_name: str,
) -> object:
    """Execute audio-related operations; raise on failure."""
    return safe_execute(operation, f"{context} '{item_name}'", log_error=True)


def safe_database_operation(
    operation: Callable[[], object],
    table_name: str,
    operation_type: str,
) -> object:
    """Execute database operations; raise on failure."""
    return safe_execute(operation, f"{operation_type} on {table_name}", log_error=True)


def safe_file_operation(
    operation: Callable[[], object],
    file_path: str,
    operation_type: str,
) -> object:
    """Execute file operations; raise on failure."""
    return safe_execute(operation, f"{operation_type} on {file_path}", log_error=True)


def handle_import_error(module_name: str, warning_message: str | None = None) -> None:
    """Always surface import errors; do not return fallbacks."""
    if warning_message:
        logger.warning(warning_message)
    raise ImportError(f"Required module '{module_name}' is not available")
