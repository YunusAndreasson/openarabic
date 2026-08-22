"""The standing account of every dictionary entry: done, dropped, or still to do.

Before this file the pipeline knew only what it had *finished* — `pick_targets._processed`
reads enriched.jsonl and skipped.jsonl, so "already generated" was the one fact it
could state. Everything else was re-derived on every run and thrown away: the ~17%
of entries that are dropped before generation (a foreign name, a preposition with no
derivational root, a word Lane's has never heard of) left no trace at all, so
"how many words are left" had no answer short of re-walking the corpus.

The ledger materialises that walk once. Classification is the expensive half and is
cached; status is the cheap half and is recomputed every run from the pipeline
outputs, so the ledger cannot drift from what actually shipped. Publication status
comes from `build_ts.publishable()` — the same routing that writes the seed — rather
than a second reading of the verdicts, which would be free to disagree with it.

  uv run python -m word_enrichment.ledger                # refresh + report
  uv run python -m word_enrichment.ledger --reclassify   # redo the offline pass
  uv run python -m word_enrichment.ledger --pick 200     # emit the next targets

Run from translate/.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import time
import urllib.request
from collections import Counter
from pathlib import Path

from word_enrichment import arramooz, camel_roots, lexicon
from word_enrichment.build_ts import ANON, SUPABASE, publishable
from word_enrichment.pick_rooted_targets import assign_root

BASE = Path(__file__).resolve().parent
LEDGER = BASE / "ledger.jsonl"
ROOT_OUT = BASE / "root_explanations.jsonl"
PAGE = 1000


def fetch_roots() -> list[dict]:
    """Every dictionary entry, id-ordered. Read-only, anon key."""
    rows: list[dict] = []
    offset = 0
    while True:
        url = (
            f"{SUPABASE}/rest/v1/roots?select=id,letters,meaning"
            f"&order=id&limit={PAGE}&offset={offset}"
        )
        req = urllib.request.Request(
            url, headers={"apikey": ANON, "Authorization": f"Bearer {ANON}"}
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            page = json.loads(resp.read())
        rows.extend(page)
        if len(page) < PAGE:
            return rows
        offset += PAGE


def load_cache() -> dict[int, dict]:
    if not LEDGER.exists():
        return {}
    out: dict[int, dict] = {}
    for line in LEDGER.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rec = json.loads(line)
            out[rec["root_id"]] = rec
    return out


def _ids(name: str) -> set[int]:
    path = BASE / name
    if not path.exists():
        return set()
    ids: set[int] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            try:
                ids.add(json.loads(line)["root_id"])
            except (json.JSONDecodeError, KeyError):
                pass
    return ids


def statuses() -> dict[int, str]:
    """Every root_id the pipeline has an opinion about, and what that opinion is.

    Precedence matters: a record can sit in more than one file (a word withheld by
    the judge is still in enriched.jsonl), and the ledger states one outcome per
    entry — the one a learner would experience.
    """
    published, withheld = publishable()
    out: dict[int, str] = {}
    for rid in _ids("skipped.jsonl"):
        out[rid] = "no-grounding"
    for rid in _ids("flagged.jsonl"):
        out[rid] = "flagged"
    for rec in withheld:
        out[rec["root_id"]] = f"withheld:{rec.get('_withheld', 'unknown')}"
    for rec in published:
        out[rec["root_id"]] = "published"
    return out


def refresh(reclassify: bool = False) -> list[dict]:
    cache = {} if reclassify else load_cache()
    rows = fetch_roots()
    status = statuses()

    ar_conn = arramooz._connect()
    lane_conn = sqlite3.connect(f"file:{lexicon.DB_PATH}?mode=ro", uri=True)
    ledger: list[dict] = []
    classified = 0
    # Written line-by-line to a temp file and renamed at the end. The first
    # version of this held everything in memory and wrote once; a cold pass over
    # 15k entries takes minutes, and a run that is killed part-way then leaves
    # nothing at all — including no way to tell how far it got.
    tmp = LEDGER.with_suffix(".jsonl.partial")
    started = time.time()
    try:
        with tmp.open("w", encoding="utf-8") as fh:
          for i, r in enumerate(rows, 1):
            rid = r["id"]
            cached = cache.get(rid)
            if cached and "basis" in cached and cached.get("letters") == r["letters"]:
                root_hint, basis = cached.get("root_hint"), cached["basis"]
            else:
                root_hint, basis = assign_root(r["letters"], ar_conn, lane_conn)
                classified += 1
            if not (r.get("meaning") or "").strip():
                state = "no-gloss"
            elif rid in status:
                state = status[rid]
            elif root_hint:
                state = "eligible"
            else:
                state = f"dropped:{basis}"
            rec = {
                "root_id": rid,
                "letters": r["letters"],
                "meaning": r.get("meaning") or "",
                "root_hint": root_hint,
                "basis": basis,
                "status": state,
            }
            ledger.append(rec)
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
            if i % 1000 == 0:
                rate = i / max(time.time() - started, 1e-6)
                eta = (len(rows) - i) / rate / 60
                print(f"  [{i}/{len(rows)}] {rate:.0f}/s  eta {eta:.1f} min", flush=True)
    finally:
        ar_conn.close()
        lane_conn.close()

    tmp.replace(LEDGER)
    print(f"ledger: {len(ledger)} entries ({classified} newly classified) -> {LEDGER}")
    return ledger


def report(ledger: list[dict]) -> None:
    total = len(ledger)
    counts = Counter(rec["status"] for rec in ledger)

    def line(label: str, n: int) -> None:
        print(f"  {label:26} {n:6}  {100 * n / total:5.1f}%")

    print(f"\nWHERE THE {total} DICTIONARY ENTRIES STAND\n{'-' * 40}")
    # "publishable", not "live": this is what the seed WOULD write. The table only
    # matches after someone runs the seeder, and the gap between the two is exactly
    # where a batch sits between being judged and being shipped.
    line("publishable (seed-ready)", counts.get("published", 0))
    for k in sorted(k for k in counts if k.startswith("withheld:")):
        line("  " + k.replace("withheld:", "withheld, "), counts[k])
    line("flagged (gate failure)", counts.get("flagged", 0))
    line("no Lane's grounding", counts.get("no-grounding", 0))
    for k in sorted(k for k in counts if k.startswith("dropped:")):
        line("  " + k.replace("dropped:", "dropped, "), counts[k])
    line("no-gloss (not eligible)", counts.get("no-gloss", 0))
    line("ELIGIBLE, not yet done", counts.get("eligible", 0))

    eligible = [rec for rec in ledger if rec["status"] == "eligible"]
    if eligible:
        by_basis = Counter(rec["basis"] for rec in eligible)
        print(f"\n  of the {len(eligible)} remaining, root basis: {dict(by_basis)}")
        done = counts.get("published", 0)
        reachable = done + len(eligible)
        print(f"  ceiling: {reachable} entries can ever carry an explanation "
              f"({100 * reachable / total:.0f}% of the dictionary)")
        print(f"  progress: {done}/{reachable} = {100 * done / reachable:.1f}%")


def pick(ledger: list[dict], count: int, out: Path) -> None:
    """The next `count` eligible entries, in id order, as a targets file."""
    targets = [
        {
            "root_id": rec["root_id"],
            "letters": rec["letters"],
            "meaning": rec["meaning"],
            "root_hint": rec["root_hint"],
            "_basis": rec["basis"],
        }
        for rec in ledger
        if rec["status"] == "eligible"
    ][:count]
    out.write_text(json.dumps(targets, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\n{len(targets)} target(s) -> {out}")
    print(f"  basis: {dict(Counter(t['_basis'] for t in targets))}")
    if targets:
        print(f"  id range: {targets[0]['root_id']}–{targets[-1]['root_id']}")


def pick_roots(ledger: list[dict], count: int, out: Path) -> None:
    """The next `count` roots with no explanation yet, busiest first.

    Busiest first because coverage is what this buys: one record for علم reaches
    94 headwords, one for a singleton root reaches one. Ordering by how many
    headwords a root serves front-loads the reach — 409 roots already cover 48%
    of the dictionary precisely because the id-order walk happened to land on
    common ones.

    "Already done" is read from root_explanations.jsonl only. The word-mode
    records do contain root-level fields, but their usage notes were written
    about one headword and would be false under the other 93.
    """
    have = _ids_str(ROOT_OUT, "root_key")
    groups: dict[str, list[dict]] = {}
    for rec in ledger:
        if rec["root_hint"]:
            groups.setdefault(camel_roots.weak_fold(rec["root_hint"].replace(" ", "")), []).append(rec)

    ranked = sorted(
        ((k, v) for k, v in groups.items() if k not in have),
        key=lambda kv: -len(kv[1]),
    )[:count]

    targets = [
        {
            "root_key": k,
            # The unfolded spelling from a member entry: `root_key` is normalised
            # for joining and is not the notation Lane's resolves.
            "root": rows[0]["root_hint"],
            "headword_count": len(rows),
            "headwords": [{"letters": r["letters"], "meaning": r["meaning"]} for r in rows[:12]],
        }
        for k, rows in ranked
    ]
    out.write_text(json.dumps(targets, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    reach = sum(t["headword_count"] for t in targets)
    print(f"\n{len(targets)} root target(s) -> {out}")
    print(f"  they serve {reach:,} headwords ({100 * reach / len(ledger):.1f}% of the dictionary)")
    if targets:
        busiest = ", ".join(f"{t['root']}({t['headword_count']})" for t in targets[:6])
        print(f"  busiest: {busiest}")


def _ids_str(path: Path, key: str) -> set[str]:
    if not path.exists():
        return set()
    out: set[str] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            try:
                out.add(json.loads(line)[key])
            except (json.JSONDecodeError, KeyError):
                pass
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--reclassify", action="store_true", help="ignore the cached classification")
    ap.add_argument("--pick", type=int, help="also emit this many WORD targets")
    ap.add_argument("--pick-roots", type=int,
                    help="emit this many ROOT targets, busiest first")
    ap.add_argument("--out", default=str(BASE / "targets_rooted.json"))
    args = ap.parse_args()

    ledger = refresh(reclassify=args.reclassify)
    report(ledger)
    if args.pick:
        pick(ledger, args.pick, Path(args.out))
    if args.pick_roots:
        pick_roots(ledger, args.pick_roots, BASE / "targets_roots.json")


if __name__ == "__main__":
    main()
