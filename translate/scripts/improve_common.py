"""Shared state/IO for the Claude-in-the-loop grammar-note improvement pass.

This is NOT an autonomous `claude --print` pipeline. The flow is:

    1. improve_fetch.py   → pulls the next batch of sentences (+ words + context)
                            into grammar_improve/inbox.json
    2. *Claude reads inbox.json and writes improved values to outbox.json*
    3. improve_apply.py   → backs up originals, writes changes to sentence_words
                            in place, logs them, and advances the checkpoint

The checkpoint file makes the whole thing resumable: stop any time, then run
improve_fetch.py again to continue from where the cursor left off.

Scope (decided): sentence_words.grammar_note (default) and optionally
sentence_words.english. roots.meaning is intentionally excluded because its
English audio (roots.audio_url_en) is TTS of the meaning text and would desync.
"""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from typing import Any

# Arabic script blocks: Arabic, Supplement, Extended-A, Presentation Forms A/B.
_ARABIC_RE = re.compile(r"[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]")


def contains_arabic(text: Any) -> bool:
    """True if the text has any Arabic-script characters.

    Grammar notes must be plain English + transliterations only (no Arabic
    letters), so apply uses this as a hard guard before writing.
    """
    return bool(text) and isinstance(text, str) and bool(_ARABIC_RE.search(text))

# grammar_improve/ lives next to translate/scripts/ -> translate/grammar_improve/
_TRANSLATE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DIR = os.path.join(_TRANSLATE_ROOT, "grammar_improve")
BACKUP_DIR = os.path.join(BASE_DIR, "backup")
APPLIED_DIR = os.path.join(BASE_DIR, "applied")

CHECKPOINT = os.path.join(BASE_DIR, "checkpoint.json")
INBOX = os.path.join(BASE_DIR, "inbox.json")
OUTBOX = os.path.join(BASE_DIR, "outbox.json")
ORIGINALS = os.path.join(BACKUP_DIR, "originals.jsonl")
# Backup of original article_sentences.arabic before an obvious-tashkeel fix.
# Separate file because these legitimately contain Arabic and key on sentence_id.
SENTENCE_ORIGINALS = os.path.join(BACKUP_DIR, "sentence_arabic_originals.jsonl")
CHANGELOG = os.path.join(BASE_DIR, "changelog.jsonl")

ALLOWED_FIELDS = ("grammar_note", "english")

DEFAULT_CHECKPOINT: dict[str, Any] = {
    "cursor_sentence_id": 0,  # last article_sentences.id fully processed
    "sentences_done": 0,
    "words_seen": 0,
    "words_changed": 0,
    "fields": ["grammar_note"],
    "batch_size": 20,
    "status": "active",  # active | done
    "created_at": None,
    "updated_at": None,
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def ensure_dirs() -> None:
    os.makedirs(BACKUP_DIR, exist_ok=True)
    os.makedirs(APPLIED_DIR, exist_ok=True)


def read_json(path: str, default: Any = None) -> Any:
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_json(path: str, data: Any) -> None:
    ensure_dirs()
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def append_jsonl(path: str, row: dict[str, Any]) -> None:
    ensure_dirs()
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


def load_checkpoint() -> dict[str, Any]:
    cp = read_json(CHECKPOINT)
    if cp is None:
        cp = dict(DEFAULT_CHECKPOINT)
        cp["created_at"] = now_iso()
        cp["updated_at"] = now_iso()
        write_json(CHECKPOINT, cp)
    return cp


def save_checkpoint(cp: dict[str, Any]) -> None:
    cp["updated_at"] = now_iso()
    write_json(CHECKPOINT, cp)


def backed_up_word_ids() -> set[int]:
    """Word IDs already captured in the originals backup (for idempotency)."""
    seen: set[int] = set()
    if not os.path.exists(ORIGINALS):
        return seen
    with open(ORIGINALS, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                seen.add(int(json.loads(line)["word_id"]))
            except (ValueError, KeyError, json.JSONDecodeError):
                continue
    return seen
