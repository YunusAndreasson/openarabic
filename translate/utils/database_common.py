"""Common database utilities to eliminate code duplication."""

import logging
from collections.abc import Callable
from typing import Any

from utils.storage import get_supabase_client

logger = logging.getLogger(__name__)


def safe_database_operation(
    operation: Callable[[], Any],
    error_context: str,
    log_error: bool = True,
) -> Any:
    """Database operations must fail loudly; no fallbacks."""
    try:
        return operation()
    except Exception as e:
        if log_error:
            logger.error(f"Database operation failed for {error_context}: {str(e)}")
        raise


def update_table_record(
    table_name: str,
    update_data: dict[str, Any],
    conditions: dict[str, Any],
    error_context: str,
) -> bool:
    """Common function to update database records."""

    def operation() -> bool:
        query = get_supabase_client().table(table_name).update(update_data)
        for key, value in conditions.items():
            query = query.eq(key, value)
        query.execute()
        return True

    result = safe_database_operation(operation, error_context, False)
    return bool(result)


def insert_table_record(
    table_name: str, data: dict[str, Any], error_context: str
) -> dict[str, Any] | None:
    """Common function to insert database records."""

    def operation() -> dict[str, Any] | None:
        result = get_supabase_client().table(table_name).insert(data).execute()
        return result.data[0] if result.data else None

    result = safe_database_operation(operation, error_context, True)
    return result if isinstance(result, dict) else None


def get_table_record(
    table_name: str,
    select_fields: list[str],
    conditions: dict[str, Any],
    error_context: str,
) -> dict[str, Any] | None:
    """Common function to get database records."""

    def operation() -> dict[str, Any] | None:
        query = get_supabase_client().table(table_name).select(",".join(select_fields))
        for key, value in conditions.items():
            query = query.eq(key, value)
        result = query.execute()
        return result.data[0] if result.data else None

    result = safe_database_operation(operation, error_context, True)
    return result if isinstance(result, dict) else None
