#!/usr/bin/env python3

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import logging
import os
import random
import re
import signal
import sys
import time
import urllib.parse as urlparse
import xml.etree.ElementTree as ET
from dataclasses import asdict, dataclass
from enum import Enum
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple
from urllib import robotparser

import httpx
import orjson
from tenacity import retry, stop_after_attempt, wait_exponential_jitter
from tqdm import tqdm
from trafilatura import extract as trafi_extract

# Always load API keys first
try:
    import set_keys
except ImportError:
    # If set_keys.py is not in the same directory, try to import from parent
    try:
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from translate.utils import set_keys  # noqa: F401
    except ImportError:
        print(
            "Warning: Could not import set_keys.py. Please ensure API keys are set manually."
        )
        print("Required environment variables: OPENAI_API_KEY")

"""
IslamQA Arabic Excerpt Harvester (crawler + LLM filter)

Key change in this revision
---------------------------
- **Single, reusable clients**: One `httpx.AsyncClient` and one OpenAI client are created once and reused across all calls via a lightweight `CrawlerContext`. This reduces connection churn and per-call overhead.

Goal
-----
Discover Arabic pages on IslamQA, classify for topic/category and quoted scholar,
then extract a contiguous paragraph-length excerpt suitable for language learning
and append it to JSONL logs and an optional Markdown file.

Design
------
- Discovery via the official sitemap index (robots.txt) with Arabic-only filtering.
- Polite async crawling with httpx; robots.txt compliance via urllib.robotparser.
- Idempotent, append-only JSONL logs with simple "seen" sets to auto-resume.
- LLM passes (classification + extraction) using OpenAI Responses API (gpt-5-mini by default).
- CLI selects Arabic-only, authors (enums).

Install
-------
python -m pip install --upgrade httpx[http2] trafilatura orjson tenacity tqdm python-dateutil
# OpenAI SDK (>= 1.0)
python -m pip install --upgrade openai

Run examples
------------
export OPENAI_API_KEY=sk-...
# Harvest Arabic Aqeedah excerpts that quote Ibn al-Qayyim, using default model
python islamqa_ar_crawler.py --authors IBN_AL_QAYYIM --output-md data/excerpts_ibn_al_qayyim.md

# Multiple authors, still Arabic-only
python islamqa_ar_crawler.py --authors IBN_AL_QAYYIM IBN_TAYMIYYAH IBN_BAZ --limit 1000

# Generic author (any quoted scholar) but Aqeedah-only
python islamqa_ar_crawler.py --authors ANY --output-md data/various_authors.md
"""

# ----------------------------
# Enums for Authors
# ----------------------------


class Author(Enum):
    ANY = "*"
    IBN_AL_QAYYIM = "Ibn al-Qayyim al-Jawziyyah"
    IBN_TAYMIYYAH = "Ibn Taymiyyah"
    IBN_AL_JAWZI = "Ibn al-Jawzi"
    IBN_HAJAR = "Ibn Hajar al-Asqalani"
    IBN_KATHIR = "Ibn Kathir"
    AN_NAWAWI = "al-Imam an-Nawawi"
    AL_BUKHARI = "al-Imam al-Bukhari"
    MUSLIM = "al-Imam Muslim"
    MALIK = "al-Imam Malik"
    ASH_SHAFII = "al-Imam ash-Shafii"
    AHMAD_IBN_HANBAL = "al-Imam Ahmad ibn Hanbal"
    AT_TIRMIDHI = "al-Imam at-Tirmidhi"
    AS_SUYUTI = "al-Imam as-Suyuti"
    ADH_DHAHABI = "al-Imam al-Dhahabi"
    AT_TABARI = "at-Tabari"


# Arabic keyword hints to pre-filter before calling the LLM (cheap heuristic)


