"""Backfill `root_meaning` onto records generated before the field existed.

The generator never emitted a discrete "what does the ROOT mean" field — that
sense is buried in `usage_note` prose and in FAQ answers. It is the one phrase a
one-line root summary needs, so the app cannot render a collapsed row without it.

This is a cheap additive pass: it re-reads records we already have, asks only for
the shared sense, and touches NO root claim. Nothing here can invalidate the
verification gate or the judge's verdicts, so records are merged straight back
into all three routed files rather than being re-verified.

Batched (the whole payload for one record is a few hundred bytes) and written per
batch, so a crash costs one batch rather than the run.

Run from translate/:
  uv run python -m word_enrichment.backfill_root_meaning
"""

from __future__ import annotations

import argparse
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

import utils.set_keys  # noqa: F401
from utils.claude_cli import call_claude_cli

BASE = Path(__file__).resolve().parent
# Every file build_ts can draw a published record from. `root_meaning` is
# additive, so each is patched in place by root_id.
TARGET_FILES = ("enriched.jsonl", "verified.jsonl", "review.jsonl")
SIDECAR = BASE / "root_meanings.jsonl"


class RootMeaning(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")
    root_id: int
    root_meaning: str = Field(
        description="At most six words, lower-case, no final full stop."
    )


class RootMeanings(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")
    meanings: list[RootMeaning]


SYSTEM_PROMPT = """\
You are an Arabic lexicographer. For each item you are given a triliteral root,
one word derived from it, that word's senses, and other words from the same root.

Return the CORE SENSE OF THE ROOT ITSELF: the meaning every word in the family
shares. Rules:
- At most six words. Lower-case. No final full stop. No quotes.
- Verbal roots read as an infinitive phrase: "to turn, invert, change".
- Do NOT restate the individual word's gloss. If the word is "heart" and the root
  is q-l-b, the answer is "to turn, invert, change" — not "heart".
- Where the family has genuinely diverged, give the sense that still explains the
  most members, not a list of every branch.
- Ground it in the evidence supplied. Do not invent a sense the family does not
  show.

Return one entry per item, with the same root_id.
"""


def _payload(rec: dict) -> dict:
    return {
        "root_id": rec["root_id"],
        "root": rec.get("triliteral_root"),
        "root_transliteration": rec.get("root_transliteration"),
        "word": rec.get("letters"),
        "word_gloss": rec.get("meaning"),
        "word_senses": [s.get("gloss") for s in rec.get("senses", [])][:3],
        "family": [
            {"word": m.get("letters"), "meaning": m.get("meaning")}
            for m in rec.get("word_family", [])
        ][:6],
    }


def _run_batch(batch: list[dict], model: str) -> list[dict]:
    user = (
        "Give the core root sense for every item below.\n\n"
        + json.dumps([_payload(r) for r in batch], ensure_ascii=False, indent=1)
    )
    result = call_claude_cli(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user},
        ],
        response_model=RootMeanings,
        model=model,
    )
    if not result.get("success"):
        raise RuntimeError(result.get("error", "call failed"))
    return [m.model_dump() for m in RootMeanings.model_validate(result["data"]).meanings]


def _load(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="sonnet")
    ap.add_argument("--batch-size", type=int, default=20)
    ap.add_argument("--workers", type=int, default=4)
    args = ap.parse_args()

    records = _load(BASE / "enriched.jsonl")
    done = {m["root_id"] for m in _load(SIDECAR)}
    pending = [r for r in records if r["root_id"] not in done and not r.get("root_meaning")]
    print(f"{len(records)} record(s), {len(done)} already backfilled, {len(pending)} pending")

    batches = [
        pending[i : i + args.batch_size] for i in range(0, len(pending), args.batch_size)
    ]
    if batches:
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            futures = {ex.submit(_run_batch, b, args.model): b for b in batches}
            for n, fut in enumerate(as_completed(futures), 1):
                try:
                    got = fut.result()
                except Exception as exc:  # noqa: BLE001 — one bad batch must not kill the run
                    print(f"  batch failed ({exc}); it stays pending")
                    continue
                # Append as each batch lands, never at the end: a crash then
                # costs one batch instead of the whole run.
                with SIDECAR.open("a", encoding="utf-8") as fh:
                    for m in got:
                        fh.write(json.dumps(m, ensure_ascii=False) + "\n")
                print(f"  batch {n}/{len(batches)} -> {len(got)} meaning(s)")

    lookup = {m["root_id"]: m["root_meaning"] for m in _load(SIDECAR)}
    for name in TARGET_FILES:
        path = BASE / name
        rows = _load(path)
        if not rows:
            continue
        patched = 0
        for r in rows:
            rm = lookup.get(r["root_id"])
            if rm and not r.get("root_meaning"):
                r["root_meaning"] = rm
                patched += 1
        path.write_text(
            "\n".join(json.dumps(r, ensure_ascii=False) for r in rows) + "\n",
            encoding="utf-8",
        )
        missing = sum(1 for r in rows if not r.get("root_meaning"))
        print(f"{name}: patched {patched}, still missing {missing}")


if __name__ == "__main__":
    main()
