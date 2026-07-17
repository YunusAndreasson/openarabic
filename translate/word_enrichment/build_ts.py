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

from word_enrichment import lexicon

BASE = Path(__file__).resolve().parent
IN = BASE / "verified.jsonl"
OUT = (
    BASE.parent.parent
    / "admin-dashboard"
    / "lib"
    / "word-enrichment.ts"
)

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
MANUAL_EXCLUDE: dict[int, str] = {
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


def resolve_link(letters: str, roots_index: dict[str, list[dict]]) -> str | None:
    bw = lexicon.bareword(letters).replace(" ", "")
    matches = roots_index.get(bw)
    if matches and len(matches) == 1:  # conservative: only unique matches
        m = matches[0]
        return word_path(m["id"], m["meaning"])
    return None


def to_ts_record(rec: dict, roots_index: dict[str, list[dict]]) -> dict:
    family = []
    for m in rec["word_family"]:
        entry = {"letters": m["letters"], "transliteration": m["transliteration"], "meaning": m["meaning"]}
        path = resolve_link(m["letters"], roots_index)
        if path:
            entry["path"] = path
        family.append(entry)
    out = {
        "rootId": rec["root_id"],
        "triliteralRoot": rec["triliteral_root"],
        "rootTransliteration": rec["root_transliteration"],
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
}

export interface WordEnrichmentFaq {
  q: string;
  a: string;
}

export interface WordEnrichment {
  rootId: number;
  triliteralRoot: string;
  rootTransliteration: string;
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


def main() -> None:
    if not IN.exists():
        print(f"no verified input at {IN}")
        return
    records = [json.loads(line) for line in IN.read_text(encoding="utf-8").splitlines() if line.strip()]
    excluded = [r for r in records if r["root_id"] in MANUAL_EXCLUDE]
    records = [r for r in records if r["root_id"] not in MANUAL_EXCLUDE]
    for r in excluded:
        print(f"  – manual exclude {r['root_id']} {r['letters']}: {MANUAL_EXCLUDE[r['root_id']]}")
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


if __name__ == "__main__":
    main()
