"""One root's candidate pool: every form we can attest, from every source.

This is the file that replaces asking a model to *think of* words from a root.
It does not ask. It reads the words out of Lane's and CAMeL, joins them, and
hands the model a closed list to choose from. `root_normalize` then refuses any
`letters` value that did not come out of this list, which is what turns "please
do not invent Arabic" from a request in a prompt into a property of the system.

Why two sources rather than one, measured over the 400 busiest roots:

  Lane's     has a family for 88.8%. Its FORMS are excellent — attested, fully
             pointed, with case endings. Its GLOSSES are 1863 prose: the first
             italic span is often a sub-sense or an idiom rather than the core
             meaning, and reading 60 of them I judged a third to a half unusable
             ("He went upon the middle of the road" for إِسْتَسْلَمَ, which means
             to surrender).

  CAMeL      has lemmas for 99.1% of our roots once they are folded properly. Its
             GLOSSES are exactly the register a phone needs ("slave;servant",
             "be_devoted"), and it alone carries the wazn. Its FORMS are the weak
             half: for weak verbs `diac` is a bare stem (قُل, عَل), not a citation
             form.

Each one's weakness is the other's strength, so the pool prefers Lane's letters
and CAMeL's gloss, and falls back per-field rather than per-source.

HOW THE TWO ARE JOINED, and the mistake not to repeat
-----------------------------------------------------
NOT on the consonantal skeleton. That was the first implementation and it is
wrong in the most damaging possible way — it produces confident, well-formed,
incorrect content. Sharing a skeleton is what a root IS, so سلم matches سَلِم,
سُلَّم, سَلَّم and سِلْم all at once, and the pool cheerfully labelled سَلِمٌ
"ladder, stairs" (that is سُلَّم) and عَبِدٌ "slave, servant" (that is عَبْد).
`root_normalize` already carries a comment about making this exact error in the
opposite direction; making it again in the same session is why the join is now
morphological rather than textual.

Instead: CAMeL's own analyser is run on Lane's headword, and a gloss is accepted
ONLY when an analysis reproduces that headword exactly (modulo case endings and
alef orthography — see `match_key`). A near miss is discarded, not used, because
the near misses are not near: asked about عِبَادَةٌ with no exact analysis
available, CAMeL's best remaining guess was عَبّاد, "sunflower".

Licence: CAMeL's database is GPL (Aramorph-derived) and its gloss strings are
expression, not fact. They are used here as offline grounding for a rewrite and
are never shipped. The wazn, POS and the Arabic forms are facts and do ship.
"""

from __future__ import annotations

import re
import sqlite3
import unicodedata
from dataclasses import dataclass, field
from functools import lru_cache

from word_enrichment import camel_roots, lane_extract, lexicon
from word_enrichment.arabic_translit import transliterate

# Tanwin and a bare final short vowel: case endings, not part of the word.
_CASE_ENDING = re.compile(r"[ًٌٍَُِْ]+$")
_TANWIN = re.compile(r"[ًٌٍ]")
# A short vowel immediately before its own long-vowel letter. Lane's writes
# عِبَادَةٌ, CAMeL writes عِبادَة — the fatha on the alef is optional notation for
# the same word, so it must not make them compare unequal.
_LONG_VOWEL = re.compile("َا|ُو|ِي")
_ALEF = re.compile("[أإآٱ]")
_YAA = re.compile("ى")

_HAS_SHORT_VOWEL = re.compile("[َُِ]")
_CONSONANT_RUN = re.compile(r"[^aiuāīū\s]{3,}")

# Third person, masculine, singular, perfect, active, indicative — the form
# every Arabic dictionary files a verb under.
_CITATION = {
    "pos": "verb", "asp": "p", "per": "3", "gen": "m", "num": "s",
    "vox": "a", "mod": "i",
}


def bareword(text: str) -> str:
    r"""Undiacritised skeleton, via the one canonical implementation in `lexicon`.

    FOR DICTIONARY LOOKUP ONLY -- never for joining two sources, which is what it
    was wrongly used for; see the module docstring.

    This delegates rather than re-deriving on purpose. The local copy it replaces
    was a transposed character class: `[\u0610-\u064B\u061A-\u0670...]` instead of
    `[\u0610-\u061A\u064B-\u065F...]`, which reads identically on screen but
    covers U+0621-U+064A -- every Arabic letter. `bareword("EABDN")` returned the
    empty string, so every candidate collided on one key and the whole pool was
    stamped with root_id 6958 (the function word alladhi). Two sources of truth
    for one normalisation is what allowed a silent divergence.
    """
    return lexicon.bareword(text)


