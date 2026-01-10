"""CLI styling utilities for beautiful terminal output.

This module provides consistent styling for the translation pipeline CLI,
including the ASCII logo, styled headers, and Rich console integration.

Color scheme matches the OpenArabic mobile app's sage-green brand identity.
"""

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
        "#5A6F62",  # forest.medium approximation
        "#4A5B52",  # Darkest
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
