"""Freeze the 40 roots the pipeline is judged on.

A golden set is only useful if it is FIXED. Re-picking it each run turns every
comparison into a comparison of samples, and "better than last time" stops
meaning anything. So this writes a file, once, and the file is the reference.

Composition, and why it is not simply the top 40:

  16 highest-impact    the roots serving the most dictionary headwords. These
                       reach the most learners, so a defect here costs the most.
                       They are also the EASIEST -- deep Lane's entries, rich
                       CAMeL coverage -- so a set made only of these would report
                       a quality the other 1,700 roots will not reproduce.

  24 stratified        an even walk down the frequency-ranked remainder, so thin
                       roots, weak radicals and geminates are represented in the
                       proportion the real corpus has them.

Skip-listed roots are excluded: they cannot produce a family of five and are
never generated, so grading them would measure a path that does not run.

Run from translate/:  uv run python -m word_enrichment.pick_golden
"""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

BASE = Path(__file__).resolve().parent
OUT = BASE / "golden_roots.json"

N_TOTAL = 40
N_TOP = 16


def main() -> int:
    records = [json.loads(line) for line in (BASE / "ledger.jsonl").open(encoding="utf-8")]
    freq = Counter(r["root_hint"] for r in records if r.get("root_hint"))

    skip_path = BASE / "pool_skip.json"
    skip = set(json.loads(skip_path.read_text(encoding="utf-8"))) if skip_path.exists() else set()
    ranked = [(root, n) for root, n in freq.most_common() if root not in skip]

    top = ranked[:N_TOP]
    rest = ranked[N_TOP:]
    stride = max(len(rest) // (N_TOTAL - N_TOP), 1)
    tail = rest[::stride][: N_TOTAL - N_TOP]

    picked = [{"root_key": root, "root": root, "headword_count": n}
              for root, n in [*top, *tail]]
    OUT.write_text(json.dumps(picked, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    covered = sum(p["headword_count"] for p in picked)
    print(f"{len(picked)} golden roots -> {OUT.name}")
    print(f"  headwords covered: {covered} of {sum(freq.values())} "
          f"({covered / sum(freq.values()) * 100:.1f}%)")
    print(f"  headword counts: {picked[0]['headword_count']} … {picked[-1]['headword_count']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
