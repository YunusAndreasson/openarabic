"""Materialise verified enrichments into the committed Next.js store.

Reads word_enrichment/verified.jsonl and writes
admin-dashboard/lib/word-enrichment.ts — a typed `Record<number, WordEnrichment>`
keyed by root id, exactly like lib/al-fawaid-content.ts. This is the ONLY file
that leaves the (git-ignored) pipeline; nothing is written to the database.

Word-family members are resolved to internal `/word/...` links when their Arabic
form uniquely matches an entry in our dictionary (a topical-cluster SEO win). The
match is conservative: only a unique bareword match is linked, to avoid mis-links.

Run:  uv run python -m word_enrichment.build_ts
"""

from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

from word_enrichment import lexicon, sql_seed

BASE = Path(__file__).resolve().parent
IN = BASE / "verified.jsonl"
OUT = (
    BASE.parent.parent
    / "admin-dashboard"
    / "lib"
    / "word-enrichment.ts"
)

SQL_OUT = BASE / "seed_root_enrichment.sql"
JSON_OUT = BASE / "seed_root_enrichment.json"

SUPABASE = "https://kkmnzbeugdoajtzfjkxg.supabase.co"
ANON = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtr"
    "bW56YmV1Z2RvYWp0emZqa3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU3ODk1NDQsImV4cCI6"
    "MjA0MTM2NTU0NH0.AjF-MzqjnUuERhgtYMwJKpDtNKBFKXjEmSMqUPeM1Os"
)

# Manual review withholds — records that PASS the automated gate (the model's
# stated root matches what the shortcut lexicon resolver returned) but where that
# resolved root is wrong for the headword, so the page's "Root: X" header would
# assert a false etymology. The resolver mis-files a word by matching its surface
# form inside an unrelated root's prose; the gate only checks model-vs-resolver
# agreement, not whether the resolver picked the right root. These are the cases
# that a human diff-review caught. The real fix is root derivation via CAMeL Tools
# (translate/utils/camel_tools_service.py) before lexicon lookup — revisit then.
# Records the second opinion does not corroborate but a human has cleared, with
# the reason it stands. Without this the stricter gate silently un-publishes
# pages that were reviewed and are correct: the dissent here is lexicographical
# convention, weak-radical notation, or Arramooz simply being wrong — not error.
# Reviewed 2026-08-20 against Lane's; four words in the same batch turned out to
# be genuine errors and were regenerated instead of listed here.
REVIEWED_OK: dict[int, str] = {
    5335: "لحظة 'moment' — ل ح ظ correct; Arramooz lacks the noun",
    5448: "دينار — Arramooz treats the loanword as its own root; Lane's د ن ر is better",
    5662: "والله — و + الله; Lane files the name under ا ل ه",
    8984: "بداية — ب د ي / بدا, weak-final notation only",
    9560: "ملائكة — Lane derives it from أ ل ك (ʾalūk 'message'); a real scholarly split with م ل ك",
    10732: "حامي — ح م و / حمي, weak-final notation only",
    13110: "نشأ — ن ش أ, matches Arramooz's نشا once hamza is folded",
    14557: "رزية — ر ز ي / رزا, weak-final notation only",
    14566: "هات — ه ي ت confirmed: Lane lists هَات and هَيْتَ as headwords there; "
           "Arramooz simply has no entry for the imperative particle",
    14966: "بني 'my son' — Lane files it under ا ب ن (ibn), Arramooz under ب ن ي; both standard",
    15001: "باق — ب ق ي correct; Arramooz lacks the participle",
    16751: "أسيد — diminutive of أسد, so Lane's ا س د is right and Arramooz's سود is wrong",
    19165: "تخلت — خ ل و correct (form V of خلا); Arramooz lacks the inflected form",
}

# Function words that PASSED the automated gate and were therefore never seen by
# the judge (it only adjudicates gate failures, i.e. review.jsonl). A primitive
# particle has no derivational root, but an invented one can still corroborate
# across Arramooz/CAMeL/Lane's and sail straight through. Found 2026-08-21 by
# POS-tagging the published set with CAMeL; مِنْ alone accounts for 619 corpus
# occurrences, so it would have been the first root explanation most learners
# ever saw. The real fix is to POS-gate targets before generation.
MANUAL_EXCLUDE: dict[int, str] = {
    5247: "مِنْ 'from' — primitive preposition, not derived from م ن ن 'to bestow a favour'",
    5250: "عَنْ 'of' — primitive preposition; the note itself admits Lane only reaches it "
          "via عَنْعَنَة, a dialectal ع/hamzah feature, which is not a derivation",
    5281: "بِهَا 'for it' — بِ + هَا, a preposition plus a clitic pronoun; ب ه و "
          "'to be beautiful' is a spurious match on the bare letters",
    5334: "Adam — foreign name, resolver gave root د م م",
    5761: "إلى 'to' — preposition, no derivational root (ا ل و)",
    5858: "زاد 'to increase' — mis-resolved to provisions root ز و د (real root ز ي د)",
    7106: "هذه 'this' — demonstrative, no root; matched inside د ث ر prose",
    10380: "تجري 'runs/flows' — mis-resolved to ت ح ت (real root ج ر ي)",
    11165: "هِ 'it' — bound pronoun, no triliteral root (ه)",
    12559: "لئن 'if' — لـ+إن particle, nonsense root ا م ا",
    13775: "Gabriel — foreign name, resolver gave root ج ب ر",
    15129: "Ibrahim — foreign name, resolver gave root ع ر ب",
    15759: "Fatima — mis-resolved to د ل ل (real root ف ط م)",
    18607: "أسهل 'easier' — mis-resolved to ح ز ن as the contrast term (real root س ه ل)",
}