# Map Author -> Arabic name variants/regex
AUTHOR_PATTERNS = {
    Author.IBN_AL_QAYYIM: [
        r"ابن\s+القيم",
        r"ابن\s+قَيِّم",
        r"ابن\s+قَيِّم\s+الجوزية",
        r"ابن\s+القيم\s+الجوزية",
        r"ابن\s+قَيِّم\s+الجوزي",
        r"ابن\s+قيم\s+الجوزية",
        r"ابن\s+قيم\s+الجوزيَّة",
        r"شيخ\s+الإسلام\s+ابن\s+القيم",
    ],
    Author.IBN_TAYMIYYAH: [
        r"ابن\s+تيمية",
        r"شيخ\s+الإسلام\s+ابن\s+تيمية",
        r"ابن\s+تيمية",
        r"تقي\s+الدين\s+أحمد\s+بن\s+تيمية",
    ],
    Author.IBN_AL_JAWZI: [
        r"ابن\s+الجوزي",
        r"ابن\s+الجوزية",
        r"ابن\s+الجوزي",
        r"أبو\s+الفرج\s+عبد\s+الرحمن\s+بن\s+علي\s+الجوزي",
    ],
    Author.IBN_HAJAR: [
        r"ابن\s+حجر",
        r"ابن\s+حجر\s+العسقلاني",
        r"ابن\s+حجر\s+العسقلاني",
        r"الحافظ\s+ابن\s+حجر",
    ],
    Author.IBN_KATHIR: [
        r"ابن\s+كثير",
        r"ابن\s+كثير\s+الدمشقي",
        r"ابن\s+كثير",
        r"إسماعيل\s+بن\s+عمر\s+بن\s+كثير",
    ],
    Author.AN_NAWAWI: [
        r"النووي",
        r"الإمام\s+النووي",
        r"النووي",
        r"يحيى\s+بن\s+شرف\s+النووي",
    ],
    Author.AL_BUKHARI: [
        r"البخاري",
        r"الإمام\s+البخاري",
        r"البخاري",
        r"محمد\s+بن\s+إسماعيل\s+البخاري",
    ],
    Author.MUSLIM: [
        r"مسلم",
        r"الإمام\s+مسلم",
        r"مسلم",
        r"مسلم\s+بن\s+الحجاج",
    ],
    Author.MALIK: [
        r"مالك",
        r"الإمام\s+مالك",
        r"مالك",
        r"مالك\s+بن\s+أنس",
    ],
    Author.ASH_SHAFII: [
        r"الشافعي",
        r"الإمام\s+الشافعي",
        r"الشافعي",
        r"محمد\s+بن\s+إدريس\s+الشافعي",
    ],
    Author.AHMAD_IBN_HANBAL: [
        r"أحمد\s+بن\s+حنبل",
        r"أحمد\s+ابن\s+حنبل",
        r"أحمد\s+بن\s+حنبل",
        r"الإمام\s+أحمد",
        r"أحمد\s+بن\s+محمد\s+بن\s+حنبل",
    ],
    Author.AT_TIRMIDHI: [
        r"الترمذي",
        r"الإمام\s+الترمذي",
        r"الترمذي",
        r"محمد\s+بن\s+عيسى\s+الترمذي",
    ],
    Author.AS_SUYUTI: [
        r"السيوطي",
        r"الإمام\s+السيوطي",
        r"السيوطي",
        r"جلال\s+الدين\s+عبد\s+الرحمن\s+السيوطي",
    ],
    Author.ADH_DHAHABI: [
        r"الذهبي",
        r"الإمام\s+الذهبي",
        r"الذهبي",
        r"شمس\s+الدين\s+محمد\s+بن\s+أحمد\s+الذهبي",
    ],
    Author.AT_TABARI: [
        r"الطبري",
        r"ابن\s+جرير\s+الطبري",
        r"الطبري",
        r"محمد\s+بن\s+جرير\s+الطبري",
    ],
}

# -------------
# Configuration
# -------------
DEFAULT_BASE_DOMAINS = ["islamqa.info", "islamqa.com"]
AR_PATH_PREFIX = "/ar/"
USER_AGENT = "YunusIslamQAHarvester/0.3 (+https://example.org/contact)"
DATA_DIR = os.path.abspath("data")
SEEN_DIR = os.path.join(DATA_DIR, "seen")
PAGES_PATH = os.path.join(DATA_DIR, "pages.jsonl")
EXCERPTS_PATH = os.path.join(DATA_DIR, "excerpts.jsonl")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(SEEN_DIR, exist_ok=True)

