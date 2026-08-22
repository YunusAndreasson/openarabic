"""Deterministic transliteration of root radicals — no model involved.

`root_transliteration` is a mechanical function of the radicals, and asking a
model for it produced 'ʿilm' (a word, not a root) and 'qwm' (no diacritics) in a
5-root trial. A lookup table cannot make that mistake.
"""

from __future__ import annotations

RADICAL = {
    "ا": "ʾ", "أ": "ʾ", "إ": "ʾ", "آ": "ʾ", "ء": "ʾ", "ؤ": "ʾ", "ئ": "ʾ",
    "ب": "b", "ت": "t", "ث": "ṯ", "ج": "j", "ح": "ḥ", "خ": "ḵ",
    "د": "d", "ذ": "ḏ", "ر": "r", "ز": "z", "س": "s", "ش": "š",
    "ص": "ṣ", "ض": "ḍ", "ط": "ṭ", "ظ": "ẓ", "ع": "ʿ", "غ": "ġ",
    "ف": "f", "ق": "q", "ك": "k", "ل": "l", "م": "m", "ن": "n",
    "ه": "h", "ة": "h", "و": "w", "ي": "y", "ى": "y",
}


def radicals(root: str) -> list[str]:
    """The individual Arabic letters of a root, however it was spaced."""
    return [ch for ch in root.replace(" ", "") if ch in RADICAL]


def spaced(root: str) -> str:
    """Display form: radicals separated by single spaces, e.g. 'ق ل ب'."""
    return " ".join(radicals(root))


def transliterate(root: str) -> str:
    """Hyphen-joined romanisation, e.g. 'q-l-b', 'ʾ-w-l'."""
    return "-".join(RADICAL[ch] for ch in radicals(root))


# Arabic block plus the presentation forms; anything outside it in a field that
# must hold Arabic is a returned transliteration, which is the failure a 5-root
# trial hit on 2 of 3 records (family letters came back as 'ʿalima', 'q-w-m').
def is_arabic(text: str) -> bool:
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return False
    return all("؀" <= c <= "ۿ" or "ﭐ" <= c <= "﻿" for c in letters)


def bareword_key(text: str) -> str:
    """Undiacritised letters only — so عَبْد and عبد compare as one word."""
    return "".join(c for c in text if c in RADICAL or ("ؠ" <= c <= "ي"))
