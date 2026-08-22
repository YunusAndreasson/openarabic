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
from utils.claude_cli import call_claude_cli, summarise_usage

from word_enrichment import lexicon, root_normalize, root_translit

BASE = Path(__file__).resolve().parent
from word_enrichment.root_schema import RootExplanation
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
- root_meaning: the sense the ROOT carries across the whole family, in at most
  six words, lower-case, no final full stop (e.g. "to turn, invert, change").
  This is what every word in word_family has in common — not a restatement of
  this word's own gloss. If the grounding does not support one shared sense,
  give the plainest one it does support.
- word_family: AT MOST 5 members, and pick the ones a learner is most likely to
  meet, not the rarest the excerpt happens to list. Each `meaning` must be AT
  MOST 8 words — a gloss, not a definition. No grammar metadata in the gloss
  ("Form II:", "verbal noun of...") and no parenthetical asides; the reader
  wants to know what the word means, and anything longer renders as three lines
  of prose in a phone-sized list. Say "a dug well" not "a (dug) well — from the
  sense of earth being turned over in digging".
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


ROOT_SYSTEM_PROMPT = """\
You write concise, accurate reference content for an Arabic-learning dictionary
(learners reading classical/Qur'anic texts). You are given ONE triliteral root,
the headwords our dictionary files under it, and a grounding excerpt from Lane's
Arabic-English Lexicon (public domain).

You are describing the ROOT, not any single word. What you write is shown under
EVERY headword built on these radicals, so it must be true of all of them.

HARD RULES — non-negotiable:
- Ground every claim in the supplied excerpt. Never invent meanings, derived
  words, or etymology. If the excerpt does not support it, do not say it.
- SYNTHESISE in your own words; the excerpt is a source to distil, not to copy.
- Never write "this word is…", "the verbal noun of…", or anything that singles
  out one headword — that text would be false under the other headwords.
- Transliteration: standard academic romanisation with diacritics (ḥamd, ʿilm,
  qalīb).
- word_family: AT MOST 5 WORDS BUILT ON THE ROOT. Each `letters` MUST be Arabic
  script, fully vocalised with diacritics — عِلْم, never the transliteration
  ʿilm, and never the bare skeleton علم. Put the romanisation in
  `transliteration`, which is the only field that takes Latin letters. Do NOT
  list the root itself as a member; list actual words derived from it. Each
  meaning AT MOST 8 words, no grammar metadata, no parenthetical asides.
- root_meaning: at most six words, lower-case, no final full stop.
Return ONLY the structured object requested.
"""

ROOT_USER_TEMPLATE = """\
TRILITERAL ROOT: {root}  [transliteration hint: {broot}]

HEADWORDS OUR DICTIONARY FILES UNDER THIS ROOT ({count} in total, sample):
{headwords}

NOTABLE HEADWORDS UNDER THIS ROOT IN LANE'S (Arabic + verb form where known):
{derived}

LANE'S LEXICON GROUNDING EXCERPT (public domain — distil, do not copy):
<excerpt>
{excerpt}
</excerpt>

Produce the root explanation, grounded strictly in the excerpt.
"""


