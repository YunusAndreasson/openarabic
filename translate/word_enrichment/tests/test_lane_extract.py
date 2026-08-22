"""What we read out of Lane's TEI, and the three things we were leaving in it.

Each case is a measured gap, not a hypothetical: 50.3% of entries under the 400
busiest roots carry a sense marker, 25.9% carry a verb form, 11.5% state a plural.
"""

import pytest

from word_enrichment import lane_extract as lane

ITAL = '<hi rend="ital">'


def entry(inner: str) -> str:
    return f'<entryFree key="x" type="main">{inner}</entryFree>'


# --- sense scoping ------------------------------------------------------------

MULTI_SENSE = entry(
    f'{ITAL}knowledge, or several species of knowledge.</hi>'
    '<sense type="b" n="2">-b2-</sense> Sometimes it is applied to '
    f'{ITAL}predominant opinion;</hi>'
    '<sense type="b" n="3">-b3-</sense> And sometimes to '
    f'{ITAL}a doing</hi>'
)


def test_gloss_stops_at_the_first_sense_boundary():
    """`_ITALIC_SPAN` runs first-italic to last-italic, so on a multi-sense entry
    it swallowed every sense and the word budget truncated wherever it landed.
    عِلْمٌ came back as "sciences, or several species of knowledge. Sometimes" --
    sense 1 plus the first word of sense 2."""
    out = lane.gloss(MULTI_SENSE)
    assert "knowledge" in out
    assert "Sometimes" not in out
    assert "predominant opinion" not in out
    assert "doing" not in out


def test_a_single_sense_entry_is_unaffected():
    """The scoping must not change the 49.7% of entries that have one sense."""
    single = entry(f'{ITAL}A mother</hi>')
    assert lane.gloss(single) == lane.gloss(single.replace("</entryFree>", " </entryFree>"))
    assert "mother" in lane.gloss(single)


def test_sense_one_without_a_translation_falls_back_to_the_whole_entry():
    """A few entries open with a bare orthography block and put every gloss under
    sense 2. Scoping to an empty sense 1 would silently drop the whole entry."""
    late = entry(
        '<form><orth lang="ar">x</orth></form>'
        '<sense type="b" n="2">-b2-</sense>'
        f'{ITAL}a place of alighting</hi>'
    )
    assert "alighting" in lane.gloss(late)


# --- verb form ----------------------------------------------------------------

@pytest.mark.parametrize("itype,expected", [
    ("1", "I"), ("2", "II"), ("4", "IV"), ("10", "X"),
    ("R. Q. 1", "Rq. I"), ("", ""), (None, ""), ("99", ""),
])
def test_verb_form_reads_lanes_structured_column(itype, expected):
    """`entry.itype` is a column, not parsed prose -- present on 25.9% of entries
    and previously never read. It is the only morphology available for the 18.5%
    of pool candidates CAMeL cannot match."""
    assert lane.verb_form(itype) == expected


# --- plurals ------------------------------------------------------------------

def test_plural_is_read_from_the_structured_construction():
    """Arabic broken plurals are unguessable, so a stated one is content a learner
    cannot derive. `_DANGLING` was stripping the "pl." and discarding the form."""
    xml = entry(f'{ITAL}A father</hi> pl. <foreign lang="ar">آبَآءٌ</foreign>')
    assert lane.plural_of(xml) == "آبَآءٌ"


def test_plural_drops_a_welded_trailing_letter():
    """A tag boundary occasionally leaves one bare consonant attached: آثَارٌح."""
    xml = entry(f'{ITAL}A trace</hi> pl. <foreign lang="ar">آثَارٌح</foreign>')
    assert lane.plural_of(xml) == "آثَارٌ"


def test_no_plural_is_an_empty_string_not_a_guess():
    """Lane also gives plurals in running prose; guessing at those would
    reintroduce the ambiguity the structured form avoids."""
    assert lane.plural_of(entry(f'{ITAL}A mother</hi> and the pl. of that varies')) == ""
    assert lane.plural_of("") == ""


def test_plural_keeps_a_defective_nouns_final_letter():
    """دُمًى is a defective noun: the alif maqsura AFTER the tanwin is part of the
    word. The welded-consonant cleanup was stripping it and shipping دُمً."""
    xml = entry(f'{ITAL}A statuette</hi> pl. <foreign lang="ar">دُمًى</foreign>')
    assert lane.plural_of(xml) == "دُمًى"


def test_plural_is_refused_when_it_belongs_to_another_form():
    """Lane's عَارِفٌ entry reads "of which latter the pl. is عُرْفٌ" -- that plural
    belongs to an alternative form he just listed. We were filing عُرْف, which is
    a different word ("custom"), as the plural of عَارِف."""
    xml = entry(
        f'{ITAL}Knowing</hi>, and <foreign lang="ar">عَرُوفٌ</foreign>, of which '
        'latter the pl. is <foreign lang="ar">عُرْفٌ</foreign>'
    )
    assert lane.plural_of(xml) == ""


def test_the_refusal_does_not_swallow_a_legitimate_plural():
    """Matching "latter" anywhere in the preceding window instead of in its own
    construction cost عَالِمٌ its correct عُلَمَآءُ. The guard is anchored."""
    xml = entry(
        f'{ITAL}A scholar</hi>; the former is said of a man and the latter of a '
        'woman, in various places. pl. <foreign lang="ar">عُلَمَآءُ</foreign>'
    )
    assert lane.plural_of(xml) == "عُلَمَآءُ"
