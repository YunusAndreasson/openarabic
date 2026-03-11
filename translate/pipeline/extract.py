"""Passage extraction from Arabic texts using Claude CLI.

This module extracts suitable learning passages from large Arabic texts,
providing rough translations for review before adding to the inbox.
Uses Claude CLI (Max subscription, no API cost) by default, with
DeepSeek via OpenRouter as fallback.
"""

import contextlib
import json
import logging
import os
import re
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

from data.config import AUTHOR_FOLDER_MAPPING, INBOX_DIR
from utils.cli_style import print_error, print_status, print_success, print_warning
from utils.web_scraper import scrape_url

logger = logging.getLogger(__name__)


def _wrap_text(text: str, width: int = 70) -> list[str]:
    """Wrap text to specified width, preserving words."""
    import textwrap

    text = " ".join(text.split())
    return textwrap.wrap(text, width=width) or [""]


@dataclass
class ExtractedPassage:
    """A single extracted passage with translation."""

    id: int
    arabic_text: str
    english_translation: str
    word_count: int
    quality_score: float
    reason: str


@dataclass
class ExtractionResult:
    """Result of passage extraction."""

    source: str
    source_title: str
    original_author: str
    passages: list[ExtractedPassage] = field(default_factory=list)


def build_extraction_prompt(max_passages: int = 25) -> str:
    """Build the system prompt for passage extraction.

    The Arabic text is NOT included here — it's passed separately
    (via file for Claude CLI, or in the user message for DeepSeek).
    """
    return f"""You are an expert Arabic educator selecting reading passages for intermediate Arabic learners.

TASK: Extract up to {max_passages} suitable passages from the provided Arabic text.

STEP 1 - ANALYZE FIRST (do this mentally before extracting):
- What is this text about? What are the main sections/themes?
- Where are the narrative portions vs. dry/technical portions?
- Which sections contain stories, personal reflections, or vivid examples?
- Which parts would a motivated learner actually enjoy reading?

STEP 2 - EXTRACT PASSAGES meeting these criteria:

LENGTH: 400-600 Arabic words (strict)

WHAT MAKES A PASSAGE "INTERESTING" (be specific):
- Stories or anecdotes (someone did something, something happened)
- Personal reflections or wisdom from life experience
- Vivid descriptions that paint a picture
- Surprising insights or counterintuitive points
- Universal themes: human nature, ethics, relationships, purpose
- Emotional resonance: passages that move the reader

WHAT TO AVOID:
- Technical definitions or rules
- Lists, enumerations, classifications
- Heavy quoting from other sources
- Editor introductions, publication info
- Abstract theological debates without concrete examples
- Passages requiring specialized background knowledge

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

ENGLISH TRANSLATION RULES:
- All translations will be read aloud via text-to-speech — use natural, flowing language.
- NEVER add comments, footnotes, brackets, or translator notes in the English text (e.g., "[i.e. ...]", "[Translator's note: ...]"). The translation must be clean text only.

RESPONSE FORMAT (JSON only):
{{{{
  "passages": [
    {{{{
      "arabic_text": "the full Arabic text here...",
      "english_translation": "Full English translation here...",
      "word_count": 245,
      "quality_score": 8.5,
      "reason": "Story about X encountering Y, with vivid details and a memorable lesson about Z."
    }}}}
  ]
}}}}

Return ONLY valid JSON. No markdown, no explanations outside JSON."""


def _extract_with_claude_cli(
    arabic_text: str,
    max_passages: int = 25,
) -> dict:
    """Extract passages using Claude CLI (claude -p).

    Uses the local Claude CLI which runs on your Max subscription — no API cost.
    The Arabic text is piped via stdin to avoid shell arg limits.
    """
    if not shutil.which("claude"):
        raise FileNotFoundError("Claude CLI not found. Install it or use --use-deepseek.")

    system_prompt = build_extraction_prompt(max_passages)

    # Truncate to fit Claude's context — leave room for prompt + response
    max_chars = 180000
    if len(arabic_text) > max_chars:
        arabic_text = arabic_text[:max_chars]
        logger.warning(f"Truncated text to {max_chars} characters for Claude CLI")

    # Write the full prompt (system + arabic text) to a temp file
    # and pipe it via stdin — avoids arg length limits
    full_prompt = (
        f"{system_prompt}\n\n---\n\n"
        f"Extract suitable learning passages from this Arabic text:\n\n"
        f"{arabic_text}\n\n"
        f"Remember: 400-600 words per passage, pure prose, self-contained, engaging content.\n"
        f"Return ONLY valid JSON. No markdown code blocks."
    )

    # Strip env vars that prevent nested Claude sessions
    env = {
        k: v
        for k, v in os.environ.items()
        if k not in ("CLAUDE_CODE_ENTRYPOINT", "CLAUDECODE")
    }

    print_status("Sending text to Claude CLI for passage extraction...")
    result = subprocess.run(
        [
            "claude",
            "-p",
            "--output-format",
            "text",
            "--max-turns",
            "1",
        ],
        input=full_prompt,
        capture_output=True,
        text=True,
        timeout=600,
        env=env,
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"Claude CLI failed (exit {result.returncode}): {result.stderr[:500]}"
        )

    content = result.stdout.strip()
    if not content:
        raise ValueError("Claude CLI returned empty response")

    logger.info(f"Claude CLI response: {len(content)} chars")
    return _parse_json_from_text(content)


