"""
Progress tracking utilities for the translation pipeline.
Provides clean logging with phase information and minimal output.
"""

import logging

logger = logging.getLogger(__name__)


class PipelineProgressTracker:
    """Tracks progress across the entire translation pipeline with clean logging."""

    def update(self, _n: int = 1, _description: str | None = None) -> None:
        """Update the current progress counter."""

    def set_description(self, _description: str) -> None:
        """Set the description for the current phase."""


# Global progress tracker instance
progress_tracker = PipelineProgressTracker()


def suppress_verbose_logging() -> None:
    """Suppress verbose logging from external libraries."""
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx._client").setLevel(logging.WARNING)