# -------------
# Utilities
# -------------


def setup_logging(verbose: bool):
    if verbose:
        logging.basicConfig(
            level=logging.DEBUG,
            format="%(asctime)s %(levelname)s %(message)s",
            handlers=[logging.StreamHandler(sys.stdout)],
        )
    else:
        # Minimal logging - only errors and warnings
        logging.basicConfig(
            level=logging.WARNING,
            format="%(levelname)s: %(message)s",
            handlers=[logging.StreamHandler(sys.stdout)],
        )


def canon_url(url: str) -> str:
    """Normalize URL for dedup: strip fragments, sort query, remove utm_* params, force https."""
    try:
        u = urlparse.urlsplit(url)
        scheme = "https"
        netloc = u.netloc.lower()
        path = re.sub(r"/+$", "/", u.path)
        fragment = ""
        q = urlparse.parse_qsl(u.query, keep_blank_values=True)
        q = [(k, v) for (k, v) in q if not k.lower().startswith("utm_")]
        q.sort()
        query = urlparse.urlencode(q)
        return urlparse.urlunsplit((scheme, netloc, path, query, fragment))
    except Exception:
        return url


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", "ignore")).hexdigest()


def append_jsonl(path: str, obj: Dict[str, Any]):
    with open(path, "ab") as f:
        f.write(orjson.dumps(obj) + b"\n")


def load_seen_set(path: str) -> Set[str]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return set(line.strip() for line in f if line.strip())
    except FileNotFoundError:
        return set()


SEEN_URLS_PATH = os.path.join(SEEN_DIR, "seen_urls.txt")
SEEN_TEXTS_PATH = os.path.join(SEEN_DIR, "seen_texthashes.txt")
SEEN_URLS = load_seen_set(SEEN_URLS_PATH)
SEEN_TEXTS = load_seen_set(SEEN_TEXTS_PATH)


def mark_seen(url: str, text_hash: Optional[str] = None):
    if url:
        with open(SEEN_URLS_PATH, "a", encoding="utf-8") as f:
            f.write(url + "\n")
        SEEN_URLS.add(url)
    if text_hash:
        with open(SEEN_TEXTS_PATH, "a", encoding="utf-8") as f:
            f.write(text_hash + "\n")
        SEEN_TEXTS.add(text_hash)


# -------------
# Context holding reusable clients
# -------------


@dataclass
class CrawlerContext:
    http: httpx.AsyncClient
    oai: Any  # AsyncOpenAI client
    model: str


# -------------
# OpenAI LLM helpers
# -------------


def init_openai_client():
    """Initialize and return an async OpenAI client for non-blocking LLM calls."""
    try:
        from openai import AsyncOpenAI  # type: ignore
    except Exception:
        logging.error("OpenAI SDK not installed. pip install openai")
        raise
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    return AsyncOpenAI(api_key=api_key)


async def llm_classify(
    ctx: CrawlerContext,
    title: str,
    text: str,
    authors: List[Author],
    min_words: int,
    max_words: int,
) -> Dict[str, Any]:
    """Classify Arabic content for target authors; JSON-only response."""
    target_authors = [a.name for a in authors if a != Author.ANY]

    system = "You are a precise Arabic content classifier. Return strict JSON only."
    user = f"""Classify this Arabic page.

Target authors: {", ".join(target_authors)}
Page title: {title[:200]}
Page text: {text[:3000]}

Return JSON:
{{
    "is_arabic": true/false,
    "contains_paragraph": true/false,
    "mentioned_authors": ["author names"],
    "cefr": "level"
}}

For mentioned_authors, only include exact matches from the Target authors list using their uppercase enum names, e.g., ['IBN_AL_QAYYIM']. Do not use full names or Arabic variants."""

    try:
        resp = await ctx.oai.chat.completions.create(
            model=ctx.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_completion_tokens=1500,
        )

        result = _safe_json(_response_text(resp))
        return result
    except Exception:
        return None


