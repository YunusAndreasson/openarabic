"""Grade a generated root record against the pool it was built from.

The pool-closure gate already proves the Arabic is attested. It cannot see
whether the ENGLISH is right, and that is where the remaining risk lives:
Lane's first italic span is frequently a sub-sense or an idiom rather than the
word's core meaning, so a record can be perfectly well-formed, perfectly closed
over the pool, and still teach that إِسْتَسْلَمَ means "he went upon the middle of
the road" when it means to surrender.

No regex sees that. Reading 60 glosses by hand, I judged a third to a half of
Lane's first spans editorially unusable -- an eyeball, not a measurement, and
stated as one. This file is what turns that into something repeatable.

The judge is shown the SAME candidate rows the generator chose from, so it grades
faithfulness against a source rather than against its own recall of Arabic. What
it is NOT asked is whether the root is right: that was settled deterministically
before generation by rule D, and asking a model to re-litigate it is the
circularity that produced every wrong-root error this pipeline has had.

Run from translate/:
    uv run python -m word_enrichment.judge_roots --input word_enrichment/golden.jsonl
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

import utils.set_keys  # noqa: F401
from word_enrichment import lexicon, pool

BASE = Path(__file__).resolve().parent


class MemberVerdict(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")
    letters: str
    faithful: bool = Field(
        description="True when the English gloss is a fair modern rendering of at "
                    "least one source gloss supplied for that exact word."
    )
    issue: str = Field(
        description="Empty string when faithful. Otherwise one short clause naming "
                    "the problem: 'archaic', 'sub-sense not core meaning', 'wrong "
                    "word's meaning', 'too vague to teach'."
    )


class RootVerdict(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")
    verdict: Literal["publish", "revise", "skip"] = Field(
        description="publish = a learner is well served. revise = one fixable "
                    "problem. skip = do not ship this root."
    )
    members: list[MemberVerdict]
    root_meaning_ok: bool = Field(
        description="Does root_meaning name the sense actually shared by the family?"
    )
    usage_note_ok: bool = Field(
        description="Is the note about the ROOT (true of every word built on it), "
                    "accurate, and free of invented etymology?"
    )
    reason: str = Field(description="One sentence. Name the specific failing word if any.")


SYSTEM = """\
You are a strict editor for an Arabic-learning dictionary. You are checking one
finished root panel against the exact source material it was written from.

Judge ONLY these questions:
1. Is each English gloss a fair modern rendering of a source gloss given for THAT
   word? A gloss taken from a different word in the list is the worst failure.
2. Is `root_meaning` the sense the family genuinely shares?
3. Is `usage_note` about the ROOT, accurate, and free of invented etymology?

Do NOT judge whether the root itself is correct — that was settled before
generation from three independent morphological sources, and second-guessing it
from meaning alone is how errors get introduced rather than found.

Be hard on two things a learner is badly served by:
- ARCHAIC or opaque English kept from the 1863 lexicon ("a cry by which a camel
  is chidden", "he went upon the middle of the road").
- A SUB-SENSE or idiom presented as the word's core meaning.
Mark those unfaithful even though they are literally present in the source.
Return ONLY the structured object requested.
"""

TEMPLATE = """\
ROOT: {root}  ({translit})

THE SOURCE ROWS THE WRITER CHOSE FROM:
{candidates}

THE FINISHED PANEL:
  root_meaning: {root_meaning}
  usage_note:   {usage_note}
  words:
{family}

Grade it.
"""


def judge_one(record: dict, get_conn, dict_index: dict, model: str | None) -> dict:
    from utils.openrouter_structured import call_openrouter

    root = record["root_key"]
    candidates = pool.build(get_conn(), root, dict_index, limit=20)
    family = "\n".join(
        f"    {m['letters']} ({m.get('transliteration', '')}) — {m['meaning']}"
        for m in record.get("word_family", [])
    )
    user = TEMPLATE.format(
        root=record.get("triliteral_root", root),
        translit=record.get("root_transliteration", ""),
        candidates="\n".join(c.prompt_line() for c in candidates),
        root_meaning=record.get("root_meaning", ""),
        usage_note=record.get("usage_note", ""),
        family=family,
    )
    result = call_openrouter(
        [{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}],
        response_model=RootVerdict, model=model, reasoning_effort="none",
    )
    if not result.get("success"):
        return {"root_key": root, "verdict": "error", "reason": result.get("error", ""),
                "_usage": result.get("usage")}
    return {"root_key": root, **result["data"], "_usage": result.get("usage")}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default=str(BASE / "golden.jsonl"))
    ap.add_argument("--out", default=str(BASE / "golden_verdicts.json"))
    ap.add_argument("--model", default=None)
    ap.add_argument("--workers", type=int, default=8)
    args = ap.parse_args()

    records = [json.loads(line) for line in Path(args.input).open(encoding="utf-8") if line.strip()]
    ledger = [json.loads(line) for line in (BASE / "ledger.jsonl").open(encoding="utf-8")]
    print(f"building the dictionary index over {len(ledger)} entries…", flush=True)
    dict_index = pool.dictionary_index(ledger)

    import threading
    conns: dict[int, sqlite3.Connection] = {}
    lock = threading.Lock()

    def _conn():
        ident = threading.get_ident()
        with lock:
            if ident not in conns:
                conns[ident] = sqlite3.connect(
                    f"file:{lexicon.DB_PATH}?mode=ro", uri=True, check_same_thread=False)
            return conns[ident]

    from concurrent.futures import ThreadPoolExecutor, as_completed

    verdicts, spend = [], 0.0
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        # `_conn` is PASSED, not called here. Calling it in this comprehension
        # evaluates it on the main thread, so all eight workers shared a single
        # sqlite connection -- which is not safe for concurrent use and surfaced
        # as an intermittent "InterfaceError: bad parameter or other API misuse"
        # three runs later, having silently worked until then.
        futures = [ex.submit(judge_one, r, _conn, dict_index, args.model) for r in records]
        for i, fut in enumerate(as_completed(futures), 1):
            v = fut.result()
            usage = v.pop("_usage", None) or {}
            spend += float(usage.get("cost_usd") or 0.0)
            verdicts.append(v)
            print(f"  [{i}/{len(records)}] {v['root_key']:8s} {v.get('verdict', '?'):8s} "
                  f"{v.get('reason', '')[:70]}", flush=True)

    Path(args.out).write_text(json.dumps(verdicts, ensure_ascii=False, indent=1),
                              encoding="utf-8")
    from collections import Counter
    tally = Counter(v.get("verdict") for v in verdicts)
    print(f"\n{dict(tally)}   ${spend:.4f}   -> {args.out}")

    unfaithful = [(v["root_key"], m["letters"], m["issue"])
                  for v in verdicts for m in v.get("members", []) if not m.get("faithful")]
    print(f"\nunfaithful glosses: {len(unfaithful)}")
    for root, letters, issue in unfaithful:
        print(f"  {root:8s} {letters:14s} {issue}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
