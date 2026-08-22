"""Build a root's word family straight out of Lane's, with no model involved.

Lane italicises his English translations — it is his typographic convention, and
the TEI keeps it as `<hi rend="ital">`. That makes the two things we were paying
a model to produce both readable from the database: the family FORMS are already
the `headword` column, and their glosses are the first italic span of each entry.

What this removes is not just cost. `verify.py` exists mainly to catch Arabic
word forms a model invented; when the family IS the headword list, that class
cannot occur, and the gate check for it becomes tautological.

Two fields genuinely are not in the source and still need synthesis: the root's
shared sense in a few words, and the note connecting it to the family. Lane has
no root-level definition — the `root` table holds only ('قلب', 'qlb', 'q0').
"""

from __future__ import annotations

import html
import re
import sqlite3

from word_enrichment.arabic_translit import transliterate

# Everything between the italic runs that is NOT English: inline Arabic, the
# cross-reference stubs, and the orthography blocks.
_NON_ENGLISH = re.compile(r"<foreign.*?</foreign>|<ref[^>]*/>|<orth.*?</orth>", re.S)
# From the first italic run to the last: keeps Lane's "or"/"and" connectives,
# without which the glosses read as comma soup ("He altered, changed, its, his").
_ITALIC_SPAN = re.compile(r'(<hi rend="ital">.*</hi>)', re.S)
# Lane numbers his senses. `_ITALIC_SPAN` runs from the FIRST italic run to the
# LAST, so on a multi-sense entry it swallows every sense at once and the word
# budget then truncates wherever it lands: عِلْمٌ came out as "sciences, or several
# species of knowledge. Sometimes" -- sense 1 plus the first word of sense 2.
# 50.3% of entries under the 400 busiest roots carry one of these markers.
_SENSE_BREAK = re.compile(r"<sense\b")
# `pl. <foreign lang="ar">آبَآءٌ</foreign>` -- Lane states plurals in a clean,
# machine-readable shape on 11.5% of entries, and `_DANGLING` strips the "pl."
# and throws the form away. Arabic broken plurals are unguessable (أَبٌ -> آبَآءٌ),
# so this is content a learner cannot derive and we already hold.
_PLURAL = re.compile(r"\bpl\.\s*(?:is\s*)?<foreign lang=\"ar\">([^<]+)</foreign>")
# Lane's roman numerals for the verb forms, from `entry.itype`. A structured
# column, not parsed prose -- present on 25.9% of entries and previously unread.
# "of which the latter the pl. is ..." — the plural belongs to an alternative
# form Lane just mentioned, not to this headword.
# The specific construction, not the bare word. Lane writes "of which latter the
# pl. is عُرْفٌ" when the plural belongs to an alternative form he just listed --
# we had filed عُرْف as the plural of عَارِف. Matching "latter" anywhere in the
# preceding window instead cost عَالِمٌ its correct عُلَمَآءُ, so the guard is
# anchored to "which (the) latter/former" and must sit just before the "pl.".
_OTHER_FORM = re.compile(r"which\s+(?:the\s+)?(?:latter|former)\b[^.]{0,20}$", re.I)
_VERB_FORM = {
    "1": "I", "2": "II", "3": "III", "4": "IV", "5": "V", "6": "VI",
    "7": "VII", "8": "VIII", "9": "IX", "10": "X", "11": "XI", "12": "XII",
    "R. Q. 1": "Rq. I", "R. Q. 2": "Rq. II",
}
_TAG = re.compile(r"<[^>]+>")
# "(S, A, Mgh, O, Msb, K,)" — Lane's source sigla. Also matches an unclosed one,
# which is what truncation leaves behind.
_CITATION = re.compile(r"\(\s*[A-Z][A-Za-z,.*&;:\-\s]{0,60}(?:\)|$)")
# Whatever the strippers leave behind: "( ,)", "( )", stray bracket pairs.
_EMPTY_PARENS = re.compile(r"\(\s*[,;:.&\s]*\)?")
_EDITORIAL = re.compile(r"\[[^\]]*\]?")       # [ ... ] translator's insertions
_SEGMENT = re.compile(r"-b\d+-")              # Perseus segment markers
_DANGLING = re.compile(
    r"\b(syn|i\.\s*q|i\.\s*e|e\.\s*g|q\.\s*v|pl|sing|inf\.\s*n|aor|accord|contr\.\s*of|&c)"
    r"\b\.?\s*[:.]?", re.I)
