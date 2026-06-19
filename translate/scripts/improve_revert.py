"""Revert improved words back to their backed-up original values.

Restores from grammar_improve/backup/originals.jsonl, which records each word's
full original (english + grammar_note) the first time it was changed. The first
recorded entry per word_id is the true original.

Usage:
    uv run python scripts/improve_revert.py --all                 # revert everything we touched
    uv run python scripts/improve_revert.py --word-ids 12 34 56   # revert specific words
    uv run python scripts/improve_revert.py --all --field grammar_note
    uv run python scripts/improve_revert.py --all --dry-run
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import utils.set_keys  # noqa: F401

from improve_common import ORIGINALS
from utils.storage import get_supabase_client


def load_originals() -> dict[int, dict]:
    """word_id -> earliest backed-up original row."""
    originals: dict[int, dict] = {}
    if not os.path.exists(ORIGINALS):
        return originals
    with open(ORIGINALS, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            wid = int(row["word_id"])
            if wid not in originals:  # keep the FIRST = true original
                originals[wid] = row
    return originals


def main() -> int:
    parser = argparse.ArgumentParser(description="Revert words to original values")
    parser.add_argument("--all", action="store_true", help="Revert every backed-up word")
    parser.add_argument("--word-ids", type=int, nargs="+", help="Revert only these word IDs")
    parser.add_argument(
        "--field", choices=["grammar_note", "english"],
        help="Only revert this field (default: both)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Show what would revert")
    args = parser.parse_args()

    if not args.all and not args.word_ids:
        print("Specify --all or --word-ids.")
        return 1

    originals = load_originals()
    if not originals:
        print(f"No backup found at {ORIGINALS} — nothing to revert.")
        return 0

    targets = originals if args.all else {w: originals[w] for w in args.word_ids if w in originals}
    fields = [args.field] if args.field else ["english", "grammar_note"]

    client = None if args.dry_run else get_supabase_client()
    reverted = 0
    for wid, row in targets.items():
        update = {f: row.get(f) for f in fields}
        print(f"  word {wid}: restore {update}")
        if not args.dry_run:
            client.table("sentence_words").update(update).eq("id", wid).execute()
        reverted += 1

    verb = "Would revert" if args.dry_run else "Reverted"
    print(f"\n{verb} {reverted} word(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
