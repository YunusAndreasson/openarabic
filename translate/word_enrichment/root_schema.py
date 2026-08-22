"""What a root explanation contains — deliberately smaller than a word record.

Everything headword-specific is gone: no `senses` (those are one word's meanings,
not the root's), no `headword_transliteration`, no `part_of_speech`, no `faq`.
What remains is exactly the part that is identical for every word built on the
same radicals, which is what makes one record able to serve up to 94 headwords.

Every field is required so strict decoding can be used. `usage_note` was optional
in the word schema and a 20-word trial came back missing it 47% of the time —
the model was not disobeying the prompt, the schema permitted the omission.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class RootFamilyMember(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")
    letters: str = Field(description="Arabic spelling of a word built on this root.")
    transliteration: str = Field(description="Latin transliteration, e.g. 'qalīb'.")
    meaning: str = Field(
        description=(
            "Short English gloss, AT MOST 8 words. No grammar metadata "
            "('Form II:', 'verbal noun of') and no parenthetical asides — a "
            "longer gloss renders as three lines in a phone-sized list."
        )
    )


class RootExplanation(BaseModel):
    """The shared account of one triliteral root."""

    model_config = ConfigDict(strict=True, extra="forbid")

    # `triliteral_root` and `root_transliteration` are NOT asked for. Both are
    # mechanical functions of radicals we resolved deterministically before the
    # call, and a 5-root trial showed what asking costs: 'ʿ-l-m' returned as the
    # Arabic root, 'qwm' as the transliteration, 'ʿilm' (a word) as another. They
    # are attached in code by root_translit, where they cannot be wrong.
    root_meaning: str = Field(
        description="The sense the ROOT carries across the whole family, at most six "
                    "words, lower-case, no final full stop, e.g. 'to turn, invert, "
                    "change'. What every word below has in common."
    )
    usage_note: str = Field(
        description=(
            "Two or three sentences a learner reads under ANY word of this root. "
            "Explain the shared idea and show how a couple of the family members "
            "come from it — 'a قَلِيب is a dug well, from earth being turned over'. "
            "Write about the ROOT, never about one particular word: this same text "
            "appears under every headword built on it, so 'this word is the verbal "
            "noun of…' would be false for most of them."
        )
    )
    word_family: list[RootFamilyMember] = Field(
        max_length=5,
        description="2-5 words from this root, chosen for how likely a learner is to "
                    "meet them rather than for rarity.",
    )


class RootFamilyPick(BaseModel):
    """One CHOSEN word, when the model is given a closed pool to choose from.

    Two fields, not four. `transliteration` and `wazn` are dropped from the ask
    entirely: both are mechanical functions of `letters`, both are already in the
    pool row the model is reading, and re-requesting them pays output tokens for
    a value that can only get worse. They are attached in code afterwards.
    """

    model_config = ConfigDict(strict=True, extra="forbid")
    letters: str = Field(
        description=(
            "The Arabic spelling COPIED EXACTLY, character for character, from one "
            "of the CANDIDATE WORDS lines. Do not re-spell it, do not add or remove "
            "diacritics, do not substitute a related word. A value that is not in "
            "that list is rejected and the whole record is discarded."
        )
    )
    meaning: str = Field(
        description=(
            "The candidate's meaning rewritten in plain modern English, AT MOST 8 "
            "words. Use the 'modern:' gloss where the line has one; Lane's wording "
            "is 1863 prose and often gives a sub-sense rather than the core meaning. "
            "No grammar metadata ('Form II:', 'verbal noun of'), no parentheses."
        )
    )


class RootExplanationFromPool(BaseModel):
    """A root explanation assembled by SELECTING from an attested pool.

    Identical to `RootExplanation` except that the family members are picks
    rather than free text. That difference is the whole architecture: the model
    never supplies an Arabic form, so it cannot invent one.
    """

    model_config = ConfigDict(strict=True, extra="forbid")

    root_meaning: str = Field(
        description="The sense the ROOT carries across the whole family, at most six "
                    "words, lower-case, no final full stop, e.g. 'to turn, invert, "
                    "change'. What every word below has in common."
    )
    usage_note: str = Field(
        description=(
            "Two or three sentences (320 characters at the very most) that a learner "
            "reads under ANY word of this root. Explain the shared idea and show how "
            "a couple of the words you chose come from it. Write about the ROOT, "
            "never about one particular word: this same text appears under every "
            "headword built on it."
        )
    )
    word_family: list[RootFamilyPick] = Field(
        max_length=5,
        description="Exactly 5 where the pool allows it, chosen for how likely a "
                    "learner is to meet them rather than for rarity. Prefer the "
                    "lines marked [in our dictionary].",
    )
