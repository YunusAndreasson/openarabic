"""Academic romanisation of a vocalised Arabic word — deterministic.

Lane's stores a Buckwalter form (`bword`), but Buckwalter is a lossless ASCII
encoding for machines ("qalobN"), not something to show a learner. This maps the
vocalised Arabic to the romanisation the rest of the app already uses (ḥamd,
ʿilm, qalīb).

It is a transcription, not a transliteration of pronunciation: no assimilation of
the article, no case-ending elision. That matches how the generated records read
and is what a dictionary list wants.
"""

from __future__ import annotations

CONSONANTS = {
    "ا": "ā", "ب": "b", "ت": "t", "ث": "ṯ", "ج": "j", "ح": "ḥ", "خ": "ḵ",
    "د": "d", "ذ": "ḏ", "ر": "r", "ز": "z", "س": "s", "ش": "š", "ص": "ṣ",
    "ض": "ḍ", "ط": "ṭ", "ظ": "ẓ", "ع": "ʿ", "غ": "ġ", "ف": "f", "ق": "q",
    "ك": "k", "ل": "l", "م": "m", "ن": "n", "ه": "h", "و": "w", "ي": "y",
    "ة": "a", "ى": "ā", "ء": "ʾ", "أ": "ʾ", "إ": "ʾ", "ؤ": "ʾ", "ئ": "ʾ",
    "آ": "ʾā", "ٱ": "",
}
SHORT = {"َ": "a", "ُ": "u", "ِ": "i"}      # fatha damma kasra
TANWIN = {"ً": "an", "ٌ": "un", "ٍ": "in"}  # the case endings
SUKUN, SHADDA, DAGGER = "ْ", "ّ", "ٰ"
LONG = {("a", "ا"): "ā", ("u", "و"): "ū", ("i", "ي"): "ī"}


def _groups(word: str) -> list[tuple[str, set[str]]]:
    """Each consonant paired with the marks attached to it.

    Grouping rather than scanning pairwise, because the order of a shadda and its
    vowel is not fixed in the wild — مَّ appears both as م+ّ+َ and م+َ+ّ, and a
    pairwise scan silently misses the doubling in the second (muḥamad).
    """
    out: list[tuple[str, set[str]]] = []
    for ch in word:
        if ch in CONSONANTS:
            out.append((ch, set()))
        elif ch in SHORT or ch in TANWIN or ch in (SUKUN, SHADDA, DAGGER):
            if out:
                out[-1][1].add(ch)
    return out


def transliterate(word: str, *, keep_case_ending: bool = False) -> str:
    """Romanise a vocalised Arabic word.

    `keep_case_ending` off by default: Lane's headwords carry full ʾiʿrāb
    (قَلْبٌ), and 'qalbun' is noise in a list where every entry carries one.
    """
    groups = _groups(word)
    out: list[str] = []
    i = 0
    while i < len(groups):
        ch, marks = groups[i]
        nxt_ch = groups[i + 1][0] if i + 1 < len(groups) else ""
        vowel = next((SHORT[m] for m in marks if m in SHORT), None)

        # Word-initial alif carrying a vowel is hamzat al-waṣl — a prop for the
        # vowel, not a long ā. Without this اِسْتَعْبَدَ romanises as "āistaʿbada".
        if i == 0 and ch in ("ا", "ٱ", "إ", "أ") and vowel:
            out.append(vowel)
            i += 1
            continue

        base = CONSONANTS[ch]
        if SHADDA in marks and base:
            base *= 2
        # tāʾ marbūṭa is the "a" of the preceding fatḥa, not another one after it.
        if ch == "ة":
            if out and out[-1].endswith(("a", "ā")):
                base = ""
            i += 1
            out.append(base)
            continue
        out.append(base)

        if vowel:
            if (vowel, nxt_ch) in LONG and not groups[i + 1][1] & set(SHORT):
                out.append(LONG[(vowel, nxt_ch)])
                i += 2
                continue
            out.append(vowel)
        elif DAGGER in marks:
            out.append("ā")
        elif keep_case_ending:
            out.extend(TANWIN[m] for m in marks if m in TANWIN)
        elif any(m in TANWIN for m in marks):
            pass
        i += 1
    return "".join(out)
