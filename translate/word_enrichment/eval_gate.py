"""Measure what the Arramooz second opinion would have caught.

Replays the whole enrichment run (enriched.jsonl) through arramooz.check and
scores it against ground truth we already paid for by hand:

  SHIPPED   81 verified minus 11 manual excludes -> the 70 live on the site
  EXCLUDED  the 11 in build_ts.MANUAL_EXCLUDE, i.e. records that passed the
            automated gate and were still wrong (human diff review caught them)
  FLAGGED   the 8 verify.py already rejected

A useful gate separates SHIPPED from EXCLUDED. Anything that also fires on
SHIPPED is a false positive and costs coverage.

Run:  uv run python -m word_enrichment.eval_gate
"""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

from word_enrichment import arramooz
from word_enrichment.build_ts import MANUAL_EXCLUDE

BASE = Path(__file__).resolve().parent
VERDICTS = ("agree", "ambiguous", "variant", "disagree", "absent")


def _ids(name: str) -> set[int]:
    # groundtruth/ holds the PRE-gate run: verify.py now rewrites verified.jsonl,
    # and the buckets this scores against are defined by that original run.
    path = BASE / "groundtruth" / name
    if not path.exists():
        return set()
    return {json.loads(line)["root_id"] for line in path.open(encoding="utf-8")}


def main() -> None:
    records = [json.loads(line) for line in (BASE / "enriched.jsonl").open(encoding="utf-8")]
    verified, flagged = _ids("verified.jsonl"), _ids("flagged.jsonl")
    excluded = set(MANUAL_EXCLUDE)

    def bucket(root_id: int) -> str:
        if root_id in excluded:
            return "EXCLUDED"
        if root_id in flagged:
            return "FLAGGED"
        return "SHIPPED" if root_id in verified else "OTHER"

    conn = arramooz._connect()
    tally: Counter[tuple[str, str]] = Counter()
    detail: dict[str, list[str]] = {"EXCLUDED": [], "SHIPPED": []}
    try:
        for rec in records:
            op = arramooz.check(rec["letters"], rec["triliteral_root"], conn)
            b = bucket(rec["root_id"])
            tally[(b, op.verdict)] += 1
            if b in detail:
                detail[b].append(
                    f"  {op.verdict:10} {rec['letters']:14} "
                    f"claimed={rec['triliteral_root']:9} arramooz={op.candidates[:3]}"
                )
    finally:
        conn.close()

    width = max(len(v) for v in VERDICTS) + 3
    print(f"{'bucket':10}" + "".join(f"{v:>{width}}" for v in VERDICTS) + f"{'total':>8}")
    for b in ("SHIPPED", "EXCLUDED", "FLAGGED", "OTHER"):
        row = [tally[(b, v)] for v in VERDICTS]
        if not sum(row):
            continue
        print(f"{b:10}" + "".join(f"{n:>{width}}" for n in row) + f"{sum(row):>8}")

    ship = [tally[("SHIPPED", v)] for v in VERDICTS]
    exc = [tally[("EXCLUDED", v)] for v in VERDICTS]
    caught = sum(exc) - exc[0]  # anything but a clean "agree" is withheld
    lost = sum(ship) - ship[0]
    print(
        f"\nGate = withhold unless 'agree'."
        f"\n  catches {caught}/{sum(exc)} known-bad"
        f"\n  costs   {lost}/{sum(ship)} known-good (false positives)"
    )
    for name in ("EXCLUDED", "SHIPPED"):
        rows = [r for r in detail[name] if not r.startswith("  agree")]
        print(f"\n{name} — not cleared by the gate ({len(rows)}):")
        print("\n".join(rows) or "  (none)")


if __name__ == "__main__":
    main()
