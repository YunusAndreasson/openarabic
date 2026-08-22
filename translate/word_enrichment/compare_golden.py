"""Diff two golden batches, so "better" means better than a specific run.

An evaluation that reports only the new batch's numbers cannot distinguish a real
improvement from a different sample or a lucky decode. Both batches here are the
SAME forty roots in the same order, so every difference is attributable to the
change under test.

Reports three things, in descending order of how much they matter:

  verdicts      did the judge's grade move, per root and in aggregate
  content       which words were swapped in or out, and which glosses were rewritten
  coverage      the fields the change was supposed to add (plural, verb form)

A gloss that merely CHANGED is not evidence of anything; the direction has to come
from the judge or from a human reading the pair. So changed glosses are printed as
pairs rather than counted as wins.

Run from translate/:
    uv run python -m word_enrichment.compare_golden --a golden_v1 --b golden_v2
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

BASE = Path(__file__).resolve().parent


def load(stem: str) -> tuple[dict, dict]:
    records = {}
    path = BASE / f"{stem}.jsonl"
    for line in path.open(encoding="utf-8"):
        if line.strip():
            r = json.loads(line)
            records[r["root_key"]] = r
    verdicts = {}
    vpath = BASE / f"{stem}_verdicts.json"
    if vpath.exists():
        verdicts = {v["root_key"]: v for v in json.loads(vpath.read_text(encoding="utf-8"))}
    return records, verdicts


def unfaithful(verdicts: dict) -> set[tuple[str, str]]:
    return {(root, m.get("letters", ""))
            for root, v in verdicts.items()
            for m in v.get("members", []) if not m.get("faithful", True)}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--a", default="golden_v1", help="baseline stem")
    ap.add_argument("--b", default="golden_v2", help="candidate stem")
    args = ap.parse_args()

    a_rec, a_ver = load(args.a)
    b_rec, b_ver = load(args.b)
    roots = [r for r in a_rec if r in b_rec]
    print(f"comparing {len(roots)} roots present in both\n")

    # --- verdicts ------------------------------------------------------------
    if a_ver and b_ver:
        rank = {"publish": 2, "revise": 1, "skip": 0}
        moved_up, moved_down = [], []
        for root in roots:
            va = a_ver.get(root, {}).get("verdict")
            vb = b_ver.get(root, {}).get("verdict")
            if va not in rank or vb not in rank or va == vb:
                continue
            (moved_up if rank[vb] > rank[va] else moved_down).append((root, va, vb))
        print("JUDGE VERDICTS")
        print(f"  {args.a}: {dict(Counter(a_ver[r].get('verdict') for r in roots if r in a_ver))}")
        print(f"  {args.b}: {dict(Counter(b_ver[r].get('verdict') for r in roots if r in b_ver))}")
        print(f"  improved: {len(moved_up)}   regressed: {len(moved_down)}")
        for root, va, vb in moved_up:
            print(f"     + {root:8s} {va} -> {vb}")
        for root, va, vb in moved_down:
            print(f"     - {root:8s} {va} -> {vb}")

        ua, ub = unfaithful(a_ver), unfaithful(b_ver)
        print(f"\n  unfaithful glosses: {len(ua)} -> {len(ub)}")
        for root, letters in sorted(ua - ub):
            print(f"     + fixed   {root:8s} {letters}")
        for root, letters in sorted(ub - ua):
            print(f"     - new     {root:8s} {letters}")

    # --- coverage ------------------------------------------------------------
    def cover(recs: dict, field: str) -> int:
        return sum(1 for r in roots for m in recs[r].get("word_family", []) if m.get(field))

    total_b = sum(len(b_rec[r].get("word_family", [])) for r in roots)
    print("\nFIELD COVERAGE (family rows)")
    for field in ("wazn", "verb_form", "plural", "root_id"):
        print(f"  {field:10s} {cover(a_rec, field):4d} -> {cover(b_rec, field):4d}  of {total_b}")

    # --- content -------------------------------------------------------------
    swapped = changed = 0
    pairs = []
    for root in roots:
        fa = {m["letters"]: m["meaning"] for m in a_rec[root].get("word_family", [])}
        fb = {m["letters"]: m["meaning"] for m in b_rec[root].get("word_family", [])}
        swapped += len(set(fa) ^ set(fb))
        for letters in set(fa) & set(fb):
            if fa[letters] != fb[letters]:
                changed += 1
                pairs.append((root, letters, fa[letters], fb[letters]))

    print(f"\nCONTENT")
    print(f"  words swapped in/out : {swapped}")
    print(f"  glosses rewritten    : {changed}")
    print(f"  root_meaning changed : "
          f"{sum(1 for r in roots if a_rec[r].get('root_meaning') != b_rec[r].get('root_meaning'))}")
    print(f"  usage_note changed   : "
          f"{sum(1 for r in roots if a_rec[r].get('usage_note') != b_rec[r].get('usage_note'))}")
    print("\n  rewritten glosses (judge the pair, do not count the change):")
    for root, letters, before, after in pairs[:20]:
        print(f"     {root:7s} {letters}")
        print(f"        {args.a}: {before}")
        print(f"        {args.b}: {after}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
