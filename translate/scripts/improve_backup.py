"""Take a full snapshot of sentence_words (id, english, grammar_note).

The per-change backup in improve_apply.py already captures every row it touches,
so this full snapshot is optional belt-and-suspenders insurance you can run once
before the first pass. It paginates through all ~40k rows.

Usage:
    uv run python scripts/improve_backup.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import utils.set_keys  # noqa: F401

from improve_common import BACKUP_DIR, append_jsonl, ensure_dirs, now_iso
from utils.storage import get_supabase_client

PAGE = 1000


def main() -> int:
    ensure_dirs()
    out = os.path.join(BACKUP_DIR, f"full_snapshot_{now_iso().replace(':', '')}.jsonl")
    client = get_supabase_client()

    offset = 0
    total = 0
    while True:
        rows = (
            client.table("sentence_words")
            .select("id, english, grammar_note")
            .order("id", desc=False)
            .range(offset, offset + PAGE - 1)
            .execute()
        ).data or []
        if not rows:
            break
        for r in rows:
            append_jsonl(out, r)
        total += len(rows)
        print(f"  ...{total} rows", flush=True)
        if len(rows) < PAGE:
            break
        offset += PAGE

    print(f"\nFull snapshot written: {out} ({total} rows)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
