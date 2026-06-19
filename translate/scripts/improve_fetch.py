"""Fetch the next batch of sentences for Claude to improve.

Reads the checkpoint, pulls the next `--count` article_sentences (by id, after
the cursor) together with their words and full sentence context, and writes
grammar_improve/inbox.json. Read-only — touches no data.

Usage:
    uv run python scripts/improve_fetch.py                 # next batch (defaults)
    uv run python scripts/improve_fetch.py --count 10      # smaller batch
    uv run python scripts/improve_fetch.py --fields grammar_note english
    uv run python scripts/improve_fetch.py --reset         # restart from the top

After this, Claude reads inbox.json and writes outbox.json, then run
improve_apply.py.
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import utils.set_keys  # noqa: F401  (loads SUPABASE_URL / SUPABASE_KEY etc.)

from improve_common import (
    INBOX,
    OUTBOX,
    load_checkpoint,
    save_checkpoint,
    write_json,
)
from utils.storage import get_supabase_client


def fetch_batch(cursor: int, count: int) -> tuple[list[dict], int]:
    """Return (sentences_with_words, max_sentence_id) for ids > cursor."""
    client = get_supabase_client()

    sentences = (
        client.table("article_sentences")
        .select("id, article_id, arabic, english, position")
        .gt("id", cursor)
        .order("id", desc=False)
        .limit(count)
        .execute()
    ).data or []

    if not sentences:
        return [], cursor

    sentence_ids = [s["id"] for s in sentences]
    words = (
        client.table("sentence_words")
        .select("id, sentence_id, position, word_form, english, grammar_note")
        .in_("sentence_id", sentence_ids)
        .order("sentence_id", desc=False)
        .order("position", desc=False)
        .execute()
    ).data or []

    by_sentence: dict[int, list[dict]] = {sid: [] for sid in sentence_ids}
    for w in words:
        by_sentence[w["sentence_id"]].append(
            {
                "word_id": w["id"],
                "position": w["position"],
                "word_form": w["word_form"],
                "english": w["english"],
                "grammar_note": w.get("grammar_note"),
            }
        )

    out = []
    for s in sentences:
        out.append(
            {
                "sentence_id": s["id"],
                "article_id": s["article_id"],
                "arabic": s["arabic"],
                "english": s["english"],
                "words": by_sentence.get(s["id"], []),
            }
        )

    return out, max(sentence_ids)


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch next batch to improve")
    parser.add_argument("--count", type=int, help="Sentences per batch (overrides checkpoint)")
    parser.add_argument(
        "--fields", nargs="+", choices=["grammar_note", "english"],
        help="Fields to improve (overrides checkpoint; default grammar_note)",
    )
    parser.add_argument("--reset", action="store_true", help="Reset cursor to the top")
    args = parser.parse_args()

    cp = load_checkpoint()
    if args.reset:
        cp["cursor_sentence_id"] = 0
        cp["sentences_done"] = 0
        cp["words_seen"] = 0
        cp["words_changed"] = 0
        cp["status"] = "active"
    if args.count:
        cp["batch_size"] = args.count
    if args.fields:
        cp["fields"] = args.fields
    save_checkpoint(cp)

    cursor = cp["cursor_sentence_id"]
    batch_size = cp["batch_size"]
    fields = cp["fields"]

    sentences, max_id = fetch_batch(cursor, batch_size)
    word_count = sum(len(s["words"]) for s in sentences)

    inbox = {
        "cursor_from": cursor,
        "cursor_to": max_id,
        "fields": fields,
        "sentences": sentences,
    }
    write_json(INBOX, inbox)
    # Clear any stale outbox so apply can't replay an old batch.
    write_json(OUTBOX, {"cursor_to": None, "changes": []})

    if not sentences:
        cp["status"] = "done"
        save_checkpoint(cp)
        print("DONE — no more sentences past the cursor. Nothing to fetch.")
        return 0

    print(
        f"Fetched {len(sentences)} sentences (id {sentences[0]['sentence_id']}..{max_id}), "
        f"{word_count} words. Fields: {', '.join(fields)}."
    )
    print(f"Progress so far: {cp['sentences_done']} sentences, {cp['words_changed']} words changed.")
    print(f"\nInbox: {INBOX}")
    print("Spec:  scripts/improve_prompt.md  ← follow it (plain language, NO Arabic letters)")
    print("Next: Claude reads inbox.json + the spec, writes outbox.json, then run improve_apply.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
