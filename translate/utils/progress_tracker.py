"""
Progress tracking utilities for the translation pipeline.
Provides clean TQDM progress bars with phase information and minimal logging.
"""

import logging

from tqdm import tqdm

logger = logging.getLogger(__name__)


class PipelineProgressTracker:
    """Tracks progress across the entire translation pipeline with clean TQDM bars."""

    def __init__(self) -> None:
        self.current_phase = None
        self.current_pbar = None

    def start_phase(self, phase_name: str, total: int, description: str = None) -> None:
        """Start a new pipeline phase with a progress bar."""
        if self.current_pbar:
            self.current_pbar.close()

        self.current_phase = phase_name
        desc = description or f"Phase: {phase_name}"

        self.current_pbar = tqdm(
            total=total,
            desc=desc,
            unit="items",
            bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, {rate_fmt}]",
            ncols=100,
            colour="green",
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
        if self.current_pbar:
            if success:
                # Show completion in the TQDM bar instead of logging
                self.current_pbar.set_description(
                    f"✅ Phase: {self.current_phase} - Completed"
                )
            else:
                self.current_pbar.set_description(
                    f"❌ Phase: {self.current_phase} - Failed"
                )
                logger.error(f"❌ Failed {self.current_phase} phase")

            self.current_pbar.close()
            self.current_pbar = None

        self.current_phase = None

    def log_error(self, error: str) -> None:
        """Log an error during processing."""
        logger.error(f"❌ {error}")

    def log_failure(self, error: str) -> None:
        """Log an irrecoverable failure."""
        logger.error(f"💥 Pipeline failed: {error}")
        if self.current_pbar:
            self.finish_phase(success=False)


# Global progress tracker instance
progress_tracker = PipelineProgressTracker()


def log_pipeline_start() -> None:
    """Log the start of the pipeline."""
    logger.info("🚀 Starting Arabic Translation Pipeline")


def log_pipeline_completion() -> None:
    """Log the successful completion of the pipeline."""
    logger.info("✅ Pipeline completed successfully!")


def log_phase_start(phase_name: str) -> None:
    """Log the start of a pipeline phase."""
    # Phase start is now handled by TQDM progress bars
    pass


def log_irrecoverable_error(error: str) -> None:
    """Log an irrecoverable error that stops the pipeline."""
    logger.error(f"💥 Pipeline failed irrecoverably: {error}")


def suppress_verbose_logging() -> None:
    """Suppress verbose logging from external libraries."""
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx._client").setLevel(logging.WARNING)
    logging.getLogger("tqdm").setLevel(logging.WARNING)