def _extract_with_deepseek(
    arabic_text: str,
    max_passages: int = 25,
) -> dict:
    """Extract passages using DeepSeek via OpenRouter (fallback)."""
    from utils.openrouter_client import OpenRouterClient

    system_prompt = build_extraction_prompt(max_passages)

    # Truncate if extremely long (DeepSeek context limit)
    max_chars = 90000
    if len(arabic_text) > max_chars:
        arabic_text = arabic_text[:max_chars]
        logger.warning(f"Truncated text to {max_chars} characters")

    user_prompt = (
        f"Extract suitable learning passages from this Arabic text:\n\n"
        f"{arabic_text}\n\n"
        f"Remember: 400-600 words per passage, pure prose, self-contained, engaging content."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    client = OpenRouterClient()
    print_status("Sending text to DeepSeek for passage extraction...")
    api_response = client.call_api(messages, max_tokens=32000, temperature=0.3)
    return client.parse_json_response(api_response)


def _parse_json_from_text(text: str) -> dict:
    """Parse JSON from text that may be wrapped in markdown code blocks."""
    # Strip markdown code blocks
    if "```json" in text:
        start = text.find("```json") + 7
        end = text.find("```", start)
        text = text[start:end].strip()
    elif "```" in text:
        start = text.find("```") + 3
        end = text.find("```", start)
        text = text[start:end].strip()

    return json.loads(text)


def extract_passages(
    arabic_text: str,
    max_passages: int = 25,
    use_deepseek: bool = False,
) -> list[ExtractedPassage]:
    """Extract suitable passages from Arabic text.

    Uses Claude CLI by default (free via Max subscription).
    Falls back to DeepSeek via OpenRouter if --use-deepseek is passed
    or if Claude CLI is not available.
    """
    if use_deepseek:
        result = _extract_with_deepseek(arabic_text, max_passages)
    else:
        try:
            result = _extract_with_claude_cli(arabic_text, max_passages)
        except FileNotFoundError:
            print_warning("Claude CLI not found, falling back to DeepSeek...")
            result = _extract_with_deepseek(arabic_text, max_passages)

    passages = []
    for p in result.get("passages", []):
        passages.append(
            ExtractedPassage(
                id=0,
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
    """Interactive CLI to review and select passages."""
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

        print("\n  Arabic:\n")
        for line in _wrap_text(passage.arabic_text, width=66):
            print(f"  {line}")

        print("\n  English:\n")
        for line in _wrap_text(passage.english_translation, width=66):
            print(f"  {line}")

        print(f"\n  Why: {passage.reason}")
        print(f"{'─' * 70}")

        while True:
            try:
                choice = input("\n  [y/n/q] > ").strip().lower()
            except EOFError:
                choice = "q"

            if choice == "y":
                selected.append(passage)
                print_success(f"  Passage {passage.id} selected")
                break
            if choice == "n":
                print_warning(f"  Passage {passage.id} skipped")
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
    """Get the inbox folder name for an author."""
    for folder in AUTHOR_FOLDER_MAPPING:
        if folder.startswith(f"{author_key}_"):
            return folder

    if author_key in AUTHOR_FOLDER_MAPPING:
        return author_key

    return None


def save_passages_to_inbox(
    passages: list[ExtractedPassage],
    author_folder: str,
    source_title: str,
) -> list[Path]:
    """Save selected passages as text files in the author's inbox folder."""
    inbox_path = Path(INBOX_DIR) / author_folder
    inbox_path.mkdir(parents=True, exist_ok=True)

    clean_title = re.sub(r"[^\w\s-]", "", source_title)
    clean_title = re.sub(r"\s+", "_", clean_title).lower()[:30]

    created_files = []

    # Find highest existing number once, then increment
    existing_nums = [
        int(m.group(1))
        for f in inbox_path.glob(f"{clean_title}_*.txt")
        if (m := re.search(r"_(\d+)\.txt$", f.name))
    ]
    next_num = max(existing_nums, default=0) + 1

    for passage in passages:
        filename = f"{clean_title}_{next_num:03d}.txt"
        file_path = inbox_path / filename

        file_path.write_text(passage.arabic_text, encoding="utf-8")
        created_files.append(file_path)
        next_num += 1

        print_success(f"  Saved: {file_path.name}")

    return created_files


def _read_local_file(file_path: str) -> tuple[str, str]:
    """Read Arabic text from a local file.

    Returns:
        Tuple of (arabic_text, title derived from filename)
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    text = path.read_text(encoding="utf-8")

    # Filter to Arabic content if the file has mixed content
    arabic_pattern = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]")
    if arabic_pattern.search(text):
        title = path.stem.replace("_", " ").replace("-", " ").title()
        return text, title

    raise ValueError(f"No Arabic content found in {file_path}")


def extract_from_source(
    author_key: str,
    url: str | None = None,
    file_path: str | None = None,
    max_passages: int = 25,
    skip_review: bool = False,
    skip_pages: int = 10,
    use_deepseek: bool = False,
) -> ExtractionResult:
    """Main entry point: extract passages from a URL or local file and save to inbox.

    Provide either url or file_path (not both).
    """
    if not url and not file_path:
        raise ValueError("Provide either --url or --file")

    # Validate author
    author_folder = get_author_folder(author_key)
    if not author_folder:
        raise ValueError(
            f"Unknown author: {author_key}. "
            f"Valid options: {list(AUTHOR_FOLDER_MAPPING.keys())}"
        )

    author_name = AUTHOR_FOLDER_MAPPING[author_folder]
    print_status(f"Author: {author_name} ({author_folder})")

    # Get Arabic text from source
    if file_path:
        source = file_path
        print_status(f"Reading: {file_path}")
        arabic_text, title = _read_local_file(file_path)
        from utils.web_scraper import count_arabic_words

        word_count = count_arabic_words(arabic_text)
        print_success(f"Loaded {word_count} Arabic words from file")
    else:
        assert url is not None
        source = url
        print_status(f"Fetching: {url}")
        if skip_pages:
            print_status(f"Skipping first {skip_pages} pages (author intro)")
        scraped = scrape_url(url, skip_pages=skip_pages)
        arabic_text = scraped.arabic_text
        title = scraped.title
        word_count = scraped.word_count
        print_success(f"Downloaded {word_count} Arabic words")

    # Extract passages
    passages = extract_passages(arabic_text, max_passages, use_deepseek=use_deepseek)
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
            source=source,
            source_title=title,
            original_author=author_name,
            passages=[],
        )

    # Save to inbox
    print_status(f"\nSaving {len(selected)} passages to inbox...")
    saved_files = save_passages_to_inbox(selected, author_folder, title or "passage")

    print_success(f"\n{len(saved_files)} passages saved to 0_inbox/{author_folder}/")
    print_status("Run 'python main.py --split' to process them.")

    return ExtractionResult(
        source=source,
        source_title=title,
        original_author=author_name,
        passages=selected,
    )


# Keep backward compatibility
def extract_from_url(
    url: str,
    author_key: str,
    max_passages: int = 25,
    skip_review: bool = False,
    skip_pages: int = 10,
) -> ExtractionResult:
    """Legacy wrapper — calls extract_from_source with a URL."""
    return extract_from_source(
        author_key=author_key,
        url=url,
        max_passages=max_passages,
        skip_review=skip_review,
        skip_pages=skip_pages,
    )


# CLI test
if __name__ == "__main__":
    import argparse
    import sys

    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser(description="Extract passages from Arabic texts")
    source_group = parser.add_mutually_exclusive_group(required=True)
    source_group.add_argument("--url", help="URL to scrape")
    source_group.add_argument("--file", dest="file_path", help="Local file path to read")
    parser.add_argument("author", help="Author number or folder name")
    parser.add_argument(
        "--skip-pages",
        type=int,
        default=10,
        help="Pages to skip from the start (default: 10, use 0 to skip nothing)",
    )
    parser.add_argument(
        "--max-passages",
        type=int,
        default=25,
        help="Maximum passages to extract (default: 25)",
    )
    parser.add_argument(
        "--use-deepseek",
        action="store_true",
        help="Use DeepSeek via OpenRouter instead of Claude CLI",
    )
    args = parser.parse_args()

    try:
        with contextlib.suppress(ImportError):
            import utils.set_keys  # noqa: F401

        result = extract_from_source(
            author_key=args.author,
            url=args.url,
            file_path=args.file_path,
            max_passages=args.max_passages,
            skip_pages=args.skip_pages,
            use_deepseek=args.use_deepseek,
        )
        print(f"\nDone! Extracted from: {result.source_title}")
    except KeyboardInterrupt:
        print("\nCancelled.")
        sys.exit(130)
    except Exception as e:
        print_error(f"Failed: {e}")
        sys.exit(1)
