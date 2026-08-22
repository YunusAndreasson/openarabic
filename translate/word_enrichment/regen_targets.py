"""Emit regeneration targets for records whose root the second opinion overturned.

Reads review.jsonl, keeps entries where Arramooz gives a single confident root
that conflicts with Lane's, and writes a targets file carrying `root_hint` so
generate.py can bypass the surface-form resolver that produced the bad root.

Run from translate/:  python -m word_enrichment.regen_targets --ids 7623 9781
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent

# Single source of truth for human root adjudications.
from word_enrichment.arramooz import ADJUDICATED  # noqa: E402



def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", type=int, nargs="*", help="only these root_ids")
    ap.add_argument("--out", default=str(BASE / "targets_regen.json"))
    args = ap.parse_args()

    rows = [json.loads(line) for line in (BASE / "review.jsonl").open(encoding="utf-8")]
    targets = []
    for rec in rows:
        op = rec.get("_second_opinion") or {}
        if args.ids and rec["root_id"] not in args.ids:
            continue
        if not args.ids and (op.get("verdict") != "disagree" or len(op.get("candidates", [])) != 1):
            continue
        candidates = op.get("candidates") or []
        adjudicated = ADJUDICATED.get(rec["root_id"])
        hint = adjudicated[0] if adjudicated else (candidates[0] if candidates else None)
        if not hint:
            print(f"  skip {rec['root_id']} {rec['letters']}: no candidate root")
            continue
        targets.append(
            {
                "root_id": rec["root_id"],
                "letters": rec["letters"],
                "meaning": rec["meaning"],
                "root_hint": hint,
                "_was": rec["triliteral_root"],
                **({"_adjudication": adjudicated[1]} if adjudicated else {}),
            }
        )
        flag = "  [adjudicated]" if adjudicated else ""
        print(f"  {rec['root_id']:6} {rec['letters']:14} {rec['triliteral_root']} -> {hint}{flag}")

    Path(args.out).write_text(
        json.dumps(targets, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"\n{len(targets)} target(s) -> {args.out}")


if __name__ == "__main__":
    main()
