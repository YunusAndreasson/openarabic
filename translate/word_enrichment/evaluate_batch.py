"""Measure a generation batch — yield, gate, judge, and content shape.

Written because "it ran" is not the same as "it worked". Every number here is
one the pipeline can regress on silently: a target list that spends its budget
on words Lane's has never heard of, a family list full of obscure derivations, a
gate that passes things the judge never sees.

`--baseline` diffs one batch against another. A single batch's numbers only say
what happened; a prompt or schema change is only demonstrated by the delta, and
an unrelated regression only shows up as one. Batch 1 is kept as
targets_batch1.json for exactly that.

Run from translate/:
  uv run python -m word_enrichment.evaluate_batch
  uv run python -m word_enrichment.evaluate_batch --baseline word_enrichment/targets_batch1.json
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path

BASE = Path(__file__).resolve().parent

# Metrics where a HIGHER number is the better outcome. Everything else reads as
# a cost, so a rise is a regression — stated once here rather than re-decided at
# each print site, where "up is good" and "up is bad" are equally easy to write.
HIGHER_IS_BETTER = {
    "generated_pct",
    "verified_pct",
    "judge_publish_pct",
    "root_meaning_present_pct",
    "usage_note_present_pct",
}


def load(name: str) -> list[dict]:
    p = BASE / name
    if not p.exists():
        return []
    return [json.loads(l) for l in p.read_text(encoding="utf-8").splitlines() if l.strip()]


def pct(n: int, d: int) -> str:
    return f"{100 * n / d:5.1f}%" if d else "    n/a"


def _p(n: int, d: int) -> float:
    return 100.0 * n / d if d else 0.0


def section(title: str) -> None:
    print(f"\n{title}\n{'-' * len(title)}")


def metrics(targets_path: Path) -> dict:
    """Every number this report makes, keyed, so two batches can be diffed."""
    targets = json.loads(targets_path.read_text(encoding="utf-8"))
    ids = {t["root_id"] for t in targets}
    sel = lambda name, key="root_id": [r for r in load(name) if r.get(key) in ids]  # noqa: E731
    enriched, skipped = sel("enriched.jsonl"), sel("skipped.jsonl")
    verified, review, flagged = sel("verified.jsonl"), sel("review.jsonl"), sel("flagged.jsonl")
    routed = len(verified) + len(review) + len(flagged)

    verdicts = {}
    vp = BASE / "verdicts.json"
    if vp.exists():
        verdicts = {
            v["root_id"]: v
            for v in json.loads(vp.read_text(encoding="utf-8"))
            if v["root_id"] in ids
        }

    have = [r for r in enriched if (r.get("root_meaning") or "").strip()]
    rm_words = sorted(len(r["root_meaning"].split()) for r in have)
    sizes = sorted(len(r.get("word_family") or []) for r in enriched)
    glosses = [m["meaning"] for r in enriched for m in (r.get("word_family") or [])]
    gw = sorted(len(g.split()) for g in glosses)
    meta = [g for g in glosses if re.match(r"^(Form [IVX]+|verbal noun|active participle)", g, re.I)]
    notes = sorted(len(r["usage_note"].split()) for r in enriched if r.get("usage_note"))
    med = lambda xs: xs[len(xs) // 2] if xs else 0  # noqa: E731

    return {
        "_targets": targets,
        "_enriched": enriched,
        "_verdicts": verdicts,
        "targets": len(targets),
        "generated": len(enriched),
        "generated_pct": _p(len(enriched), len(targets)),
        "no_grounding": len(skipped),
        "no_grounding_pct": _p(len(skipped), len(targets)),
        "unaccounted": len(targets) - len(enriched) - len(skipped),
        "verified": len(verified),
        "verified_pct": _p(len(verified), routed),
        "review": len(review),
        "review_pct": _p(len(review), routed),
        "flagged": len(flagged),
        "flagged_pct": _p(len(flagged), routed),
        "judge_publish_pct": _p(
            sum(1 for v in verdicts.values() if v["verdict"] == "publish"), len(verdicts)
        ),
        "root_meaning_present_pct": _p(len(have), len(enriched)),
        "root_meaning_median_words": med(rm_words),
        "root_meaning_max_words": rm_words[-1] if rm_words else 0,
        "root_meaning_over_cap_pct": _p(sum(1 for w in rm_words if w > 6), len(rm_words)),
        "family_median_members": med(sizes),
        "family_max_members": sizes[-1] if sizes else 0,
        "family_gloss_median_words": med(gw),
        "family_gloss_max_words": gw[-1] if gw else 0,
        "family_gloss_over_8_pct": _p(sum(1 for w in gw if w > 8), len(gw)),
        "family_gloss_metadata_pct": _p(len(meta), len(glosses)),
        "usage_note_present_pct": _p(len(notes), len(enriched)),
        "usage_note_median_words": med(notes),
        "usage_note_max_words": notes[-1] if notes else 0,
    }


def render(m: dict) -> None:
    t = m["targets"]
    section("YIELD — where the budget went")
    print(f"  targets picked        {t:5}")
    print(f"  generated             {m['generated']:5}  {pct(m['generated'], t)}")
    print(f"  no Lane's grounding   {m['no_grounding']:5}  {pct(m['no_grounding'], t)}"
          "   <- cheap, but pure waste of a target slot")
    if m["unaccounted"]:
        print(f"  unaccounted           {m['unaccounted']:5}   (errors, or run incomplete)")

    section("BASIS — how each target's root was decided")
    for k, v in Counter(x.get("_basis") for x in m["_targets"]).most_common():
        print(f"  {str(k):16} {v:5}  {pct(v, t)}")

    section("GATE — verify.py routing")
    print(f"  verified (passed)     {m['verified']:5}  {m['verified_pct']:5.1f}%")
    print(f"  review   (to judge)   {m['review']:5}  {m['review_pct']:5.1f}%")
    print(f"  flagged               {m['flagged']:5}  {m['flagged_pct']:5.1f}%")
    print(f"\n  NOTE: only the {m['review']} review records ever reach the judge.")
    print(f"        The {m['verified']} verified ones publish unadjudicated.")

    if m["_verdicts"]:
        section("JUDGE — verdicts on the review queue")
        for k, v in Counter(x["verdict"] for x in m["_verdicts"].values()).most_common():
            print(f"  {k:12} {v:5}  {pct(v, len(m['_verdicts']))}")

    section("root_meaning — the one-line summary the app leads with")
    print(f"  present               {m['root_meaning_present_pct']:5.1f}%")
    print(f"  words: median {m['root_meaning_median_words']}  max {m['root_meaning_max_words']}")
    print(f"  over the 6-word cap   {m['root_meaning_over_cap_pct']:5.1f}%")

    section("word_family — the section that teaches the root")
    print(f"  members per record: median {m['family_median_members']}  max {m['family_max_members']}"
          "   (schema caps at 5)")
    print(f"  gloss words: median {m['family_gloss_median_words']}  max {m['family_gloss_max_words']}")
    print(f"  glosses over 8 words  {m['family_gloss_over_8_pct']:5.1f}%"
          "   <- each is 2-3 lines on a phone")
    print(f"  starting with grammar metadata {m['family_gloss_metadata_pct']:5.1f}%")

    section("USAGE NOTE — the expanded body in the reader sheet")
    print(f"  present               {m['usage_note_present_pct']:5.1f}%")
    print(f"  words: median {m['usage_note_median_words']}  max {m['usage_note_max_words']}")


def compare(now: dict, before: dict, label: str) -> None:
    section(f"DELTA vs {label}")
    print(f"  {'metric':34} {'before':>9} {'now':>9} {'change':>10}")
    for key in now:
        if key.startswith("_") or not isinstance(now[key], (int, float)):
            continue
        a, b = before.get(key), now[key]
        if a is None:
            continue
        delta = b - a
        if abs(delta) < 0.05:
            mark = "  ="
        elif (delta > 0) == (key in HIGHER_IS_BETTER):
            mark = " ok"
        else:
            mark = "  !"
        fmt = "{:9.1f}" if key.endswith("_pct") else "{:9.0f}"
        print(f"  {key:34} {fmt.format(a)} {fmt.format(b)} {delta:+9.1f}{mark}")
    print("\n  ok = moved the right way   ! = moved the wrong way   = unchanged")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--targets", default=str(BASE / "targets_rooted.json"))
    ap.add_argument("--baseline", help="a second targets file to diff against")
    args = ap.parse_args()

    now = metrics(Path(args.targets))
    render(now)
    if args.baseline:
        compare(now, metrics(Path(args.baseline)), Path(args.baseline).name)


if __name__ == "__main__":
    main()
