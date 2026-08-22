"""Automated adjudication of root claims — replaces the human review queue.

The judge does NOT re-derive the root from the generator's grounding. That is the
circularity that caused every error found so far; repeating it inside a judge
just launders the same mistake. It is handed independent evidence instead
(build_evidence.py): three root opinions, the headwords Lane's actually files
under the claimed root, and real corpus sentences with translations.

Usage context is decisive for homographs — غار is "cave" because the sentence is
"he would go to the Cave of Hira", not "deceived" — and irrelevant to etymology:
no sentence reveals whether ملائكة descends from أ ل ك or م ل ك. The prompt makes
that distinction explicit so the judge does not invent certainty from context
that cannot carry it.

Run from translate/:  uv run python -m word_enrichment.judge
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

import utils.set_keys  # noqa: F401
from utils.claude_cli import call_claude_cli

BASE = Path(__file__).resolve().parent


class Verdict(BaseModel):
    root_id: int
    verdict: Literal["publish", "fix_root", "fix_senses", "skip"]
    correct_root: str | None = Field(
        None, description="Arabic radicals separated by spaces, when verdict is fix_root"
    )
    bad_senses: list[str] = Field(
        default_factory=list, description="Claimed senses that belong to a different word"
    )
    confidence: float = Field(description="0.0-1.0")
    reason: str = Field(description="One sentence citing which evidence decided it")


class Verdicts(BaseModel):
    verdicts: list[Verdict]


SYSTEM_PROMPT = """\
You are an Arabic lexicographer adjudicating automatically-generated dictionary
entries. Each item gives a WORD, a CLAIMED ROOT, claimed SENSES, and independent
evidence. Decide whether the entry is safe to publish.

The evidence, and how much each is worth:
- camel_morphology: a morphological analyser decomposing the surface form. The
  strongest signal for WHICH root a form derives from. `#` marks a weak radical
  (و/ي), so غ.#.ر is consistent with غ و ر. "foreign": true means it identified a
  non-Arabic/transliterated word.
- arramooz: a dictionary's root field. Reliable for lemmas, silent or wrong for
  inflected forms, proper names and particles.
- lanes_surface_resolver: KNOWN UNRELIABLE. It matches a word that merely OCCURS
  inside an unrelated root's prose. Treat a disagreement here as weak evidence.
- lanes_headwords_under_claimed_root: what Lane's actually files under the
  claimed root. Decisive: if the word's own family (e.g. شَيْطَنَ for شيطان) is
  NOT among them, the claimed root is likely wrong.
- corpus_usage: real sentences with translations.

How to use corpus_usage — this matters:
- It DECIDES homographs. غار is "cave" if the sentence is about the Cave of Hira,
  not "deceived". زاد is "increased" or "provisions" depending on the sentence.
- It CANNOT settle etymology. Whether ملائكة descends from أ ل ك or م ل ك is not
  visible in any sentence. Where classical lexicographers genuinely disagree,
  a defensible traditional derivation is publishable — do NOT overturn Lane's on
  the strength of a modern analyser alone.
- Beware context that merely CO-OCCURS with the word. شيطان appears near
  "driven away" (مدحور) in Qur'anic phrasing; that does not make د ح ر its root.

Verdicts:
- publish   : root is right (or a defensible traditional variant) and senses fit
              the word.
- fix_root  : root is wrong and you can name the right one -> correct_root.
- fix_senses: root is right but one or more senses belong to a DIFFERENT word
              (a common failure when the source entry discusses two roots).
- skip      : a proper name, a particle/pronoun, or a foreign word with no
              derivational root; or you cannot determine the root. Never guess.

Prefer skip over a low-confidence publish. A wrong entry is memorised by
learners; a missing entry costs only coverage.
Two hard rules:
- If evidence.notation_variant_only is true, the sources agree on the RADICALS
  and differ only in how a weak letter is written. That is not an error: verdict
  `publish`. Never `fix_root` on a notation variant.
- Never return `fix_root` unless you are at least 0.70 confident. Below that,
  return `skip`. A confidently wrong root is worse than a missing entry.

Return one verdict per item, same root_id.
"""


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--evidence", default=str(BASE / "evidence.json"))
    ap.add_argument(
        "--out",
        default=str(BASE / "verdicts.json"),
        help="write elsewhere when auditing, so an audit never overwrites the "
             "verdicts build_ts publishes from",
    )
    ap.add_argument(
        "--replace",
        action="store_true",
        help="overwrite the verdicts file instead of merging into it. Only for a "
             "deliberate re-adjudication of everything.",
    )
    args = ap.parse_args()

    bundles = json.loads(Path(args.evidence).read_text(encoding="utf-8"))
    user = (
        "Adjudicate every item below. Return one verdict per root_id.\n\n"
        + json.dumps(bundles, ensure_ascii=False, indent=1)
    )
    result = call_claude_cli(
        [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user}],
        response_model=Verdicts,
        model=os.environ.get("JUDGE_MODEL", "opus"),
    )
    if not result.get("success"):
        print(f"FAILED: {result.get('error')}")
        return

    verdicts = Verdicts.model_validate(result["data"]).verdicts

    # The model does not always return one verdict per item, and nothing used to
    # notice: a 70-bundle run came back with 68, both الله records dropped in
    # silence. build_ts withholds an unjudged record, so nothing wrong ships —
    # but the entry is lost with no signal, which is indistinguishable from a
    # deliberate skip. Ask again for exactly what is missing.
    asked = {b["root_id"] for b in bundles}
    missing = [b for b in bundles if b["root_id"] not in {v.root_id for v in verdicts}]
    if missing:
        print(f"! {len(missing)} item(s) came back without a verdict; retrying those\n")
        retry = call_claude_cli(
            [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": "Adjudicate every item below. Return one verdict per "
                    "root_id.\n\n" + json.dumps(missing, ensure_ascii=False, indent=1),
                },
            ],
            response_model=Verdicts,
            model=os.environ.get("JUDGE_MODEL", "opus"),
        )
        if retry.get("success"):
            extra = Verdicts.model_validate(retry["data"]).verdicts
            verdicts.extend(v for v in extra if v.root_id in asked)

    still = asked - {v.root_id for v in verdicts}
    if still:
        print(f"! STILL unjudged after retry: {sorted(still)} — these stay withheld\n")

    # Merge, do not overwrite. Evidence is normally built with --only-new, so a
    # run holds verdicts for just this batch; writing that straight out would
    # drop every earlier verdict and silently un-publish the words they cleared.
    out = Path(args.out)
    merged: dict[int, dict] = {}
    if out.exists() and not args.replace:
        for v in json.loads(out.read_text(encoding="utf-8")):
            merged[v["root_id"]] = v
    kept = len(merged)
    for v in verdicts:
        merged[v.root_id] = v.model_dump()
    out.write_text(
        json.dumps(sorted(merged.values(), key=lambda v: v["root_id"]), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"{len(verdicts)} new verdict(s); {len(merged)} total "
          f"({kept} carried forward) -> {out}\n")
    for v in sorted(verdicts, key=lambda v: v.verdict):
        extra = f" -> {v.correct_root}" if v.correct_root else ""
        extra += f" bad_senses={v.bad_senses}" if v.bad_senses else ""
        print(f"  {v.root_id:6} {v.verdict:11}{extra}  ({v.confidence:.2f}) {v.reason[:90]}")


if __name__ == "__main__":
    main()
