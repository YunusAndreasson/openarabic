"""Validate word translations to trigger grammar color-coding in the app.

Fetches existing word-by-word translations from the DB and uses Claude CLI
to check morpheme-to-English-word alignment.  Suggested improvements
are saved to the ``translation_improvements`` table for human review.

Usage:
    # Validate a single article
    uv run python scripts/validate_translations.py --article-id 123

    # Validate all articles
    uv run python scripts/validate_translations.py --all

    # Resume from a specific position (1-indexed)
    uv run python scripts/validate_translations.py --all --start-from 50

    # Verbose output
    uv run python scripts/validate_translations.py --article-id 123 --verbose
"""

import argparse
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import utils.set_keys  # noqa: F401  (sets environment variables)

from tqdm import tqdm

from data.validation_models import ValidationBatchResponse
from utils.claude_cli import validate_words_batch
from utils.validation import validate_with_retry
from utils.validation_db import (
    fetch_article_words_for_validation,
    get_all_article_ids,
    get_article_title,
    save_validation_improvements,
)

logging.basicConfig(
    level=logging.WARNING,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def validate_article_translations(
    article_id: int,
    verbose: bool = False,
) -> bool:
    """Validate all word translations for a single article.

    Returns True if validation succeeded (even if no improvements found).
    """
    article_title = get_article_title(article_id)
    title_display = f" ({article_title})" if article_title else ""

    if verbose:
        logger.info(f"Validating article {article_id}{title_display}")

    try:
        sentences_data = fetch_article_words_for_validation(article_id)
        if not sentences_data:
            if verbose:
                logger.warning(f"No sentences found for article {article_id}")
            return False

        total_sentences = len(sentences_data)
        total_words = sum(len(s["words_data"]) for s in sentences_data)
        if verbose:
            logger.info(f"Fetched {total_sentences} sentences with {total_words} words")

        # Flatten all words across sentences into a single batch for one API call
        all_words_data: list[dict] = []
        for sentence in sentences_data:
            all_words_data.extend(sentence["words_data"])

        if verbose:
            logger.info(f"Sending {len(all_words_data)} words in a single batch")

        validation_response = validate_with_retry(
            validate_words_batch, all_words_data, verbose
        )
        if not validation_response:
            if verbose:
                logger.error(f"Validation failed for article {article_id}")
            return False

        validated_batch = ValidationBatchResponse(**validation_response)
        all_validations = [v.model_dump() for v in validated_batch.validations]

        if not all_validations:
            if verbose:
                logger.error(f"All sentences failed for article {article_id}")
            return False

        saved_count, skipped_count = save_validation_improvements(
            all_validations, all_words_data
        )

        if verbose:
            if saved_count > 0:
                logger.info(
                    f"Article {article_id}: {saved_count} improvements queued, "
                    f"{skipped_count} already correct"
                )
            else:
                logger.info(
                    f"Article {article_id}: all {total_words} words correct — "
                    "no changes needed"
                )

        return True

    except Exception as e:
        logger.error(f"Failed to validate article {article_id}: {e}", exc_info=True)
        return False


def validate_last_n_articles(n: int, verbose: bool = False) -> int:
    """Validate the last N articles by creation order.

    Returns the number of successfully validated articles.
    """
    if verbose:
        logging.getLogger().setLevel(logging.INFO)

    from utils.config_common import get_supabase_client

    client = get_supabase_client()
    response = (
        client.table("articles")
        .select("id")
        .order("id", desc=True)
        .limit(n)
        .execute()
    )

    if not response.data:
        print("No articles found.")
        return 0

    # Reverse to process oldest first
    article_ids = [a["id"] for a in reversed(response.data)]
    print(f"Validating last {len(article_ids)} articles (IDs {article_ids[0]}–{article_ids[-1]})")

    success_count = 0
    failed_count = 0

    for article_id in tqdm(article_ids, desc="Validating articles", unit="article"):
        try:
            if validate_article_translations(article_id, verbose):
                success_count += 1
            else:
                failed_count += 1
        except Exception as e:
            if verbose:
                logger.error(f"Article {article_id}: {e}")
            failed_count += 1

    print(f"\nDone: {success_count} succeeded, {failed_count} failed")
    return success_count


def validate_all_articles(verbose: bool = False, start_from: int = 1) -> int:
    """Validate all articles in the database.

    Returns the number of successfully validated articles.
    """
    if verbose:
        logging.getLogger().setLevel(logging.INFO)

    article_ids = get_all_article_ids()
    if not article_ids:
        print("No articles found in database.")
        return 0

    total = len(article_ids)
    if start_from > 1:
        idx = start_from - 1
        if idx >= total:
            print(f"start_from ({start_from}) exceeds total articles ({total})")
            return 0
        article_ids = article_ids[idx:]
        if verbose:
            logger.info(f"Starting from article #{start_from} (skipping {idx})")

    success_count = 0
    failed_count = 0

    for article_id in tqdm(article_ids, desc="Validating articles", unit="article"):
        try:
            if validate_article_translations(article_id, verbose):
                success_count += 1
            else:
                failed_count += 1
        except Exception as e:
            if verbose:
                logger.error(f"Article {article_id}: {e}")
            failed_count += 1

    print(f"\nDone: {success_count} succeeded, {failed_count} failed")
    return success_count


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate word translations for grammar color-coding",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--article-id", type=int, help="Validate a single article")
    parser.add_argument("--all", action="store_true", help="Validate all articles")
    parser.add_argument(
        "--last",
        type=int,
        help="Validate the last N articles (by creation order)",
    )
    parser.add_argument(
        "--start-from",
        type=int,
        default=1,
        help="Article number to start from (1-indexed)",
    )
    parser.add_argument("--verbose", "-v", action="store_true")

    args = parser.parse_args()

    if not args.article_id and not args.all and not args.last:
        parser.print_help()
        return 1

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    if args.article_id:
        ok = validate_article_translations(args.article_id, verbose=args.verbose)
        return 0 if ok else 1

    if args.last:
        count = validate_last_n_articles(args.last, args.verbose)
        return 0 if count > 0 else 1

    count = validate_all_articles(args.verbose, args.start_from)
    return 0 if count > 0 else 1


if __name__ == "__main__":
    sys.exit(main())