def match_key(text: str) -> str:
    """The identity of a word form, normalised only for notation.

    Removes what varies between editors without changing the word: the case
    ending, tanwin, the alef's hamza seat, and a short vowel written before its
    own long vowel. Keeps every stem vowel and every shadda, which is precisely
    what distinguishes سَلِم from سُلَّم from سِلْم.
    """
    # NFC first. Arabic combining marks have no inherent order: a shadda and its
    # vowel can be stored either way round and render identically. Lane's writes
    # ضَجَّة as shadda-then-fatha; a model copying that exact string back returned
    # fatha-then-shadda. Without this the closure gate called six correctly-copied
    # words "invented" in a 25-root probe and threw away the records.
    out = unicodedata.normalize("NFC", (text or "").strip())
    out = _CASE_ENDING.sub("", out)
    out = _TANWIN.sub("", out)
    out = _LONG_VOWEL.sub(lambda m: m.group(0)[1], out)
    out = _ALEF.sub("ا", out)
    out = _YAA.sub("ي", out)
    return out.replace("ـ", "")


def is_teachable(letters: str) -> bool:
    """True when the form is pointed enough to read.

    Checks the ROMANISATION, not the Arabic. عبّدهُ carries a damma on its final
    pronoun and passes any "has a diacritic" test while its stem has none — it
    romanises as `ʿbbdhu`. Three consonants in a row is the tell.
    """
    if not letters or not _HAS_SHORT_VOWEL.search(letters):
        return False
    return not _CONSONANT_RUN.search(transliterate(letters))


def _is_english_gloss(gloss: str) -> bool:
    """A gloss the app could show. CAMeL echoes the Arabic form back, tagged
    `pattern FOREIGN`, for words it cannot analyse -- عَلْمَآءِ came through glossed as itself.
    An Arabic 'translation' teaches nothing and would reach the screen as one."""
    return bool(gloss) and gloss.isascii()


@lru_cache(maxsize=1)
def _analyzer():
    try:
        from camel_tools.morphology.analyzer import Analyzer
        from camel_tools.morphology.database import MorphologyDB

        return Analyzer(MorphologyDB.builtin_db())
    except Exception:  # noqa: BLE001 — a degraded pool, not a crash
        return None


@lru_cache(maxsize=1)
def _reinflector():
    """CAMeL's Reinflector, already a dependency via utils/camel_tools_service.

    Built with flags='r' — the plain builtin_db cannot reinflect.
    """
    try:
        from camel_tools.morphology.database import MorphologyDB
        from camel_tools.morphology.reinflector import Reinflector

        return Reinflector(MorphologyDB.builtin_db(flags="r"))
    except Exception:  # noqa: BLE001
        return None


@lru_cache(maxsize=8192)
def analyse_exact(form: str) -> dict:
    """CAMeL's reading of `form`, but only when it is unmistakably that form.

    Returns {} rather than a best guess. Every analysis whose own `diac` does not
    reproduce the input under `match_key` is discarded — that is the rule keeping
    عِبَادَةٌ from being glossed "sunflower", which is what the nearest available
    analysis actually offered.

    `noun_prop` is skipped: CAMeL files عابِد as both the name Abid and the
    participle "worshipping", and the name sorts first.
    """
    engine = _analyzer()
    if not engine or not form:
        return {}
    try:
        analyses = engine.analyze(form)
    except Exception:  # noqa: BLE001
        return {}

    target = match_key(form)
    for analysis in analyses:
        if analysis.get("pos") == "noun_prop":
            continue
        if match_key(analysis.get("diac", "")) != target:
            continue
        gloss = (analysis.get("gloss") or "").split("+")[0].strip()
        if not _is_english_gloss(gloss):
            continue
        return {
            "gloss": gloss,
            "wazn": analysis.get("pattern") or "",
            "pos": analysis.get("pos") or "",
            "lex": analysis.get("lex") or "",
        }
    return {}


def citation_form(lemma: str) -> str:
    """A verb lemma's 3ms perfect, e.g. قُل -> قالَ. '' when it cannot be built."""
    engine = _reinflector()
    if not engine or not lemma:
        return ""
    try:
        analyses = engine.reinflect(lemma, _CITATION)
    except Exception:  # noqa: BLE001
        return ""
    forms = sorted({a.get("diac", "") for a in analyses if a.get("diac")}, key=len)
    return forms[0] if forms else ""


