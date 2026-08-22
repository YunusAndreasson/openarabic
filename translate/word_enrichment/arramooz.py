"""Arramooz Alwaseet lookup — an INDEPENDENT root source used to gate Lane's.

Why this exists
---------------
`verify.py`'s root check is circular for the worst failure class. It re-derives
the root by calling `lexicon.lookup()` — the same resolver that produced the
grounding the model was shown. When that resolver mis-files a word (Ibrahim ->
ع ر ب, هذه -> د ث ر) the model dutifully repeats the wrong root and the gate
sees agreement. Measured: 11 of 81 "verified" records were rejected by human
review, every one of them this class.

Arramooz is a morphological dictionary built from the Ayaspell data
(https://github.com/linuxscout/arramooz, GPL-2.0): ~40.7k vocalised entries,
each carrying an explicit `root` column, over ~5.6k distinct roots. It knows
nothing about Lane's, so its root is a genuinely independent opinion and a
disagreement is real evidence rather than a self-consistency check.

It is used OFFLINE, in this git-ignored pipeline, as a source of *facts* (which
radicals a word has). No Arramooz text is stored in or shipped with the app.

Verdicts
--------
agree      exactly one candidate root and it matches the claim
ambiguous  several candidate roots, the claim among them (e.g. زاد, which is
           both ز ي د "increase" and ز و د "provisions" — the claim may still
           be the wrong one *for this word*, so this is not a pass)
disagree   candidates exist and the claim is not among them
absent     no entry at all. NOT a pass: for a dictionary of this size, absence
           is itself diagnostic — proper names, particles, demonstratives and
           inflected (non-lemma) forms are exactly what it does not carry, and
           those are exactly the words Lane's resolver invents roots for.
"""

from __future__ import annotations

import re
import sqlite3
from dataclasses import dataclass
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "sources" / "arramooz.sqlite"

SOURCE_NAME = "Arramooz Alwaseet (Ayaspell project)"
SOURCE_URL = "https://github.com/linuxscout/arramooz"

# Codepoints, not a character class. A literal Arabic class displays in a
# different order than it is stored, so an edit can transpose a range boundary
# without looking any different -- which is exactly how pool.py ended up with
# U+061A-U+0670, a "diacritics" range covering the entire Arabic alphabet.
# Integers cannot be reordered by a bidi renderer.
_MARK_RANGES = (
    (0x0610, 0x061A),  # Arabic-script honorific marks
    (0x064B, 0x065F),  # tanwin, harakat, shadda, sukun, low/high marks
    (0x0670, 0x0670),  # superscript alef
    (0x06D6, 0x06ED),  # Qur'anic annotation marks
    (0x0640, 0x0640),  # tatweel
)
_MARKS_TABLE = {cp: None for lo, hi in _MARK_RANGES for cp in range(lo, hi + 1)}

# Cross-source orthographic fold. Arramooz writes hamza both as أ and as ء
# (ءخذ / أخذ for the same root); Lane's uses a third convention. For deciding
# whether two sources named the SAME radicals, collapse every hamza carrier to
# alef, alef-maqsura to yaa, taa-marbuta to haa.
_FOLD = str.maketrans(
    {
        "أ": "ا",  # أ -> ا
        "إ": "ا",  # إ -> ا
        "آ": "ا",  # آ -> ا
        "ء": "ا",  # ء -> ا
        "ؤ": "ا",  # ؤ -> ا
        "ئ": "ا",  # ئ -> ا
        "ٱ": "ا",  # ٱ -> ا
        "ى": "ي",  # ى -> ي
        "ة": "ه",  # ة -> ه
    }
)


def bareword(text: str) -> str:
    """Strip diacritics and tatweel, keeping the letter skeleton."""
    return (text or "").translate(_MARKS_TABLE).strip()


def fold_root(text: str) -> str:
    """Normalise a root for cross-source comparison (spaces dropped).

    Also collapses a doubled final radical so a geminate root compares equal
    whichever way a source writes it (خف vs خفف) — same rule as verify.py.
    """
    bw = bareword(text).replace(" ", "").translate(_FOLD)
    if len(bw) >= 2 and bw[-1] == bw[-2]:
        bw = bw[:-1]
    return bw


# Proclitics Arramooz does not carry (it stores lemmas, not surface forms):
# definite article, conjunctions, and the preposition/future particles.
_PROCLITICS = ("وال", "فال", "بال", "كال", "لل", "ال", "و", "ف", "ب", "ك", "ل", "س")
# Imperfect-verb prefixes, tried last: Arramooz indexes the perfect lemma, so
# a surface يَنْظُر / تَجْرِي is absent unless the subject marker comes off.
_IMPERFECT = ("ي", "ت", "ن", "أ", "ا")
# Enclitic pronouns + the feminine/plural verb endings that ride on a surface form.
_ENCLITICS = ("هما", "هنّ", "كما", "كنّ", "نا", "ها", "هم", "هن", "كم", "كن", "ني", "ه", "ك", "ي", "ت", "وا")

