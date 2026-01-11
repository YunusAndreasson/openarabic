"""CLI styling utilities for beautiful terminal output.

This module provides consistent styling for the translation pipeline CLI,
including the ASCII logo, styled headers, and Rich console integration.

Color scheme matches the OpenArabic mobile app's sage-green brand identity.
"""

import logging

import pyfiglet
from rich.console import Console
from rich.panel import Panel

# Shared Rich console instance
console = Console()

# Brand colors - matching OpenArabic mobile app sage-green palette
# Based on forest/sage OKLCH colors from constants/colors.ts
BRAND_PRIMARY = "#9AB5A4"  # forest.lighter - sage green
BRAND_DARK = "#6A7F72"  # forest.light - darker sage
BRAND_ACCENT = "#72A47F"  # semantic.successDark - muted green accent
BRAND_TINT = "#8BAF96"  # tint.primaryDark approximation
BRAND_DARKER = "#5A6F62"  # forest.medium approximation
BRAND_DARKEST = "#4A5B52"  # forest.dark approximation


def print_logo() -> None:
    """Display the OpenArabic ASCII art logo with sage-green gradient."""
    # Generate ASCII art using 'ansi_shadow' for authentic BBS block style
    ascii_art = pyfiglet.figlet_format("OpenArabic", font="ansi_shadow")

    # Sage-green gradient matching app's forest/sage palette (top to bottom)
    gradient = [
        BRAND_PRIMARY,  # Lightest sage
        BRAND_TINT,  # Mid sage
        BRAND_ACCENT,  # Muted green
        BRAND_DARK,  # Darker sage
        BRAND_DARKER,  # forest.medium
        BRAND_DARKEST,  # Darkest
    ]
    lines = ascii_art.rstrip().split("\n")

    for i, line in enumerate(lines):
        color = gradient[min(i, len(gradient) - 1)]
        console.print(f"[bold {color}]{line}[/]")

    # Tagline in accent color
    console.print(f"[italic {BRAND_ACCENT}]Arabic Translation Pipeline[/]")
    console.print()  # Add spacing after logo


def print_rule(title: str = "") -> None:
    """Print a horizontal rule, optionally with a title."""
    if title:
        console.rule(f"[bold {BRAND_ACCENT}]{title}[/]", style=BRAND_DARK)
    else:
        console.rule(style=BRAND_DARK)


def print_summary(lines: list[str], title: str = "Summary") -> None:
    """Print a summary panel with the given lines."""
    if not lines:
        return
    content = "\n".join(lines)
    panel = Panel(
        content,
        title=f"[bold {BRAND_PRIMARY}]{title}[/]",
        border_style=BRAND_DARK,
        padding=(0, 1),
    )
    console.print(panel)


# Semantic colors for corrections - staying on-brand where possible
# Success/corrected uses brand accent (sage green family)
# Error/original uses muted red for necessary contrast
CORRECTION_OLD = "#C27070"  # Muted dusty red (sage-adjacent warmth)
CORRECTION_NEW = BRAND_ACCENT  # Use brand sage green for success
CORRECTION_INFO = BRAND_PRIMARY  # Use brand sage for info
CORRECTION_WARN = "#C9A86A"  # Muted sage-adjacent amber for warnings


def print_correction(
    label: str,
    old: str,
    new: str,
    expanded: list[str] | None = None,
    indent: int = 4,
) -> None:
    """Print a before/after correction with clear visual diff.

    Args:
        label: Context label (e.g., "[Sentence 5] Translation")
        old: Original text
        new: Corrected text
        expanded: Optional list of condensed forms that were expanded
        indent: Number of spaces for indentation
    """
    pad = " " * indent
    console.print(f"{pad}[bold {BRAND_ACCENT}]{label}[/]")
    console.print(f"{pad}  [bold {CORRECTION_OLD}]✗[/] [{CORRECTION_OLD}]{old}[/]")
    console.print(f"{pad}  [bold {CORRECTION_NEW}]✓[/] [{CORRECTION_NEW}]{new}[/]")
    if expanded:
        forms = ", ".join(expanded)
        console.print(
            f"{pad}  [bold {CORRECTION_INFO}]→[/] [{CORRECTION_INFO}]Expanded: {forms}[/]"
        )


def print_word_correction(
    sentence_idx: int,
    arabic: str,
    old: str,
    new: str,
    expanded: list[str] | None = None,
) -> None:
    """Print a word-level correction with proper indentation."""
    print_correction(
        label=f"[Sentence {sentence_idx}] Word '{arabic}'",
        old=old,
        new=new,
        expanded=expanded,
        indent=6,
    )