def generate_root_one(target: dict, model: str, provider: str) -> tuple[str, dict]:
    """One shared record for a root. Returns ('ok'|'no_grounding'|'error', record).

    The grounding is already root-scoped: `lexicon.lookup` uses `root_hint` to
    resolve and then pulls every entry filed under that root, so the `word`
    argument only matters when no hint is given.
    """
    root = target["root"]
    words = target.get("headwords") or []
    grounding = lexicon.lookup(words[0]["letters"] if words else root, root_hint=root)
    if not grounding or not grounding.is_usable():
        return "no_grounding", {"root_key": target["root_key"], "root": root}

    derived = "\n".join(
        f"- {d['word']}" + (f" (form {d['form']})" if d["form"] else "")
        for d in grounding.derived_forms[:24]
    )
    user = ROOT_USER_TEMPLATE.format(
        root=grounding.root,
        broot=grounding.broot,
        count=target.get("headword_count", len(words)),
        headwords="\n".join(f"- {w['letters']} — {w['meaning']}" for w in words[:12]),
        derived=derived,
        excerpt=grounding.text,
    )
    messages = [
        {"role": "system", "content": ROOT_SYSTEM_PROMPT},
        {"role": "user", "content": user},
    ]
    if provider == "openrouter":
        from utils.openrouter_structured import call_openrouter

        result = call_openrouter(messages, response_model=RootExplanation,
                                 model=None if model in ("sonnet", "opus", "haiku") else model)
    else:
        result = call_claude_cli(messages, response_model=RootExplanation, model=model)

    if not result.get("success"):
        return "error", {"root_key": target["root_key"], "root": root,
                         "error": result.get("error"), "_usage": result.get("usage")}

    rec = RootExplanation.model_validate(result["data"]).model_dump()

    # Strict decoding guarantees a string is present, not that it obeys any of the
    # rules the prompt states. Everything root_normalize checks was broken by a
    # real model in a five-root trial.
    rec, problems = root_normalize.normalize(rec, target["root_key"])
    if problems:
        return "error", {"root_key": target["root_key"], "root": root,
                         "error": "; ".join(problems), "_usage": result.get("usage")}

    record = {
        "root_key": target["root_key"],
        # Derived, never generated — see root_schema.
        "triliteral_root": root_translit.spaced(grounding.root),
        "root_transliteration": root_translit.transliterate(grounding.root),
        "source": lexicon.SOURCE_NAME,
        "source_url": lexicon.SOURCE_URL,
        **rec,
        "_usage": result.get("usage"),
    }
    return "ok", record


# ---------------------------------------------------------------------------
# Pool mode: the model SELECTS from attested forms instead of writing them.
#
# The prompt below is deliberately short. The old root prompt shipped a whole
# Lane's entry as an excerpt and asked the model to compose a record from it,
# which is what made a 200-word batch cost ~$20.80. Here the sources have already
# been read; what arrives is ~20 lines of candidates, and the task is a choice
# plus a rewrite. Input drops by roughly an order of magnitude, and -- the part
# that actually dominated the bill -- there is far less for a reasoning model to
# deliberate about.
# ---------------------------------------------------------------------------

ROOT_POOL_SYSTEM_PROMPT = """\
You write short reference content for an Arabic-learning dictionary, for learners
reading classical and Qur'anic texts.

You are given ONE root and a numbered list of words that are ATTESTED for it in
Lane's Lexicon and in a morphological database. Your job is to CHOOSE from that
list and to rewrite the English. It is not to recall Arabic.

HARD RULES:
- `letters` MUST be copied character-for-character from a CANDIDATE line. Never
  re-spell, re-point, or substitute a word, and never supply one that is not
  listed. Anything else is rejected and the whole record is thrown away.
- Choose the words a learner is most likely to actually meet. Prefer lines marked
  [in our dictionary]; they are the ones the app can link to.
- Do not choose two forms of the same word (a verb and that verb with a pronoun
  attached). Spread the choice across different shapes: a verb, a noun, an actor,
  a place or an abstract noun.
- Rewrite each meaning in plain modern English, at most 8 words. Prefer the
  'modern:' gloss. Lane's wording is 1863 prose and frequently gives a sub-sense
  or an idiom rather than the word's core meaning -- if the two disagree, trust
  'modern:'. If a Lane gloss is archaic or opaque, say what the word means today.
- What you write is shown under EVERY word built on these radicals, so never
  write "this word...", "the verbal noun of...", or anything true of only one.
Return ONLY the structured object requested.
"""

ROOT_POOL_USER_TEMPLATE = """\
ROOT: {root}   ({broot})

CANDIDATE WORDS -- choose only from these lines:
{candidates}

Choose up to 5. Copy each `letters` exactly as written above, rewrite its
meaning, then write `root_meaning` (at most 6 words) and a `usage_note` of two or
three sentences about the ROOT itself.
"""