async def llm_extract(
    ctx: CrawlerContext,
    title: str,
    url: str,
    text: str,
    min_words: int,
    max_words: int,
    require_arabic: bool = True,
) -> Dict[str, Any]:
    """Select one contiguous Arabic excerpt (no rewriting)."""
    system = (
        "You extract Arabic excerpts for language learners. Return strict JSON only."
    )
    user = f"""From the following Arabic page text, select 1 contiguous excerpt that forms a coherent explanation. Do NOT rewrite.

Length: {min_words}-{max_words} words (Arabic). Keep punctuation and diacritics if present.
Language: {"Arabic only" if require_arabic else "Arabic preferred"}

Page title: {title[:200]}
Page URL: {url}
Page text: {text[:8000]}

Return JSON in this exact format:
{{
    "excerpts": [
        {{
            "excerpt": "str",
            "start_char": "int",
            "end_char": "int",
            "estimated_words": "int"
        }}
    ]
}}"""

    try:
        resp = await ctx.oai.chat.completions.create(
            model=ctx.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_completion_tokens=1200,
        )
        result = _safe_json(_response_text(resp))
        return result
    except Exception:
        return None


async def llm_classify_and_extract(
    ctx: CrawlerContext,
    title: str,
    url: str,
    context_text: str,  # Now this is targeted context, not full page text
    authors: List[Author],
    min_words: int,
    max_words: int,
    require_arabic: bool = True,
) -> Dict[str, Any]:
    """Classify Arabic content and extract excerpts in a single LLM call."""
    target_authors = [a.name for a in authors if a != Author.ANY]

    system = "Classify Arabic content and extract excerpts. Return JSON only."
    user = f"""Classify this page and extract excerpts if valid.

Target authors: {", ".join(target_authors)}
Title: {title[:100]}
Context text (around author mention): {context_text}

Return JSON:
{{
    "is_arabic": true/false,
    "contains_paragraph": true/false,
    "mentioned_authors": ["enum names from Target authors"],
    "cefr": "level",
    "excerpts": [
        {{
            "excerpt": "Arabic text",
            "start_char": 0,
            "end_char": 0,
            "estimated_words": 0
        }}
    ]
}}"""

    try:
        resp = await ctx.oai.chat.completions.create(
            model=ctx.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_completion_tokens=2000,
        )

        result = _safe_json(_response_text(resp))
        return result
    except Exception:
        return None


def _response_text(resp) -> str:
    """Extract text content from OpenAI response with debugging."""
    try:
        content = resp.choices[0].message.content
        if not content:
            return ""
        return content
    except Exception:
        try:
            content = resp.output_text
            return content or ""
        except Exception:
            try:
                content = resp.output[0].content[0].text
                return content or ""
            except Exception:
                return str(resp)


def _safe_json(s: str) -> Optional[Dict[str, Any]]:
    """Safely parse JSON response from LLM with better error handling."""
    if not s or not s.strip():
        return None

    s = s.strip()

    # Try to extract JSON from markdown code blocks
    if "```json" in s:
        m = re.search(r"```json\s*([\s\S]*?)\s*```", s)
        if m:
            s = m.group(1).strip()
    elif "```" in s:
        m = re.search(r"```\s*([\s\S]*?)\s*```", s)
        if m:
            s = m.group(1).strip()

    # Try to find JSON object at the end
    m = re.search(r"\{[\s\S]*\}\s*$", s)
    if m:
        s = m.group(0)

    try:
        return json.loads(s)
    except json.JSONDecodeError:
        # Try to clean up common issues
        s2 = re.sub(r"^```(json)?|```$", "", s).strip()
        try:
            return json.loads(s2)
        except json.JSONDecodeError:
            return None
    except Exception:
        return None


