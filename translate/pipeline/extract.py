"""Passage extraction from Arabic texts using DeepSeek.

This module extracts suitable learning passages from large Arabic texts,
providing rough translations for review before adding to the inbox.
"""

import contextlib
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

from data.config import AUTHOR_FOLDER_MAPPING, INBOX_DIR
from utils.cli_style import print_error, print_status, print_success, print_warning
from utils.openrouter_client import OpenRouterClient
from utils.web_scraper import scrape_url

logger = logging.getLogger(__name__)


def _wrap_text(text: str, width: int = 70) -> list[str]:
    """Wrap text to specified width, preserving words.

    Args:
        text: Text to wrap
        width: Maximum line width

    Returns:
        List of wrapped lines
    """
    import textwrap

    # Normalize whitespace
    text = " ".join(text.split())
    return textwrap.wrap(text, width=width) or [""]


@dataclass
class ExtractedPassage:
    """A single extracted passage with translation."""

    id: int
    arabic_text: str
    english_translation: str
    word_count: int
    quality_score: float  # 1-10 rating from DeepSeek
    reason: str  # Why this passage was selected


@dataclass
class ExtractionResult:
    """Result of passage extraction."""

    source_url: str
    source_title: str
    original_author: str
    passages: list[ExtractedPassage] = field(default_factory=list)


def build_extraction_prompt(arabic_text: str, max_passages: int = 25) -> str:
    """Build the prompt for DeepSeek to extract passages.

    Args:
        arabic_text: Full Arabic text to extract from
        max_passages: Maximum number of passages to extract

    Returns:
        System prompt string
    """
    return f"""You are an expert Arabic educator selecting reading passages for intermediate Arabic learners.

TASK: Extract up to {max_passages} suitable passages from the provided Arabic text.

STEP 1 - ANALYZE FIRST (do this mentally before extracting):
- What is this text about? What are the main sections/themes?
- Where are the narrative portions vs. dry/technical portions?
- Which sections contain stories, personal reflections, or vivid examples?
- Which parts would a motivated learner actually enjoy reading?

STEP 2 - EXTRACT PASSAGES meeting these criteria:

LENGTH: 200-300 Arabic words (strict)

WHAT MAKES A PASSAGE "INTERESTING" (be specific):
✓ Stories or anecdotes (someone did something, something happened)
✓ Personal reflections or wisdom from life experience
✓ Vivid descriptions that paint a picture
✓ Surprising insights or counterintuitive points
✓ Universal themes: human nature, ethics, relationships, purpose
✓ Emotional resonance: passages that move the reader

WHAT TO AVOID:
✗ Technical definitions or rules
✗ Lists, enumerations, classifications
✗ Heavy quoting from other sources
✗ Editor introductions, publication info
✗ Abstract theological debates without concrete examples
✗ Passages requiring specialized background knowledge

THE KEY TEST: "Would a motivated Arabic learner want to finish reading this passage,
or would their eyes glaze over?" If the latter, don't include it.

QUALITY SCORING (be harsh):
- 9-10: Genuinely captivating - you'd share this with a friend
- 7-8: Solidly engaging - holds attention throughout
- 5-6: Acceptable but forgettable
- Below 5: Don't include

EXAMPLE OF A GOOD PASSAGE (for reference):
A passage about a scholar who traveled far seeking knowledge, faced hardship,
had a memorable encounter with a teacher who said something wise, and learned
a lesson applicable to life. It has narrative flow, a human element, and leaves
the reader with something to think about.

EXAMPLE OF A BAD PASSAGE (avoid):
"The scholars differed on this matter into three opinions. The first opinion is...
The second opinion is... The evidence for the first opinion includes..."
(This is dry classification, not engaging narrative)

RESPONSE FORMAT (JSON only):
{{
  "passages": [
    {{
      "arabic_text": "النص العربي الكامل هنا...",
      "english_translation": "Full English translation here...",
      "word_count": 245,
      "quality_score": 8.5,
      "reason": "Story about X encountering Y, with vivid details and a memorable lesson about Z."
    }}
  ]
}}

Return ONLY valid JSON. No markdown, no explanations outside JSON."""


