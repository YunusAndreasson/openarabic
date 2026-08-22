"""Make a generated root record consistent, or say why it cannot be.

The prompt states a dozen rules — Arabic script here, Latin there, six words at
most, no grammar metadata, write about the root and not one word. A prompt is a
request; none of it is enforced by strict decoding, which guarantees only that a
string of some kind is present. Every rule below was broken by a real model in a
five-root trial.

Two kinds of response, deliberately separated:

  NORMALISE  mechanical deviations with one obvious correction — casing, a
             trailing full stop, stray whitespace, a parenthetical aside. Fixing
             these in code is cheaper and more reliable than another round trip.

  REJECT     deviations that mean the model misread the task: Latin script where
             Arabic belongs, five identical family members, a usage note written
             about a single headword. There is no correct edit for these, and
             silently keeping them is how a defect reaches the app looking fine.
"""

from __future__ import annotations

import re
import unicodedata

from word_enrichment import root_translit

MAX_ROOT_MEANING_WORDS = 6
MAX_GLOSS_WORDS = 8
MIN_FAMILY = 2
# Two or three sentences. Only a lower bound existed, which is the wrong half to
# guard: a short note is a thin panel, a long one is the "large blob of text" the
# whole presentation pass exists to prevent. A budget in the validator prevents
# it; a CSS clamp would only hide it.
MAX_NOTE_CHARS = 320
MAX_NOTE_SENTENCES = 3

_PARENTHETICAL = re.compile(r"\s*\([^)]*\)")
# Fatha, damma, kasra, sukun, shadda, tanwin, superscript alef.
_HAS_DIACRITIC = re.compile("[\u064b-\u0652\u0670]")
_GRAMMAR_PREFIX = re.compile(
    r"^(form\s+[ivx]+\b|verbal noun\b|active participle\b|passive participle\b|"
    r"noun of\b|pl\.|plural of\b)",
    re.I,
)
# Phrases that only make sense under ONE headword. This text is shown beneath
# every word built on the root, so "this word is the verbal noun of X" is false
# for the other ninety-three.
_WORD_SCOPED = re.compile(
    r"\b(this word|the word itself|this headword|this particular (word|form)|"
    r"the verbal noun of this)\b",
    re.I,
)


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip())


def _pool_key(letters: str) -> str:
    """Imported lazily so this module stays usable without the CAMeL stack."""
    from word_enrichment.pool import match_key

    return match_key(letters)


