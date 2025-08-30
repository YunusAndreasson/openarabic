"""
Progress tracking utilities for the translation pipeline.
Provides clean logging with phase information and minimal output.
"""

import logging

logger = logging.getLogger(__name__)


class PipelineProgressTracker:
    """Tracks progress across the entire translation pipeline with clean logging."""

    def __init__(self) -> None:
        self.current_phase = None
        self.current_total = 0
        self.current_count = 0
        self._finished = False

    def start_phase(self, phase_name: str, total: int, description: str = None) -> None:
        """Start a new pipeline phase with logging."""
        if self.current_phase:
            self.finish_phase()

        self.current_phase = phase_name
        self.current_total = total
        self.current_count = 0
        self._finished = False

        logger.info(f"🚀 Starting {phase_name} phase - Processing {total} items")
        if description:
            logger.info(f"   {description}")

    def update(self, n: int = 1, description: str = None) -> None:
        """Update the current progress counter."""
        self.current_count += n

        if description:
            logger.debug(
                f"   {description} ({self.current_count}/{self.current_total})"
            )

    def set_description(self, description: str) -> None:
        """Set the description for the current phase."""
        logger.debug(f"   {description}")

    def finish_phase(self, success: bool = True) -> None:
        """Finish the current phase."""
        if self.current_phase and not self._finished:
            if success:
                logger.info(
                    f"✅ Completed {self.current_phase} phase - {self.current_count}/{self.current_total} items processed"
                )
            else:
                logger.error(
                    f"❌ Failed {self.current_phase} phase - {self.current_count}/{self.current_total} items processed"
                )

            self.current_phase = None
            self.current_total = 0
            self.current_count = 0
            self._finished = True


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