def build_user_prompt(arabic_text: str) -> str:
    """Build user prompt with the Arabic text.

    Args:
        arabic_text: Full Arabic text

    Returns:
        User prompt string
    """
    # Truncate if extremely long (DeepSeek v3 has 128K context)
    # Leave room for prompt (~3K) and response (~30K for 25 passages)
    max_chars = 90000
    if len(arabic_text) > max_chars:
        arabic_text = arabic_text[:max_chars]
        logger.warning(f"Truncated text to {max_chars} characters")

    return f"""Extract suitable learning passages from this Arabic text:

{arabic_text}

Remember: 200-300 words per passage, pure prose, self-contained, engaging content."""


def extract_passages_with_deepseek(
    arabic_text: str,
    max_passages: int = 25,
) -> list[ExtractedPassage]:
    """Use DeepSeek to extract suitable passages from Arabic text.

    Args:
        arabic_text: Full Arabic text to extract from
        max_passages: Maximum number of passages to extract

    Returns:
        List of extracted passages with translations, sorted by quality score
    """
    client = OpenRouterClient()

    system_prompt = build_extraction_prompt(arabic_text, max_passages)
    user_prompt = build_user_prompt(arabic_text)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    print_status("Sending text to DeepSeek for passage extraction...")

    response = client.call_api(
        messages,
        max_tokens=32000,  # More tokens for ~25 passages with translations
        temperature=0.3,  # Some creativity but mostly consistent
    )

    result = client.parse_json_response(response)

    passages = []
    for p in result.get("passages", []):
        passages.append(
            ExtractedPassage(
                id=0,  # Will be assigned after sorting
                arabic_text=p.get("arabic_text", ""),
                english_translation=p.get("english_translation", ""),
                word_count=p.get("word_count", 0),
                quality_score=float(p.get("quality_score", 5.0)),
                reason=p.get("reason", ""),
            )
        )

    # Sort by quality score descending (best first)
    passages.sort(key=lambda x: x.quality_score, reverse=True)

    # Assign IDs after sorting (so #1 is the best)
    for i, passage in enumerate(passages, start=1):
        passage.id = i

    return passages


def interactive_review(passages: list[ExtractedPassage]) -> list[ExtractedPassage]:
    """Interactive CLI to review and select passages.

    Args:
        passages: List of passages to review

    Returns:
        List of selected passages
    """
    selected = []
    total = len(passages)

    print(f"\n{'=' * 70}")
    print(f"  PASSAGE REVIEW - {total} passages (sorted by quality, best first)")
    print("  [y] Keep  [n] Skip  [q] Quit and save selections")
    print(f"{'=' * 70}\n")

    for passage in passages:
        print(f"\n{'─' * 70}")
        print(
            f"  #{passage.id} of {total}  |  Score: {passage.quality_score}/10  |  {passage.word_count} words"
        )
        print(f"{'─' * 70}")

        # Show full Arabic text
        print("\n  📖 Arabic:\n")
        # Wrap text for readability
        for line in _wrap_text(passage.arabic_text, width=66):
            print(f"  {line}")

        # Show full English translation
        print("\n  🌐 English:\n")
        for line in _wrap_text(passage.english_translation, width=66):
            print(f"  {line}")

        print(f"\n  💡 {passage.reason}")
        print(f"{'─' * 70}")

        while True:
            try:
                choice = input("\n  [y/n/q] > ").strip().lower()
            except EOFError:
                choice = "q"

            if choice == "y":
                selected.append(passage)
                print_success(f"  ✓ Passage {passage.id} selected")
                break
            if choice == "n":
                print_warning(f"  ✗ Passage {passage.id} skipped")
                break
            if choice == "q":
                print_status(f"\n  Stopping review. {len(selected)} passages selected.")
                return selected
            print("  Please enter y, n, or q")

    print(f"\n{'=' * 70}")
    print(f"  Review complete! {len(selected)} of {total} passages selected.")
    print(f"{'=' * 70}\n")

    return selected


def get_author_folder(author_key: str) -> str | None:
    """Get the inbox folder name for an author.

    Args:
        author_key: Author number (e.g., "15") or folder name

    Returns:
        Folder name or None if not found
    """
    # Check if it's a number key
    for folder in AUTHOR_FOLDER_MAPPING:
        if folder.startswith(f"{author_key}_"):
            return folder

    # Check if it's the folder name itself
    if author_key in AUTHOR_FOLDER_MAPPING:
        return author_key

    return None


