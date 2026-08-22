"""Calibrate the root pipeline against an expert-annotated gold set.

Uses the Quranic Treebank (github.com/NoorBayan/Quranic, MIT), which annotates
every token with `lemma_ar` and `root_ar` — exactly this pipeline's task, done by
scholars. That removes the last reason to put a human in the loop: accuracy is
measured against annotation that already exists rather than labels we produce.

Comparison is weak-folded (CAMeL writes a weak radical as `#`, the treebank
writes it out: س.م.# vs سمو), so a source is not penalised for notation.

Gold rows whose root is `ـ` (tatweel) are particles/determiners with no
derivational root — kept as a separate check that each source correctly
declines rather than inventing one.

Set QURANIC_CSV to the extracted Quranic.csv (UTF-16, tab-delimited).
Run from translate/:  QURANIC_CSV=/path/Quranic.csv uv run python -m word_enrichment.calibrate
"""

from __future__ import annotations

import csv
import os
import sqlite3
import sys
from collections import Counter

from word_enrichment import arramooz, camel_roots, lexicon

NO_ROOT = "ـ"  # tatweel: the treebank's "this token has no root"
MAX_LEMMAS = int(os.environ.get("CALIBRATE_MAX", "3000"))


def load_gold(path: str) -> tuple[list[tuple[str, str]], list[str]]:
    """Unique (lemma, root) pairs, plus lemmas the gold set says have NO root."""
    rooted: dict[str, str] = {}
    rootless: set[str] = set()
    with open(path, encoding="utf-16", newline="") as fh:
        for row in csv.DictReader(fh, delimiter="\t"):
            lemma = (row.get("lemma_ar") or "").strip()
            root = (row.get("root_ar") or "").strip()
            if not lemma or lemma == NO_ROOT:
                continue
            if root == NO_ROOT or not root:
                rootless.add(lemma)
            elif lemma not in rooted:
                rooted[lemma] = root
    return list(rooted.items()), sorted(rootless)


def main() -> None:
    path = os.environ.get("QURANIC_CSV")
    if not path or not os.path.exists(path):
        print("Set QURANIC_CSV to the extracted Quranic.csv")
        sys.exit(1)

    pairs, rootless = load_gold(path)
    pairs = pairs[:MAX_LEMMAS]
    print(f"gold: {len(pairs)} unique rooted lemmas, {len(rootless)} rootless lemmas\n")

    ar_conn = arramooz._connect()
    lane_conn = sqlite3.connect(f"file:{lexicon.DB_PATH}?mode=ro", uri=True)
    stats: Counter[str] = Counter()
    try:
        for lemma, gold in pairs:
            bare = arramooz.bareword(lemma)
            want = camel_roots.weak_fold(arramooz.fold_root(gold))

            camel = camel_roots.analyze(bare)
            camel_ok = camel_hit = False
            if camel and not camel[0].foreign:
                camel_hit = True
                camel_ok = camel_roots.weak_fold(camel[0].letters) == want
            stats["camel_attempted"] += camel_hit
            stats["camel_correct"] += camel_ok

            ar_cands, _ = arramooz.roots_for(bare, ar_conn)
            ar_hit = bool(ar_cands)
            ar_ok = ar_hit and any(
                camel_roots.weak_fold(r) == want for r, _ in ar_cands[:1]
            )
            stats["arramooz_attempted"] += ar_hit
            stats["arramooz_correct"] += ar_ok

            resolved = lexicon._resolve_root(lane_conn, bare)
            lane_hit = bool(resolved)
            lane_ok = lane_hit and camel_roots.weak_fold(
                arramooz.fold_root(resolved[0])
            ) == want
            stats["lane_attempted"] += lane_hit
            stats["lane_correct"] += lane_ok

            # The shipped decision rule: CAMeL leads, others corroborate.
            others = {camel_roots.weak_fold(r) for r, _ in ar_cands}
            if resolved:
                others.add(camel_roots.weak_fold(arramooz.fold_root(resolved[0])))
            if camel_hit:
                fold = camel_roots.weak_fold(camel[0].letters)
                if fold in others:
                    stats["pipeline_published"] += 1
                    stats["pipeline_correct"] += fold == want
                    stats["corroborated"] += 1
                elif camel[0].confidence >= 0.8:
                    stats["pipeline_published"] += 1
                    stats["pipeline_correct"] += fold == want
                    stats["camel_strong"] += 1
                else:
                    stats["pipeline_skipped"] += 1
            else:
                stats["pipeline_skipped"] += 1

        # Does each source correctly DECLINE on rootless tokens?
        for lemma in rootless[:500]:
            bare = arramooz.bareword(lemma)
            camel = camel_roots.analyze(bare)
            declined = not camel or camel[0].foreign
            stats["rootless_total"] += 1
            stats["rootless_camel_declined"] += declined
    finally:
        ar_conn.close()
        lane_conn.close()

    n = len(pairs)
    print(f"{'source':12} {'attempted':>10} {'correct':>9} {'precision':>10} {'recall':>8}")
    for src in ("camel", "arramooz", "lane"):
        att, cor = stats[f"{src}_attempted"], stats[f"{src}_correct"]
        prec = 100 * cor / att if att else 0
        print(f"{src:12} {att:10} {cor:9} {prec:9.1f}% {100 * cor / n:7.1f}%")

    pub, pcor = stats["pipeline_published"], stats["pipeline_correct"]
    print(
        f"\npipeline: publishes {pub}/{n} ({100 * pub / n:.1f}%), "
        f"of which correct {pcor} ({100 * pcor / pub if pub else 0:.1f}% precision)"
    )
    print(
        f"  corroborated {stats['corroborated']}, camel-strong {stats['camel_strong']}, "
        f"skipped {stats['pipeline_skipped']}"
    )
    rt = stats["rootless_total"]
    if rt:
        print(
            f"\nrootless lemmas (particles/determiners): CAMeL correctly declined "
            f"{stats['rootless_camel_declined']}/{rt} "
            f"({100 * stats['rootless_camel_declined'] / rt:.1f}%)"
        )


if __name__ == "__main__":
    main()
