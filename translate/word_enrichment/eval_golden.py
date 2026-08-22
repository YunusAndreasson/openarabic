"""Assemble everything needed to JUDGE the golden batch into one file.

Three things have to sit side by side before anyone can say whether this pipeline
is good enough: the finished panel, the SOURCE ROWS it was written from, and the
mechanical facts about it. Reading the panel alone tells you whether it sounds
plausible, which is exactly the property a fluent model can supply without being
right.

The mechanical flags here are the ones no model needs to be asked about, and each
is a defect a reader would meet in the app rather than a style opinion:

  duplicate_link    two family rows carrying the SAME root_id. Both open the same
                    screen, so tapping "teach" and tapping "knowledge" land in the
                    same place. Caused by the skeleton-keyed dictionary index,
                    which is right for deciding IF a row links and too coarse for
                    deciding WHERE.
  unlinked          root_id is null: the row renders as plain text. Expected for
                    most rows -- the pool holds ~16 forms per root and our
                    dictionary about 7 -- and a panel where EVERY row is unlinked
                    is a dead panel.
  verbatim_lane     the shipped gloss is Lane's 1863 wording unchanged. The task
                    was to rewrite; an exact copy means it did not happen, and
                    Lane's register is the single largest quality risk here.
  no_wazn           no morphological pattern, so the teaching content is missing.
  repeated_gloss    two members glossed identically -- a family that looks like
                    five words and teaches two.

Run from translate/:  uv run python -m word_enrichment.eval_golden
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from collections import Counter
from pathlib import Path

from word_enrichment import lexicon, pool

BASE = Path(__file__).resolve().parent


def _norm(text: str) -> str:
    return " ".join((text or "").lower().replace(",", " ").split())


def flags_for(record: dict, candidates: list) -> dict:
    by_key = {c.key: c for c in candidates}
    members = record.get("word_family") or []

    link_counts = Counter(m.get("root_id") for m in members if m.get("root_id") is not None)
    gloss_counts = Counter(_norm(m.get("meaning", "")) for m in members)

    per_member = []
    for m in members:
        source = by_key.get(pool.match_key(m.get("letters", "")))
        lane = (source.lane_gloss if source else "") or ""
        camel = (source.camel_gloss if source else "") or ""
        shipped = m.get("meaning", "")
        per_member.append({
            **m,
            "lane_gloss": lane,
            "camel_gloss": camel,
            "in_pool": source is not None,
            "verbatim_lane": bool(lane) and _norm(shipped) == _norm(lane),
            "duplicate_link": (m.get("root_id") is not None
                               and link_counts[m["root_id"]] > 1),
            "unlinked": m.get("root_id") is None,
            "no_wazn": not m.get("wazn"),
            "repeated_gloss": gloss_counts[_norm(shipped)] > 1,
        })

    return {
        "members": per_member,
        "linked": sum(1 for m in per_member if not m["unlinked"]),
        "dead_panel": all(m["unlinked"] for m in per_member) if per_member else True,
        "any_duplicate_link": any(m["duplicate_link"] for m in per_member),
        "any_verbatim_lane": any(m["verbatim_lane"] for m in per_member),
        "note_chars": len(record.get("usage_note", "")),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--records", default=str(BASE / "golden.jsonl"))
    ap.add_argument("--verdicts", default=str(BASE / "golden_verdicts.json"))
    ap.add_argument("--out", default=str(BASE / "golden_eval.json"))
    args = ap.parse_args()

    records = [json.loads(line) for line in Path(args.records).open(encoding="utf-8") if line.strip()]
    verdicts = {}
    vpath = Path(args.verdicts)
    if vpath.exists():
        verdicts = {v["root_key"]: v for v in json.loads(vpath.read_text(encoding="utf-8"))}

    ledger = [json.loads(line) for line in (BASE / "ledger.jsonl").open(encoding="utf-8")]
    print(f"building the dictionary index over {len(ledger)} entries…", flush=True)
    dict_index = pool.dictionary_index(ledger)
    freq = Counter(r["root_hint"] for r in ledger if r.get("root_hint"))
    conn = sqlite3.connect(f"file:{lexicon.DB_PATH}?mode=ro", uri=True)

    out = []
    for record in records:
        root = record["root_key"]
        candidates = pool.build(conn, root, dict_index, limit=20)
        out.append({
            **record,
            "headword_count": freq[root],
            "verdict": verdicts.get(root, {}),
            "pool": [{"letters": c.letters, "transliteration": c.transliteration,
                      "lane_gloss": c.lane_gloss, "camel_gloss": c.camel_gloss,
                      "wazn": c.wazn, "linked": c.root_id is not None}
                     for c in candidates],
            **flags_for(record, candidates),
        })

    Path(args.out).write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")

    print(f"\n{len(out)} records -> {args.out}\n")
    print(f"  panels with a duplicate link : {sum(1 for r in out if r['any_duplicate_link'])}")
    print(f"  panels with NO linkable row  : {sum(1 for r in out if r['dead_panel'])}")
    print(f"  panels with a verbatim Lane gloss: {sum(1 for r in out if r['any_verbatim_lane'])}")
    print(f"  mean linked rows per panel   : "
          f"{sum(r['linked'] for r in out) / max(len(out), 1):.1f} of 5")
    print(f"  mean usage_note length       : "
          f"{sum(r['note_chars'] for r in out) / max(len(out), 1):.0f} chars")
    if verdicts:
        print(f"  judge: {dict(Counter(r['verdict'].get('verdict') for r in out))}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