def save_passages_to_inbox(
    passages: list[ExtractedPassage],
    author_folder: str,
    source_title: str,
) -> list[Path]:
    """Save selected passages as text files in the author's inbox folder.

    Args:
        passages: List of passages to save
        author_folder: Author folder name (e.g., "15_al_imam_al_dhahabi")
        source_title: Original source title for filename prefix

    Returns:
        List of created file paths
    """
    inbox_path = Path(INBOX_DIR) / author_folder
    inbox_path.mkdir(parents=True, exist_ok=True)

    # Clean source title for filename
    clean_title = re.sub(r"[^\w\s-]", "", source_title)
    clean_title = re.sub(r"\s+", "_", clean_title).lower()[:30]

    created_files = []

    for passage in passages:
        # Find next available number
        existing = list(inbox_path.glob(f"{clean_title}_*.txt"))
        next_num = len(existing) + 1

        filename = f"{clean_title}_{next_num:03d}.txt"
        file_path = inbox_path / filename

        # Write just the Arabic text (the pipeline handles the rest)
        file_path.write_text(passage.arabic_text, encoding="utf-8")
        created_files.append(file_path)

        print_success(f"  Saved: {file_path.name}")

    return created_files


def extract_from_url(
    url: str,
    author_key: str,
    max_passages: int = 10,
    skip_review: bool = False,
) -> ExtractionResult:
    """Main entry point: extract passages from URL and save to inbox.

    Args:
        url: URL to scrape
        author_key: Author number or folder name
        max_passages: Maximum passages to extract
        skip_review: If True, save all passages without review

    Returns:
        ExtractionResult with details
    """
    # Validate author
    author_folder = get_author_folder(author_key)
    if not author_folder:
        raise ValueError(
            f"Unknown author: {author_key}. "
            f"Valid options: {list(AUTHOR_FOLDER_MAPPING.keys())}"
        )

    author_name = AUTHOR_FOLDER_MAPPING[author_folder]
    print_status(f"Author: {author_name} ({author_folder})")

    # Scrape URL
    print_status(f"Fetching: {url}")
    scraped = scrape_url(url)
    print_success(f"Downloaded {scraped.word_count} Arabic words")

    # Extract passages
    passages = extract_passages_with_deepseek(scraped.arabic_text, max_passages)
    if passages:
        top_score = passages[0].quality_score
        low_score = passages[-1].quality_score
        print_success(
            f"Extracted {len(passages)} passages (scores: {top_score:.1f} to {low_score:.1f})"
        )

    if not passages:
        raise ValueError("No suitable passages found in text")

    # Review or auto-select
    if skip_review:
        selected = passages
    else:
        selected = interactive_review(passages)

    if not selected:
        print_warning("No passages selected. Nothing saved.")
        return ExtractionResult(
            source_url=url,
            source_title=scraped.title,
            original_author=author_name,
            passages=[],
        )

    # Save to inbox
    print_status(f"\nSaving {len(selected)} passages to inbox...")
    saved_files = save_passages_to_inbox(
        selected,
        author_folder,
        scraped.title or "passage",
    )

    print_success(f"\n✓ {len(saved_files)} passages saved to 0_inbox/{author_folder}/")
    print_status("Run 'python main.py --split' to process them.")

    return ExtractionResult(
        source_url=url,
        source_title=scraped.title,
        original_author=author_name,
        passages=selected,
    )


# CLI test
if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO)

    if len(sys.argv) < 3:
        print("Usage: python -m pipeline.extract <url> <author_number>")
        print("Example: python -m pipeline.extract 'https://usul.ai/t/zaghl-cilm' 15")
        sys.exit(1)

    url = sys.argv[1]
    author = sys.argv[2]

    try:
        # Load API keys
        with contextlib.suppress(ImportError):
            import utils.set_keys  # noqa: F401

        result = extract_from_url(url, author)
        print(f"\nDone! Extracted from: {result.source_title}")
    except KeyboardInterrupt:
        print("\nCancelled.")
        sys.exit(130)
    except Exception as e:
        print_error(f"Failed: {e}")
        sys.exit(1)
