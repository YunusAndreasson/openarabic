"""Automated trust gate for generated enrichments.

Since there is no per-entry human review, this is what earns the "trust the
pipeline" stance: programmatic guards that catch the main hallucination risk —
Arabic word forms the model could have invented. For every record we re-derive
the Lane's grounding and require:
  - the stated triliteral root matches the resolved root,
  - every word_family Arabic form actually appears in the grounding's headwords,
  - required fields are present and non-empty, source is set.
Passing records → verified.jsonl; anything failing → flagged.jsonl (never shipped).

Run:  uv run python -m word_enrichment.verify
"""

from __future__ import annotations

import json
from pathlib import Path

from word_enrichment import lexicon

BASE = Path(__file__).resolve().parent
IN = BASE / "enriched.jsonl"
VERIFIED = BASE / "verified.jsonl"
FLAGGED = BASE / "flagged.jsonl"


# Orthographic normalisation for root/family comparison: alef-maqsura↔yaa, the
# alef/hamza variants, and taa-marbuta — the same radicals for root purposes.
_NORMALIZE = str.maketrans(
    {"ى": "ي", "ٱ": "ا", "أ": "ا", "إ": "ا", "آ": "ا", "ة": "ه", "ؤ": "ء", "ئ": "ء"}
)


def _bw(s: str) -> str:
    return lexicon.bareword(s).replace(" ", "").translate(_NORMALIZE)


def _norm_root(s: str) -> str:
    """Collapse a doubled final radical so geminate roots compare equal:
    Lane writes doubled roots with two letters (خفّ → خف) where the model may
    expand them to three (خ ف ف → خفف). Both normalise to خف."""
    bw = _bw(s)
    return bw[:-1] if len(bw) >= 2 and bw[-1] == bw[-2] else bw


def check(record: dict) -> list[str]:
    """Return a list of problems; empty means the record passes."""
    problems: list[str] = []
    for field in ("triliteral_root", "root_transliteration", "headword_transliteration",
                  "part_of_speech", "senses", "word_family", "faq", "source"):
        if not record.get(field):
            problems.append(f"missing/empty: {field}")
    if problems:
        return problems

    # Read the full (untruncated) entry so a form near the end isn't a false miss.
    grounding = lexicon.lookup(record["letters"], text_budget=200_000)
    if not grounding:
        return ["grounding no longer resolves"]

    # Root must match what the lexicon resolves for this word (geminate-aware).
    if _norm_root(record["triliteral_root"]) != _norm_root(grounding.root):
        problems.append(
            f"root mismatch: model={record['triliteral_root']!r} vs Lane's={grounding.root!r}"
        )

    # Every word-family Arabic form must actually occur in the grounding — as an
    # entry headword, a POS-table form, or anywhere in the entry prose. This is
    # the real "is it grounded?" test and guards against invented derivations.
    headword_bws = {_bw(d["word"]) for d in grounding.derived_forms}
    headword_bws |= {_bw(p["headword"]) for p in grounding.pos}
    text_bw = _bw(grounding.text)
    for member in record["word_family"]:
        bw = _bw(member["letters"])
        if bw not in headword_bws and bw not in text_bw:
            problems.append(f"word_family not in grounding: {member['letters']}")

    # FAQ shape.
    if not any(isinstance(f.get("q"), str) and f.get("a") for f in record["faq"]):
        problems.append("faq malformed")

    return problems


def main() -> None:
    if not IN.exists():
        print(f"no input at {IN}")
        return
    VERIFIED.unlink(missing_ok=True)
    FLAGGED.unlink(missing_ok=True)

    ok = bad = 0
    for line in IN.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        record = json.loads(line)
        problems = check(record)
        target = VERIFIED if not problems else FLAGGED
        out = record if not problems else {**record, "_problems": problems}
        with target.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(out, ensure_ascii=False) + "\n")
        if problems:
            bad += 1
            print(f"  ✗ {record['root_id']} {record['letters']}: {problems}")
        else:
            ok += 1
            print(f"  ✓ {record['root_id']} {record['letters']} ({record['meaning']})")

    print(f"\nVerified {ok}, flagged {bad}. → {VERIFIED.name} / {FLAGGED.name}")


if __name__ == "__main__":
    main()
