"""CLI styling utilities for beautiful terminal output.

This module provides consistent styling for the translation pipeline CLI,
including the ASCII logo, styled headers, and Rich console integration.
"""

import pyfiglet
from rich.console import Console
from rich.panel import Panel
from rich.text import Text

# Shared Rich console instance
console = Console()

# Brand colors
BRAND_COLOR = "green"
ACCENT_COLOR = "cyan"


def print_logo() -> None:
    """Display the OpenArabic ASCII art logo in a styled panel."""
    # Generate ASCII art using the 'slant' font for a clean, professional look
    ascii_art = pyfiglet.figlet_format("OpenArabic", font="slant")

    # Create styled text with brand color
    logo_text = Text(ascii_art.rstrip(), style=f"bold {BRAND_COLOR}")

    # Add tagline
    tagline = Text("Arabic Translation Pipeline", style=f"italic {ACCENT_COLOR}")

    # Combine logo and tagline
    combined = Text()
    combined.append(logo_text)
    combined.append("\n")
    combined.append(tagline)

    # Display in a panel
    panel = Panel(
        combined,
        border_style=BRAND_COLOR,
        padding=(0, 2),
    )
    console.print(panel)
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
