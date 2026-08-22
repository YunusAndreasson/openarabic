"""Invariants over everything that is live, not just the newest batch.

evaluate_batch.py measures one run. This measures the corpus a learner actually
sees, which is where the failures that matter have shown up — each one passed
every per-batch check and was only visible by looking at the published set as a
whole:

  function words   مِنْ published with root م ن ن 'to bestow a favour'. Particles
                   have no derivational root, so any root the sources offer is an
                   accident of shared letters. They cleared the gate (all three
                   sources "agreed") and the judge never sees gate PASSES.
  proper nouns     A personal name has no learner-useful etymology, and the root
                   a resolver finds for one is a coincidence of spelling.
  stale rows       A record the judge later withheld stays live until something
                   deletes it. Withholding is not unpublishing.

Exits non-zero when an invariant is broken, so it can gate a seed.

Run from translate/:  uv run python -m word_enrichment.audit_published
"""

from __future__ import annotations

import json
import sys
import urllib.request
from collections import Counter
from pathlib import Path

from word_enrichment import arramooz, camel_roots
from word_enrichment.build_ts import ANON, SUPABASE, publishable

BASE = Path(__file__).resolve().parent

# Words CAMeL's POS vote calls a particle that are in fact nouns, checked by hand.
# `dominant_pos` is a plurality vote over every analysis, so a noun whose
# consonantal skeleton coincides with a very frequent particle loses the vote:
# منة has far more مِنْ+clitic readings than مَنَّة readings, and diacritics do not
# rescue it because the analyzer normalises them away. Measured over the whole
# dictionary the gate mis-drops about 2 entries in 15,227 — and no cheap
# orthographic rule (tanwīn, shadda) separates these from إِذًا or أَيٌّ, which are
# genuinely particles carrying both. Losing two nouns is the right trade against
# publishing مِنْ, the most-read word in the corpus, with an invented etymology.
# Listing them here keeps the invariant sharp: anything NEW still fails.
POS_REVIEWED_OK: dict[int, str] = {
    5285: "مَنَّةٌ 'favour' — a real noun of م ن ن; CAMeL votes prep on the منة skeleton",
    5289: "مِنَّةٌ 'favour' — same word, same skeleton collision",
}


def live_ids() -> set[int] | None:
    """root_ids currently in the table, or None when it cannot be read."""
    ids: set[int] = set()
    offset = 0
    try:
        while True:
            url = f"{SUPABASE}/rest/v1/root_enrichment?select=root_id&order=root_id&limit=1000&offset={offset}"
            req = urllib.request.Request(
                url, headers={"apikey": ANON, "Authorization": f"Bearer {ANON}"}
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                page = json.loads(resp.read())
            ids.update(r["root_id"] for r in page)
            if len(page) < 1000:
                return ids
            offset += 1000
    except Exception as exc:  # noqa: BLE001 — an unreadable table is reported, not fatal
        print(f"  (could not read the live table: {exc})")
        return None


def main() -> int:
    records, withheld = publishable()
    print(f"PUBLISHED SET — {len(records)} record(s), {len(withheld)} withheld")
    failures = 0

    print("\nPART OF SPEECH (CAMeL, over the published set)")
    pos = Counter()
    function_words: list[dict] = []
    proper: list[dict] = []
    for rec in records:
        bare = arramooz.bareword(rec["letters"])
        tag = camel_roots.dominant_pos(bare)
        pos[tag or "unanalysable"] += 1
        if tag in camel_roots.FUNCTION_POS and rec["root_id"] not in POS_REVIEWED_OK:
            function_words.append(rec)
        elif tag == "noun_prop":
            proper.append(rec)
    for tag, n in pos.most_common(8):
        print(f"  {str(tag):16} {n:5}")

    print(f"\n  function words live   {len(function_words):5}   (must be 0)")
    for rec in function_words:
        print(f"    ! {rec['root_id']} {rec['letters']} ({rec['meaning']}) → {rec['triliteral_root']}")
    failures += len(function_words)

    # A name has no learner-useful etymology and any root a resolver finds for one
    # is a spelling coincidence, so a proper noun that reached the published set
    # WITHOUT a judge verdict is the same hole the function words came through:
    # the judge only ever sees gate failures.
    verdicts_path = BASE / "verdicts.json"
    verdicts: dict[int, str] = {}
    if verdicts_path.exists():
        verdicts = {
            v["root_id"]: v["verdict"]
            for v in json.loads(verdicts_path.read_text(encoding="utf-8"))
        }
    unjudged = [r for r in proper if r["root_id"] not in verdicts]
    print(f"  proper nouns live     {len(proper):5}   ({len(unjudged)} never adjudicated)")
    for rec in proper:
        seen = verdicts.get(rec["root_id"], "NO VERDICT")
        print(f"    {'!' if rec['root_id'] in {r['root_id'] for r in unjudged} else '·'} "
              f"{rec['root_id']} {rec['letters']} ({rec['meaning']}) → "
              f"{rec['triliteral_root']}  [{seen}]")
    failures += len(unjudged)

    print("\nSTALE ROWS — live but no longer publishable")
    live = live_ids()
    if live is not None:
        should = {r["root_id"] for r in records}
        stale = live - should
        missing = should - live
        print(f"  live rows             {len(live):5}")
        print(f"  stale (must delete)   {len(stale):5}   {sorted(stale) if stale else ''}")
        print(f"  not yet seeded        {len(missing):5}")
        failures += len(stale)

    print("\nRESULT: " + ("OK" if failures == 0 else f"{failures} invariant failure(s)"))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