@dataclass
class Candidate:
    """One word that could go in a root's family list."""

    letters: str  # vocalised Arabic — what the app displays
    transliteration: str
    lane_gloss: str = ""
    camel_gloss: str = ""
    wazn: str = ""
    pos: str = ""
    plural: str = ""     # Lane's stated plural — unguessable, so worth carrying
    verb_form: str = ""  # Lane's roman numeral (II, X): the wazn's other half
    root_id: int | None = None  # our dictionary entry, when this form is one
    exact_link: bool = False  # True when root_id came from a vocalised match
    headword_count: int = 0  # dictionary entries sharing this skeleton
    sources: tuple[str, ...] = field(default_factory=tuple)

    @property
    def key(self) -> str:
        return match_key(self.letters)

    @property
    def glosses(self) -> list[str]:
        """Both readings, best-register first, for the model to distil."""
        return [g for g in (self.camel_gloss, self.lane_gloss) if g]

    def prompt_line(self) -> str:
        """One line of the closed list handed to the model."""
        bits = [f"{self.letters} ({self.transliteration})"]
        if self.camel_gloss:
            bits.append(f"modern: {self.camel_gloss.replace('_', ' ').replace(';', ', ')}")
        if self.lane_gloss:
            bits.append(f"Lane: {self.lane_gloss}")
        if self.wazn:
            bits.append(f"pattern {self.wazn}")
        elif self.verb_form:
            # Only when CAMeL gave no pattern. The two say different things — a
            # wazn is the template, a form number is its traditional name — but
            # for a Lane-only candidate the form number is the only morphology
            # available, and 18.5% of the pool is Lane-only.
            bits.append(f"form {self.verb_form}")
        if self.plural:
            bits.append(f"pl. {self.plural}")
        return "- " + " | ".join(bits)



def resolve(letters: str, candidates: list[Candidate]) -> Candidate | None:
    """The pool entry the model meant, or None if that cannot be decided.

    Exact first. Failing that, ONE fallback: if exactly one candidate shares the
    consonantal skeleton, the model copied the right word and dropped or added a
    mark, so snap to the pool's spelling. A model returned ضَجّة for a pool holding
    ضَجَّة -- one missing fatha, the same word, and rejecting it threw the record away.

    The single-match condition is what keeps this safe rather than a return to
    skeleton matching. Where several pool forms share a skeleton -- سَلِم, سُلَّم,
    سِلْم, which is the normal case on a productive root -- this is ambiguous and
    returns None, so the exact rule still governs precisely the situation that
    once glossed 'be safe' as 'ladder, stairs'.

    The caller rewrites `letters` to the RESOLVED candidate's spelling, so what
    ships is always the source's pointing, never the model's.
    """
    by_key = {c.key: c for c in candidates}
    exact = by_key.get(match_key(letters))
    if exact is not None:
        return exact

    skeleton = bareword(letters)
    if not skeleton:
        return None
    same = [c for c in candidates if bareword(c.letters) == skeleton]
    return same[0] if len(same) == 1 else None


def dictionary_index(ledger: list[dict]) -> dict[str, dict]:
    """Two maps: an exact one that decides WHICH entry, a skeletal one that
    decides WHETHER any entry exists.

    Both are needed, and using only the second is what produced the defect this
    docstring exists to record. `root_id` is the id of ONE dictionary entry, so a
    skeleton-keyed lookup gives عِلْمٌ ("knowledge") and عَلَّم ("teach") the same
    id — they share the consonants علم, which is what a root IS. In the app both
    rows then open the same screen: tapping "teach" lands on "knowledge". It hit
    19 of 40 panels, and at 31.8 headwords per root the fan-out multiplies it.

    So:
      exact      match_key -> root_id. Distinguishes سَلِم from سُلَّم from سِلْم,
                 and is the only map allowed to decide a destination.
      skeleton   bareword -> (root_id, count). Kept because our own
                 `roots.letters` values are inconsistently pointed, so an exact
                 match misses most of them; a skeleton hit still proves the app
                 HAS a screen for this word even when it cannot say which.

    Each entry is also indexed under its LEMMA, because the two sides store
    different things: our dictionary holds the surface forms a learner meets in
    an article (أَحْبَار, a plural; تَرْجُفُ, a 3fs imperfect) while the pool holds
    lemmas (حبر, رجف). Those never share a skeleton, and without this 32 of 300
    sampled roots had no tappable family member at all.
    """
    exact: dict[str, int] = {}
    skeleton: dict[str, tuple[int, int]] = {}

    def add_skeleton(key: str, root_id: int) -> None:
        if not key:
            return
        existing, count = skeleton.get(key, (root_id, 0))
        skeleton[key] = (existing, count + 1)

    for rec in ledger:
        letters = rec.get("letters", "")
        root_id = rec["root_id"]
        exact.setdefault(match_key(letters), root_id)
        add_skeleton(bareword(letters), root_id)

        lemma = analyse_exact(letters).get("lex", "")
        if lemma:
            exact.setdefault(match_key(lemma), root_id)
            if bareword(lemma) != bareword(letters):
                add_skeleton(bareword(lemma), root_id)

    return {"exact": exact, "skeleton": skeleton}


