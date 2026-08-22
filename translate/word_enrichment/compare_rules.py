"""Compare candidate root-decision rules against the Quranic Treebank gold set.

Calibration showed the ordering assumption was wrong: Arramooz is the more
PRECISE source (93.4%) while CAMeL has the wider REACH. A rule that leads with
CAMeL therefore trades away precision it did not need to. This measures the
alternatives instead of guessing between them.

Each rule returns (published, predicted_root) so coverage and precision are
scored on the same footing.

Run:  QURANIC_CSV=/path/Quranic.csv uv run python -m word_enrichment.compare_rules
"""

from __future__ import annotations

import os
import sqlite3
import sys
from collections import Counter

from word_enrichment import arramooz, camel_roots, lexicon
from word_enrichment.calibrate import load_gold

MAX_LEMMAS = int(os.environ.get("CALIBRATE_MAX", "3000"))


def rules(camel, ar_folds, lane_fold):
    """name -> (publish?, predicted_fold). All inputs already weak-folded."""
    camel_fold = (
        camel_roots.weak_fold(camel[0].letters)
        if camel and not camel[0].foreign
        else None
    )
    camel_conf = camel[0].confidence if camel and not camel[0].foreign else 0.0
    ar_top = ar_folds[0] if ar_folds else None
    others_of_camel = set(ar_folds) | ({lane_fold} if lane_fold else set())

    out = {}

    # A — shipped rule: CAMeL leads, anything corroborates, else CAMeL if confident.
    if camel_fold and (camel_fold in others_of_camel or camel_conf >= 0.8):
        out["A camel-first"] = (True, camel_fold)
    else:
        out["A camel-first"] = (False, None)

    # B — Arramooz leads (higher precision), CAMeL fills the gaps.
    if ar_top:
        out["B arramooz-first"] = (True, ar_top)
    elif camel_fold and camel_conf >= 0.8:
        out["B arramooz-first"] = (True, camel_fold)
    else:
        out["B arramooz-first"] = (False, None)

    # C — publish only when two independent sources agree.
    agree = None
    if camel_fold and camel_fold in others_of_camel:
        agree = camel_fold
    elif ar_top and lane_fold and ar_top == lane_fold:
        agree = ar_top
    out["C corroborated-only"] = (bool(agree), agree)

    # D — corroboration first; else Arramooz alone; else confident CAMeL.
    if agree:
        out["D corroborated>arramooz>camel"] = (True, agree)
    elif ar_top:
        out["D corroborated>arramooz>camel"] = (True, ar_top)
    elif camel_fold and camel_conf >= 0.8:
        out["D corroborated>arramooz>camel"] = (True, camel_fold)
    else:
        out["D corroborated>arramooz>camel"] = (False, None)

    return out


def main() -> None:
    path = os.environ.get("QURANIC_CSV")
    if not path or not os.path.exists(path):
        print("Set QURANIC_CSV")
        sys.exit(1)
    pairs, _ = load_gold(path)
    pairs = pairs[:MAX_LEMMAS]

    ar_conn = arramooz._connect()
    lane_conn = sqlite3.connect(f"file:{lexicon.DB_PATH}?mode=ro", uri=True)
    pub: Counter[str] = Counter()
    cor: Counter[str] = Counter()
    try:
        for lemma, gold in pairs:
            bare = arramooz.bareword(lemma)
            want = camel_roots.weak_fold(arramooz.fold_root(gold))
            camel = camel_roots.analyze(bare)
            ar_cands, _ = arramooz.roots_for(bare, ar_conn)
            ar_folds = [camel_roots.weak_fold(r) for r, _ in ar_cands]
            resolved = lexicon._resolve_root(lane_conn, bare)
            lane_fold = (
                camel_roots.weak_fold(arramooz.fold_root(resolved[0])) if resolved else None
            )
            for name, (published, pred) in rules(camel, ar_folds, lane_fold).items():
                if published:
                    pub[name] += 1
                    cor[name] += pred == want
    finally:
        ar_conn.close()
        lane_conn.close()

    n = len(pairs)
    print(f"gold lemmas: {n}\n")
    print(f"{'rule':32} {'coverage':>10} {'precision':>10} {'correct/n':>11}")
    for name in sorted(pub | Counter({k: 0 for k in cor})):
        p, c = pub[name], cor[name]
        print(
            f"{name:32} {100 * p / n:9.1f}% {100 * c / p if p else 0:9.1f}% "
            f"{100 * c / n:10.1f}%"
        )
    print("\ncorrect/n = share of ALL gold lemmas published AND right (coverage x precision)")


if __name__ == "__main__":
    main()
