"""Gate an authored outbox.json before it is applied.

Checks (all must pass, else exit 1):
  - cursor_to matches the inbox
  - every inbox word with a NON-EMPTY word_form has exactly one change
    (empty word_forms are punctuation placeholders and are skipped)
  - no extra word_ids, no duplicates
  - every change targets field 'grammar_note'
  - no note contains Arabic letters (same guard improve_apply.py enforces)
  - no empty notes

Usage: uv run python scripts/validate_outbox.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from improve_common import INBOX, OUTBOX, contains_arabic, read_json


def main() -> int:
    inbox = read_json(INBOX)
    outbox = read_json(OUTBOX)
    errs: list[str] = []

    if not inbox or not inbox.get("sentences"):
        print("FAIL: inbox empty (nothing to validate)")
        return 1
    if not outbox or outbox.get("cursor_to") is None:
        print("FAIL: outbox cursor_to is null/missing (author step did not run?)")
        return 1
    if outbox["cursor_to"] != inbox["cursor_to"]:
        errs.append(f"cursor mismatch: outbox {outbox['cursor_to']} != inbox {inbox['cursor_to']}")

    inbox_words = [(w["word_id"], w.get("word_form", "")) for s in inbox["sentences"] for w in s["words"]]
    real_ids = {wid for wid, wf in inbox_words if wf and wf.strip()}
    all_ids = {wid for wid, _ in inbox_words}

    changes = outbox.get("changes", [])
    out_ids = [c.get("word_id") for c in changes]
    so = set(out_ids)

    missing = real_ids - so
    extra = so - all_ids
    dups = sorted({i for i in out_ids if out_ids.count(i) > 1})
    if missing:
        errs.append(f"missing {len(missing)} word_ids (e.g. {sorted(missing)[:10]})")
    if extra:
        errs.append(f"extra word_ids: {sorted(extra)[:10]}")
    if dups:
        errs.append(f"duplicate word_ids: {dups[:10]}")

    badfield = [c.get("word_id") for c in changes if c.get("field") != "grammar_note"]
    if badfield:
        errs.append(f"non-grammar_note fields: {badfield[:10]}")

    arabic = [c.get("word_id") for c in changes if c.get("new") and contains_arabic(c["new"])]
    if arabic:
        errs.append(f"notes with Arabic letters: {arabic[:10]}")

    empty = [c.get("word_id") for c in changes if not c.get("new") or not str(c["new"]).strip()]
    if empty:
        errs.append(f"empty notes: {empty[:10]}")

    if errs:
        for e in errs:
            print("FAIL:", e)
        return 1

    print(f"OK: {len(changes)} changes, coverage {len(real_ids)}/{len(real_ids)} real words, cursor -> {outbox['cursor_to']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
