"""Size the corpus for a fully automatic run: how many words can be rooted
with NO human in the loop, and how many distinct roots that collapses to.

Pure offline lookup — CAMeL Tools + Arramooz + Lane's, zero model calls. Root
assignment is a *deterministic* step: decide it before generation and the whole
wrong-root class (and the review queue it creates) cannot occur.

CAMeL is primary — it analyses morphology, so it roots inflected forms that the
two table-lookup sources miss — and the others corroborate it. Where CAMeL says
NTWS ("not this word's script") it is positively identifying a foreign name,
which is a precise skip signal rather than a guess.

Buckets:
  corroborated  CAMeL + >=1 independent source agree      -> generate, high confidence
  camel-strong  CAMeL alone, >=80% of analyses agree      -> generate
  weak          CAMeL unsure and nothing corroborates     -> SKIP
  foreign       CAMeL says NTWS (proper name/loanword)    -> SKIP (correctly)
  no-root       particle/pronoun, no derivational root    -> SKIP

Run from translate/:  uv run python -m word_enrichment.size_corpus
"""

from __future__ import annotations

import json
import sqlite3
import urllib.request
from collections import Counter

from word_enrichment import arramooz, camel_roots, lexicon
from word_enrichment.build_ts import ANON, SUPABASE

CAMEL_MIN_CONFIDENCE = 0.8


def all_roots() -> list[dict]:
    rows: list[dict] = []
    offset, page = 0, 1000
    while True:
        url = (
            f"{SUPABASE}/rest/v1/roots?select=id,letters,meaning"
            f"&order=id&limit={page}&offset={offset}"
        )
        req = urllib.request.Request(
            url, headers={"apikey": ANON, "Authorization": f"Bearer {ANON}"}
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            batch = json.loads(resp.read())
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < page:
            break
        offset += page
    return rows


def main() -> None:
    words = all_roots()
    print(f"{len(words)} dictionary entries\n")

    ar_conn = arramooz._connect()
    lane_conn = sqlite3.connect(f"file:{lexicon.DB_PATH}?mode=ro", uri=True)
    tally: Counter[str] = Counter()
    units: set[str] = set()
    try:
        for i, w in enumerate(words, 1):
            if i % 2500 == 0:
                print(f"  …{i}")
            letters = arramooz.bareword(w["letters"])

            camel = camel_roots.analyze(letters)
            if camel and camel[0].foreign:
                tally["foreign"] += 1
                continue
            if not camel:
                tally["no-root"] += 1
                continue
            best = camel[0]
            fold = camel_roots.weak_fold(best.letters)

            # Independent corroboration, compared under weak-folding so the
            # three sources' different weak-radical conventions don't collide.
            others: set[str] = set()
            ar_candidates, _ = arramooz.roots_for(letters, ar_conn)
            others |= {camel_roots.weak_fold(r) for r, _ in ar_candidates}
            resolved = lexicon._resolve_root(lane_conn, letters)
            if resolved:
                others.add(camel_roots.weak_fold(arramooz.fold_root(resolved[0])))

            # Rule D, chosen by measurement against the Quranic Treebank
            # (compare_rules.py): corroboration first, then Arramooz alone,
            # then confident CAMeL. Leading with CAMeL — the earlier rule —
            # cost 12.4 points of correct-and-published because CAMeL has the
            # wider reach but Arramooz is the more precise source.
            ar_folds = [camel_roots.weak_fold(r) for r, _ in ar_candidates]
            if fold in others:
                tally["corroborated"] += 1
                units.add(best.letters)
            elif ar_folds:
                tally["arramooz-alone"] += 1
                units.add(ar_folds[0])
            elif best.confidence >= CAMEL_MIN_CONFIDENCE:
                tally["camel-strong"] += 1
                units.add(best.letters)
            else:
                tally["weak"] += 1
    finally:
        ar_conn.close()
        lane_conn.close()

    total = len(words)
    print()
    for k in ("corroborated", "arramooz-alone", "camel-strong", "weak", "foreign", "no-root"):
        n = tally[k]
        print(f"  {k:14} {n:6}  {100 * n / total:5.1f}%")

    auto = tally["corroborated"] + tally["arramooz-alone"] + tally["camel-strong"]
    print(f"\n  publishable, zero human input : {auto:6}  ({100 * auto / total:.1f}%)")
    print(f"  auto-skipped                  : {total - auto:6}")
    print(f"\n  distinct roots (generation units): {len(units)}")
    print(f"  -> {auto / max(len(units), 1):.1f}x fewer model calls than per-word")


if __name__ == "__main__":
    main()
