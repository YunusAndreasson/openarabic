"""CLI styling utilities for beautiful terminal output.

This module provides consistent styling for the translation pipeline CLI,
including the ASCII logo, styled headers, and Rich console integration.
"""

import pyfiglet
from rich.console import Console
from rich.panel import Panel

# Shared Rich console instance
console = Console()

# Brand colors
BRAND_COLOR = "green"
ACCENT_COLOR = "cyan"


def print_logo() -> None:
    """Display the OpenArabic ASCII art logo with gradient effect."""
    # Generate ASCII art using 'ansi_shadow' for authentic BBS block style
    ascii_art = pyfiglet.figlet_format("OpenArabic", font="ansi_shadow")

    # Apply gradient from green to cyan (top to bottom)
    gradient = ["bright_green", "green", "cyan", "dark_cyan", "blue", "dark_blue"]
    lines = ascii_art.rstrip().split("\n")

    for i, line in enumerate(lines):
        color = gradient[min(i, len(gradient) - 1)]
        console.print(f"[bold {color}]{line}[/]")

    # Tagline
    console.print(f"[italic {ACCENT_COLOR}]Arabic Translation Pipeline[/]")
    console.print()  # Add spacing after logo


def print_rule(title: str = "") -> None:
    """Print a horizontal rule, optionally with a title."""
    if title:
        console.rule(f"[bold {ACCENT_COLOR}]{title}[/]", style="dim")
    else:
        console.rule(style="dim")


def print_summary(lines: list[str], title: str = "Summary") -> None:
    """Print a summary panel with the given lines."""
    if not lines:
        return
    content = "\n".join(lines)
    panel = Panel(
        content,
        title=f"[bold]{title}[/]",
        border_style="dim",
        padding=(0, 1),
    )
    console.print(panel)