_ORPHAN = re.compile(r"[()\[\]]")
# Lane's source abbreviations. They survive paren-stripping when a citation was
# split by a tag boundary, and they were in 22% of extracted glosses.
#
# Matched ONLY in citation position — a RUN of two or more, or a single one
# trailing after punctuation. Several sigla ("A", "M", "S", "L", "F") are also
# ordinary English words, and stripping them wherever they appear turns
# "A male slave" into "male slave".
_SIG = (r"(?:TA|Mgh|Msb|IAar|ISd|IDrd|IB|Sgh|Ham|JK|Lh|Az|Ks|Fr|AA|As|IAth|"
        r"S|K|A|M|O|T|L|F|P|Kr|Er)")
_SIGLA_RUN = re.compile(
    rf"[;,.]?\s*\b{_SIG}\b(?:\s*[,&]?\s*(?:\&c\.?|{_SIG})\b)+\s*[.,;:]?")
_SIGLA_TAIL = re.compile(rf"[;,]\s*\b{_SIG}\b\s*[.,;:]?\s*$")
_REPEAT_PUNCT = re.compile(r"\s*([,;:])(?:\s*[,;:])+")
# A gloss must not end mid-thought. Lane's phrases run long, so a word budget
# lands on these constantly: "or it has a more special signification than".
_TRAILING = re.compile(
    r"\s+\b(than|of|as|and|or|to|with|in|for|by|from|the|a|an|is|was|that|which|"
    r"upon|into|like|its|his|him|it)\b[\s,;:]*$", re.I)
_WS = re.compile(r"\s+")
# Lane's TEI keeps the print edition's line-break hyphens, so "watering-troughs"
# arrives as "water-ing-troughs". Rejoin only when both sides are lower-case
# letters, which leaves real compounds ("upside-down", "well-known") alone.
_SOFT_HYPHEN = re.compile(r"([a-z])-(ing|ed|es|ers?|ly|tion|ness)\b")
_AMPC = re.compile(r"\s*&\s*c\.?", re.I)
# One bare consonant welded after a case ending — a tag boundary artefact
# (آثَارٌح). Alif, alif maqsura and waw are EXCLUDED: on a defective noun the
# letter after the tanwin is part of the word, and stripping it turned Lane's
# دُمًى into دُمً.
_TRAILING_LETTER = re.compile(
    "(?<=[\u064b\u064c\u064d\u064e\u064f\u0650])"
    "[\u0621-\u0625\u0627-\u0648\u064a]$")
# Removing inline Arabic leaves holes: "praying for , for a man".
_ORPHAN_COMMA = re.compile(r"\s+([,;:])")
_EMPTY_CLAUSE = re.compile(r"([,;:])\s*\1")

MIN_GLOSS_WORDS = 2
MAX_GLOSS_WORDS = 9


def _clean_gloss_text(raw: str, max_words: int) -> str:
    text = _NON_ENGLISH.sub(" ", raw)
    text = _TAG.sub(" ", text)
    text = _CITATION.sub(" ", text)
    text = _EDITORIAL.sub(" ", text)
    text = _SEGMENT.sub(" ", text)
    text = _DANGLING.sub(" ", text)
    text = _EMPTY_PARENS.sub(" ", text)
    text = _WS.sub(" ", html.unescape(text)).strip(" ,;:.-—")

    words = text.split()
    if len(words) > max_words:
        # Cut at the last clause boundary inside the budget rather than at the
        # word count. "He altered, or changed, its, or his, mode, or" ends on a
        # conjunction and reads as truncation; "He altered, or changed" does not.
        head = " ".join(words[:max_words])
        cut = max(head.rfind(c) for c in ";,:")
        head = head[:cut] if cut >= len(head) // 2 else head
        text = head
    text = _AMPC.sub(" ", text)
    text = _SIGLA_RUN.sub(" ", text)
    text = _SIGLA_TAIL.sub("", text)
    text = _ORPHAN.sub(" ", text)
    text = _REPEAT_PUNCT.sub(r"\1", text)
    text = _SOFT_HYPHEN.sub(r"\1\2", text)
    text = _ORPHAN_COMMA.sub(r"\1", text)
    text = _EMPTY_CLAUSE.sub(r"\1", text)
    out = _WS.sub(" ", text).strip(" ,;:.-—")
    # Repeatedly, because trimming one trailing function word often exposes another.
    for _ in range(4):
        trimmed = _TRAILING.sub("", out)
        if trimmed == out:
            break
        out = trimmed
    out = out.strip(" ,;:.-—")
    return out if len(out.split()) >= MIN_GLOSS_WORDS else ""


