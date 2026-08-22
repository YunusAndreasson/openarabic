"""Pick unprocessed dictionary entries and pre-assign each one a root.

This is the front of the automatic pipeline. Root assignment happens HERE,
deterministically, before any model call — which is what makes the wrong-root
class impossible rather than merely detectable. The generator is handed the root
via `root_hint`; it never infers one.

Uses rule D from compare_rules.py, chosen by measurement against the Quranic
Treebank (91.8% coverage at 93.9% precision): corroborated first, then Arramooz
alone (the most precise single source), then confident CAMeL. Entries that
resolve to nothing, to a foreign name, or to a weak guess are dropped here and
never reach generation.

Prefer `ledger.py --pick N` for routine batches: it reads a materialised ledger
instead of re-walking and re-classifying the corpus, and it can state how many
entries remain. This module stays as the source of `assign_root` (the ledger
calls it, so the two cannot classify differently) and as the path that works with
no ledger built yet.

Run from translate/:
  uv run python -m word_enrichment.pick_rooted_targets --count 100
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import urllib.request
from pathlib import Path

from word_enrichment import arramooz, camel_roots, lexicon
from word_enrichment.build_ts import ANON, SUPABASE
from word_enrichment.pick_targets import _processed

BASE = Path(__file__).resolve().parent
CAMEL_MIN_CONFIDENCE = 0.8


def _grounded(lane_conn, root: str) -> str | None:
    """The spelling of `root` that Lane's actually resolves, or None.

    Arramooz stores roots folded — ة becomes ه and ى becomes ي — so جَنَّة is
    handed back as "جنه" where the real radicals are ج ن ن, and عَلَى as "علي"
    where they are ع ل و. Lane's resolves neither, and the target was spent
    anyway: generate.py only discovers the miss after it has already been
    handed the word. Trying the notation variants of the SAME radicals here
    keeps the root chosen by rule D — it never substitutes a different root,
    which is how إِقْرَأْ would have become ق ر ر.
    """
    bare = root.replace(" ", "")
    for cand in dict.fromkeys([root, bare, " ".join(bare)]):
        if cand and lexicon.resolve_root_letters(lane_conn, cand):
            return cand
    return None


def assign_root(letters: str, ar_conn, lane_conn) -> tuple[str | None, str]:
    """(root, basis) under rule D. root is None when the entry must be skipped."""
    bare = arramooz.bareword(letters)
    camel = camel_roots.analyze(bare)
    if camel and camel[0].foreign:
        return None, "foreign"
    # Particles, pronouns and prepositions have no derivational root, so any root
    # the sources offer is an accident of shared letters. They used to pass the
    # gate — all three sources "agreed" — and were published unjudged, because the
    # judge only ever sees gate FAILURES. Dropping them here is the only place
    # that catches the class.
    if camel_roots.is_function_word(bare):
        return None, "function-word"
    ar_cands, _ = arramooz.roots_for(bare, ar_conn)
    resolved = lexicon._resolve_root(lane_conn, bare)

    others = {camel_roots.weak_fold(r) for r, _ in ar_cands}
    if resolved:
        others.add(camel_roots.weak_fold(arramooz.fold_root(resolved[0])))

    if camel:
        fold = camel_roots.weak_fold(camel[0].letters)
        if fold in others:
            # Corroborated. Prefer a source that spells the radicals out over
            # CAMeL's `#` placeholder, which is not a real Arabic letter and
            # would be meaningless in a prompt.
            for r, _ in ar_cands:
                if camel_roots.weak_fold(r) == fold:
                    g = _grounded(lane_conn, r)
                    if g:
                        return g, "corroborated"
            if resolved:
                g = _grounded(lane_conn, resolved[0])
                if g:
                    return g, "corroborated"
    for r, _ in ar_cands:
        g = _grounded(lane_conn, r)
        if g:
            return g, "arramooz"
    if camel and camel[0].confidence >= CAMEL_MIN_CONFIDENCE and "#" not in camel[0].letters:
        g = _grounded(lane_conn, camel[0].letters)
        if g:
            return g, "camel-strong"
    # Nothing we can ground. Dropping it here costs one offline SQLite lookup;
    # letting it through costs a target slot and a model call that returns
    # nothing.
    return None, "ungrounded"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--count", type=int, default=100)
    ap.add_argument("--offset", type=int, default=0)
    ap.add_argument("--out", default=str(BASE / "targets_rooted.json"))
    args = ap.parse_args()

    done = _processed()
    ar_conn = arramooz._connect()
    lane_conn = sqlite3.connect(f"file:{lexicon.DB_PATH}?mode=ro", uri=True)

    picked: list[dict] = []
    dropped = {"foreign": 0, "function-word": 0, "ungrounded": 0}
    offset, page, skipped = 0, 1000, 0
    try:
        while len(picked) < args.count:
            url = (
                f"{SUPABASE}/rest/v1/roots?select=id,letters,meaning"
                f"&order=id&limit={page}&offset={offset}"
            )
            req = urllib.request.Request(
                url, headers={"apikey": ANON, "Authorization": f"Bearer {ANON}"}
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                rows = json.loads(resp.read())
            if not rows:
                break
            for r in rows:
                if r["id"] in done or not (r.get("meaning") or "").strip():
                    continue
                root, basis = assign_root(r["letters"], ar_conn, lane_conn)
                if not root:
                    dropped[basis] = dropped.get(basis, 0) + 1
                    continue
                if skipped < args.offset:
                    skipped += 1
                    continue
                picked.append(
                    {
                        "root_id": r["id"],
                        "letters": r["letters"],
                        "meaning": r["meaning"],
                        "root_hint": root,
                        "_basis": basis,
                    }
                )
                if len(picked) >= args.count:
                    break
            if len(rows) < page:
                break
            offset += page
    finally:
        ar_conn.close()
        lane_conn.close()

    Path(args.out).write_text(
        json.dumps(picked, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    from collections import Counter

    basis = Counter(t["_basis"] for t in picked)
    print(f"{len(picked)} rooted target(s) -> {args.out}")
    print(f"  basis: {dict(basis)}")
    print(f"  dropped before generation: {dropped}")


if __name__ == "__main__":
    main()
