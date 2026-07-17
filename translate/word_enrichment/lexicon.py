"""Lane's Lexicon lookup — the public-domain grounding source for word enrichment.

Reads the machine-readable Lane's Arabic-English Lexicon SQLite database
(laneslexicon/LexiconDatabase, built from the Perseus XML, CC-BY-SA / public
domain). Given an Arabic word/lemma, resolves its triliteral root and returns a
compact, tag-stripped grounding bundle (root, derived word-family, part-of-speech
hints, and the entry prose). This text is fed to the model ONLY as grounding; the
published enrichment is synthesised and cited, never a verbatim dump.
"""

from __future__ import annotations

import html
import re
import sqlite3
from dataclasses import dataclass, field
from pathlib import Path

SOURCE_NAME = "Lane's Arabic-English Lexicon (E. W. Lane, 1863–1893)"
SOURCE_URL = "https://lanelexicon.com/"

DB_PATH = Path(__file__).resolve().parent / "sources" / "lexicon.sqlite"

# Arabic diacritics (harakat, shadda, sukun, superscript alef) + tatweel.
_DIACRITICS = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭـ]")
_TAG = re.compile(r"<[^>]+>")
_WS = re.compile(r"\s+")

# Arabic verb form numbers → conventional roman labels (from itype).
_FORM = {
    "1": "I", "2": "II", "3": "III", "4": "IV", "5": "V",
    "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X",
}


def bareword(text: str) -> str:
    """Strip diacritics + tatweel so word forms compare on their skeleton."""
    return _DIACRITICS.sub("", text or "").strip()


def _xml_to_text(xml: str) -> str:
    """Flatten a Lane entry's XML/TEI markup to clean prose grounding."""
    if not xml:
        return ""
    txt = _TAG.sub(" ", xml)
    txt = html.unescape(txt)
    return _WS.sub(" ", txt).strip()


@dataclass
class Grounding:
    root: str  # vocalised Arabic root, e.g. "حمد"
    broot: str  # Buckwalter root, e.g. "Hmd"
    derived_forms: list[dict] = field(default_factory=list)  # {word, form}
    pos: list[dict] = field(default_factory=list)  # {headword, pos}
    text: str = ""  # tag-stripped entry prose (grounding budget-capped)
    source: str = SOURCE_NAME
    source_url: str = SOURCE_URL

    def is_usable(self, min_chars: int = 200) -> bool:
        return bool(self.root) and len(self.text) >= min_chars


def _resolve_root(conn: sqlite3.Connection, word: str) -> tuple[str, str] | None:
    """(root, broot) for an Arabic word, via the entry/xref bareword indexes."""
    bw = bareword(word)
    if not bw:
        return None
    cur = conn.cursor()
    # 1) exact vocalised or bare headword/word match in `entry`.
    for col in ("headword", "word", "bareword"):
        row = cur.execute(
            f"SELECT root, broot FROM entry WHERE {col}=? AND root!='' LIMIT 1",
            (word if col != "bareword" else bw,),
        ).fetchone()
        if row and row[0]:
            return row[0], row[1]
    # 2) cross-reference table maps inflected words → root.
    row = cur.execute(
        "SELECT root, broot FROM xref WHERE bareword=? AND root!='' LIMIT 1", (bw,)
    ).fetchone()
    if row and row[0]:
        return row[0], row[1]
    # 3) last resort: prefix match on bareword headwords sharing the skeleton.
    row = cur.execute(
        "SELECT root, broot FROM entry WHERE bareword=? AND root!='' LIMIT 1", (bw,)
    ).fetchone()
    if row and row[0]:
        return row[0], row[1]
    return None


def lookup(word: str, *, text_budget: int = 6000, db_path: Path = DB_PATH) -> Grounding | None:
    """Grounding for an Arabic word, or None if the root isn't found in Lane's."""
    if not db_path.exists():
        raise FileNotFoundError(f"Lane's SQLite not found at {db_path}")
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    try:
        resolved = _resolve_root(conn, word)
        if not resolved:
            return None
        root, broot = resolved
        cur = conn.cursor()

        rows = cur.execute(
            "SELECT headword, itype, xml FROM entry "
            "WHERE broot=? AND root!='' ORDER BY nodenum",
            (broot,),
        ).fetchall()
        if not rows:
            return None

        derived, chunks = [], []
        seen = set()
        for headword, itype, xml in rows:
            if headword and headword not in seen:
                seen.add(headword)
                derived.append({"word": headword, "form": _FORM.get(str(itype or ""), "")})
            piece = _xml_to_text(xml)
            if piece:
                chunks.append(piece)

        pos_rows = cur.execute(
            "SELECT DISTINCT headword, pos FROM pos WHERE root=? AND pos!=''",
            (root,),
        ).fetchall()
        pos = [{"headword": h, "pos": p} for h, p in pos_rows if h]

        text = _WS.sub(" ", " ".join(chunks)).strip()[:text_budget]
        return Grounding(root=root, broot=broot, derived_forms=derived, pos=pos, text=text)
    finally:
        conn.close()


if __name__ == "__main__":
    import json
    import sys

    word = sys.argv[1] if len(sys.argv) > 1 else "حمد"
    g = lookup(word)
    if not g:
        print(f"NO grounding for {word!r}")
        sys.exit(1)
    print(f"root={g.root} ({g.broot})  usable={g.is_usable()}  text_len={len(g.text)}")
    print("derived_forms:", json.dumps(g.derived_forms, ensure_ascii=False))
    print("pos:", json.dumps(g.pos, ensure_ascii=False))
    print("\n--- grounding text preview (first 700 chars) ---")
    print(g.text[:700])
