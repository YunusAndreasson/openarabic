"""Batch context and pipeline statistics for progress logging.

Uses ContextVar to pass batch information through the call chain
without modifying function signatures.
"""

import logging
from contextvars import ContextVar
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# Stores (current_batch, total_batches) tuple
_batch_context: ContextVar[tuple[int, int] | None] = ContextVar(
    "batch_context", default=None
)


def set_batch(current: int, total: int) -> None:
    """Set the current batch context for logging."""
    _batch_context.set((current, total))


def clear_batch() -> None:
    """Clear the batch context."""
    _batch_context.set(None)


def get_batch_prefix() -> str:
    """Get the batch prefix string for logging.

    Returns empty string if no batch context is set.
    """
    ctx = _batch_context.get()
    if ctx:
        return f"Batch {ctx[0]}/{ctx[1]}: "
    return ""


@dataclass
class PipelineStats:
    """Tracks pipeline statistics for summary reporting."""

    # Retry tracking
    retries: int = 0
    retry_sentences: list[int] = field(default_factory=list)

    # DeepSeek correction tracking
    corrections: int = 0
    sentences_corrected: int = 0

    # Review tracking
    needs_review: int = 0
    review_sentences: list[int] = field(default_factory=list)

    def record_retry(self, sentence_index: int) -> None:
        """Record a retry attempt for a sentence."""
        self.retries += 1
        if sentence_index not in self.retry_sentences:
            self.retry_sentences.append(sentence_index)

    def record_correction(self, num_fixes: int) -> None:
        """Record DeepSeek corrections for a sentence."""
        if num_fixes > 0:
            self.corrections += num_fixes
            self.sentences_corrected += 1

    def record_needs_review(self, sentence_index: int) -> None:
        """Record a sentence flagged as NEEDS_REVIEW."""
        self.needs_review += 1
        if sentence_index not in self.review_sentences:
            self.review_sentences.append(sentence_index)

    def print_summary(self) -> None:
        """Print pipeline statistics summary."""
        if not any([self.retries, self.corrections, self.needs_review]):
            return

        from utils.cli_style import print_summary

        lines = []

        if self.retries:
            sentences_str = ", ".join(str(s) for s in sorted(self.retry_sentences)[:5])
            if len(self.retry_sentences) > 5:
                sentences_str += f" (+{len(self.retry_sentences) - 5} more)"
            lines.append(f"⚠️  Retries: {self.retries} (sentences {sentences_str})")

        if self.corrections:
            lines.append(
                f"🔧 DeepSeek fixes: {self.corrections} across "
                f"{self.sentences_corrected} sentences"
            )

        if self.needs_review:
            sentences_str = ", ".join(str(s) for s in sorted(self.review_sentences)[:5])
            if len(self.review_sentences) > 5:
                sentences_str += f" (+{len(self.review_sentences) - 5} more)"
            lines.append(f"👀 Needs review: {self.needs_review} ({sentences_str})")

        print_summary(lines, title="📊 Translation Summary")

    def reset(self) -> None:
        """Reset all statistics."""
        self.retries = 0
        self.retry_sentences.clear()
        self.corrections = 0
        self.sentences_corrected = 0
        self.needs_review = 0
        self.review_sentences.clear()


# Global pipeline stats instance
pipeline_stats = PipelineStats()