def generate_root_from_pool(
    target: dict,
    model: str,
    provider: str,
    conn,
    dict_index: dict,
    reasoning_effort: str | None = None,
) -> tuple[str, dict]:
    """One root record, assembled by selection. ('ok'|'no_pool'|'error', record)."""
    from word_enrichment import pool as pool_mod
    from word_enrichment.root_schema import RootExplanationFromPool

    root = target["root"]
    candidates = pool_mod.build(conn, root, dict_index, limit=20)
    if len(candidates) < root_normalize.MIN_FAMILY:
        return "no_pool", {"root_key": target["root_key"], "root": root,
                           "pool_size": len(candidates)}

    by_key = {c.key: c for c in candidates}
    lines = []
    for c in candidates:
        mark = "  [in our dictionary]" if c.root_id is not None else ""
        lines.append(c.prompt_line() + mark)

    messages = [
        {"role": "system", "content": ROOT_POOL_SYSTEM_PROMPT},
        {"role": "user", "content": ROOT_POOL_USER_TEMPLATE.format(
            root=root_translit.spaced(root),
            broot=root_translit.transliterate(root),
            candidates="\n".join(lines),
        )},
    ]

    if provider == "openrouter":
        from utils.openrouter_structured import call_openrouter

        result = call_openrouter(
            messages, response_model=RootExplanationFromPool,
            model=None if model in ("sonnet", "opus", "haiku") else model,
            reasoning_effort=reasoning_effort,
        )
    else:
        result = call_claude_cli(messages, response_model=RootExplanationFromPool,
                                 model=model)

    if not result.get("success"):
        return "error", {"root_key": target["root_key"], "root": root,
                         "error": result.get("error"), "_usage": result.get("usage")}

    rec = RootExplanationFromPool.model_validate(result["data"]).model_dump()

    # Attach what was never asked for. Each value comes from the pool row the
    # model chose, so it is the source's, not the model's.
    for member in rec.get("word_family") or []:
        chosen = pool_mod.resolve(member.get("letters", ""), candidates)
        if chosen is not None:
            # The pool's spelling wins over the model's, always. The model's job
            # was to choose a row, not to reproduce its pointing.
            member["letters"] = chosen.letters
        member["transliteration"] = chosen.transliteration if chosen else ""
        member["wazn"] = chosen.wazn if chosen else ""
        member["verb_form"] = chosen.verb_form if chosen else ""
        member["plural"] = chosen.plural if chosen else ""
        member["root_id"] = chosen.root_id if chosen else None
        member["_exact_link"] = bool(chosen and chosen.exact_link)

    # Last line of defence on the link. Two members must never open the same
    # screen: "teach" and "knowledge" both landing on عِلْم is worse than "teach"
    # not being tappable. A precise (vocalised) match keeps the link; a merely
    # skeletal one loses it and the row renders as plain text.
    claimed: dict[int, dict] = {}
    for member in rec.get("word_family") or []:
        root_id = member.get("root_id")
        if root_id is None:
            continue
        holder = claimed.get(root_id)
        if holder is None:
            claimed[root_id] = member
        elif member.get("_exact_link") and not holder.get("_exact_link"):
            holder["root_id"] = None      # the precise match takes it over
            claimed[root_id] = member
        else:
            member["root_id"] = None
    for member in rec.get("word_family") or []:
        member.pop("_exact_link", None)

    rec, problems = root_normalize.normalize(rec, target["root_key"],
                                             pool_keys=set(by_key))
    if problems:
        return "error", {"root_key": target["root_key"], "root": root,
                         "error": "; ".join(problems), "_usage": result.get("usage")}

    return "ok", {
        "root_key": target["root_key"],
        "triliteral_root": root_translit.spaced(root),
        "root_transliteration": root_translit.transliterate(root),
        "source": lexicon.SOURCE_NAME,
        "source_url": lexicon.SOURCE_URL,
        "pool_size": len(candidates),
        **rec,
        "_usage": result.get("usage"),
    }


