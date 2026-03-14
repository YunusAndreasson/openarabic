#!/usr/bin/env python3
"""Recombine article-level audio for ALL published articles.

Downloads existing sentence audio from Supabase storage and re-concatenates
with a fresh title TTS call for the bilingual version. Arabic-only audio
is rebuilt from existing sentence clips with zero TTS calls.

Cost: 1 ElevenLabs call per article (title only for bilingual intro).
Sentence audio is reused from storage — no regeneration needed.

Usage:
    uv run scripts/recombine_all_article_audio.py              # all published articles
    uv run scripts/recombine_all_article_audio.py --dry-run    # preview without changes
    uv run scripts/recombine_all_article_audio.py --start 100  # start from article ID 100
"""

import argparse
import logging
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import utils.set_keys  # noqa: F401, E402

from scripts.regenerate_audio import regenerate_article_audio  # noqa: E402
from utils.responses_api import load_api_keys  # noqa: E402
from utils.storage import get_supabase_client  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def fetch_published_articles(start_id: int = 0) -> list[dict]:
    """Fetch all published articles from Supabase, ordered by ID."""
    supabase = get_supabase_client()
    articles = (
        supabase.table("articles")
        .select("id, title")
        .eq("published", True)
        .gte("id", start_id)
        .order("id")
        .execute()
        .data
    )
    return articles or []


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Recombine article-level audio for all published articles"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview articles without regenerating audio",
    )
    parser.add_argument(
        "--start",
        type=int,
        default=0,
        metavar="ID",
        help="Start from this article ID (skip earlier articles)",
    )
    args = parser.parse_args()

    load_api_keys()

    articles = fetch_published_articles(args.start)
    total = len(articles)

    if total == 0:
        logger.info("No published articles found")
        return

    logger.info(f"Found {total} published article(s) to process")

    if args.dry_run:
        for a in articles:
            logger.info(f"  [{a['id']}] {a['title']}")
        logger.info(f"Dry run complete — {total} articles would be processed")
        return

    succeeded = 0
    failed = 0

    for i, article in enumerate(articles, 1):
        article_id = article["id"]
        title = article["title"] or "(no title)"
        logger.info(f"\n[{i}/{total}] Article {article_id}: {title}")

        try:
            regenerate_article_audio(article_id)
            succeeded += 1
        except Exception as e:
            logger.error(f"  FAILED: {e}")
            failed += 1

        # Brief pause between articles to avoid rate limiting
        if i < total:
            time.sleep(1)

    logger.info(f"\nDone! Succeeded: {succeeded}, Failed: {failed}, Total: {total}")


if __name__ == "__main__":
    main()
