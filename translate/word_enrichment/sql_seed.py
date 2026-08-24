"""Emit an idempotent SQL seed for public.root_enrichment.

A file rather than a direct write. The pipeline holds only the anon key, and
`root_enrichment` is deliberately read-only to anon — it is published dictionary
content and the anon key ships inside the app bundle, so a write policy there
would let any holder of it rewrite every explanation in the dictionary. Writes
belong to the service role; until one is configured, this file is what a human
pastes into the SQL editor.

Re-running is safe: every row is an upsert keyed on root_id.
"""

from __future__ import annotations

import json
from pathlib import Path

COLUMNS = (
    "root_id",
    "triliteral_root",
    "root_transliteration",
    "root_meaning",
    "headword_transliteration",
    "part_of_speech",
    "senses",
    "word_family",
    "usage_note",
    "faq",
    "source",
    "source_url",
)

# Everything except the key is refreshed, so a regenerated record fully replaces
# the published one instead of leaving half of it stale.
_UPDATED = [c for c in COLUMNS if c != "root_id"]


def sql_str(value: str | None) -> str:
    """A Postgres string literal, or NULL."""
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def sql_json(value: object) -> str:
    """A jsonb literal. `ensure_ascii=False` so the Arabic stays real text."""
    return sql_str(json.dumps(value, ensure_ascii=False)) + "::jsonb"


def build_rows(records: list[dict], resolve_member) -> list[str]:
    statements: list[str] = []
    for rec in sorted(records, key=lambda r: r["root_id"]):
        family = []
        for m in rec["word_family"]:
            entry = {
                "letters": m["letters"],
                "transliteration": m["transliteration"],
                "meaning": m["meaning"],
            }
            resolved = resolve_member(m["letters"], m["meaning"])
            if resolved:
                entry["root_id"] = resolved["root_id"]
            family.append(entry)

        senses = [
            {"gloss": s["gloss"], **({"note": s["note"]} if s.get("note") else {})}
            for s in rec["senses"]
        ]
        faq = [{"q": f["q"], "a": f["a"]} for f in rec["faq"]]

        values = [
            str(rec["root_id"]),
            sql_str(rec["triliteral_root"]),
            sql_str(rec["root_transliteration"]),
            sql_str(rec.get("root_meaning") or ""),
            sql_str(rec["headword_transliteration"]),
            sql_str(rec["part_of_speech"]),
            sql_json(senses),
            sql_json(family),
            sql_str(rec.get("usage_note")),
            sql_json(faq),
            sql_str(rec["source"]),
            sql_str(rec["source_url"]),
        ]

        parts = [
            "INSERT INTO public.root_enrichment (" + ", ".join(COLUMNS) + ") VALUES (",
            "  " + ",\n  ".join(values),
            ") ON CONFLICT (root_id) DO UPDATE SET",
            ",\n".join(f"  {c} = EXCLUDED.{c}" for c in _UPDATED) + ",",
            "  updated_at = timezone('utc', now());",
        ]
        statements.append("\n".join(parts))
    return statements


def build_json_rows(records: list[dict], resolve_member) -> list[dict]:
    """The same rows as `build_rows`, as plain dicts for a PostgREST upsert.

    The SQL file needs a human with the SQL editor; this needs only the
    service-role key, which the repo already has. Both are generated from one
    record list so the two sinks cannot drift.
    """
    rows: list[dict] = []
    for rec in sorted(records, key=lambda r: r["root_id"]):
        family = []
        for m in rec["word_family"]:
            entry = {
                "letters": m["letters"],
                "transliteration": m["transliteration"],
                "meaning": m["meaning"],
            }
            resolved = resolve_member(m["letters"], m["meaning"])
            if resolved:
                entry["root_id"] = resolved["root_id"]
            family.append(entry)
        rows.append(
            {
                "root_id": rec["root_id"],
                "triliteral_root": rec["triliteral_root"],
                "root_transliteration": rec["root_transliteration"],
                "root_meaning": rec.get("root_meaning") or "",
                "headword_transliteration": rec["headword_transliteration"],
                "part_of_speech": rec["part_of_speech"],
                "senses": [
                    {"gloss": s["gloss"], **({"note": s["note"]} if s.get("note") else {})}
                    for s in rec["senses"]
                ],
                "word_family": family,
                "usage_note": rec.get("usage_note"),
                "faq": [{"q": f["q"], "a": f["a"]} for f in rec["faq"]],
                "source": rec["source"],
                "source_url": rec["source_url"],
            }
        )
    return rows


def write_json(path: Path, records: list[dict], resolve_member) -> int:
    rows = build_json_rows(records, resolve_member)
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return len(rows)


def write(path: Path, records: list[dict], resolve_member) -> int:
    header = [
        "-- AUTO-GENERATED by translate/word_enrichment/build_ts.py — do NOT edit by hand.",
        "-- Seed/refresh public.root_enrichment. Idempotent: re-running upserts by root_id.",
        "-- Apply supabase/migrations/20260821_create_root_enrichment.sql first.",
        "",
        "BEGIN;",
        "",
    ]
    rows = build_rows(records, resolve_member)
    path.write_text(
        "\n".join(header) + "\n\n".join(rows) + "\n\nCOMMIT;\n", encoding="utf-8"
    )
    return len(rows)
