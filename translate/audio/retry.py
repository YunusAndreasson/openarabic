"""Retry decorator for network operations with exponential backoff."""

import functools
import logging
import random
import time
from collections.abc import Callable
from typing import Any

logger = logging.getLogger(__name__)


def retry_operation(
    max_attempts: int = 3, delay: float = 1, backoff: float = 2, jitter: bool = True
) -> Callable:
    """Retry decorator for network operations with exponential backoff and jitter.

    Args:
        max_attempts: Maximum number of retry attempts
        delay: Initial delay in seconds
        backoff: Backoff multiplier (e.g., 2 for exponential backoff)
        jitter: Add random jitter to delay to avoid thundering herd
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            attempts = 0
            current_delay = delay

            while attempts < max_attempts:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    attempts += 1

                    # Check if this is a rate limiting error (429)
                    is_rate_limit = False
                    error_msg = str(e).lower()
                    if (
                        "429" in error_msg
                        or "rate limit" in error_msg
                        or "system_busy" in error_msg
                    ):
                        is_rate_limit = True
                        logger.warning(
                            f"Rate limit detected on attempt {attempts}/{max_attempts}: {e}"
                        )
                    else:
                        logger.warning(f"Attempt {attempts}/{max_attempts} failed: {e}")

                    if attempts == max_attempts:
                        if is_rate_limit:
                            logger.error(
                                f"Rate limit exceeded after {max_attempts} attempts: {e}"
                            )
                        else:
                            logger.error(f"Failed after {max_attempts} attempts: {e}")
                        raise

                    # Calculate delay with jitter to avoid thundering herd
                    if jitter:
                        # Add random jitter up to 25% of current delay
                        jitter_amount = current_delay * 0.25 * random.random()  # noqa: S311
                        actual_delay = current_delay + jitter_amount
                    else:
                        actual_delay = current_delay

                    logger.info(f"Retrying in {actual_delay:.1f} seconds...")
                    time.sleep(actual_delay)

                    # Exponential backoff for rate limits, linear for others
                    if is_rate_limit:
                        current_delay *= backoff  # Exponential backoff for rate limits
                    else:
                        current_delay = (
                            delay * attempts
                        )  # Linear backoff for other errors

                    # Cap the delay at 60 seconds maximum
                    current_delay = min(current_delay, 60)

            # This should not be reached (raise on max_attempts), but log if it is
            logger.error(
                f"AUDIO GENERATION FAILED: {func.__name__} exhausted all {max_attempts} retries"
            )
            return None

        return wrapper

    return decorator


__all__ = ["retry_operation"]
