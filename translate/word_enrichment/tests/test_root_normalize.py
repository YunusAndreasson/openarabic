"""The rules that decide whether a paid call becomes a shipped record.

Split deliberately between TRIM and REJECT, because getting that split wrong is
expensive in both directions: rejecting a good record for a cosmetic overrun
throws away a call, and trimming a genuine misread ships a defect that looks fine.
"""

import pytest

from word_enrichment import pool, root_normalize as rn

# Two valid members, so a record fails only for the reason under test.
FAMILY = [
    {"letters": "عِلْمٌ",
     "transliteration": "ʿilm", "meaning": "knowledge"},
    {"letters": "عَلِمَ",
     "transliteration": "ʿalima", "meaning": "to know"},
]
NOTE = ("The root turns on knowing and perceiving. It gives words for knowledge, "
        "for a sign, and for the marks by which a thing is recognised.")


def record(**over):
    return {"root_meaning": "to know", "usage_note": NOTE,
            "word_family": [dict(m) for m in FAMILY], **over}


def test_a_clean_record_passes():
    """Guards the guards: if this fails, every other case here is vacuous."""
    out, problems = rn.normalize(record())
    assert problems == []
    assert len(out["word_family"]) == 2


# --- closure: the rule the whole architecture rests on -----------------------

def test_a_form_outside_the_pool_fails_the_record():
    """Not a dropped member -- a hard fail. One invented form means the model
    wrote Arabic instead of selecting it, so the rest cannot be trusted either."""
    sullam = "سُلَّم"
    rec = record(word_family=[*[dict(m) for m in FAMILY],
                              {"letters": sullam, "transliteration": "sullam",
                               "meaning": "ladder"}])
    keys = {pool.match_key(m["letters"]) for m in FAMILY}
    _, problems = rn.normalize(rec, pool_keys=keys)
    assert any("not in the candidate pool" in p for p in problems)


def test_closure_is_not_skeletal():
    """salim and sullam share a skeleton. Accepting one for the other is exactly
    how this pipeline has produced confident, well-formed, wrong content."""
    salim = "سَلِمٌ"
    sullam = "سُلَّم"
    assert pool.bareword(salim) == pool.bareword(sullam)
    assert pool.match_key(salim) != pool.match_key(sullam)


def test_closure_fires_before_the_transliteration_rule():
    """The ordering regression: an invented form has no pool row to take a
    transliteration from, so placed later the closure check never ran -- the form
    was dropped as 'transliteration missing' and the hard fail silently became a
    trim."""
    rec = record(word_family=[*[dict(m) for m in FAMILY],
                              {"letters": "سُلَّم",
                               "meaning": "ladder"}])  # no transliteration at all
    keys = {pool.match_key(m["letters"]) for m in FAMILY}
    _, problems = rn.normalize(rec, pool_keys=keys)
    assert any("not in the candidate pool" in p for p in problems)


def test_fields_attached_in_code_survive_normalisation():
    """`wazn` and `root_id` come from the pool row, not the model. The rebuild
    used to reconstruct a member from three fields and drop both -- which are
    the two the panel renders and links with."""
    family = [dict(m) for m in FAMILY]
    family[0].update(wazn="1ِ2ْ3", root_id=42)
    out, problems = rn.normalize(record(word_family=family))
    assert problems == []
    assert out["word_family"][0]["wazn"] == "1ِ2ْ3"
    assert out["word_family"][0]["root_id"] == 42


# --- usage_note: trim vs reject ----------------------------------------------

def test_an_over_long_note_is_trimmed_not_rejected():
    """The first probe call ever made lost a good record to a 330-char note."""
    long_note = "The root turns on turning a thing over completely. " * 6
    out, problems = rn.normalize(record(usage_note=long_note))
    assert problems == []
    assert len(out["usage_note"]) <= rn.MAX_NOTE_CHARS


def test_trimming_stops_at_a_sentence_boundary():
    """A mid-sentence cut trades a long panel for a broken one."""
    out, _ = rn.normalize(record(usage_note="One. Two. Three. Four. Five."))
    assert out["usage_note"].endswith(".")
    assert len(out["usage_note"].rstrip(".").split(".")) <= rn.MAX_NOTE_SENTENCES


def test_one_unsplittable_over_long_sentence_is_rejected():
    """Nothing to trim back to, so this really is a misread of the task."""
    _, problems = rn.normalize(record(usage_note="y " * 220))
    assert any("in one sentence" in p for p in problems)


def test_a_note_about_one_headword_is_rejected_not_trimmed():
    """Shown under every word on the root, so it would be false for most."""
    _, problems = rn.normalize(
        record(usage_note="This word is the verbal noun of the root and means knowledge indeed."))
    assert any("one headword" in p for p in problems)


# --- members: drop, don't fail -----------------------------------------------

@pytest.mark.parametrize("bad,why", [
    ({"letters": "ilm", "transliteration": "ilm", "meaning": "knowledge"}, "not Arabic"),
    ({"letters": "علم", "transliteration": "ʿilm",
      "meaning": "knowledge"}, "no diacritics"),
])
def test_a_bad_member_is_dropped_while_the_record_survives(bad, why):
    """One bad member of three is a trim; the record cost a call and is otherwise
    correct. The record fails only when too few members survive."""
    out, problems = rn.normalize(record(word_family=[*[dict(m) for m in FAMILY], bad]))
    assert problems == []
    assert len(out["word_family"]) == 2
    assert any(why in d for d in out["_dropped_members"])


def test_a_derived_form_sharing_the_root_skeleton_is_kept():
    """An earlier version dropped عِلْمٌ and عَلِمَ for 'being the root itself'.
    Sharing the root's consonants is what a derived word IS."""
    out, problems = rn.normalize(record(), root_key="علم")
    assert problems == []
    assert len(out["word_family"]) == 2


# --- root_meaning: trim at a clause, reject when there is nothing to trim ------

def test_an_over_long_root_meaning_is_trimmed_at_a_comma():
    """A list of near-synonyms shortens cleanly; a probe lost a clean record to a
    seven-word meaning against a six-word cap."""
    out, problems = rn.normalize(
        record(root_meaning="to move, sway, swing, dangle, oscillate, waver"))
    assert problems == []
    assert len(out["root_meaning"].split()) <= rn.MAX_ROOT_MEANING_WORDS
    assert out["root_meaning"].startswith("to move")


def test_an_over_long_root_meaning_with_no_commas_is_rejected():
    """Shortening this would mean rewriting it, which is not a normalisation."""
    _, problems = rn.normalize(
        record(root_meaning="a single unsplittable seven word root meaning here"))
    assert any("root_meaning is" in p for p in problems)
