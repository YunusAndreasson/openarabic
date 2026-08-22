"""Normalisation is the layer that fails silently, so it is the layer under test.

Every case here is a defect that actually shipped or nearly did. The first class
is the reason this file exists: `bareword` in `pool.py` was a character class that
LOOKED like the correct one and stripped the entire Arabic alphabet instead, so
every candidate normalised to the empty string, collided on one key, and the whole
pool was stamped with one unrelated `root_id`. Nothing raised. The pool just went
quietly wrong, and the only visible symptom was an odd sort order.

A test asserting an exact expected string catches that in milliseconds. A test
asserting "it removed some characters" would have passed.
"""

import pytest

from word_enrichment import arramooz, lexicon, pool

# (vocalised, expected skeleton). Written as escapes so the source is ASCII and
# cannot be reordered by a bidi renderer -- the same discipline as the codepoint
# table in lexicon.py.
BAREWORD_CASES = [
    ("\u0639\u064e\u0628\u0652\u062f\u064c", "\u0639\u0628\u062f"),        # 3abdun  -> 3bd
    ("\u0639\u0650\u0644\u0652\u0645\u064c", "\u0639\u0644\u0645"),        # 3ilmun  -> 3lm
    ("\u0635\u064e\u062f\u064e\u0642\u064e\u0629\u064c",
     "\u0635\u062f\u0642\u0629"),                                                # sadaqatun
    ("\u0642\u064e\u0627\u0645\u064e", "\u0642\u0627\u0645"),                # qaama
]


@pytest.mark.parametrize("vocalised,expected", BAREWORD_CASES)
def test_bareword_strips_marks_and_keeps_letters(vocalised, expected):
    """The regression. Every letter survives; every mark is removed."""
    assert lexicon.bareword(vocalised) == expected


@pytest.mark.parametrize("vocalised,expected", BAREWORD_CASES)
def test_bareword_is_one_implementation(vocalised, expected):
    """Three modules expose this; a divergence between them is how the bug hid."""
    assert arramooz.bareword(vocalised) == expected
    assert pool.bareword(vocalised) == expected


def test_bareword_never_empties_a_real_word():
    """The precise failure mode: a too-wide range returns '' for every input, and
    an empty key collides with every other empty key."""
    for vocalised, _ in BAREWORD_CASES:
        assert lexicon.bareword(vocalised) != ""


def test_match_key_separates_words_sharing_a_skeleton():
    """The join must NOT be skeletal. salim / sullam / silm are three different
    words on one root; keying them together glossed 'safe' as 'ladder, stairs'."""
    salim = "\u0633\u064e\u0644\u0650\u0645\u064c"
    sullam = "\u0633\u064f\u0644\u0651\u064e\u0645"
    silm = "\u0633\u0650\u0644\u0652\u0645\u064c"
    keys = {pool.match_key(w) for w in (salim, sullam, silm)}
    assert len(keys) == 3, "match_key collapsed distinct words"
    # ...while the skeleton deliberately does collapse them.
    assert len({pool.bareword(w) for w in (salim, sullam, silm)}) == 1


def test_match_key_ignores_case_endings_and_alef_seat():
    """Lane's writes case endings, CAMeL does not; that must not split a match."""
    assert pool.match_key("\u0639\u064e\u0628\u0652\u062f\u064c") == pool.match_key(
        "\u0639\u064e\u0628\u0652\u062f"
    )


def test_is_teachable_rejects_an_unpointed_form():
    """A skeleton with one stray vowel on a suffix reads as consonant soup."""
    assert not pool.is_teachable("\u0639\u0628\u0651\u062f\u0647\u064f")
    assert pool.is_teachable("\u0639\u064e\u0628\u0652\u062f")


def test_english_gloss_gate_rejects_an_arabic_gloss():
    """CAMeL echoes the form back, tagged FOREIGN, when it cannot analyse a word."""
    assert not pool._is_english_gloss("\u0639\u064e\u0644\u0652\u0645")
    assert not pool._is_english_gloss("")
    assert pool._is_english_gloss("slave;servant")


# dad + fatha + jim + SHADDA + FATHA + ta-marbuta, and the same word with the two
# marks the other way round. Built from codepoints, not typed as literals: typing
# them relies on whatever encoder the source passed through preserving an order
# that is invisible on screen, which is precisely the property under test.
_DAJJA_SHADDA_FIRST = "ضَجَّة"
_DAJJA_VOWEL_FIRST = "ضَجَّة"
_DAJJ = "ضَجّ"


def test_the_two_orderings_really_are_different_bytes():
    """Guards the two tests below from passing vacuously."""
    assert _DAJJA_SHADDA_FIRST != _DAJJA_VOWEL_FIRST
    assert sorted(_DAJJA_SHADDA_FIRST) == sorted(_DAJJA_VOWEL_FIRST)


def test_match_key_is_blind_to_combining_mark_order():
    """Arabic combining marks have no inherent order: a shadda and its vowel can
    be stored either way round and render identically.

    Lane's writes ضَجَّة shadda-first; a model handed that exact string and told to
    copy it returned it vowel-first. The closure gate then called six
    correctly-copied words "invented" across a 25-root probe and discarded the
    records. Same glyphs, different bytes -- invisible to any review that reads
    the rendered text.
    """
    assert pool.match_key(_DAJJA_SHADDA_FIRST) == pool.match_key(_DAJJA_VOWEL_FIRST)


def test_closure_accepts_a_reordered_copy_of_a_pool_form():
    """The same case end-to-end, through the gate itself."""
    from word_enrichment import root_normalize

    rec = {
        "root_meaning": "to clamour",
        "usage_note": "The root turns on noise and outcry, the din a crowd makes "
                      "when it protests loudly about something.",
        "word_family": [
            {"letters": _DAJJA_VOWEL_FIRST, "transliteration": "dajja",
             "meaning": "an outcry"},
            {"letters": _DAJJ, "transliteration": "dajja", "meaning": "to clamour"},
        ],
    }
    pool_keys = {pool.match_key(_DAJJA_SHADDA_FIRST), pool.match_key(_DAJJ)}
    _, problems = root_normalize.normalize(rec, pool_keys=pool_keys)
    assert problems == [], problems


def test_resolve_snaps_an_under_pointed_copy_to_the_pool_spelling():
    """A model returned ضَجّة where the pool held ضَجَّة -- one missing fatha, the
    same word. With exactly one pool form on that skeleton the choice is
    unambiguous, so the record is kept and the SOURCE's pointing is what ships."""
    from word_enrichment.pool import Candidate

    pool_form = "ضَجَّة"
    under_pointed = "ضَجّة"
    candidates = [Candidate(letters=pool_form, transliteration="dajja",
                            camel_gloss="outcry")]
    resolved = pool.resolve(under_pointed, candidates)
    assert resolved is not None and resolved.letters == pool_form


def test_resolve_refuses_when_several_pool_forms_share_the_skeleton():
    """The safety condition. On a productive root سَلِم / سُلَّم / سِلْم all share a
    skeleton, and snapping there is how 'be safe' once became 'ladder, stairs'."""
    from word_enrichment.pool import Candidate

    candidates = [
        Candidate(letters="سَلِمٌ", transliteration="salim", camel_gloss="be safe"),
        Candidate(letters="سُلَّم", transliteration="sullam", camel_gloss="ladder"),
    ]
    assert pool.resolve("سلم", candidates) is None
