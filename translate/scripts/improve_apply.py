"""Apply Claude's improvements (outbox.json) to sentence_words, in place.

Backs up every original value before changing it (grammar_improve/backup/
originals.jsonl — the revert artifact), writes the changes, records them to
changelog.jsonl, and advances the checkpoint so the next fetch continues past
this batch.

A batch is considered processed when outbox.cursor_to matches inbox.cursor_to —
even with zero changes (Claude judged the batch already good), the cursor still
advances.

Usage:
    uv run python scripts/improve_apply.py            # apply outbox + advance cursor
    uv run python scripts/improve_apply.py --dry-run  # show changes, write nothing
    uv run python scripts/improve_apply.py --db-log   # also log to translation_improvements
"""

import argparse
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import utils.set_keys  # noqa: F401

from improve_common import (
    ALLOWED_FIELDS,
    APPLIED_DIR,
    CHANGELOG,
    INBOX,
    ORIGINALS,
    OUTBOX,
    SENTENCE_ORIGINALS,
    append_jsonl,
    backed_up_word_ids,
    contains_arabic,
    load_checkpoint,
    now_iso,
    read_json,
    save_checkpoint,
)
from utils.storage import get_supabase_client


def _backed_up_sentence_ids() -> set[int]:
    """Sentence IDs already captured in the sentence-arabic backup."""
    import json as _json

    seen: set[int] = set()
    if not os.path.exists(SENTENCE_ORIGINALS):
        return seen
    with open(SENTENCE_ORIGINALS, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                seen.add(int(_json.loads(line)["sentence_id"]))
            except (ValueError, KeyError, _json.JSONDecodeError):
                continue
    return seen


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply improvements to sentence_words")
    parser.add_argument("--dry-run", action="store_true", help="Show changes, write nothing")
    parser.add_argument(
        "--db-log", action="store_true",
        help="Also insert each change into translation_improvements (status='applied')",
    )
    args = parser.parse_args()

    inbox = read_json(INBOX)
    outbox = read_json(OUTBOX)
    cp = load_checkpoint()

    if not inbox or not inbox.get("sentences"):
        print("Inbox is empty (run improve_fetch.py first, or the pass is done).")
        return 0
    if not outbox or outbox.get("cursor_to") is None:
        print("Outbox not ready — Claude must write improvements to outbox.json first.")
        return 1
    if outbox["cursor_to"] != inbox["cursor_to"]:
        print(
            f"Mismatch: outbox.cursor_to={outbox['cursor_to']} but "
            f"inbox.cursor_to={inbox['cursor_to']}. Re-fetch or re-write the outbox."
        )
        return 1

    # word_id -> {english, grammar_note, sentence_id, word_form}
    word_lookup: dict[int, dict] = {}
    # sentence_id -> current arabic (for obvious-tashkeel fixes to the full sentence)
    sentence_lookup: dict[int, str] = {}
    total_words = 0
    for s in inbox["sentences"]:
        sentence_lookup[s["sentence_id"]] = s.get("arabic")
        for w in s["words"]:
            total_words += 1
            word_lookup[w["word_id"]] = {
                "english": w["english"],
                "grammar_note": w.get("grammar_note"),
                "sentence_id": s["sentence_id"],
                "word_form": w["word_form"],
            }

    allowed = set(cp.get("fields", ["grammar_note"])) & set(ALLOWED_FIELDS)
    client = None if args.dry_run else get_supabase_client()
    already_backed = backed_up_word_ids()

    applied = 0
    skipped = 0
    for ch in outbox.get("changes", []):
        word_id = ch.get("word_id")
        field = ch.get("field")
        new = ch.get("new")
        reason = ch.get("reason", "")

        if field not in allowed:
            print(f"  skip word {word_id}: field '{field}' not in scope {sorted(allowed)}")
            skipped += 1
            continue
        cur = word_lookup.get(word_id)
        if cur is None:
            print(f"  skip word {word_id}: not in this batch")
            skipped += 1
            continue
        old = cur.get(field)
        if new is None or new == old:
            skipped += 1
            continue
        if contains_arabic(new):
            print(f"  SKIP word {word_id} ({cur['english']}) [{field}]: contains Arabic letters — not allowed in notes")
            skipped += 1
            continue

        print(f"  word {word_id} ({cur['english']}) [{field}]")
        print(f"      old: {old!r}")
        print(f"      new: {new!r}")
        if reason:
            print(f"      why: {reason}")

        if args.dry_run:
            applied += 1
            continue

        # 1) back up the full original row once
        if word_id not in already_backed:
            append_jsonl(ORIGINALS, {
                "word_id": word_id,
                "sentence_id": cur["sentence_id"],
                "english": cur["english"],
                "grammar_note": cur["grammar_note"],
                "backed_up_at": now_iso(),
            })
            already_backed.add(word_id)

        # 2) write the change in place
        client.table("sentence_words").update({field: new}).eq("id", word_id).execute()

        # 3) local audit log
        append_jsonl(CHANGELOG, {
            "ts": now_iso(), "word_id": word_id, "field": field,
            "old": old, "new": new, "reason": reason,
        })

        # 4) optional DB audit trail
        if args.db_log:
            rec = {"sentence_word_id": word_id, "status": "applied", "reviewer_notes": reason}
            rec[f"suggested_{field}"] = new
            client.table("translation_improvements").insert(rec).execute()

        applied += 1

    # ---- obvious-tashkeel fixes to the full sentence Arabic (article_sentences.arabic) ----
    # Audio-safe: sentence audio is stored under a random uuid filename (not text-keyed),
    # so editing the displayed Arabic never forces a re-render. These values are MEANT to
    # contain Arabic, so the contains_arabic() guard does NOT apply here.
    sentence_fixed = 0
    already_backed_sentences = _backed_up_sentence_ids()
    for fix in outbox.get("sentence_fixes", []):
        sid = fix.get("sentence_id")
        field = fix.get("field", "arabic")
        new = fix.get("new")
        reason = fix.get("reason", "")

        if field != "arabic":
            print(f"  skip sentence {sid}: only 'arabic' is fixable, not '{field}'")
            skipped += 1
            continue
        if sid not in sentence_lookup:
            print(f"  skip sentence {sid}: not in this batch")
            skipped += 1
            continue
        old = sentence_lookup[sid]
        if new is None or new == old:
            skipped += 1
            continue

        print(f"  SENTENCE {sid} [arabic tashkeel fix]")
        print(f"      old: {old!r}")
        print(f"      new: {new!r}")
        if reason:
            print(f"      why: {reason}")

        if args.dry_run:
            sentence_fixed += 1
            continue

        if sid not in already_backed_sentences:
            append_jsonl(SENTENCE_ORIGINALS, {
                "sentence_id": sid, "arabic": old, "backed_up_at": now_iso(),
            })
            already_backed_sentences.add(sid)

        client.table("article_sentences").update({"arabic": new}).eq("id", sid).execute()

        append_jsonl(CHANGELOG, {
            "ts": now_iso(), "kind": "sentence_arabic", "sentence_id": sid,
            "field": "arabic", "old": old, "new": new, "reason": reason,
        })
        sentence_fixed += 1

    if args.dry_run:
        print(
            f"\nDry-run: would apply {applied} note change(s), "
            f"{sentence_fixed} sentence tashkeel fix(es), skip {skipped}. Nothing written."
        )
        return 0

    # advance checkpoint past this batch
    cp["cursor_sentence_id"] = inbox["cursor_to"]
    cp["sentences_done"] += len(inbox["sentences"])
    cp["words_seen"] += total_words
    cp["words_changed"] += applied
    save_checkpoint(cp)

    # archive the batch
    shutil.copy(INBOX, os.path.join(APPLIED_DIR, f"batch_{inbox['cursor_to']}_inbox.json"))
    shutil.copy(OUTBOX, os.path.join(APPLIED_DIR, f"batch_{inbox['cursor_to']}_outbox.json"))

    print(
        f"\nApplied {applied} note change(s), {sentence_fixed} sentence tashkeel fix(es) "
        f"({skipped} skipped). "
        f"Cursor → sentence_id {cp['cursor_sentence_id']}. "
        f"Totals: {cp['sentences_done']} sentences, {cp['words_changed']} words changed."
    )
    print("Next: run improve_fetch.py for the following batch.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
