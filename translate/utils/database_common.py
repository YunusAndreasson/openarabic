"""Common database utilities to eliminate code duplication."""

import logging
from typing import Any, Dict, List, Optional

from utils.storage_utils import get_supabase_client

logger = logging.getLogger(__name__)


def safe_database_operation(
    operation: callable,
    error_context: str,
    fallback_value: Any = None,
    log_error: bool = True,
) -> Any:
    """Common wrapper for database operations with error handling."""
    try:
        return operation()
    except Exception as e:
        if log_error:
            logger.error(f"Database operation failed for {error_context}: {str(e)}")
        return fallback_value


def update_table_record(
    table_name: str,
    update_data: Dict[str, Any],
    conditions: Dict[str, Any],
    error_context: str,
) -> bool:
    """Common function to update database records."""

    def operation():
        query = get_supabase_client().table(table_name).update(update_data)
        for key, value in conditions.items():
            query = query.eq(key, value)
        query.execute()
        return True

    return safe_database_operation(operation, error_context, False)


def insert_table_record(
    table_name: str, data: Dict[str, Any], error_context: str
) -> Optional[Dict[str, Any]]:
    """Common function to insert database records."""

    def operation():
        result = get_supabase_client().table(table_name).insert(data).execute()
        return result.data[0] if result.data else None

    return safe_database_operation(operation, error_context, None)


def get_table_record(
    table_name: str,
    select_fields: List[str],
    conditions: Dict[str, Any],
    error_context: str,
) -> Optional[Dict[str, Any]]:
    """Common function to get database records."""

    def operation():
        query = get_supabase_client().table(table_name).select(",".join(select_fields))
        for key, value in conditions.items():
            query = query.eq(key, value)
        result = query.execute()
        return result.data[0] if result.data else None

    return safe_database_operation(operation, error_context, None)


def get_table_records(
    table_name: str,
    select_fields: List[str],
    conditions: Optional[Dict[str, Any]] = None,
    order_by: Optional[str] = None,
    limit: Optional[int] = None,
    error_context: str = "query",
) -> List[Dict[str, Any]]:
    """Common function to get multiple database records."""

    def operation():
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

    return safe_database_operation(operation, error_context, [])


def check_record_exists(
    table_name: str, conditions: Dict[str, Any], error_context: str
) -> bool:
    """Common function to check if a record exists."""

    def operation():
        query = get_supabase_client().table(table_name).select("id")
        for key, value in conditions.items():
            query = query.eq(key, value)
        result = query.execute()
        return len(result.data) > 0

    return safe_database_operation(operation, error_context, False)
