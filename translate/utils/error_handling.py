"""Common error handling utilities to eliminate code duplication."""

import logging
from collections.abc import Callable
from typing import Any, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


def safe_execute(
    operation: Callable[[], T],
    error_context: str,
    fallback_value: T | None = None,
    log_error: bool = True,
    reraise: bool = False,
) -> T | None:
    """Safely execute an operation with consistent error handling."""
    try:
        return operation()
    except Exception as e:
        if log_error:
            logger.error(f"Operation failed for {error_context}: {str(e)}")
        if reraise:
            raise
        return fallback_value


def safe_audio_operation(
    operation: Callable[[], T],
    context: str,
    item_name: str,
    fallback_value: T | None = None,
) -> T | None:
    """Safely execute audio-related operations with consistent error handling."""
    return safe_execute(
        operation, f"{context} '{item_name}'", fallback_value, log_error=True
    )


def safe_database_operation(
    operation: Callable[[], T],
    table_name: str,
    operation_type: str,
    fallback_value: T | None = None,
) -> T | None:
    """Safely execute database operations with consistent error handling."""
    return safe_execute(
        operation, f"{operation_type} on {table_name}", fallback_value, log_error=True
    )


def safe_file_operation(
    operation: Callable[[], T],
    file_path: str,
    operation_type: str,
    fallback_value: T | None = None,
) -> T | None:
    """Safely execute file operations with consistent error handling."""
    return safe_execute(
        operation, f"{operation_type} on {file_path}", fallback_value, log_error=True
    )


def handle_import_error(
    module_name: str, fallback_value: Any = None, warning_message: str | None = None
) -> Any:
    """Handle import errors gracefully with consistent logging."""
    if warning_message:
        logger.warning(warning_message)
    else:
        logger.warning(f"Module '{module_name}' not available, using fallback")
    return fallback_value
