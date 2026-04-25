"""Quran verse lookup using Sahih International translation.

Downloads and caches the full Sahih International translation from alquran.cloud,
then provides lookup by surah:ayah reference.

Usage:
    python quran_lookup.py              # Download and cache
    python quran_lookup.py --test 2:255 # Look up a specific verse
"""

from __future__ import annotations

import json
import re
import sys
import urllib.request
from difflib import SequenceMatcher
from functools import lru_cache
from pathlib import Path

CACHE_FILE = Path(__file__).parent / "sahih_international.json"
API_URL = "https://api.alquran.cloud/v1/quran/en.sahih"

ARABIC_CACHE_FILE = Path(__file__).parent / "quran_arabic.json"
ARABIC_API_URL = "https://api.alquran.cloud/v1/quran/quran-uthmani"


def _download_json(url: str) -> dict:
    """Download JSON from a URL."""
    req = urllib.request.Request(url, headers={"User-Agent": "OpenArabic/1.0"})
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read())


def _extract_verses(data: dict) -> dict[str, str]:
    """Extract {surah:ayah: text} dict from alquran.cloud API response."""
    verses: dict[str, str] = {}
    for surah in data["data"]["surahs"]:
        for ayah in surah["ayahs"]:
            verses[f"{surah['number']}:{ayah['numberInSurah']}"] = ayah["text"]
    return verses


def _load_or_download(cache_path: Path, api_url: str, label: str) -> dict[str, str]:
    """Load from cache or download from API."""
    if cache_path.exists():
        with open(cache_path, encoding="utf-8") as f:
            return json.load(f)

    print(f"Downloading {label} from {api_url}...")
    data = _download_json(api_url)
    if data.get("status") != "OK":
        raise RuntimeError(f"API error: {data}")

    verses = _extract_verses(data)
    cache_path.write_text(
        json.dumps(verses, ensure_ascii=False, indent=0), encoding="utf-8",
    )
    print(f"Downloaded {len(verses)} verses, cached to {cache_path}")
    return verses


@lru_cache(maxsize=1)
def get_verses() -> dict[str, str]:
    """Get the Sahih International verse dictionary (cached in memory)."""
    return _load_or_download(CACHE_FILE, API_URL, "Sahih International")


@lru_cache(maxsize=1)
def get_arabic_quran() -> dict[str, str]:
    """Get Arabic Quran text dict (cached in memory)."""
    return _load_or_download(ARABIC_CACHE_FILE, ARABIC_API_URL, "Arabic Quran")


def lookup_verse(reference: str) -> str | None:
    """Look up a verse by reference like '2:255' or '50:37'.

    Returns the Sahih International English text, or None if not found.
    """
    ref = reference.strip()
    if "-" in ref:
        ref = ref.split("-")[0]
    return get_verses().get(ref)


# --- Arabic text normalization for fuzzy matching ---

_DIACRITICS_RE = re.compile(r"[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]")
_ALEF_VARIANTS_RE = re.compile(r"[إأآٱ]")
_WHITESPACE_RE = re.compile(r"\s+")


def _normalize_arabic(text: str) -> str:
    """Normalize Arabic text for fuzzy comparison.

    Strips diacritics, normalizes alef/hamza/taa-marbuta variants,
    and collapses whitespace.
    """
    # Superscript alef → regular alef (before stripping diacritics)
    text = text.replace("\u0670", "\u0627")
    # Strip tashkeel
    text = _DIACRITICS_RE.sub("", text)
    # Normalize alef variants
    text = _ALEF_VARIANTS_RE.sub("ا", text)
    # Remove standalone hamza (differs between editions)
    text = text.replace("\u0621", "")
    # Taa marbuta → haa
    text = text.replace("ة", "ه")
    # Alef maqsura → yaa
    text = text.replace("ى", "ي")
    # Remove tatweel
    text = text.replace("\u0640", "")
    # Collapse whitespace
    return _WHITESPACE_RE.sub(" ", text).strip()


def verify_verse_reference(arabic_text: str, reference: str) -> bool:
    """Verify that a Quran reference matches the Arabic text via fuzzy matching.

    Handles single verses (50:37), ranges (36:69-70), and partial quotes.
    """
    quran = get_arabic_quran()
    norm_input = _normalize_arabic(arabic_text)

    # For range references like "36:69-70", concatenate the verses
    if "-" in reference:
        base, _, end_ayah = reference.partition("-")
        surah, _, start_ayah = base.partition(":")
        try:
            combined = " ".join(
                quran.get(f"{surah}:{a}", "")
                for a in range(int(start_ayah), int(end_ayah) + 1)
            )
            norm_combined = _normalize_arabic(combined)
            if norm_input in norm_combined or norm_combined in norm_input:
                return True
        except ValueError:
            pass

    # Single verse check
    actual_arabic = quran.get(reference)
    if not actual_arabic:
        return False

    norm_actual = _normalize_arabic(actual_arabic)

    # Exact substring match (handles partial quotes)
    if norm_input in norm_actual or norm_actual in norm_input:
        return True

    # Fuzzy match for Uthmani vs Imla'i spelling differences
    shorter, longer = sorted([norm_input, norm_actual], key=len)
    # Check beginning of verse (most common for partial quotes)
    window = longer[: len(shorter) + 5]
    if SequenceMatcher(None, shorter, window).ratio() >= 0.8:
        return True
    # Check end of verse
    window = longer[-(len(shorter) + 5) :]
    return SequenceMatcher(None, shorter, window).ratio() >= 0.8


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        ref = sys.argv[2] if len(sys.argv) > 2 else "50:37"
        text = lookup_verse(ref)
        if text:
            print(f"[{ref}] {text}")
        else:
            print(f"Verse {ref} not found")
    else:
        get_verses()
        print(f"Al-Fatiha 1:1 = {lookup_verse('1:1')}")
        print(f"Qaf 50:37 = {lookup_verse('50:37')}")