def _probe_roots(n: int) -> list[dict]:
    """N roots spread across the frequency distribution, skip-list excluded.

    NOT the busiest N. Pool size and headword count both fall off steeply, so the
    top of the list is the cheapest and most richly-sourced part of the corpus;
    probing only there would understate what the remaining 1,700 roots cost. This
    walks the frequency-ranked list at an even stride instead, so the sample
    carries the same mix of fat and thin roots the real run will.
    """
    import json as _json
    from collections import Counter

    base = Path(__file__).resolve().parent
    records = [_json.loads(line) for line in (base / "ledger.jsonl").open(encoding="utf-8")]
    freq = Counter(r["root_hint"] for r in records if r.get("root_hint"))

    skip_path = base / "pool_skip.json"
    skip = set(_json.loads(skip_path.read_text(encoding="utf-8"))) if skip_path.exists() else set()

    ranked = [(root, count) for root, count in freq.most_common() if root not in skip]
    if not ranked:
        return []
    stride = max(len(ranked) // n, 1)
    picked = ranked[::stride][:n]
    return [{"root_key": root, "root": root, "headword_count": count}
            for root, count in picked]


def probe(n: int, model: str, provider: str, workers: int) -> None:
    """Measure what a root actually costs, print it, and STOP.

    There is no flag that turns this into a full run, and that is the point. Cost
    on this pipeline has been wrong by more than an order of magnitude in both
    directions -- a 200-word batch that arithmetic said would be about a dollar
    billed roughly $20.80, because the reasoning trace is charged as output and
    nothing in the prompt budget predicted it. So the number is measured on the
    real prompt, at the real pool sizes, and a human decides what happens next.

    Reasoning off and on are both measured for the same reason: which one is
    cheaper per USABLE record is not obvious. Cheaper calls that fail validation
    are not cheaper.
    """
    import sqlite3
    from collections import Counter
    from concurrent.futures import ThreadPoolExecutor, as_completed

    from word_enrichment import pool as pool_mod

    base = Path(__file__).resolve().parent
    targets = _probe_roots(n)
    if not targets:
        print("no probe targets — is ledger.jsonl present?")
        return

    import json as _json
    records = [_json.loads(line) for line in (base / "ledger.jsonl").open(encoding="utf-8")]
    print(f"building the dictionary index over {len(records)} entries…", flush=True)
    dict_index = pool_mod.dictionary_index(records)

    freq = Counter(r["root_hint"] for r in records if r.get("root_hint"))
    skip_path = base / "pool_skip.json"
    skip = set(_json.loads(skip_path.read_text(encoding="utf-8"))) if skip_path.exists() else set()
    generatable = [r for r in freq if r not in skip]
    covered = sum(freq[r] for r in generatable)

    print(f"probing {len(targets)} roots "
          f"(headword counts {targets[0]['headword_count']}…{targets[-1]['headword_count']})")
    print(f"corpus to project onto: {len(generatable)} roots / {covered} headwords\n")

    rows = []
    for effort in ("none", "low"):
        conns = {}

        def _one(t, _effort=effort):
            import threading
            key = threading.get_ident()
            if key not in conns:
                conns[key] = sqlite3.connect(
                    f"file:{lexicon.DB_PATH}?mode=ro", uri=True, check_same_thread=False)
            return t, *generate_root_from_pool(
                t, model, provider, conns[key], dict_index, reasoning_effort=_effort)

        ok = err = nopool = 0
        spend = 0.0
        tok_in = tok_out = 0
        failures: list[str] = []
        with ThreadPoolExecutor(max_workers=workers) as ex:
            futures = [ex.submit(_one, t) for t in targets]
            for fut in as_completed(futures):
                try:
                    t, status, rec = fut.result()
                except Exception as exc:  # noqa: BLE001
                    err += 1
                    failures.append(str(exc)[:90])
                    continue
                usage = rec.pop("_usage", None) or {}
                spend += float(usage.get("cost_usd") or 0.0)
                tok_in += usage.get("input", 0)
                tok_out += usage.get("output", 0)
                if status == "ok":
                    ok += 1
                elif status == "no_pool":
                    nopool += 1
                else:
                    err += 1
                    failures.append(f"{t['root']}: {rec.get('error', '')[:80]}")

        attempted = ok + err
        rows.append({
            "effort": effort, "ok": ok, "err": err, "no_pool": nopool,
            "spend": spend, "tok_in": tok_in, "tok_out": tok_out,
            "per_call": spend / max(attempted, 1),
            "per_usable": spend / max(ok, 1),
            "yield": ok / max(attempted, 1),
        })
        print(f"reasoning={effort:5s}  ok={ok:3d} err={err:3d} no_pool={nopool:2d}  "
              f"in={tok_in:6d} out={tok_out:6d}  ${spend:.4f}")
        for line in failures[:6]:
            print(f"     ✗ {line}")
        print(flush=True)

    print("=" * 78)
    print(f"{'reasoning':<10} {'yield':>7} {'$/call':>10} {'$/usable':>10} "
          f"{'out tok/call':>13} {'PROJECTED':>12}")
    print("-" * 78)
    for r in rows:
        attempted = r["ok"] + r["err"]
        projected = r["per_usable"] * len(generatable)
        print(f"{r['effort']:<10} {r['yield'] * 100:6.0f}% {r['per_call']:>10.4f} "
              f"{r['per_usable']:>10.4f} {r['tok_out'] / max(attempted, 1):>13.0f} "
              f"{'$' + format(projected, '.2f'):>12}")
    print("=" * 78)
    print("PROJECTED = $/usable-record x the whole generatable corpus, retries included.")
    print("\nProbe complete. This command cannot start a full run — that is deliberate.")
    print("To generate, re-run without --probe once you have decided on a setting.")


def _load_seen(path: Path, key: str = "root_id") -> set:
    """Identifiers already written to `path`, so a re-run resumes rather than repeats.

    `key` because the two modes are keyed differently: a word record by the
    integer headword id, a root record by the normalised radicals.
    """
    seen: set = set()
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                try:
                    seen.add(json.loads(line)[key])
                except (json.JSONDecodeError, KeyError):
                    pass
    return seen


def _append(path: Path, obj: dict) -> None:
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(obj, ensure_ascii=False) + "\n")