def _clean_span(xml: str, max_words: int) -> str:
    """The cleaned gloss for a fragment, or '' — `gloss` without sense scoping."""
    span = _ITALIC_SPAN.search(xml or "")
    if not span:
        return ""
    return _clean_gloss_text(span.group(1), max_words)


def gloss(xml: str, max_words: int = MAX_GLOSS_WORDS) -> str:
    """Lane's own English for one entry, cleaned, or '' when he gives none."""
    scoped = xml or ""
    first_sense = _SENSE_BREAK.search(scoped)
    if first_sense:
        primary = scoped[: first_sense.start()]
        # Only if sense 1 actually carries a translation. A few entries open with
        # a bare orthography block and put every gloss under sense 2.
        if '<hi rend="ital">' in primary:
            # ...and only if it SURVIVES cleaning. Scoping measurably de-junks
            # glosses ("The day of resurrection . Also" -> "The day of
            # resurrection"), but on 4 of 784 entries under the golden roots the
            # primary sense cleaned down to nothing and the candidate dropped out
            # of the pool altogether -- جَامِعٌ lost "Collecting; one of the names
            # of God". Trading a slightly untidy gloss for no gloss is a bad
            # trade, so a scoping that empties the result is discarded.
            if _clean_span(primary, max_words):
                scoped = primary

    span = _ITALIC_SPAN.search(scoped)
    if not span:
        return ""
    return _clean_gloss_text(span.group(1), max_words)



# A short vowel, specifically. Lane also lists half-pointed headwords carrying
# only a shadda (تقلّب, علّمهُ); those look vocalised to a naive check but have no
# vowels to romanise, and came out as "tqllb" and "ʿllmhu".
_HAS_VOWEL = re.compile("[\u064e\u064f\u0650]")


# Vowels the transliterator emits; everything else counts as a consonant.
_CONSONANT_RUN = re.compile(r"[^aiuāīū\s]{3,}")


def _vocalised(word: str) -> bool:
    """Lane lists both قَلَبَهُ and the bare قلب; only the pointed form teaches."""
    return bool(_HAS_VOWEL.search(word or ""))


def plural_of(xml: str) -> str:
    """The Arabic plural Lane states for an entry, or ''.

    Only the explicit `pl. <Arabic>` construction is read. Lane also gives plurals
    in running prose ("and the pl. of that is..."), and guessing at those would
    reintroduce exactly the ambiguity the structured form avoids.
    """
    match = _PLURAL.search(xml or "")
    if not match:
        return ""
    lead = re.sub(r"<[^>]+>", " ", (xml or "")[: match.start()])[-90:]
    if _OTHER_FORM.search(lead):
        return ""
    # A tag boundary occasionally leaves one stray letter welded on: آثَارٌح.
    # A plural ends on its case ending, never on a bare consonant after one.
    form = html.unescape(match.group(1)).strip()
    return _TRAILING_LETTER.sub("", form)


def verb_form(itype: str | None) -> str:
    """'II' for Lane's itype 2, or '' when the entry is not a verb."""
    return _VERB_FORM.get((itype or "").strip(), "")


def family_for(
    conn: sqlite3.Connection, spellings: list[str], limit: int = 5
) -> list[dict]:
    """Up to `limit` family members for a root, in Lane's own order.

    `spellings` because one root reaches Lane's under several notations. Lane
    orders entries roughly by prominence, so taking the first usable ones favours
    the words a learner actually meets over the rarities further down — the exact
    judgement the prompt used to ask a model to make.
    """
    rows: list[tuple] = []
    for spelling in spellings:
        rows += conn.execute(
            "SELECT headword, itype, xml, nodenum FROM entry "
            "WHERE root=? AND headword!='' ORDER BY nodenum",
            (spelling,),
        ).fetchall()

    members: list[dict] = []
    seen: set[str] = set()
    for headword, itype, xml, _n in rows:
        if not _vocalised(headword) or headword in seen:
            continue
        roman = transliterate(headword)
        # Check the OUTPUT, not the input. عبّدهُ carries a damma on its final
        # pronoun and passes any "has a vowel" test, while its stem has none —
        # it romanised as "ʿbbdhu". Three consonants in a row means the headword
        # was never really pointed.
        if _CONSONANT_RUN.search(roman):
            continue
        text = gloss(xml)
        if not text:
            continue
        seen.add(headword)
        members.append({
            "letters": headword,
            "transliteration": roman,
            "meaning": text,
            "plural": plural_of(xml),
            "verb_form": verb_form(itype),
        })
        if len(members) >= limit:
            break
    return members