def normalize(
    rec: dict, root_key: str = "", pool_keys: set[str] | None = None
) -> tuple[dict, list[str]]:
    """(record with mechanical fixes applied, reasons it is still unusable).

    `pool_keys` is the closure gate, and it is the reason the rest of this file
    can eventually shrink. When the model is handed a closed list of attested
    forms and told to choose from it, every `letters` value MUST come back out of
    that list. A form that does not is not a stylistic slip to normalise away —
    it means the model wrote Arabic instead of selecting it, which is the single
    failure this architecture exists to make impossible. So it is a HARD FAIL for
    the whole record, not a dropped member: one invented form means the others
    cannot be trusted either.

    Keyed on `pool.match_key`, not the skeleton. A skeleton match would accept
    سُلَّم ('ladder') for a pool offering سَلِم ('be safe') — same radicals, and
    that is precisely the substitution that has already produced confident,
    well-formed, wrong content in this pipeline.
    """
    out = dict(rec)
    problems: list[str] = []

    # Same trim-before-reject rule as usage_note. root_meaning is a comma-separated
    # list of near-synonyms ("to turn, invert, change"), so dropping a trailing
    # clause shortens it without changing what it says. Measured: a probe lost an
    # otherwise-clean record to a seven-word meaning against a six-word cap.
    meaning = _clean(out.get("root_meaning", "")).rstrip(".").lower()
    if len(meaning.split()) > MAX_ROOT_MEANING_WORDS and "," in meaning:
        clauses = [c.strip() for c in meaning.split(",") if c.strip()]
        kept: list[str] = []
        for clause in clauses:
            candidate = ", ".join([*kept, clause])
            if kept and len(candidate.split()) > MAX_ROOT_MEANING_WORDS:
                break
            kept.append(clause)
        meaning = ", ".join(kept)

    if not meaning:
        problems.append("root_meaning is empty")
    elif len(meaning.split()) > MAX_ROOT_MEANING_WORDS:
        # No commas to trim at, so shortening would mean rewriting it.
        problems.append(
            f"root_meaning is {len(meaning.split())} words, cap is {MAX_ROOT_MEANING_WORDS}"
        )
    out["root_meaning"] = meaning

    # Over-length is a TRIM, not a rejection. A note ten characters past the cap
    # is a mechanical deviation with one obvious correction, and this file's whole
    # premise is that those get fixed in code -- rejecting throws away a paid call
    # and everything else in it that was right. (Measured: the very first probe
    # call lost a good record to a 330-char note.) Whole sentences are dropped
    # from the end so the note still reads as finished prose; truncating
    # mid-sentence would trade a long panel for a broken one.
    note = _clean(out.get("usage_note", ""))
    sentences = [part for part in re.split(r"(?<=[.!?])\s+", note) if part]
    if len(sentences) > MAX_NOTE_SENTENCES or len(note) > MAX_NOTE_CHARS:
        kept: list[str] = []
        for sentence in sentences[:MAX_NOTE_SENTENCES]:
            candidate = " ".join([*kept, sentence])
            if kept and len(candidate) > MAX_NOTE_CHARS:
                break
            kept.append(sentence)
        note = " ".join(kept)

    if len(note.split()) < 10:
        problems.append("usage_note is too short to explain anything")
    if len(note) > MAX_NOTE_CHARS:
        # A single sentence longer than the entire budget. Nothing to trim back
        # to, so this one really is a misread of the task.
        problems.append(f"usage_note is {len(note)} chars in one sentence, "
                        f"cap is {MAX_NOTE_CHARS}")
    if _WORD_SCOPED.search(note):
        problems.append("usage_note is written about one headword, not the root")
    out["usage_note"] = note

    # A member that breaks a rule is DROPPED, not fatal. Only the surviving count
    # matters — an over-long gloss on one of five is a trim, not a reason to throw
    # away a record that cost a call and is otherwise correct. The record fails
    # only if too few members survive.
    family, seen, dropped = [], set(), []
    for member in out.get("word_family") or []:
        letters = _clean(member.get("letters", ""))
        translit = _clean(member.get("transliteration", ""))
        gloss = _clean(_PARENTHETICAL.sub("", member.get("meaning", "")))

        # Checked before every other rule on purpose. Placed after the
        # transliteration rule, an invented form (which has no pool row to take a
        # transliteration from) was dropped as "transliteration missing" and the
        # hard fail never fired -- the gate silently degraded to a trim.
        if pool_keys is not None and _pool_key(letters) not in pool_keys:
            problems.append(f"{letters!r} is not in the candidate pool (invented)")
            continue
        if not root_translit.is_arabic(letters):
            dropped.append(f"{letters!r} not Arabic script")
            continue
        if not translit or root_translit.is_arabic(translit):
            dropped.append(f"{letters!r} transliteration missing or not Latin")
            continue
        # Keyed on the FULL diacritised form. Keying on the consonantal skeleton
        # collapsed صِدْق ('truth') and صَدَّقَ ('he believed') into one entry —
        # sharing a skeleton is what a root IS, so every genuine family read as a
        # pile of duplicates and 5 of 5 records were rejected.
        # NFC: the same word in two combining-mark orders is one word, and
        # without normalising, a repeat would slip through as distinct.
        key = unicodedata.normalize("NFC", re.sub(r"\s+", "", letters))
        if key in seen:
            dropped.append(f"{letters!r} duplicate")
            continue
        # NOTE: there is deliberately no "is this the root itself" check here.
        # An earlier version compared the undiacritised letters against the root
        # key and dropped عَبْدٌ, عِلْمٌ and عَلِمَ — real words, and the most
        # useful ones a learner meets. A derived form sharing its root's
        # consonantal skeleton is not a defect, it is what a root IS; the same
        # mistake that once collapsed صِدْق and صَدَّقَ into "duplicates".
        # The real failure was the UNVOCALISED skeleton (سلم glossed as the root
        # meaning), which the diacritic rule below already catches.
        if not _HAS_DIACRITIC.search(letters):
            dropped.append(f"{letters!r} has no diacritics")
            continue
        if _GRAMMAR_PREFIX.match(gloss):
            dropped.append(f"{letters!r} gloss leads with grammar metadata")
            continue
        if len(gloss.split()) > MAX_GLOSS_WORDS:
            dropped.append(f"{letters!r} gloss is {len(gloss.split())} words")
            continue
        seen.add(key)
        kept = {"letters": letters, "transliteration": translit, "meaning": gloss}
        # Carried through, not re-derived: `wazn` and `root_id` are attached from
        # the pool row before normalisation and are what the panel renders and
        # links with. Rebuilding the member from three fields silently discarded
        # both.
        for extra in ("wazn", "root_id", "verb_form", "plural"):
            if extra in member:
                kept[extra] = member[extra]
        family.append(kept)

    if len(family) < MIN_FAMILY:
        problems.append(
            f"only {len(family)} usable family member(s), need {MIN_FAMILY}"
            + (f" (dropped: {'; '.join(dropped)})" if dropped else "")
        )
    out["word_family"] = family
    out["_dropped_members"] = dropped
    return out, problems