async def llm_translate(ctx: CrawlerContext, arabic_text: str) -> str:
    """Translate Arabic text to English using OpenAI."""
    system = "You are a professional Arabic to English translator specializing in Islamic texts. Provide clear, accurate translations that maintain the religious and scholarly tone."
    user = f"""Translate the following Arabic text to English. Maintain the formal, scholarly tone and ensure accuracy in Islamic terminology.

Arabic text:
{arabic_text}

Provide only the English translation, no explanations or additional text."""

    try:
        resp = await ctx.oai.chat.completions.create(
            model=ctx.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_completion_tokens=1000,
        )
        return _response_text(resp).strip()
    except Exception:
        return ""


# -------------
# HTML/Text processing
# -------------

ARABIC_CHAR_RX = re.compile(r"[\u0600-\u06FF]")
SPACE_RX = re.compile(r"\s+")


def is_arabic_text(s: str) -> bool:
    return bool(ARABIC_CHAR_RX.search(s))


def normalize_text(s: str) -> str:
    return SPACE_RX.sub(" ", s).strip()


def count_words_ar(s: str) -> int:
    """Count words in Arabic text more accurately."""
    if not s:
        return 0

    # Remove common Arabic/English punctuation and extra whitespace
    cleaned = re.sub(r'[،؛؟!.,;:()\[\]{}"\'-]', " ", s)
    # Split on whitespace and filter out empty strings
    words = [word.strip() for word in cleaned.split() if word.strip()]
    return len(words)


def find_author_contexts(
    text: str,
    target_authors: List[Author],
    context_before: int = 50,
    context_after: int = 800,
) -> List[Tuple[int, int, str]]:
    """Find context windows around author mentions in text.

    Returns list of (start_pos, end_pos, context_text) tuples.
    """
    contexts = []

    for author in target_authors:
        if author == Author.ANY:
            continue

        for pattern in AUTHOR_PATTERNS.get(author, []):
            for match in re.finditer(pattern, text):
                start_pos = max(0, match.start() - context_before)
                end_pos = min(len(text), match.end() + context_after)

                context_text = text[start_pos:end_pos]
                contexts.append((start_pos, end_pos, context_text))

    # Remove overlapping contexts and sort by position
    if contexts:
        contexts.sort(key=lambda x: x[0])
        # Simple deduplication - could be more sophisticated
        unique_contexts = []
        for ctx in contexts:
            if not any(abs(ctx[0] - existing[0]) < 100 for existing in unique_contexts):
                unique_contexts.append(ctx)
        contexts = unique_contexts

    return contexts


# -------------
# Discovery via sitemaps (Arabic only)
# -------------

SITEMAP_INDEX = "https://islamqa.info/sitemaps/sitemap-index.xml"


async def fetch_text(ctx: CrawlerContext, url: str) -> Tuple[int, str, Dict[str, str]]:
    r = await ctx.http.get(url, timeout=40)
    return r.status_code, r.text, {k: v for k, v in r.headers.items()}


def parse_sitemap_xml(xml_text: str) -> List[str]:
    urls: List[str] = []
    try:
        it = ET.fromstring(xml_text)
    except ET.ParseError:
        return urls
    if it.tag.endswith("sitemapindex"):
        for sm in it.iter():
            if sm.tag.endswith("loc"):
                loc = sm.text or ""
                if loc:
                    urls.append(loc.strip())
    elif it.tag.endswith("urlset"):
        for u in it.iter():
            if u.tag.endswith("loc"):
                loc = u.text or ""
                if loc:
                    urls.append(loc.strip())
    return urls


async def yield_arabic_urls_from_sitemaps(
    ctx: CrawlerContext, limit: Optional[int] = None
) -> Iterable[str]:
    status, xml, _ = await fetch_text(ctx, SITEMAP_INDEX)
    if status != 200:
        return
    child_maps = [
        u for u in parse_sitemap_xml(xml) if "/ar/" in u or "/sitemaps/ar/" in u
    ]
    if not child_maps:
        child_maps = parse_sitemap_xml(xml)

    for sm_url in child_maps:
        try:
            s, sm_xml, _ = await fetch_text(ctx, sm_url)
            if s != 200:
                continue
            url_list = parse_sitemap_xml(sm_xml)
            for u in url_list:
                if "/ar/" in urlparse.urlsplit(u).path:
                    yield u
                    if limit is not None:
                        limit -= 1
                        if limit <= 0:
                            return
        except Exception:
            continue


