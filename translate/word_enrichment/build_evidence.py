"""Assemble the evidence an automated judge needs to adjudicate a root claim.

The point is that the judge must NOT re-derive the root from the same grounding
the generator saw — that is the circularity that produced every error so far,
just moved one level up. It gets *independent* evidence instead:

  - three root opinions (CAMeL morphological analysis, Arramooz, Lane's)
  - the Lane's headwords actually filed under the claimed root
  - real usage: the corpus sentences this word appears in, with translations

Usage context is what disambiguates a homograph (زاد "increased" vs "provisions",
غار "cave" vs "deceived"). It does NOT settle an etymological dispute — whether
ملائكة descends from أ ل ك or م ل ك is not visible in any sentence — so the judge
is told to treat those differently rather than pretend context decides.

Run from translate/:  uv run python -m word_enrichment.build_evidence
"""

from __future__ import annotations

import argparse
import json
import random
import sqlite3
import urllib.request
from pathlib import Path

from word_enrichment import arramooz, camel_roots, lexicon
from word_enrichment.build_ts import ANON, SUPABASE

BASE = Path(__file__).resolve().parent
MAX_SENTENCES = 3


def _get(path: str) -> list[dict]:
    req = urllib.request.Request(
        f"{SUPABASE}/rest/v1/{path}",
        headers={"apikey": ANON, "Authorization": f"Bearer {ANON}"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


def usage_for(root_id: int) -> list[dict]:
    """Real sentences this dictionary entry occurs in, with English."""
    rows = _get(
        f"sentence_words?select=word_form,english,sentence_id"
        f"&root_id=eq.{root_id}&limit={MAX_SENTENCES * 2}"
    )
    if not rows:
        return []
    ids = ",".join(str(r["sentence_id"]) for r in rows[: MAX_SENTENCES * 2])
    sentences = {
        s["id"]: s
        for s in _get(f"article_sentences?select=id,arabic,english&id=in.({ids})")
    }
    out, seen = [], set()
    for r in rows:
        s = sentences.get(r["sentence_id"])
        if not s or s["id"] in seen:
            continue
        seen.add(s["id"])
        out.append(
            {
                "surface_form": r["word_form"],
                "contextual_gloss": r["english"],
                "arabic": s["arabic"],
                "english": s["english"],
            }
        )
        if len(out) >= MAX_SENTENCES:
            break
    return out


def evidence_for(record: dict, ar_conn, lane_conn) -> dict:
    letters = record["letters"]
    bare = arramooz.bareword(letters)

    camel = camel_roots.analyze(bare)
    camel_view = (
        {"foreign": True}
        if camel and camel[0].foreign
        else [
            {"root": c.root, "confidence": round(c.confidence, 2)} for c in camel[:3]
        ]
    )

    ar_candidates, stem = arramooz.roots_for(bare, ar_conn)
    resolved = lexicon._resolve_root(lane_conn, bare)

    # What Lane's actually files under the CLAIMED root — the check that settled
    # شيطان by hand (شَيْطَنَ/تَشَيْطَنَ sit under ش ط ن, nothing under ش ي ط).
    claimed_headwords: list[str] = []
    grounding = lexicon.lookup(letters, root_hint=record["triliteral_root"], text_budget=1)
    if grounding:
        claimed_headwords = [d["word"] for d in grounding.derived_forms[:10]]

    # A disagreement that survives weak-folding is a real conflict; one that
    # does not is just two sources spelling the same radicals differently
    # (Lane's ح م و vs Arramooz حمي). The judge overturned Lane's on exactly
    # this once, so it is stated explicitly rather than left to inference.
    claim_fold = camel_roots.weak_fold(arramooz.fold_root(record["triliteral_root"]))
    all_other_folds = {camel_roots.weak_fold(r) for r, _ in ar_candidates}
    if camel and not camel[0].foreign:
        all_other_folds.add(camel_roots.weak_fold(camel[0].letters))
    notation_variant_only = bool(all_other_folds) and claim_fold in all_other_folds

    return {
        "root_id": record["root_id"],
        "word": letters,
        "gloss": record["meaning"],
        "claimed_root": record["triliteral_root"],
        "claimed_senses": [s["gloss"] for s in record.get("senses", [])],
        "evidence": {
            "camel_morphology": camel_view,
            "arramooz": [r for r, _ in ar_candidates[:3]] or None,
            "arramooz_matched_stem": stem or None,
            "lanes_surface_resolver": resolved[0] if resolved else None,
            "lanes_headwords_under_claimed_root": claimed_headwords,
            "notation_variant_only": notation_variant_only,
            "corpus_usage": usage_for(record["root_id"]),
        },
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--source",
        default="review",
        choices=("review", "verified"),
        help="which routed file to build evidence from. `verified` exists to "
             "AUDIT the set that publishes unadjudicated: the judge only ever "
             "sees gate failures, so the error rate among gate PASSES has never "
             "been measured, only assumed.",
    )
    ap.add_argument(
        "--sample",
        type=int,
        default=0,
        help="adjudicate a random sample of that size instead of everything. "
             "Deterministic seed so a re-run audits the same records.",
    )
    ap.add_argument("--out", default=str(BASE / "evidence.json"))
    ap.add_argument(
        "--ids-from",
        help="a targets file; restrict to records from that batch. A blind-spot "
             "audit sampled across every batch measures the corpus, not the run "
             "that just changed — and it is the run that has to be judged.",
    )
    ap.add_argument(
        "--only-new",
        action="store_true",
        help="skip records that already have a verdict. The judge is not "
             "deterministic — one run skipped two items another run published — "
             "so re-adjudicating a settled word can silently un-publish it and "
             "makes a batch-over-batch comparison meaningless. Use this for every "
             "routine batch; omit it only to deliberately re-judge from scratch.",
    )
    args = ap.parse_args()

    records = [
        json.loads(line)
        for line in (BASE / f"{args.source}.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    if args.ids_from:
        wanted = {t["root_id"] for t in json.loads(Path(args.ids_from).read_text(encoding="utf-8"))}
        before = len(records)
        records = [r for r in records if r["root_id"] in wanted]
        print(f"  --ids-from: {len(records)} of {before} records are in that batch")
    if args.only_new:
        settled: set[int] = set()
        vp = BASE / "verdicts.json"
        if vp.exists():
            settled = {v["root_id"] for v in json.loads(vp.read_text(encoding="utf-8"))}
        before = len(records)
        records = [r for r in records if r["root_id"] not in settled]
        print(f"  --only-new: {before - len(records)} already adjudicated, {len(records)} to judge")
    if args.sample and args.sample < len(records):
        # Seeded, not arbitrary: an audit you cannot repeat is an anecdote.
        rng = random.Random(20260821)
        records = rng.sample(records, args.sample)
    ar_conn = arramooz._connect()
    lane_conn = sqlite3.connect(f"file:{lexicon.DB_PATH}?mode=ro", uri=True)
    try:
        bundles = [evidence_for(r, ar_conn, lane_conn) for r in records]
    finally:
        ar_conn.close()
        lane_conn.close()

    out = Path(args.out)
    out.write_text(json.dumps(bundles, ensure_ascii=False, indent=2), encoding="utf-8")
    with_usage = sum(1 for b in bundles if b["evidence"]["corpus_usage"])
    print(f"{len(bundles)} bundles -> {out}")
    print(f"  {with_usage} have corpus usage context, {len(bundles) - with_usage} have none")


if __name__ == "__main__":
    main()