def _camel_letters(lemma: str, feats: dict) -> str:
    """The best display form CAMeL can give for one lemma.

    Order matters and each step earns its place. `lex` is often already a proper
    citation form (أَعْلَى, ٱِعْتَلَى) and is tried first; hollow verbs are where it
    fails (قال has no short vowel — the alef carries the length), and that is
    exactly the case reinflection fixes, turning the stem قُل into قالَ. `diac` is
    last because for weak verbs it is a bare stem.
    """
    reinflected = citation_form(lemma) if feats.get("pos") == "verb" else ""
    for candidate in (lemma, reinflected, feats.get("diac", "")):
        if candidate and is_teachable(candidate):
            return candidate
    return ""


def build(
    conn: sqlite3.Connection,
    root: str,
    dict_index: dict[str, dict] | None = None,
    limit: int = 24,
) -> list[Candidate]:
    """Every attested form for `root`, ranked by how useful it is to a learner."""
    dict_index = dict_index or {"exact": {}, "skeleton": {}}
    pool: dict[str, Candidate] = {}

    # Lane's first: its spellings are the ones the app displays. Each is put to
    # CAMeL's analyser for a modern gloss and a wazn, and gets them only on an
    # exact morphological match.
    for member in lane_extract.family_for(conn, [root], limit=limit):
        letters = member["letters"]
        reading = analyse_exact(letters)
        pool[match_key(letters)] = Candidate(
            letters=letters,
            transliteration=member["transliteration"],
            lane_gloss=member["meaning"],
            camel_gloss=reading.get("gloss", ""),
            wazn=reading.get("wazn", ""),
            pos=reading.get("pos", ""),
            plural=member.get("plural", ""),
            verb_form=member.get("verb_form", ""),
            sources=("lane", "camel") if reading else ("lane",),
        )

    # Then everything CAMeL knows that Lane's did not surface — this is where the
    # 11% of roots Lane's has no family for get one at all.
    for lemma, feats in camel_roots.lemmas_for(root).items():
        letters = _camel_letters(lemma, feats)
        if not letters:
            continue
        key = match_key(letters)
        if key in pool or not _is_english_gloss(feats["gloss"]):
            continue
        pool[key] = Candidate(
            letters=letters,
            transliteration=transliterate(letters),
            camel_gloss=feats["gloss"],
            wazn=feats["wazn"],
            pos=feats["pos"],
            sources=("camel",),
        )

    exact = dict_index.get("exact", {})
    skeleton = dict_index.get("skeleton", {})
    for candidate in pool.values():
        fallback, count = skeleton.get(bareword(candidate.letters), (None, 0))
        # Exact wins. `exact_link` records WHICH kind of match this was, so the
        # caller can drop a merely-skeletal link when two members collide on it.
        precise = exact.get(candidate.key)
        candidate.root_id = precise if precise is not None else fallback
        candidate.exact_link = precise is not None
        candidate.headword_count = count

    # A candidate with no gloss cannot be rewritten into anything, and one that is
    # only a skeleton cannot be read. Both are dropped here rather than left for
    # the model to trip over.
    usable = [c for c in pool.values() if c.glosses and is_teachable(c.letters)]
    return sorted(usable, key=_rank)[:limit]


def _rank(candidate: Candidate) -> tuple:
    """Most useful first. Ties break toward the word a learner can act on.

    `headword_count` leads because a form our dictionary carries is one the app
    can link to and the learner can add to practice; a lexically fine word with
    no entry is a dead row. Then both-sources, because agreement between an 1863
    lexicon and a modern analyser is the strongest signal we have that a form is
    both real and current. Then a modern gloss, since that is what reaches the
    screen.
    """
    return (
        -min(candidate.headword_count, 1),
        -len(candidate.sources),
        0 if candidate.camel_gloss else 1,
        -candidate.headword_count,
        candidate.key,
    )