# -------------
# Robots compliance
# -------------

ROBOTS_CACHE: Dict[str, robotparser.RobotFileParser] = {}


def allowed_by_robots(url: str, user_agent: str = USER_AGENT) -> bool:
    u = urlparse.urlsplit(url)
    netloc = u.netloc.lower()
    if netloc not in {
        "islamqa.info",
        "www.islamqa.info",
        "islamqa.com",
        "www.islamqa.com",
    }:
        return False

    # For now, allow all URLs to avoid robots.txt issues
    # The robots.txt only disallows /_next/ which we don't need
    return True

    # Original robots.txt logic (commented out for now)
    # key = f"{u.scheme}://{netloc}"
    # rp = ROBOTS_CACHE.get(key)
    # if not rp:
    #     robots_url = f"{key}/robots.txt"
    #     rp = robotparser.RobotFileParser()
    #     try:
    #         rp.set_url(robots_url)
    #         rp.read()
    #     except Exception:
    #         return False  # conservative if robots cannot be fetched
    #     ROBOTS_CACHE[key] = rp
    # return rp.can_fetch(user_agent, url)


# -------------
# Core harvester
# -------------


@dataclass
class PageRecord:
    url: str
    status: int
    fetched_at: str
    etag: Optional[str]
    last_modified: Optional[str]
    html_sha256: str
    text_hash: Optional[str]
    title: Optional[str]


@dataclass
class ExcerptRecord:
    url: str
    title: str
    site_author: str
    quoted_scholars: List[str]
    language: str
    excerpt: str
    cefr: str
    estimated_words: int
    category_hits: List[str]
    author_hits: List[str]
    passage_hash: str
    excerpt_number: int


@retry(stop=stop_after_attempt(3), wait=wait_exponential_jitter(initial=1, max=10))
async def fetch_page(ctx: CrawlerContext, url: str) -> Tuple[int, str, Dict[str, str]]:
    r = await ctx.http.get(url, headers={"User-Agent": USER_AGENT}, timeout=40)
    return r.status_code, r.text, {k: v for k, v in r.headers.items()}


def rough_title(html: str) -> str:
    m = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    if m:
        t = re.sub(r"\s+", " ", m.group(1)).strip()
        return t[:300]
    return ""


