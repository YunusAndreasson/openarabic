"""Pydantic schema for a synthesised word-enrichment record.

The model returns ONLY the synthesised content fields below; provenance
(`root_id`, `source`, `source_url`, the headword itself) is attached in code so
the model cannot fabricate it. Strict + extra=forbid so a malformed generation
fails loudly rather than smuggling junk through.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class Sense(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")
    gloss: str = Field(description="A concise English sense, e.g. 'praise, commendation'.")
    note: str | None = Field(
        description="Short clarification of register/usage, or null when there is "
                    "nothing to add. Required-but-nullable rather than optional: "
                    "strict decoding demands every property be present, and an "
                    "explicit null is a decision where an absent key is a shrug.",
    )


class FamilyMember(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")
    letters: str = Field(description="Arabic spelling of a word from the same root.")
    transliteration: str = Field(description="Latin transliteration, e.g. 'muḥammad'.")
    meaning: str = Field(
        description=(
            "Short English gloss, AT MOST 8 words. No grammar metadata "
            "('Form II:', 'verbal noun of') and no parenthetical asides."
        )
    )


class Faq(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")
    q: str = Field(description="A natural search-style question a learner would ask.")
    a: str = Field(description="A short, direct answer grounded in the source.")


class WordEnrichment(BaseModel):
    """Synthesised, source-grounded enrichment for one dictionary word."""

    model_config = ConfigDict(strict=True, extra="forbid")

    triliteral_root: str = Field(description="Spaced Arabic root letters, e.g. 'ح م د'.")
    root_transliteration: str = Field(description="Root transliteration, e.g. 'ḥ-m-d'.")
    root_meaning: str = Field(
        description=(
            "The CORE sense the root itself carries, as a bare phrase of at most six "
            "words, lower-case, no final full stop, e.g. 'to praise, commend' or "
            "'to turn, invert, change'. This is the meaning shared by the whole word "
            "family — NOT the meaning of this particular word."
        )
    )
    headword_transliteration: str = Field(
        description="Transliteration of THIS word (not the root), e.g. 'ḥamd'."
    )
    part_of_speech: str = Field(description="e.g. 'noun (verbal noun / maṣdar)', 'verb (form I)'.")
    senses: list[Sense] = Field(description="1–4 distinct senses, most common first.")
    word_family: list[FamilyMember] = Field(
        max_length=5,
        description=(
            "2-5 words sharing the root, chosen for how likely a learner is to "
            "meet them rather than for rarity. Used for internal linking."
        ),
    )
    usage_note: str = Field(
        description="One or two sentences on how the word is used (register, "
                    "Qur'anic/classical note). REQUIRED — this is the body the "
                    "reader sheet expands to show, so a record without one renders "
                    "as a bare root line. It was optional until a 20-word trial "
                    "came back missing it 47% of the time; the model was not "
                    "disobeying the prompt, the schema permitted the omission.",
    )
    faq: list[Faq] = Field(description="1–2 FAQ items; the first should be 'How do you say X in Arabic?'.")
