"""CAMeL Tools root extraction — the strongest of the three root sources.

Arramooz and Lane's both look a word up in a table, so an inflected surface form
(تجري, ينظر) is either absent or resolves through prose. CAMeL does real
morphological analysis: it decomposes the form, so it roots inflected words
natively and that whole class of miss disappears.

Uses the `calima-msa-r13` database that ships with camel-tools (already a
dependency here for tashkeel — see utils/camel_tools_service.py, which only
wires up the Reinflector). Database licence: derived from Aramorph 1.2.1,
GPL-2.0. Used offline as a source of facts (which radicals a word has); no
CAMeL data is shipped in the app.

Two notations to know:
  `ج.ر.#`  a `#` marks a WEAK radical (و/ي elided in this form). Compare with
           weak-folding, not literally.
  `NTWS`   "not the word's script" — CAMeL declining to root a foreign or
           transliterated word. Ibrahim returns exactly this, which makes it a
           precise auto-skip signal rather than a guess.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

# Roots CAMeL emits that carry no derivational information.
# Parts of speech that have no derivational root. A primitive particle is not a
# word that HAS a root we failed to find — it is a word for which the question
# does not arise, so any root a source offers for one is noise that happens to
# corroborate. مِنْ "from" published with root م ن ن "to bestow a favour" because
# all three sources agreed on letters that mean nothing here, and it is the most
# frequent word in the corpus (619 occurrences).
FUNCTION_POS = frozenset(
    {
        "prep",
        "conj",
        "conj_sub",
        "part",
        "part_neg",
        "part_verb",
        "part_focus",
        "part_fut",
        "part_interrog",
        "part_restrict",
        "part_voc",
        "part_det",
        "pron",
        "pron_dem",
        "pron_rel",
        "pron_interrog",
        "pron_exclam",
        "interj",
        "abbrev",
        "punc",
    }
)

# `FOREIGN` is a marker, not radicals — without it here a Latin-script word
# yields a CamelRoot whose `letters` read literally "FOREIGN". Nothing grounds
# it, so the outcome was already a drop; the fake root just mislabelled why.
_NON_ROOTS = {"NOAN", "NTWS", "NOROOT", "FOREIGN", ""}

# Weak radicals + the placeholder, all equivalent when comparing across sources.
_WEAK_CHARS = {"#", "و", "ي", "ا", "ى", "ء", "أ", "إ", "آ"}


@dataclass
class CamelRoot:
    root: str  # dotted CAMeL form, e.g. "ج.ر.#"
    letters: str  # dots removed, e.g. "جر#"
    votes: int  # analyses backing it
    total: int  # analyses considered
    foreign: bool = False  # CAMeL said NTWS — a non-Arabic/transliterated word

    @property
    def confidence(self) -> float:
        return self.votes / self.total if self.total else 0.0


@lru_cache(maxsize=1)
def _analyzer():
    from camel_tools.morphology.analyzer import Analyzer
    from camel_tools.morphology.database import MorphologyDB

    return Analyzer(MorphologyDB.builtin_db())


def weak_fold(letters: str) -> str:
    """Collapse every weak radical (and CAMeL's `#`) to one symbol.

    Lets ج.ر.# (CAMeL), جري (Arramooz) and ج ر ي (Lane's) compare equal without
    pretending a strong radical matches a weak one.
    """
    return "".join("*" if ch in _WEAK_CHARS else ch for ch in letters)


def _analyses(word: str) -> list[dict]:
    """CAMeL's raw analyses for one surface form.

    The analyzer is built OUTSIDE the try on purpose. A missing camel-tools or an
    absent morphology database is a broken environment, not a word without a root
    — but swallowed as one it silently disables the function-word and foreign
    gates while every downstream count still reads as a clean run. That is how مِنْ
    reached production. Only the per-word call is tolerated, because an
    unanalysable string genuinely has no analyses.
    """
    analyzer = _analyzer()
    try:
        return analyzer.analyze(word)
    except Exception:  # noqa: BLE001 — an unanalysable surface form has no analyses
        return []


def analyze(word: str) -> list[CamelRoot]:
    """Candidate roots for a surface form, best-attested first."""
    analyses = _analyses(word)
    if not analyses:
        return []

    counts: dict[str, int] = {}
    foreign = 0
    for a in analyses:
        root = (a.get("root") or "").strip()
        if root == "NTWS":
            foreign += 1
            continue
        if root in _NON_ROOTS:
            continue
        letters = root.replace(".", "")
        # A one-letter "root" is a particle/pronoun artefact (هذه -> 'ه'), not
        # a derivational root.
        if len(letters) < 2:
            continue
        counts[root] = counts.get(root, 0) + 1

    total = len(analyses)
    if not counts:
        # Every analysis was NTWS: a confident "this word has no Arabic root".
        return [CamelRoot("", "", foreign, total, foreign=True)] if foreign else []

    return [
        CamelRoot(root, root.replace(".", ""), votes, total)
        for root, votes in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    ]


def best_root(word: str) -> CamelRoot | None:
    """Single best candidate, or None when CAMeL offers nothing usable."""
    candidates = analyze(word)
    if not candidates or candidates[0].foreign:
        return None
    return candidates[0]


def is_foreign(word: str) -> bool:
    """True when CAMeL positively identifies a non-Arabic / transliterated word."""
    candidates = analyze(word)
    return bool(candidates) and candidates[0].foreign


def dominant_pos(word: str) -> str | None:
    """The part of speech most of CAMeL's analyses agree on, or None.

    A vote rather than the top analysis: the ranking is not calibrated for this,
    and a single stray verbal reading of a preposition should not outrank a dozen
    particle readings.
    """
    from collections import Counter

    tags = [a.get("pos") for a in _analyses(word) if a.get("pos")]
    if not tags:
        return None
    return Counter(tags).most_common(1)[0][0]


def is_function_word(word: str) -> bool:
    """True when the surface form is most often a particle, pronoun or preposition."""
    return dominant_pos(word) in FUNCTION_POS


# ---------------------------------------------------------------------------
# Reverse index: root -> the lemmas built on it.
#
# `analyze()` goes one way (surface form -> root). The pool builder needs the
# other: given a root, which words does CAMeL know that are built on it, with
# their glosses and patterns. That is a different traversal of the same database
# — `stem_hash` holds every stem CAMeL can produce, each tagged with its root.
# ---------------------------------------------------------------------------

# Values in `stem_hash` are list[tuple[str, dict]] — (category, features). An
# earlier attempt treated them as dicts and raised AttributeError on the first row.
def fold_key(root: str) -> str:
    """The join key for a root, normalised so our three sources agree.

    Two normalisations, both load-bearing:

      weak radicals   CAMeL writes ق.و.م as `ق.#.م` in some entries; folding every
                      weak radical to `*` lets it meet Lane's ق و م. Skipping this
                      cost 34 points of root coverage — قوم, قول and علو, three of
                      the commonest roots in Arabic, all returned zero lemmas.

      geminates       our ledger files 179 roots under two letters (حب), where
                      CAMeL stores the doubled form (حبب). Those 179 roots serve
                      1,137 headwords, so leaving them unjoined is not a rounding
                      error.
    """
    letters = "".join(root.split())
    if len(letters) == 2:
        letters += letters[-1]
    return weak_fold(letters)


@lru_cache(maxsize=1)
def _lemma_index() -> dict[str, dict[str, dict]]:
    """folded root -> {lemma: {gloss, wazn, pos, diac}}, built once.

    `noun_prop` is excluded outright. Proper names are filed under whatever root
    their letters resemble, so every common root picks up a scatter of personal
    and place names that are not derivations of it at all.
    """
    from camel_tools.morphology.database import MorphologyDB

    index: dict[str, dict[str, dict]] = {}
    for entries in MorphologyDB.builtin_db().stem_hash.values():
        for _category, feats in entries:
            root = (feats.get("root") or "").replace(".", "")
            if not root or root in _NON_ROOTS:
                continue
            if feats.get("pos") == "noun_prop":
                continue
            lemma = feats.get("lex")
            if not lemma:
                continue
            bucket = index.setdefault(fold_key(root), {})
            if lemma not in bucket:
                bucket[lemma] = {
                    "gloss": feats.get("gloss") or "",
                    "wazn": feats.get("pattern") or "",
                    "pos": feats.get("pos") or "",
                    "diac": feats.get("diac") or "",
                }
    return index


def lemmas_for(root: str) -> dict[str, dict]:
    """Every CAMeL lemma built on `root`, keyed by lemma. Empty when unknown."""
    return _lemma_index().get(fold_key(root), {})
