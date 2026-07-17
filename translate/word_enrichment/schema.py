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
        default=None,
        description="Optional short clarification of register/usage for this sense.",
    )


class FamilyMember(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")
    letters: str = Field(description="Arabic spelling of a word from the same root.")
    transliteration: str = Field(description="Latin transliteration, e.g. 'muḥammad'.")
    meaning: str = Field(description="Short English meaning.")


class Faq(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")
    q: str = Field(description="A natural search-style question a learner would ask.")
    a: str = Field(description="A short, direct answer grounded in the source.")


class WordEnrichment(BaseModel):
    """Synthesised, source-grounded enrichment for one dictionary word."""

    model_config = ConfigDict(strict=True, extra="forbid")

    triliteral_root: str = Field(description="Spaced Arabic root letters, e.g. 'ح م د'.")
    root_transliteration: str = Field(description="Root transliteration, e.g. 'ḥ-m-d'.")
    headword_transliteration: str = Field(
        description="Transliteration of THIS word (not the root), e.g. 'ḥamd'."
    )
    part_of_speech: str = Field(description="e.g. 'noun (verbal noun / maṣdar)', 'verb (form I)'.")
    senses: list[Sense] = Field(description="1–4 distinct senses, most common first.")
    word_family: list[FamilyMember] = Field(
        description="2–8 notable words sharing the root (derivations), for internal linking."
    )
    usage_note: str | None = Field(
        default=None,
        description="One or two sentences on how the word is used (register, Qur'anic/classical note).",
    )
    faq: list[Faq] = Field(description="1–2 FAQ items; the first should be 'How do you say X in Arabic?'.")