def _upsert(path: Path, obj: dict, key: str = "root_id") -> bool:
    """Replace the record with this root_id, or append it. Returns True if replaced.

    Regeneration must not leave two records for one word: verify.py walks every
    line, and build_ts keys a dict by root_id where the later line silently wins.
    Keeping one record per root_id makes that explicit instead of order-dependent.
    """
    if not path.exists():
        _append(path, obj)
        return False
    kept, replaced = [], False
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            existing = json.loads(line)
        except json.JSONDecodeError:
            kept.append(line)
            continue
        if existing.get(key) == obj[key]:
            replaced = True
            continue
        kept.append(line)
    kept.append(json.dumps(obj, ensure_ascii=False))
    path.write_text("\n".join(kept) + "\n", encoding="utf-8")
    return replaced


def generate_one(target: dict, model: str, provider: str = "claude") -> tuple[str, dict]:
    """Return ('ok'|'no_grounding'|'error', record)."""
    root_id = int(target["root_id"])
    letters = target["letters"]
    meaning = target["meaning"]

    # An externally-corroborated root bypasses the surface-form resolver, which
    # is this pipeline's main error source (it matches words that merely occur
    # inside an unrelated root's prose). See verify.py / arramooz.py.
    root_hint = target.get("root_hint")
    grounding = lexicon.lookup(letters, root_hint=root_hint)
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
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user},
    ]
    if provider == "openrouter":
        from utils.openrouter_structured import call_openrouter

        result = call_openrouter(messages, response_model=WordEnrichment,
                                 model=None if model in ("sonnet", "opus", "haiku") else model)
    else:
        result = call_claude_cli(messages, response_model=WordEnrichment, model=model)
    if not result.get("success"):
        return "error", {"root_id": root_id, "letters": letters, "error": result.get("error"),
                         "_usage": result.get("usage")}

    enrichment = WordEnrichment.model_validate(result["data"])
    record = {
        "root_id": root_id,
        "letters": letters,
        "meaning": meaning,
        "source": lexicon.SOURCE_NAME,
        "source_url": lexicon.SOURCE_URL,
        **enrichment.model_dump(),
    }
    if root_hint:
        record["_root_hint"] = root_hint
    # Kept off the record written to disk (see _record) — it describes the call,
    # not the word.
    record["_usage"] = result.get("usage")
    return "ok", record


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--probe",
        type=int,
        default=0,
        help="measure cost on N roots and EXIT. Picks its own stratified sample, "
             "runs reasoning off and on, prints $/usable-record and the projection "
             "to the whole corpus. It cannot continue into a full run.",
    )
    ap.add_argument("--input", required=False,
                    help="word mode: [{root_id, letters, meaning}]. "
                         "root mode: [{root_key, root, headwords}]")
    ap.add_argument(
        "--mode",
        default="word",
        choices=["word", "root", "root-legacy"],
        help="`word` writes one record per dictionary headword. `root` writes ONE "
             "record per set of radicals, shared by every headword built on them "
             "— 1,687 roots span 13,136 headwords, and 38%% of the word-mode "
             "records generated so far re-derived a root already covered.",
    )
    ap.add_argument(
        "--provider",
        default="openrouter",
        choices=["claude", "openrouter"],
        help="`claude` runs `claude --print`, which boots a Claude Code harness "
             "per word (measured: 45,838 prefix tokens and ~6,258 output tokens "
             "for a ~500-token record) and bills a Max subscription. `openrouter` "
             "is a plain POST that sends the prompt and nothing else, billed as "
             "metered credit. DEFAULTS TO openrouter: this pipeline is not allowed "
             "to spend the Max subscription, and a default that could is one "
             "forgotten flag away from a bill. Choosing `claude` must be deliberate.",
    )
    ap.add_argument("--model", default="sonnet",
                    help="claude: sonnet|opus|haiku. openrouter: a model id, or "
                         "omit for DEEPSEEK_MODEL.")
    ap.add_argument("--limit", type=int, default=0, help="0 = all")
    ap.add_argument(
        "--reasoning",
        default="none",
        choices=["none", "low", "medium", "high"],
        help="openrouter only. Defaults to `none` because the probe measured the "
             "reasoning trace, billed as output, at ~18x the tokens of the record "
             "itself for no gain in yield on a select-and-rewrite task.",
    )
    ap.add_argument(
        "--force",
        action="store_true",
        help="regenerate targets already in enriched.jsonl, replacing the old record",
    )
    ap.add_argument(
        "--workers",
        type=int,
        default=1,
        help="parallel CLI calls. Measured 3.1x at 8 workers; each call is an "
             "independent `claude --print` subprocess with no shared state.",
    )
    ap.add_argument(
        "--out",
        default=None,
        help="write records here instead of enriched.jsonl (use for benchmark runs "
             "so throwaway output never reaches verify/build_ts)",
    )
    args = ap.parse_args()

    # Before anything else, and it returns rather than falling through: a probe
    # that could slide into a full run would not be a cost gate.
    if args.probe:
        probe(args.probe, args.model, args.provider, max(args.workers, 1))
        return

    if not args.input:
        ap.error("--input is required unless --probe is given")

    if args.provider == "claude":
        # Not a block — there are legitimate one-off uses — but never silent.
        # `claude --print` boots a whole Claude Code harness per call (measured at
        # 45,838 prefix tokens for a ~500-token record) and bills the Max
        # subscription, which is what made a 200-word batch cost ~$20.80.
        print("WARNING: --provider claude bills the Max subscription and boots a "
              "harness per call.\n         The measured cost is ~50x openrouter "
              "for this task. Ctrl-C now if unintended.", flush=True)

    out_path = Path(args.out) if args.out else OUT
    skipped_path = out_path.with_name(out_path.stem + ".skipped.jsonl") if args.out else SKIPPED

    is_root = args.mode in ("root", "root-legacy")
    key = "root_key" if is_root else "root_id"
    ident = (lambda t: t["root_key"]) if is_root else (lambda t: int(t["root_id"]))
    label = (lambda t: f"{t['root']} ({t.get('headword_count', '?')} headwords)"
             if is_root else f"{t['letters']} ({t['meaning']})")

    targets = json.loads(Path(args.input).read_text(encoding="utf-8"))
    if args.limit:
        targets = targets[: args.limit]
    seen = set() if args.force else _load_seen(out_path, key)

    pending = [t for t in targets if ident(t) not in seen]

    # Built once, outside _run: the dictionary index costs a CAMeL analysis of all
    # 15,227 entries, and the sqlite handle is per-thread because a connection
    # cannot be shared across them.
    pool_state: dict = {}
    if args.mode == "root":
        import sqlite3
        import threading

        from word_enrichment import pool as pool_mod

        ledger = [json.loads(line) for line
                  in (BASE / "ledger.jsonl").open(encoding="utf-8")]
        print(f"building the dictionary index over {len(ledger)} entries…", flush=True)
        pool_state["index"] = pool_mod.dictionary_index(ledger)
        pool_state["conns"] = {}
        pool_state["lock"] = threading.Lock()

        def _conn():
            ident_ = threading.get_ident()
            with pool_state["lock"]:
                if ident_ not in pool_state["conns"]:
                    pool_state["conns"][ident_] = sqlite3.connect(
                        f"file:{lexicon.DB_PATH}?mode=ro", uri=True,
                        check_same_thread=False)
                return pool_state["conns"][ident_]

        pool_state["get"] = _conn

    def _run(t):
        if args.mode == "root":
            return t, *generate_root_from_pool(
                t, args.model, args.provider, pool_state["get"](),
                pool_state["index"], reasoning_effort=args.reasoning)
        if args.mode == "root-legacy":
            return t, *generate_root_one(t, args.model, args.provider)
        return t, *generate_one(t, args.model, args.provider)

    ok = skip = err = 0
    done = 0
    total = len(pending)
    usage: list[dict] = []

    def _record(t, status, record) -> None:
        """Write one outcome. Called as each result lands, never in a final pass."""
        nonlocal ok, skip, err, done
        done += 1
        rid = ident(t)
        spent = record.pop("_usage", None)
        if spent:
            usage.append(spent)
        if status == "ok":
            was_replaced = _upsert(out_path, record, key) if args.force else (_append(out_path, record) or False)
            ok += 1
            if was_replaced:
                print(f"  ↻ replaced existing record for {rid}")
            detail = (f"{len(record['senses'])} senses, " if "senses" in record else "")
            print(f"  [{done}/{total}] ✓ {rid} {label(t)} → "
                  f"{detail}{len(record['word_family'])} family", flush=True)
        elif status in ("no_grounding", "no_pool"):
            _append(skipped_path, {**record, "reason": status})
            skip += 1
            print(f"  [{done}/{total}] – {rid} {label(t)} → "
                  f"{status}, skipped", flush=True)
        else:
            err += 1
            print(f"  [{done}/{total}] ✗ {rid} {label(t)} → error: {record.get('error')}",
                  flush=True)

    if args.workers > 1:
        from concurrent.futures import ThreadPoolExecutor, as_completed

        # `as_completed`, not `ex.map`. `map` yields only once every future has
        # finished, so the old loop wrote nothing until the whole batch was done:
        # a crash 190 words into 200 lost all 190, and the run printed nothing
        # for twenty minutes. Writing per completion also makes the run
        # resumable — `_load_seen` skips whatever already reached disk.
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            futures = {ex.submit(_run, t): t for t in pending}
            for fut in as_completed(futures):
                try:
                    t, status, record = fut.result()
                except Exception as exc:  # noqa: BLE001 — one bad word must not kill the run
                    t = futures[fut]
                    _record(t, "error", {"error": str(exc)})
                    continue
                _record(t, status, record)
    else:
        for t in pending:
            _record(*_run(t))

    print(f"\nDone. ok={ok} skipped={skip} errors={err}. Output → {out_path}")
    print(f"\nCOST — {summarise_usage(usage)}")


if __name__ == "__main__":
    main()