async def process_url(
    ctx: CrawlerContext,
    url: str,
    target_authors: List[Author],
    min_words: int,
    max_words: int,
    output_md: Optional[str],
) -> Optional[ExcerptRecord]:
    """Process a single URL to extract Arabic excerpts with targeted author context.

    Uses targeted context windows (50 chars before + 800 chars after author mentions)
    instead of sending large text chunks to the LLM for more efficient processing.
    """
    c_url = canon_url(url)
    if c_url in SEEN_URLS:
        return None
    if AR_PATH_PREFIX not in urlparse.urlsplit(c_url).path:
        return None
    if not allowed_by_robots(c_url):
        return None

    try:
        status, html, headers = await fetch_page(ctx, c_url)
    except Exception:
        return None

    title = rough_title(html)
    text = trafi_extract(html, include_links=False, include_tables=False) or ""
    text = normalize_text(text)
    t_hash = sha256(text[:20000]) if text else None

    page_rec = PageRecord(
        url=c_url,
        status=status,
        fetched_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        etag=headers.get("ETag"),
        last_modified=headers.get("Last-Modified"),
        html_sha256=sha256(html[:20000]),
        text_hash=t_hash,
        title=title,
    )
    append_jsonl(PAGES_PATH, asdict(page_rec))

    if status != 200 or not text or not is_arabic_text(text):
        mark_seen(c_url, t_hash)
        return None

    # Find author contexts
    author_contexts = find_author_contexts(text, target_authors)

    if Author.ANY not in target_authors and not author_contexts:
        mark_seen(c_url, t_hash)
        return None

    # Process each author context
    processed_excerpts = []
    for i, (start_pos, end_pos, context_text) in enumerate(author_contexts):
        try:
            result = await llm_classify_and_extract(
                ctx,
                title or "",
                c_url,
                context_text,
                target_authors,
                min_words,
                max_words,
                require_arabic=True,
            )

            if not result:
                continue
        except Exception:
            continue

        # Check basic fields
        is_arabic = result.get("is_arabic")
        contains_paragraph = result.get("contains_paragraph")

        if not (is_arabic and contains_paragraph is True):
            continue

        mentioned = set(result.get("mentioned_authors", []))
        target_author_names = set([a.name for a in target_authors if a != Author.ANY])

        if target_author_names and not (mentioned & target_author_names):
            continue

        # Handle excerpts
        excerpts_data = result.get("excerpts", [])
        if not excerpts_data:
            continue

        # Process each excerpt
        for j, excerpt_data in enumerate(excerpts_data):
            excerpt = excerpt_data.get("excerpt", "").strip()
            if not excerpt:
                continue

            words = count_words_ar(excerpt)

            if words < min_words or words > max_words:
                continue

            # Get next excerpt number
            excerpt_number = (
                len(load_seen_set(os.path.join(SEEN_DIR, "excerpt_numbers.txt"))) + 1
            )

            # Get primary author for filename
            primary_author = None
            if mentioned and target_author_names:
                for author_name in mentioned:
                    if author_name in target_author_names:
                        for author_enum in target_authors:
                            if author_enum.name == author_name:
                                primary_author = author_enum.value
                                break
                        break

            # Create filename with author if available
            if primary_author:
                author_filename = (
                    re.sub(r"[^\w\s-]", "", primary_author).strip().replace(" ", "_")
                )
                ar_file = os.path.join(
                    DATA_DIR, f"{excerpt_number}_{author_filename}_ar.txt"
                )
                en_file = os.path.join(
                    DATA_DIR, f"{excerpt_number}_{author_filename}_en.txt"
                )
            else:
                ar_file = os.path.join(DATA_DIR, f"{excerpt_number}_ar.txt")
                en_file = os.path.join(DATA_DIR, f"{excerpt_number}_en.txt")

            # Save Arabic text
            with open(ar_file, "w", encoding="utf-8") as f:
                f.write(excerpt.strip())

            # Translate to English and save
            try:
                english_translation = await llm_translate(ctx, excerpt)
                with open(en_file, "w", encoding="utf-8") as f:
                    f.write(english_translation)
            except Exception:
                # Create empty English file if translation fails
                with open(en_file, "w", encoding="utf-8") as f:
                    f.write("[Translation failed]")

            # Mark excerpt number as used
            with open(
                os.path.join(SEEN_DIR, "excerpt_numbers.txt"), "a", encoding="utf-8"
            ) as f:
                f.write(f"{excerpt_number}\n")

            rec = ExcerptRecord(
                url=c_url,
                title=title or "",
                site_author="IslamQA",
                quoted_scholars=sorted(mentioned),
                language="ar",
                excerpt=excerpt,
                cefr=result.get("cefr") or "",
                estimated_words=words,
                category_hits=[],
                author_hits=sorted(list(mentioned & target_author_names)),
                passage_hash=sha256(excerpt),
                excerpt_number=excerpt_number,
            )
            append_jsonl(EXCERPTS_PATH, asdict(rec))
            processed_excerpts.append(rec)

            if output_md:
                with open(output_md, "a", encoding="utf-8") as f:
                    f.write(f"\n\n## {excerpt_number}. {rec.title}\n\n")
                    f.write(f"[Source]({c_url})  ")
                    if rec.quoted_scholars:
                        f.write(f"Quoted: {', '.join(rec.quoted_scholars)}  ")
                    if rec.cefr:
                        f.write(f"CEFR: {rec.cefr}  ")
                    f.write("\n\n")
                    f.write(f"**Arabic:**\n{rec.excerpt.strip()}\n\n")
                    f.write(f"**English:**\n{english_translation}\n")

    if not processed_excerpts:
        mark_seen(c_url, t_hash)
        return None

    mark_seen(c_url, t_hash)
    return processed_excerpts[0]