# Weak radicals are written interchangeably across lexicographical conventions
# (Lane's ح م و vs Arramooz حمي; ب د ي vs بدا). Folding them lets a root pair
# be recognised as the same claim written two ways — reported as `variant`,
# which is NOT a pass, only a different kind of near-miss from a real conflict.
_WEAK = str.maketrans({"و": "ا", "ي": "ا"})


def _stems(word: str) -> list[str]:
    """The surface form plus plausible clitic-stripped stems, longest first.

    Arramooz indexes lemmas. A form carrying ال- or a pronoun suffix is simply
    absent, which would otherwise read as "this word is suspicious" when it is
    only inflected.
    """
    bw = bareword(word)
    out = [bw]
    for pro in (*_PROCLITICS, *_IMPERFECT):
        if bw.startswith(pro) and len(bw) - len(pro) >= 3:
            out.append(bw[len(pro) :])
    for stem in list(out):
        for enc in _ENCLITICS:
            if stem.endswith(enc) and len(stem) - len(enc) >= 3:
                out.append(stem[: -len(enc)])
    seen: set[str] = set()
    return [s for s in out if s and not (s in seen or seen.add(s))]


@dataclass
class Opinion:
    verdict: str  # agree | ambiguous | variant | disagree | absent
    candidates: list[str]  # folded roots Arramooz offers, most-attested first
    hits: int  # how many dictionary entries matched the surface form
    matched_stem: str = ""  # which stem actually resolved

    @property
    def is_trustworthy(self) -> bool:
        """Only an unambiguous, corroborating match clears the gate."""
        return self.verdict == "agree"


# Cases where Arramooz is itself wrong and a human checked it against Lane's.
# root_id -> (adjudicated root, why). A record whose root matches is cleared
# even though the second opinion dissents — the same kind of recorded human
# decision as build_ts.MANUAL_EXCLUDE, so it is not re-litigated every run.
ADJUDICATED: dict[int, tuple[str, str]] = {
    7623: (
        "شطن",
        "Arramooz says ش ي ط, a minority derivation. Lane files شَيْطَنَ and "
        "تَشَيْطَنَ under ش ط ن (to be distant/rebellious); ش ي ط is about "
        "burning (oil, meat) and yields no شيطان forms.",
    ),
}


def adjudication(root_id: int, claimed_root: str) -> str | None:
    """The recorded reason this root stands despite a dissenting second opinion."""
    entry = ADJUDICATED.get(root_id)
    if entry and fold_root(entry[0]) == fold_root(claimed_root):
        return entry[1]
    return None


def _connect() -> sqlite3.Connection:
    if not DB_PATH.exists():
        raise FileNotFoundError(
            f"Arramooz DB missing at {DB_PATH}. Fetch it with:\n"
            "  git clone --depth 1 https://github.com/linuxscout/arramooz\n"
            "  cp arramooz/data/arabicdictionary.sqlite "
            f"{DB_PATH}"
        )
    return sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)


def roots_for(
    word: str, conn: sqlite3.Connection | None = None
) -> tuple[list[tuple[str, int]], str]:
    """((folded_root, entry_count) ..., matched_stem) for an Arabic surface form.

    Matches on the two indexed skeletons Arramooz ships: `unvocalized`
    (diacritics removed) and `normalized` (its own hamza fold). Ordered by how
    many entries back each root, so the head of the list is the best-attested
    reading.
    """
    own = conn is None
    conn = conn or _connect()
    try:
        # Stems are tried longest-first; the first that resolves wins, so an
        # unstripped match is always preferred over a speculatively stripped one.
        for stem in _stems(word):
            counts: dict[str, int] = {}
            for table in ("verbs", "nouns"):
                for column, value in (("unvocalized", stem), ("normalized", stem.translate(_FOLD))):
                    rows = conn.execute(
                        f"SELECT root, COUNT(*) FROM {table} "  # noqa: S608 - fixed table/column names
                        f"WHERE {column}=? AND root!='' GROUP BY root",
                        (value,),
                    )
                    for root, n in rows:
                        folded = fold_root(root)
                        if folded:
                            counts[folded] = counts.get(folded, 0) + n
            if counts:
                return sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])), stem
        return [], ""
    finally:
        if own:
            conn.close()


def check(word: str, claimed_root: str, conn: sqlite3.Connection | None = None) -> Opinion:
    """Second opinion on a root claim. See module docstring for verdicts."""
    candidates, stem = roots_for(word, conn)
    names = [root for root, _ in candidates]
    hits = sum(n for _, n in candidates)
    claim = fold_root(claimed_root)
    if not names:
        return Opinion("absent", [], 0)
    if claim in names:
        return Opinion("agree" if len(names) == 1 else "ambiguous", names, hits, stem)
    # Same radicals, different weak-letter convention (ح م و / حمي) — a
    # notational variant, not a conflicting claim.
    if claim.translate(_WEAK) in {n.translate(_WEAK) for n in names}:
        return Opinion("variant", names, hits, stem)
    return Opinion("disagree", names, hits, stem)
