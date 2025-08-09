"""Common database utilities to eliminate code duplication."""

import logging
from collections.abc import Callable
from typing import Any

from utils.storage_utils import get_supabase_client

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


def get_table_records(
    table_name: str,
    select_fields: list[str],
    conditions: dict[str, Any] | None = None,
    order_by: str | None = None,
    limit: int | None = None,
    error_context: str = "query",
) -> list[dict[str, Any]]:
    """Common function to get multiple database records."""

    def operation() -> list[dict[str, Any]]:
        query = get_supabase_client().table(table_name).select(",".join(select_fields))

        if conditions:
            for key, value in conditions.items():
                query = query.eq(key, value)

        if order_by:
            query = query.order(order_by)

        if limit:
            query = query.limit(limit)

        result = query.execute()
        return result.data or []

    result = safe_database_operation(operation, error_context, True)
    return result if isinstance(result, list) else []


def check_record_exists(
    table_name: str, conditions: dict[str, Any], error_context: str
) -> bool:
    """Common function to check if a record exists."""

    def operation() -> bool:
        query = get_supabase_client().table(table_name).select("id")
        for key, value in conditions.items():
            query = query.eq(key, value)
        result = query.execute()
        return len(result.data) > 0

    result = safe_database_operation(operation, error_context, True)
    return bool(result)
