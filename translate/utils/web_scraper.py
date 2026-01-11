"""Web scraper for extracting Arabic text from URLs.

This module handles downloading and parsing text content from various sources,
with special handling for Arabic text platforms like Usul.ai.
"""

import json
import logging
import re
from dataclasses import dataclass
from typing import Any, cast

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


@dataclass
class ScrapedContent:
    """Result of scraping a URL."""

    url: str
    title: str
    author: str
    arabic_text: str
    word_count: int
    source_platform: str


def fetch_url(url: str, timeout: int = 30) -> str:
    """Fetch raw HTML/content from URL.

    Args:
        url: URL to fetch
        timeout: Request timeout in seconds

    Returns:
        Raw response text

    Raises:
        requests.RequestException: If fetch fails
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; OpenArabic/1.0; +https://github.com/openarabic)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ar,en;q=0.5",
    }

    response = requests.get(url, headers=headers, timeout=timeout)
    response.raise_for_status()
    return response.text


def extract_arabic_text(html: str) -> str:
    """Extract Arabic text content from HTML.

    Args:
        html: Raw HTML string

    Returns:
        Extracted Arabic text
    """
    soup = BeautifulSoup(html, "html.parser")

    # Remove script and style elements
    for element in soup(["script", "style", "nav", "header", "footer"]):
        element.decompose()

    # Get text content
    text = soup.get_text(separator="\n", strip=True)

    # Filter to lines containing Arabic characters
    arabic_pattern = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+")
    arabic_lines = []

    for line in text.split("\n"):
        line = line.strip()
        if arabic_pattern.search(line) and len(line) > 20:
            arabic_lines.append(line)

    return "\n\n".join(arabic_lines)


def try_extract_json_data(html: str) -> dict[str, Any] | None:
    """Try to extract structured JSON data from page (for SPAs like Usul.ai).

    Args:
        html: Raw HTML string

    Returns:
        Parsed JSON data if found, None otherwise
    """
    soup = BeautifulSoup(html, "html.parser")

    # Look for Next.js/Nuxt data scripts
    for script in soup.find_all("script"):
        script_text = script.string or ""

        # Next.js __NEXT_DATA__
        if script.get("id") == "__NEXT_DATA__":
            try:
                return cast("dict[str, Any]", json.loads(script_text))
            except json.JSONDecodeError:
                continue

        # Look for inline JSON with Arabic content
        if "pageProps" in script_text or '"content"' in script_text:
            # Try to extract JSON object
            try:
                # Find JSON-like structure
                match = re.search(r"\{.*\"content\".*\}", script_text, re.DOTALL)
                if match:
                    return cast("dict[str, Any]", json.loads(match.group()))
            except (json.JSONDecodeError, AttributeError):
                continue

    return None


def fetch_all_usul_pages(base_url: str, max_pages: int = 100) -> str:
    """Fetch all pages from a paginated Usul.ai text.

    Args:
        base_url: Base URL without page number (e.g., https://usul.ai/t/zaghl-cilm)
        max_pages: Maximum pages to fetch

    Returns:
        Combined Arabic text from all pages
    """
    all_arabic = []
    arabic_pattern = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+")

    for page in range(1, max_pages + 1):
        url = f"{base_url}/{page}"
        try:
            html = fetch_url(url)
            # Extract Arabic words from this page
            words = arabic_pattern.findall(html)
            if len(words) < 50:  # Too few words, probably hit the end
                logger.info(f"Page {page}: only {len(words)} words - stopping")
                break
            all_arabic.extend(words)
            logger.info(f"Page {page}: {len(words)} words (total: {len(all_arabic)})")
        except requests.exceptions.HTTPError as e:
            if "404" in str(e):
                logger.info(f"Page {page}: not found - stopping")
                break
            raise

    # Reconstruct text with spaces
    return " ".join(all_arabic)


def extract_from_usul_ai(html: str, url: str = "") -> tuple[str, str, str]:
    """Special extraction for Usul.ai platform.

    Args:
        html: Raw HTML from usul.ai
        url: Original URL (used for pagination)

    Returns:
        Tuple of (title, author, arabic_text)
    """
    title = ""
    author = ""
    arabic_text = ""

    soup = BeautifulSoup(html, "html.parser")

    # Try common title patterns
    title_elem = soup.find("h1") or soup.find("title")
    if title_elem:
        title = title_elem.get_text(strip=True)

    # Check if this is a paginated text (has /1, /2 links)
    if url:
        # Remove any existing page number from URL
        base_url = re.sub(r"/\d+$", "", url)
        # Check for pagination links
        page_links = soup.find_all(
            "a", href=re.compile(rf"{re.escape(base_url.split('/')[-1])}/\d+")
        )
        if page_links:
            logger.info("Detected paginated content, fetching all pages...")
            arabic_text = fetch_all_usul_pages(base_url)
            return title, author, arabic_text

    # Fall back to single page extraction
    main_content = (
        soup.find("article")
        or soup.find("main")
        or soup.find(class_=re.compile(r"content|text|body", re.I))
        or soup.find(id=re.compile(r"content|text|body", re.I))
    )

    if main_content:
        arabic_text = extract_arabic_text(str(main_content))
    else:
        arabic_text = extract_arabic_text(html)

    return title, author, arabic_text


def count_arabic_words(text: str) -> int:
    """Count Arabic words in text.

    Args:
        text: Text containing Arabic

    Returns:
        Word count
    """
    arabic_pattern = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+")
    words = arabic_pattern.findall(text)
    return len(words)


def scrape_url(url: str) -> ScrapedContent:
    """Scrape Arabic content from a URL.

    Args:
        url: URL to scrape

    Returns:
        ScrapedContent with extracted data

    Raises:
        requests.RequestException: If fetch fails
        ValueError: If no Arabic content found
    """
    logger.info(f"Fetching URL: {url}")
    html = fetch_url(url)
    logger.info(f"Fetched {len(html)} bytes")

    # Detect platform and use appropriate extractor
    if "usul.ai" in url:
        platform = "usul.ai"
        title, author, arabic_text = extract_from_usul_ai(html, url)
    else:
        platform = "generic"
        title = ""
        author = ""
        arabic_text = extract_arabic_text(html)

    word_count = count_arabic_words(arabic_text)

    if word_count < 50:
        raise ValueError(f"Insufficient Arabic content found: only {word_count} words")

    logger.info(f"Extracted {word_count} Arabic words from {platform}")

    return ScrapedContent(
        url=url,
        title=title,
        author=author,
        arabic_text=arabic_text,
        word_count=word_count,
        source_platform=platform,
    )


# Quick test function
def test_scrape(url: str) -> None:
    """Test scraping a URL and print results."""
    print(f"\n{'=' * 60}")
    print(f"Testing: {url}")
    print("=" * 60)

    try:
        result = scrape_url(url)
        print(f"\nPlatform: {result.source_platform}")
        print(f"Title: {result.title}")
        print(f"Author: {result.author}")
        print(f"Word count: {result.word_count}")
        print("\nFirst 500 chars of Arabic text:")
        print("-" * 40)
        print(result.arabic_text[:500])
        print("-" * 40)
        print(f"\n... ({len(result.arabic_text)} total chars)")
    except Exception as e:
        print(f"ERROR: {e}")


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO)

    if len(sys.argv) > 1:
        test_scrape(sys.argv[1])
    else:
        # Default test URL
        test_scrape("https://usul.ai/t/zaghl-cilm")
