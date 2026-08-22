"""Pick N dictionary entries that have not been enriched yet.

Read-only against Supabase (SELECT on `roots`). Skips every root_id already in
enriched.jsonl or skipped.jsonl so a benchmark or a new batch never redoes work.

Run from translate/:  uv run python -m word_enrichment.pick_targets --count 20
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from word_enrichment.build_ts import ANON, SUPABASE
import urllib.request

BASE = Path(__file__).resolve().parent


def _processed() -> set[int]:
    done: set[int] = set()
    for name in ("enriched.jsonl", "skipped.jsonl"):
        path = BASE / name
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                try:
                    done.add(json.loads(line)["root_id"])
                except (json.JSONDecodeError, KeyError):
                    pass
    return done


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--count", type=int, default=20)
    ap.add_argument("--offset", type=int, default=0, help="skip this many eligible rows first")
    ap.add_argument("--out", default=str(BASE / "targets_bench.json"))
    args = ap.parse_args()

    done = _processed()
    picked: list[dict] = []
    offset, page, skipped = 0, 1000, 0
    while len(picked) < args.count:
        url = (
            f"{SUPABASE}/rest/v1/roots?select=id,letters,meaning"
            f"&order=id&limit={page}&offset={offset}"
        )
        req = urllib.request.Request(
            url, headers={"apikey": ANON, "Authorization": f"Bearer {ANON}"}
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            rows = json.loads(resp.read())
        if not rows:
            break
        for r in rows:
            if r["id"] in done or not (r.get("meaning") or "").strip():
                continue
            if skipped < args.offset:
                skipped += 1
                continue
            picked.append(
                {"root_id": r["id"], "letters": r["letters"], "meaning": r["meaning"]}
            )
            if len(picked) >= args.count:
                break
        if len(rows) < page:
            break
        offset += page

    Path(args.out).write_text(
        json.dumps(picked, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"{len(picked)} unprocessed target(s) -> {args.out}")
    for t in picked[:5]:
        print(f"  {t['root_id']:6} {t['letters']:14} {t['meaning']}")


if __name__ == "__main__":
    main()