def print_sentence_correction(
    sentence_idx: int,
    field: str,
    old: str,
    new: str,
    expanded: list[str] | None = None,
) -> None:
    """Print a sentence-level correction (translation or tashkeel)."""
    print_correction(
        label=f"[Sentence {sentence_idx}] {field}",
        old=old,
        new=new,
        expanded=expanded,
        indent=4,
    )


def print_correction_summary(
    sentence_idx: int, count: int, quality: float, level: str = "info"
) -> None:
    """Print a summary line for a sentence's corrections.

    Args:
        sentence_idx: Sentence index
        count: Number of corrections applied
        quality: Quality score 0.0-1.0
        level: 'info' for corrections applied, 'debug' for no corrections
    """
    # Color quality score based on value
    if quality >= 0.8:
        q_color = CORRECTION_NEW
    elif quality >= 0.5:
        q_color = CORRECTION_WARN
    else:
        q_color = CORRECTION_OLD

    fixes_text = f"{count} fixes" if count else "no changes"
    if level == "info" or count > 0:
        console.print(
            f"    [dim]╰─[/] [{BRAND_ACCENT}]Sentence {sentence_idx}[/]: "
            f"{fixes_text}, quality=[{q_color}]{quality:.2f}[/]"
        )


# =============================================================================
# Pipeline phase logging - consistent alignment and color usage
# =============================================================================


def print_phase(emoji: str, phase_num: int, name: str, description: str) -> None:
    """Print a phase header with emoji, number, name and description.

    Example: 📄 PHASE 1: SPLIT - Splitting input files into sentences
    """
    console.print(
        f"[bold {BRAND_PRIMARY}]{emoji} PHASE {phase_num}: {name}[/] "
        f"[{BRAND_DARK}]- {description}[/]"
    )


def print_phase_complete(elapsed: float) -> None:
    """Print phase completion in green."""
    console.print(f"[bold {BRAND_ACCENT}]   Completed in {elapsed:.1f}s[/]")


def print_phase_result(message: str) -> None:
    """Print a phase result message (indented, neutral color)."""
    console.print(f"[{BRAND_TINT}]   {message}[/]")


def print_pipeline_start(phases: list[str]) -> None:
    """Print pipeline start message."""
    flow = " [dim]→[/] ".join(f"[{BRAND_ACCENT}]{p}[/]" for p in phases)
    console.print(f"[bold {BRAND_PRIMARY}]Starting:[/] {flow}")
    console.print()


def print_pipeline_complete(elapsed: float) -> None:
    """Print final pipeline completion."""
    console.print(f"[bold {BRAND_ACCENT}]Pipeline completed in {elapsed:.1f}s[/]")


def print_status(message: str) -> None:
    """Print a general status message."""
    console.print(f"[{BRAND_TINT}]{message}[/]")


def print_success(message: str) -> None:
    """Print a success message in green."""
    console.print(f"[bold {BRAND_ACCENT}]{message}[/]")


def print_warning(message: str) -> None:
    """Print a warning message in amber."""
    console.print(
        f"[bold {CORRECTION_WARN}]Warning:[/] [{CORRECTION_WARN}]{message}[/]"
    )


def print_error(message: str) -> None:
    """Print an error message in red."""
    console.print(f"[bold {CORRECTION_OLD}]Error:[/] [{CORRECTION_OLD}]{message}[/]")


def print_api_summary(title: str, content: str) -> None:
    """Print API usage summary in a panel."""
    panel = Panel(
        content,
        title=f"[bold {BRAND_PRIMARY}]{title}[/]",
        border_style=BRAND_DARK,
        padding=(0, 1),
    )
    console.print(panel)


class PipelineLogHandler(logging.Handler):
    """Custom handler that formats logs to appear indented inside phases."""

    def emit(self, record: logging.LogRecord) -> None:
        """Format and print log with indented timestamp and styled message."""
        import time

        timestamp = time.strftime("%H:%M:%S", time.localtime())
        message = record.getMessage()

        # Format: "   HH:MM:SS → message" with colors
        console.print(
            f"   [{BRAND_DARK}]{timestamp}[/] [{BRAND_DARK}]→[/] [{BRAND_TINT}]{message}[/]"
        )


def setup_rich_logging() -> None:
    """Configure logging with custom handler for indented, styled output.

    Log entries appear indented inside their phase with styled timestamps.
    """
    # Clear any existing handlers
    root_logger = logging.getLogger()
    root_logger.handlers.clear()

    # Add our custom handler
    root_logger.addHandler(PipelineLogHandler())
    root_logger.setLevel(logging.INFO)


def print_log(message: str) -> None:
    """Print a log-style message with indentation inside phases."""
    console.print(f"   [{BRAND_TINT}]{message}[/]")
