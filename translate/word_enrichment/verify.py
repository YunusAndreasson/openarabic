"""Automated trust gate for generated enrichments.

Programmatic guards that catch the main hallucination risk — Arabic word forms
the model could have invented. For every record we re-derive the Lane's
grounding and require:
  - the stated triliteral root matches the resolved root,
  - every word_family Arabic form actually appears in the grounding's headwords,
  - required fields are present and non-empty, source is set.

Those checks share a blind spot: they re-derive the root with `lexicon.lookup()`,
the SAME resolver that produced the grounding the model was shown. When it
mis-files a word the model repeats the wrong root and the check sees agreement.
All 11 records that passed this gate and were still rejected by human review
(build_ts.MANUAL_EXCLUDE) are that class.

So a second, independent opinion runs alongside it: `arramooz.check` looks the
word up in a morphological dictionary that knows nothing about Lane's. Measured
over the 89-record run (see eval_gate.py) it separates the sets cleanly —
0 of 11 known-bad records clear it, against 53 of 70 known-good. It is
deliberately NOT a hard failure: of the 17 known-good it does not clear, three
turned out to be genuine errors human review had missed, and the rest are
lexicographical convention (Lane files malāʾikah under ا ل ك, Arramooz under
م ل ك) or weak-radical notation. Treat it as triage, not judgement.

Routing:
  flagged.jsonl   hard failure — never shipped
  review.jsonl    passes the hard checks, second opinion does not corroborate
                  — needs human eyes before shipping
  verified.jsonl  passes both — safe to ship

Run:  uv run python -m word_enrichment.verify
"""

from __future__ import annotations

import json
from pathlib import Path

from word_enrichment import arramooz, camel_roots, lexicon

BASE = Path(__file__).resolve().parent
IN = BASE / "enriched.jsonl"
VERIFIED = BASE / "verified.jsonl"
FLAGGED = BASE / "flagged.jsonl"
REVIEW = BASE / "review.jsonl"


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
    # Reproduce the SAME grounding generation used: a record built from a root
    # hint must be checked against that root, otherwise this re-derives the
    # broken surface-form root and reports the corrected record as mismatched.
    grounding = lexicon.lookup(
        record["letters"], text_budget=200_000, root_hint=record.get("_root_hint")
    )
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
    for path in (VERIFIED, FLAGGED, REVIEW):
        path.unlink(missing_ok=True)

    conn = arramooz._connect()
    ok = bad = review = 0
    try:
        for line in IN.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            record = json.loads(line)
            problems = check(record)
            if problems:
                bad += 1
                target, out = FLAGGED, {**record, "_problems": problems}
                print(f"  ✗ {record['root_id']} {record['letters']}: {problems}")
            else:
                opinion = arramooz.check(record["letters"], record["triliteral_root"], conn)
                adjudged = arramooz.adjudication(record["root_id"], record["triliteral_root"])
                out = {
                    **record,
                    "_second_opinion": {
                        "verdict": opinion.verdict,
                        "candidates": opinion.candidates,
                        "matched_stem": opinion.matched_stem,
                        "source": arramooz.SOURCE_NAME,
                        **({"adjudicated": adjudged} if adjudged else {}),
                    },
                }
                # A proper noun goes to the judge even when the sources agree.
                # Sampling 30 gate-PASSED records found no wrong roots at all,
                # but two entries whose only sense was a personal name (Hassan,
                # Zayd) — a root explanation for a given name is odd rather than
                # false, and the judge is what tells the two apart. Cannot be a
                # blanket drop: مُحَمَّد really is a passive participle of ح م د,
                # and يَهُود ← ه و د is the standard derivation. Costs ~1% of the
                # batch in extra adjudication.
                is_proper = camel_roots.dominant_pos(
                    arramooz.bareword(record["letters"])
                ) == "noun_prop"
                if (opinion.is_trustworthy or adjudged) and not is_proper:
                    ok += 1
                    target = VERIFIED
                    print(f"  ✓ {record['root_id']} {record['letters']} ({record['meaning']})")
                else:
                    review += 1
                    target = REVIEW
                    print(
                        f"  ? {record['root_id']} {record['letters']} ({record['meaning']}): "
                        f"{opinion.verdict} — Lane's {record['triliteral_root']!r} vs "
                        f"Arramooz {opinion.candidates[:3]}"
                    )
            with target.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps(out, ensure_ascii=False) + "\n")
    finally:
        conn.close()

    print(
        f"\nVerified {ok}, needs review {review}, flagged {bad}."
        f"\n→ {VERIFIED.name} / {REVIEW.name} / {FLAGGED.name}"
    )


if __name__ == "__main__":
    main()
