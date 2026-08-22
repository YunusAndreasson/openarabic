"""Fan one root record out onto every dictionary headword built on that root.

This is the step that makes the panel appear where a learner expects it. The app
reads `root_enrichment` by `root_id`, and `root_id` is the id of a single
DICTIONARY ENTRY — one word — not of a set of radicals. A root record keyed by
its radicals therefore reaches nothing on its own. Generating 100 roots and
seeing 100 words light up out of 3,258 would be the visible symptom.

So one generated record becomes up to 94 rows, one per headword filed under those
radicals. That is deliberate redundancy in a fully generated table: the expensive
part was the generation (100 calls, not 3,258), and re-running the fan-out is a
re-seed rather than a consistency risk.

Two fields are genuinely per-headword and are computed here rather than copied:

  headword_transliteration   this word's romanisation, not the root's
  senses                     left empty for now. The column exists for the
                             headword's OWN meanings, which come from its own
                             Lane's entry; filling it is free but is a separate
                             piece of work, and shipping [] renders as "no senses
                             section" rather than as wrong senses.

`part_of_speech` is NOT NULL in the schema with no default and is deliberately
not rendered by the app (`services/rootEnrichment.ts` explains why: the word
screen derives a better one from real corpus usage). It is written as an empty
string to satisfy the constraint without inventing a claim.

Run from translate/:
    uv run python -m word_enrichment.fan_out --records golden_v3 batch100
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

from word_enrichment import arabic_translit

BASE = Path(__file__).resolve().parent


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--records", nargs="+", required=True,
                    help="stems under word_enrichment/, e.g. golden_v3 batch100")
    ap.add_argument("--out", default=str(BASE / "seed_root_fanout.json"))
    args = ap.parse_args()

    by_root: dict[str, dict] = {}
    for stem in args.records:
        path = BASE / f"{stem}.jsonl"
        for line in path.open(encoding="utf-8"):
            if line.strip():
                rec = json.loads(line)
                # Later files win, so a regenerated batch supersedes an older one.
                by_root[rec["root_key"]] = rec
    print(f"{len(by_root)} distinct root records from {len(args.records)} file(s)")

    ledger = [json.loads(line) for line
              in (BASE / "ledger.jsonl").open(encoding="utf-8")]

    rows, missing = [], Counter()
    for entry in ledger:
        root = entry.get("root_hint")
        record = by_root.get(root) if root else None
        if record is None:
            missing[root] += 1
            continue
        rows.append({
            "root_id": entry["root_id"],
            "triliteral_root": record["triliteral_root"],
            "root_transliteration": record["root_transliteration"],
            "root_meaning": record["root_meaning"],
            # Per headword, not per root.
            "headword_transliteration": arabic_translit.transliterate(entry["letters"]),
            "part_of_speech": "",
            "senses": [],
            "word_family": record["word_family"],
            "usage_note": record.get("usage_note"),
            "faq": [],
            "source": record["source"],
            "source_url": record["source_url"],
        })

    Path(args.out).write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")

    covered_roots = len({e["root_hint"] for e in ledger
                         if e.get("root_hint") in by_root})
    print(f"\n{len(rows)} headword rows -> {args.out}")
    print(f"  from {covered_roots} roots, mean fan-out "
          f"{len(rows) / max(covered_roots, 1):.1f} headwords per root")
    print(f"  corpus coverage: {len(rows)}/{len(ledger)} "
          f"({len(rows) / len(ledger) * 100:.1f}% of dictionary entries)")

    widest = Counter(e["root_hint"] for e in ledger if e.get("root_hint") in by_root)
    print("\n  widest fan-outs:")
    for root, n in widest.most_common(5):
        print(f"    {root:8s} -> {n} headwords")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
