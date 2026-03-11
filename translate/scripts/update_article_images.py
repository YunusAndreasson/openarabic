#!/usr/bin/env python3
"""
Reassign images for all articles using the smart image matcher.

Usage:
    # Dry run — preview changes without writing to DB:
    python scripts/update_article_images.py --dry-run

    # Update all articles:
    python scripts/update_article_images.py

    # Update a specific article by ID:
    python scripts/update_article_images.py --id 296
"""

import argparse
import importlib.util
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

# Load API/DB keys
set_keys_path = Path(__file__).parent.parent / "utils" / "set_keys.py"
if set_keys_path.exists():
    spec = importlib.util.spec_from_file_location("set_keys", set_keys_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

from utils.config_common import get_supabase_client  # noqa: E402
from utils.image_matcher import _load_catalog, match_image  # noqa: E402


def run(dry_run: bool = False, article_id: int | None = None) -> None:
    db = get_supabase_client()
    catalog = _load_catalog()

    query = db.table("articles").select("id, title, summary, image_url, categories(name)")
    if article_id is not None:
        query = query.eq("id", article_id)

    articles = query.execute().data
    print(f"{'DRY RUN — ' if dry_run else ''}Processing {len(articles)} articles\n")

    updated = skipped = errors = 0

    for a in articles:
        cat = a["categories"]["name"]
        current = (a["image_url"] or "").split("/")[-1]
        proposed = match_image(cat, a["title"], a["summary"])

        if not proposed:
            print(f"  [SKIP] {a['id']} — no match found")
            skipped += 1
            continue

        data = catalog.get(proposed, {})
        risk = data.get("aqeedah_risk", "?")
        mood = data.get("mood", "?")
        desc = data.get("description", "")[:60]
        changed = proposed != current

        status = "→" if changed else "="
        print(f"  [{status}] {a['id']:<6} [{cat:<7}] {proposed:<35} [{risk}/{mood}] {desc}")

        if changed and not dry_run:
            try:
                db.table("articles").update({"image_url": proposed}).eq("id", a["id"]).execute()
                updated += 1
            except Exception as e:
                print(f"       ERROR updating {a['id']}: {e}")
                errors += 1
        elif not changed:
            skipped += 1

    print(f"\n{'─' * 60}")
    if dry_run:
        print(f"Dry run complete — {sum(1 for a in articles if (a['image_url'] or '').split('/')[-1] != match_image(a['categories']['name'], a['title'], a['summary']))} would change")
    else:
        print(f"Done: {updated} updated, {skipped} unchanged, {errors} errors")


def main() -> None:
    parser = argparse.ArgumentParser(description="Update article image URLs using smart matcher")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing to DB")
    parser.add_argument("--id", type=int, help="Update a single article by ID")
    args = parser.parse_args()
    run(dry_run=args.dry_run, article_id=args.id)


if __name__ == "__main__":
    main()