_NONALNUM = re.compile(r"[^a-z0-9]+")


def _norm_meaning(text: str) -> str:
    return _NONALNUM.sub(" ", text.lower()).strip()


def slugify(text: str) -> str:
    """Mirror admin-dashboard/lib/slugify.ts slugifyText."""
    return _NONALNUM.sub("-", text.lower()).strip("-")


def word_path(root_id: int, meaning: str) -> str:
    return f"/word/{slugify(meaning) or 'word'}-{root_id}"


def load_roots_index() -> dict[str, list[dict]]:
    """bareword(Arabic letters) -> [{id, meaning}] over the whole roots table (read-only)."""
    index: dict[str, list[dict]] = {}
    offset, page = 0, 1000
    while True:
        url = f"{SUPABASE}/rest/v1/roots?select=id,letters,meaning&order=id&limit={page}&offset={offset}"
        req = urllib.request.Request(url, headers={"apikey": ANON, "Authorization": f"Bearer {ANON}"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            rows = json.loads(resp.read())
        if not rows:
            break
        for r in rows:
            bw = lexicon.bareword(r["letters"]).replace(" ", "")
            if bw and r.get("meaning", "").strip():
                index.setdefault(bw, []).append({"id": r["id"], "meaning": r["meaning"]})
        if len(rows) < page:
            break
        offset += page
    return index


def resolve_member(letters: str, meaning: str, roots_index: dict[str, list[dict]]) -> dict | None:
    """The dictionary entry this family member is, when it is unambiguously one.

    Returns both the id and the web path. The website links by path; the app has
    no slug routes and navigates by root id, so storing the id is what lets one
    row serve both. A bareword matching several dictionary entries (common —
    diacritics/case endings collapse to the same skeleton) is resolved by the
    family member's own gloss: if exactly one candidate's stored meaning agrees
    with it (either contains the other), that is unambiguous enough to link.
    Otherwise it is left unlinked rather than guessed at.
    """
    bw = lexicon.bareword(letters).replace(" ", "")
    matches = roots_index.get(bw)
    if not matches:
        return None
    if len(matches) == 1:
        m = matches[0]
        return {"root_id": m["id"], "path": word_path(m["id"], m["meaning"])}
    fam_meaning = _norm_meaning(meaning)
    if fam_meaning:
        agree = [
            c
            for c in matches
            if (cm := _norm_meaning(c["meaning"])) and (fam_meaning in cm or cm in fam_meaning)
        ]
        if len(agree) == 1:
            m = agree[0]
            return {"root_id": m["id"], "path": word_path(m["id"], m["meaning"])}
    return None


def resolve_link(letters: str, meaning: str, roots_index: dict[str, list[dict]]) -> str | None:
    member = resolve_member(letters, meaning, roots_index)
    return member["path"] if member else None


def to_ts_record(rec: dict, roots_index: dict[str, list[dict]]) -> dict:
    family = []
    for m in rec["word_family"]:
        entry = {"letters": m["letters"], "transliteration": m["transliteration"], "meaning": m["meaning"]}
        resolved = resolve_member(m["letters"], m["meaning"], roots_index)
        if resolved:
            entry["path"] = resolved["path"]
            entry["rootId"] = resolved["root_id"]
        family.append(entry)
    out = {
        "rootId": rec["root_id"],
        "triliteralRoot": rec["triliteral_root"],
        "rootTransliteration": rec["root_transliteration"],
        "rootMeaning": rec.get("root_meaning", ""),
        "headwordTransliteration": rec["headword_transliteration"],
        "partOfSpeech": rec["part_of_speech"],
        "senses": [{"gloss": s["gloss"], **({"note": s["note"]} if s.get("note") else {})}
                   for s in rec["senses"]],
        "wordFamily": family,
        "faq": [{"q": f["q"], "a": f["a"]} for f in rec["faq"]],
        "source": rec["source"],
        "sourceUrl": rec["source_url"],
    }
    if rec.get("usage_note"):
        out["usageNote"] = rec["usage_note"]
    return out


HEADER = """\
// AUTO-GENERATED by translate/word_enrichment/build_ts.py — do NOT edit by hand.
// Per-word dictionary enrichment SYNTHESISED (not reproduced) from public-domain
// Lane's Arabic-English Lexicon grounding, then automatically verified against the
// source. Regenerate by re-running the word_enrichment pipeline. Keyed by root id.

export interface WordEnrichmentSense {
  gloss: string;
  note?: string;
}

export interface WordEnrichmentFamilyMember {
  letters: string;
  transliteration: string;
  meaning: string;
  /** Internal /word/... link when this form is in our dictionary. */
  path?: string;
  /** The same entry's root id — how the mobile app navigates, which has no slugs. */
  rootId?: number;
}

export interface WordEnrichmentFaq {
  q: string;
  a: string;
}

export interface WordEnrichment {
  rootId: number;
  triliteralRoot: string;
  rootTransliteration: string;
  /** The sense shared by the whole family, e.g. "to turn, invert, change". */
  rootMeaning: string;
  headwordTransliteration: string;
  partOfSpeech: string;
  senses: WordEnrichmentSense[];
  wordFamily: WordEnrichmentFamilyMember[];
  usageNote?: string;
  faq: WordEnrichmentFaq[];
  source: string;
  sourceUrl: string;
}

"""

FOOTER = """
export function getWordEnrichment(rootId: number): WordEnrichment | undefined {
  return WORD_ENRICHMENT[rootId];
}
"""


def publishable() -> tuple[list[dict], list[dict]]:
    """(records that publish, records withheld) under the current verdicts.

    Extracted so this routing has exactly one implementation. `ledger.py` reports
    coverage from it and this module writes the seeds from it, which is what stops
    the ledger from claiming a word is live that the seed would never have written.

    Withheld records carry `_withheld` naming the reason.
    """
    if not IN.exists():
        return [], []
    records = [json.loads(line) for line in IN.read_text(encoding="utf-8").splitlines() if line.strip()]

    # verify.py routes anything the second opinion does not corroborate to
    # review.jsonl. Pull back the ones a human has explicitly cleared; the rest
    # stay withheld until someone looks at them.
    review_path = IN.parent / "review.jsonl"
    verdicts_path = IN.parent / "verdicts.json"
    verdicts: dict[int, dict] = {}
    if verdicts_path.exists():
        verdicts = {
            v["root_id"]: v
            for v in json.loads(verdicts_path.read_text(encoding="utf-8"))
        }
    pending: list[dict] = []
    if review_path.exists():
        for line in review_path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            rec = json.loads(line)
            rid = rec["root_id"]
            verdict = (verdicts.get(rid) or {}).get("verdict")
            # The judge decides; REVIEWED_OK is only a fallback for records it
            # has not seen, and MANUAL_EXCLUDE still overrides everything.
            if verdict == "publish":
                records.append(rec)
            elif verdict in ("skip", "fix_root", "fix_senses"):
                pending.append({**rec, "_withheld": verdict})
            elif rid in REVIEWED_OK:
                records.append(rec)
            elif rid not in MANUAL_EXCLUDE:
                pending.append({**rec, "_withheld": "unadjudicated"})

    excluded = [r for r in records if r["root_id"] in MANUAL_EXCLUDE]
    records = [r for r in records if r["root_id"] not in MANUAL_EXCLUDE]
    pending.extend({**r, "_withheld": "manual-exclude"} for r in excluded)
    return records, pending


def main() -> None:
    if not IN.exists():
        print(f"no verified input at {IN}")
        return
    records, pending = publishable()
    for rec in pending:
        why = rec.get("_withheld")
        if why == "manual-exclude":
            print(f"  – manual exclude {rec['root_id']} {rec['letters']}: {MANUAL_EXCLUDE[rec['root_id']]}")
        else:
            op = rec.get("_second_opinion", {})
            print(
                f"  ! withheld {rec['root_id']} {rec['letters']} "
                f"({rec['meaning']}): {why if why != 'unadjudicated' else op.get('verdict')}"
            )
    if pending:
        print(f"  {len(pending)} record(s) withheld\n")
    print(f"loading roots index for internal-link resolution…")
    roots_index = load_roots_index()
    print(f"  {len(roots_index)} distinct barewords indexed")

    by_id = {}
    linked = 0
    for rec in records:
        ts = to_ts_record(rec, roots_index)
        linked += sum(1 for m in ts["wordFamily"] if m.get("path"))
        by_id[rec["root_id"]] = ts

    body = "export const WORD_ENRICHMENT: Record<number, WordEnrichment> = " + \
        json.dumps(by_id, ensure_ascii=False, indent=2) + ";\n"
    OUT.write_text(HEADER + body + FOOTER, encoding="utf-8")
    print(f"wrote {len(by_id)} enrichment(s), {linked} internal family links → {OUT}")

    # Same records, second sink. The TS module still feeds the website until it
    # is switched over to read the table; the SQL is what puts the identical rows
    # in Supabase so the app can reach them.
    written = sql_seed.write(
        SQL_OUT, records, lambda letters, meaning: resolve_member(letters, meaning, roots_index)
    )
    rows_json = sql_seed.write_json(
        JSON_OUT, records, lambda letters, meaning: resolve_member(letters, meaning, roots_index)
    )
    missing = sum(1 for r in records if not r.get("root_meaning"))
    print(f"wrote {written} row(s) → {SQL_OUT}")
    print(f"wrote {rows_json} row(s) → {JSON_OUT}")
    if missing:
        print(f"  ! {missing} record(s) have no root_meaning — run backfill_root_meaning")


if __name__ == "__main__":
    main()