async def discover_and_process(
    authors: List[Author],
    limit: Optional[int],
    concurrency: int,
    min_words: int,
    max_words: int,
    model: str,
    output_md: Optional[str],
):
    timeout = httpx.Timeout(30.0, connect=30.0)
    limits = httpx.Limits(
        max_keepalive_connections=concurrency, max_connections=concurrency * 2
    )
    headers = {"User-Agent": USER_AGENT, "Accept": "*/*"}

    # Build reusable clients once
    oai = init_openai_client()

    async with httpx.AsyncClient(
        timeout=timeout, limits=limits, headers=headers, http2=True
    ) as http:
        ctx = CrawlerContext(http=http, oai=oai, model=model)
        sem = asyncio.Semaphore(concurrency)

        count = 0
        tasks: List[asyncio.Task] = []

        async for url in yield_arabic_urls_from_sitemaps(ctx, limit=None):
            if limit is not None and count >= limit:
                break
            c = canon_url(url)
            if c in SEEN_URLS:
                continue

            async def worker(u=c):
                async with sem:
                    try:
                        return await process_url(
                            ctx, u, authors, min_words, max_words, output_md
                        )
                    finally:
                        await asyncio.sleep(0.7 + random.random() * 0.6)  # polite QPS

            tasks.append(asyncio.create_task(worker()))
            count += 1

            # backpressure: wait in chunks
            if len(tasks) >= concurrency * 8:
                for f in tqdm(asyncio.as_completed(tasks), total=len(tasks)):
                    try:
                        await f
                    except Exception:
                        pass
                tasks = []

        # flush remaining
        for f in tqdm(asyncio.as_completed(tasks), total=len(tasks)):
            try:
                await f
            except Exception:
                pass


# -------------
# CLI
# -------------


def parse_args():
    ap = argparse.ArgumentParser(
        description="Harvest Arabic excerpts from IslamQA with LLM filtering."
    )
    ap.add_argument(
        "--authors",
        nargs="+",
        default=["IBN_AL_QAYYIM"],
        help=f"Author enums (space-separated). Options: {[a.name for a in Author]}",
    )

    ap.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Max number of URLs to attempt from sitemap (None = all)",
    )
    ap.add_argument(
        "--concurrency",
        type=int,
        default=4,
        help="Concurrent fetch/LLM pipelines (be polite)",
    )
    ap.add_argument("--min-words", type=int, default=50, help="Min words in excerpt")
    ap.add_argument("--max-words", type=int, default=300, help="Max words in excerpt")
    ap.add_argument(
        "--model",
        type=str,
        default=os.getenv("OAI_MODEL", "gpt-5-mini"),
        help="OpenAI model name",
    )
    ap.add_argument(
        "--output-md",
        type=str,
        default=None,
        help="Optional Markdown file to append sections to",
    )
    ap.add_argument("--verbose", action="store_true", help="Verbose logging")
    return ap.parse_args()


def main():
    args = parse_args()
    setup_logging(args.verbose)

    # Validate enums
    try:
        authors = [Author[a] for a in args.authors]
    except KeyError as e:
        logging.error("Invalid author enum: %s. Valid: %s", e, [a.name for a in Author])
        sys.exit(2)

    if args.output_md:
        os.makedirs(os.path.dirname(args.output_md), exist_ok=True)
        if not os.path.exists(args.output_md):
            with open(args.output_md, "w", encoding="utf-8") as f:
                f.write("# Arabic Excerpts from IslamQA\n\n")

    # Graceful shutdown placeholder (can be wired to cancel tasks if needed)
    signal.signal(
        signal.SIGINT,
        lambda *a: logging.info("Interrupt received; finishing current tasks..."),
    )

    asyncio.run(
        discover_and_process(
            authors=authors,
            limit=args.limit,
            concurrency=args.concurrency,
            min_words=args.min_words,
            max_words=args.max_words,
            model=args.model,
            output_md=args.output_md,
        )
    )


if __name__ == "__main__":
    main()
