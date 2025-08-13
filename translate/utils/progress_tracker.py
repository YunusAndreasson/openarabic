"""
Progress tracking utilities for the translation pipeline.
Provides clean TQDM progress bars with phase information and minimal logging.
"""

import logging
import sys

from tqdm import tqdm

logger = logging.getLogger(__name__)


class PipelineProgressTracker:
    """Tracks progress across the entire translation pipeline with clean TQDM bars."""

    def __init__(self) -> None:
        self.current_phase = None
        self.current_pbar = None
        self._finished = False

    def start_phase(self, phase_name: str, total: int, description: str = None) -> None:
        """Start a new pipeline phase with a progress bar."""
        if self.current_pbar:
            self.current_pbar.close()

        self.current_phase = phase_name
        self._finished = False
        desc = description or f"Phase: {phase_name}"

        self.current_pbar = tqdm(
            total=total,
            desc=desc,
            unit="items",
            bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, {rate_fmt}]",
            ncols=100,
            colour="green",
            leave=False,
            file=sys.stdout,
            disable=not sys.stdout.isatty(),
            dynamic_ncols=True,
        )

    def update(self, n: int = 1, description: str = None) -> None:
        """Update the current progress bar."""
        if self.current_pbar:
            if description:
                self.current_pbar.set_description(
                    f"Phase: {self.current_phase} - {description}"
                )
            self.current_pbar.update(n)

    def set_description(self, description: str) -> None:
        """Set the description for the current progress bar."""
        if self.current_pbar:
            self.current_pbar.set_description(
                f"Phase: {self.current_phase} - {description}"
            )

    def finish_phase(self, success: bool = True) -> None:
        """Finish the current phase."""
        if self.current_pbar and self.current_phase and not self._finished:
            if success:
                # Show completion with checkmark
                self.current_pbar.set_description(
                    f"✅ Phase: {self.current_phase} - Completed"
                )
                # Force a final update to show the completion
                self.current_pbar.refresh()
                # Log completion message
                logger.info(f"✅ Phase: {self.current_phase} - Completed")
            else:
                self.current_pbar.set_description(
                    f"❌ Phase: {self.current_phase} - Failed"
                )
                logger.error(f"❌ Failed {self.current_phase} phase")

            self.current_pbar.close()
            self.current_pbar = None
            self.current_phase = None
            self._finished = True
        elif self.current_phase and not self._finished:
            # Phase was already finished, just clear the state
            self.current_phase = None
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
    logging.getLogger("tqdm").setLevel(logging.WARNING)
