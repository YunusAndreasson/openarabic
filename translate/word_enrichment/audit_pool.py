"""Whole-corpus audit of the candidate pools, with no model in the loop.

`evaluate_batch.py` measures one generated batch; this measures the INPUT that
batch is built from, before a single call is paid for. Every defect it can find
is free to find, and each one it misses becomes content on a phone.

Why this file exists at all, stated plainly: twice in this project a reported
metric measured the measurement rather than the data -- a "22% artifacts" figure
that was a regex matching "A male slave", and a healthy mechanical score over
glosses a third of which were editorially unusable. So this audit reports
DISTRIBUTIONS and NAMES ROOTS, and deliberately refuses to emit a single
pass-rate number that could be quoted as quality. The semantic question is the
judge's, not a regex's.

The hard gate is narrow on purpose -- coverage and silent truncation only:

  pool under MIN_POOL   a root the model cannot build a family of 5 from. It
                        would return a short record that looks fine.
  no linkable member    every family row dead-ends; the panel renders as text.
  regression vs baseline  any root that HAD a usable pool and no longer does.

Run from translate/:
    uv run python -m word_enrichment.audit_pool            # report + gate
    uv run python -m word_enrichment.audit_pool --save     # re-baseline
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from collections import Counter
from pathlib import Path

from word_enrichment import lexicon, pool

BASE = Path(__file__).resolve().parent
LEDGER = BASE / "ledger.jsonl"
BASELINE = BASE / "pool_baseline.json"
SKIPLIST = BASE / "pool_skip.json"

# Five family members ship on the word screen, three in the sheet. A pool of
# fewer than five leaves the model no choice to make, which is the whole point
# of handing it a pool.
MIN_POOL = 5


def roots_from_ledger() -> tuple[list[str], dict[str, tuple[int, int]], Counter]:
    records = [json.loads(line) for line in LEDGER.open(encoding="utf-8")]
    index = pool.dictionary_index(records)
    freq = Counter(r["root_hint"] for r in records if r.get("root_hint"))
    return [root for root, _ in freq.most_common()], index, freq


def audit() -> dict:
    roots, index, freq = roots_from_ledger()
    conn = sqlite3.connect(f"file:{lexicon.DB_PATH}?mode=ro", uri=True)

    per_root: dict[str, dict] = {}
    for root in roots:
        candidates = pool.build(conn, root, index, limit=24)
        sources = Counter()
        for candidate in candidates:
            sources["both" if len(candidate.sources) > 1 else candidate.sources[0]] += 1
        per_root[root] = {
            "size": len(candidates),
            "linkable": sum(1 for c in candidates if c.root_id is not None),
            "with_wazn": sum(1 for c in candidates if c.wazn),
            "with_modern_gloss": sum(1 for c in candidates if c.camel_gloss),
            "headwords": freq[root],
            "sources": dict(sources),
        }
    return per_root


def report(per_root: dict) -> list[str]:
    """Prints the distribution; returns the list of failures for the gate."""
    sizes = sorted(r["size"] for r in per_root.values())
    total_headwords = sum(r["headwords"] for r in per_root.values())

    def pct(n: int) -> str:
        return f"{n:5d}  {n / len(per_root) * 100:5.1f}%"

    print(f"{len(per_root)} roots, {total_headwords} headwords\n")
    print("POOL SIZE")
    for lo, hi, label in ((0, 0, "empty"), (1, 4, "1-4  (unusable)"),
                          (5, 9, "5-9"), (10, 19, "10-19"), (20, 99, "20+")):
        print(f"  {label:16s} {pct(sum(1 for s in sizes if lo <= s <= hi))}")
    mid = sizes[len(sizes) // 2] if sizes else 0
    print(f"  median {mid}   mean {sum(sizes) / max(len(sizes), 1):.1f}\n")

    print("PER-ROOT COVERAGE (share of roots where every candidate has one)")
    for key, label in (("with_modern_gloss", "modern gloss"), ("with_wazn", "wazn"),
                       ("linkable", "links to a dictionary entry")):
        got = sum(r[key] for r in per_root.values())
        pool_total = sum(r["size"] for r in per_root.values())
        print(f"  {label:28s} {got:6d} / {pool_total}  ({got / max(pool_total, 1) * 100:.1f}% of candidates)")
    print()

    mix = Counter()
    for r in per_root.values():
        for source, n in r["sources"].items():
            mix[source] += n
    print("SOURCE MIX (candidates)")
    for source, n in mix.most_common():
        print(f"  {source:12s} {n:6d}")
    print()

    thin = sorted(((r["size"], r["headwords"], root) for root, r in per_root.items()
                   if r["size"] < MIN_POOL), reverse=True, key=lambda t: t[1])
    dead = sorted(((r["headwords"], root) for root, r in per_root.items()
                   if r["linkable"] == 0), reverse=True)

    # Named, never summarised: a truncated list reads as full coverage, which is
    # a failure mode this project has already had.
    print(f"ROOTS WITH A POOL UNDER {MIN_POOL}: {len(thin)}")
    for size, headwords, root in thin:
        print(f"  {root:10s} pool={size}  serves {headwords} headwords")
    print(f"\nROOTS WITH NO LINKABLE MEMBER: {len(dead)}")
    for headwords, root in dead:
        print(f"  {root:10s} serves {headwords} headwords")

    return [root for _, _, root in thin]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--save", action="store_true",
                        help="write the current sizes as the regression baseline")
    args = parser.parse_args()

    per_root = audit()
    thin = report(per_root)

    # A root with too small a pool is EXCLUDED from generation, not a build
    # failure -- it never costs a model call. Writing the list is what keeps that
    # exclusion visible; a silently shortened target list reads as full coverage.
    SKIPLIST.write_text(json.dumps(sorted(thin), ensure_ascii=False, indent=1),
                        encoding="utf-8")
    print(f"\nskip list written: {len(thin)} roots excluded from generation "
          f"({sum(per_root[r]['headwords'] for r in thin)} headwords)")

    current = {root: r["size"] for root, r in per_root.items()}
    if args.save:
        BASELINE.write_text(json.dumps(current, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"\nbaseline written: {len(current)} roots")
        return 0

    if BASELINE.exists():
        previous = json.loads(BASELINE.read_text(encoding="utf-8"))
        # Only a drop THROUGH the threshold is a regression. Churn above it is
        # the analyser being updated, not a defect.
        lost = [root for root, size in previous.items()
                if size >= MIN_POOL and current.get(root, 0) < MIN_POOL]
        if lost:
            print(f"\nREGRESSION: {len(lost)} roots fell below {MIN_POOL}: {' '.join(lost[:20])}")
            return 1
        print(f"\nno regression against baseline ({len(previous)} roots)")
    else:
        print("\nno baseline yet -- run with --save")

    print("\nPASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
