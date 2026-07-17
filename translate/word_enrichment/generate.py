"""Generate source-grounded word enrichments with Claude Sonnet 5.

For each target word {root_id, letters, meaning}:
  1. resolve its root in Lane's Lexicon and pull grounding (lexicon.lookup),
  2. ask Sonnet 5 (via the repo's `claude --print` wrapper) to SYNTHESISE a
     structured, learner-friendly enrichment grounded ONLY in that excerpt,
  3. attach provenance and append to word_enrichment/enriched.jsonl (resumable).

Read-only: touches no database and never reproduces the source verbatim — the
Lane's text is grounding for synthesis; the published output is original + cited.

Run from the translate/ root:  uv run python word_enrichment/generate.py --input word_enrichment/targets.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import utils.set_keys  # noqa: F401  (harmless env bootstrap; keeps config import happy)
from utils.claude_cli import call_claude_cli

from word_enrichment import lexicon
from word_enrichment.schema import WordEnrichment

OUT = Path(__file__).resolve().parent / "enriched.jsonl"
SKIPPED = Path(__file__).resolve().parent / "skipped.jsonl"

SYSTEM_PROMPT = """\
You write concise, accurate reference content for an Arabic-learning dictionary
(learners reading classical/Qur'anic texts). For one Arabic word you are given a
grounding excerpt from Lane's Arabic-English Lexicon (public domain) plus the
word's existing English gloss.

HARD RULES — non-negotiable:
- Ground every factual claim in the supplied excerpt or the given gloss. If the
  excerpt does not support something, DO NOT state it. Never invent meanings,
  roots, derived words, or etymology.
- SYNTHESISE in your own words. Do NOT copy sentences from the excerpt verbatim;
  the excerpt is a source to distil, not text to reproduce.
- Keep it clean and plain — no flowery filler. A learner wants: the root, the
  real senses, a few notable words from the same root, and how it's used.
- Transliteration: use standard academic romanisation with diacritics
  (e.g. ḥamd, muḥammad, ʿilm). Every Arabic string you emit must be consistent
  with the grounding (a form the root actually produces).
- word_family: pick the most useful, genuinely distinct derivations that appear
  in the grounding (the headword list). Give each a short meaning.
- faq: 1–2 items. The first MUST be phrased "How do you say \"<english meaning>\"
  in Arabic?" with a short direct answer.
Return ONLY the structured object requested.
"""

USER_TEMPLATE = """\
WORD (Arabic): {letters}
EXISTING ENGLISH GLOSS: {meaning}
TRILITERAL ROOT (from Lane's): {root}  [transliteration hint: {broot}]
NOTABLE HEADWORDS UNDER THIS ROOT (Arabic + verb form where known):
{derived}

LANE'S LEXICON GROUNDING EXCERPT (public domain — distil, do not copy):
<excerpt>
{excerpt}
</excerpt>

Produce the enrichment for the WORD above, grounded strictly in the excerpt + gloss.
"""


def _load_seen(path: Path) -> set[int]:
    seen: set[int] = set()
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                try:
                    seen.add(json.loads(line)["root_id"])
                except (json.JSONDecodeError, KeyError):
                    pass
    return seen


def _append(path: Path, obj: dict) -> None:
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(obj, ensure_ascii=False) + "\n")


def generate_one(target: dict, model: str) -> tuple[str, dict]:
    """Return ('ok'|'no_grounding'|'error', record)."""
    root_id = int(target["root_id"])
    letters = target["letters"]
    meaning = target["meaning"]

    grounding = lexicon.lookup(letters)
    if not grounding or not grounding.is_usable():
        return "no_grounding", {"root_id": root_id, "letters": letters, "meaning": meaning}

    derived = "\n".join(
        f"- {d['word']}" + (f" (form {d['form']})" if d["form"] else "")
        for d in grounding.derived_forms[:24]
    )
    user = USER_TEMPLATE.format(
        letters=letters,
        meaning=meaning,
        root=grounding.root,
        broot=grounding.broot,
        derived=derived,
        excerpt=grounding.text,
    )
    result = call_claude_cli(
        [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user}],
        response_model=WordEnrichment,
        model=model,
    )
    if not result.get("success"):
        return "error", {"root_id": root_id, "letters": letters, "error": result.get("error")}

    enrichment = WordEnrichment.model_validate(result["data"])
    record = {
        "root_id": root_id,
        "letters": letters,
        "meaning": meaning,
        "source": lexicon.SOURCE_NAME,
        "source_url": lexicon.SOURCE_URL,
        **enrichment.model_dump(),
    }
    return "ok", record


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="JSON list of {root_id, letters, meaning}")
    ap.add_argument("--model", default="sonnet", choices=["sonnet", "opus", "haiku"])
    ap.add_argument("--limit", type=int, default=0, help="0 = all")
    args = ap.parse_args()

    targets = json.loads(Path(args.input).read_text(encoding="utf-8"))
    if args.limit:
        targets = targets[: args.limit]
    seen = _load_seen(OUT)

    ok = skip = err = 0
    for t in targets:
        rid = int(t["root_id"])
        if rid in seen:
            continue
        status, record = generate_one(t, args.model)
        if status == "ok":
            _append(OUT, record)
            ok += 1
            print(f"  ✓ {rid} {t['letters']} ({t['meaning']}) → {len(record['senses'])} senses, "
                  f"{len(record['word_family'])} family")
        elif status == "no_grounding":
            _append(SKIPPED, {**record, "reason": "no_grounding"})
            skip += 1
            print(f"  – {rid} {t['letters']} ({t['meaning']}) → no Lane's grounding, skipped")
        else:
            err += 1
            print(f"  ✗ {rid} {t['letters']} → error: {record.get('error')}")

    print(f"\nDone. ok={ok} skipped={skip} errors={err}. Output → {OUT}")


if __name__ == "__main__":
    main()
