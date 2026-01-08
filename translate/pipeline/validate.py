#!/usr/bin/env python3
"""
Word Translation Validation Pipeline

This script validates existing word translations in the database using
OpenRouter's DeepSeek-v3 model. It checks for:
- Morphological accuracy (prefix/suffix rendering)
- English word count matching Arabic morphemes
- Theological correctness (no shirk/bidah)

Usage:
    # Validate specific article
    uv run python pipeline/validate.py --article-id 123

    # Validate all articles
    uv run python pipeline/validate.py --all

    # Start from a specific article number
    uv run python pipeline/validate.py --all --start-from 10

    # Validate with verbose logging
    uv run python pipeline/validate.py --all --verbose
"""

import argparse
import logging
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load API keys at startup (before other imports to avoid circular dependencies)
try:
    from utils.set_keys import load_api_keys_safely

    load_api_keys_safely()
except ImportError:
    logging.getLogger(__name__).warning(
        "Could not import load_api_keys_safely, using environment variables"
    )

from tqdm import tqdm

from data.validation_models import ValidationBatchResponse
from utils.openrouter_client import OpenRouterClient
from utils.validation import validate_with_retry
from utils.validation_db import (
    fetch_article_words_for_validation,
    get_all_article_ids,
    get_article_title,
    save_validation_improvements,
)

# Configure logging - suppress all except errors during progress bar
logging.basicConfig(
    level=logging.WARNING,  # Only show warnings and errors
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def validate_article_translations(
    article_id: int, client: OpenRouterClient | None = None, verbose: bool = False
) -> bool:
    """Validate all word translations for a single article.

    Args:
        article_id: ID of the article to validate
        client: Optional pre-configured OpenRouter client
        verbose: Enable verbose logging

    Returns:
        bool: True if validation succeeded, False otherwise
    """
    # Get article title for logging
    article_title = get_article_title(article_id)
    title_display = f" ({article_title})" if article_title else ""

    if verbose:
        logger.info(f"Validating article {article_id}{title_display}")

    try:
        # Fetch words grouped by sentence
        sentences_data = fetch_article_words_for_validation(article_id)

        if not sentences_data:
            if verbose:
                logger.warning(f"No sentences found for article {article_id}")
            return False

        total_sentences = len(sentences_data)
        total_words = sum(len(s["words_data"]) for s in sentences_data)
        if verbose:
            logger.info(f"Fetched {total_sentences} sentences with {total_words} words")

        # Create client if not provided
        if client is None:
            client = OpenRouterClient()

        # Process each sentence
        all_validations = []
        all_words_data = []
        failed_sentences = 0

        for i, sentence in enumerate(sentences_data, 1):
            words_data = sentence["words_data"]
            sentence_arabic = sentence["sentence_arabic"]

            if verbose:
                logger.info(
                    f"Processing sentence {i}/{total_sentences} ({len(words_data)} words): {sentence_arabic[:60]}..."
                )

            try:
                # Validate sentence with retry logic
                validation_response = _validate_words_with_retry(
                    client, words_data, verbose
                )

                if not validation_response:
                    if verbose:
                        logger.warning(
                            f"Sentence {i}/{total_sentences} validation failed: {sentence_arabic[:50]}..."
                        )
                    failed_sentences += 1
                    continue

                # Parse response using Pydantic
                validated_batch = ValidationBatchResponse(**validation_response)
                validations = [v.model_dump() for v in validated_batch.validations]

                # Accumulate results
                all_validations.extend(validations)
                all_words_data.extend(words_data)

            except Exception as e:
                if verbose:
                    logger.warning(
                        f"Sentence {i}/{total_sentences} error: {str(e)[:100]}"
                    )
                failed_sentences += 1
                continue

        if not all_validations:
            if verbose:
                logger.error(f"All {total_sentences} sentences failed validation")
            return False

        # Save all validations to database
        saved_count, skipped_count = save_validation_improvements(
            all_validations, all_words_data
        )

        # Log summary (always show summary)
        if failed_sentences > 0 and verbose:
            logger.warning(f"   {failed_sentences}/{total_sentences} sentences failed")

        if verbose:
            if saved_count > 0:
                logger.info(
                    f"✅ Article {article_id}: {saved_count} improvements saved, {skipped_count} correct"
                )
                logger.info(f"   {saved_count}/{total_words} words need review")
            else:
                logger.info(
                    f"✅ Article {article_id}: All {total_words} words are correct! No improvements needed."
                )

        return True

    except Exception as e:
        logger.error(f"Failed to validate article {article_id}: {e}", exc_info=True)
        return False


def _validate_words_with_retry(
    client: OpenRouterClient, words_data: list[dict], verbose: bool = False
) -> dict | None:
    """Validate words with retry logic for parse errors."""
    return validate_with_retry(client.validate_words_batch, words_data, verbose)


def validate_all_articles(verbose: bool = False, start_from: int = 1) -> int:
    """Validate all articles in database.

    Args:
        verbose: Enable verbose logging
        start_from: Article number to start from (1-indexed, default: 1)

    Returns:
        int: Count of successfully validated articles
    """
    if verbose:
        logging.getLogger().setLevel(logging.INFO)

    try:
        # Fetch all article IDs
        article_ids = get_all_article_ids()

        if not article_ids:
            if verbose:
                logger.warning("No articles found in database")
            return 0

        # Apply start_from offset (convert from 1-indexed to 0-indexed)
        total_articles = len(article_ids)
        if start_from > 1:
            start_index = start_from - 1
            if start_index >= total_articles:
                logger.warning(
                    f"start_from ({start_from}) exceeds total articles ({total_articles})"
                )
                return 0
            article_ids = article_ids[start_index:]
            if verbose:
                logger.info(
                    f"Starting from article #{start_from} (skipping first {start_index} articles)"
                )

        # Create client once for all articles
        client = OpenRouterClient()

        # Process each article with progress bar
        success_count = 0
        failed_count = 0

        for article_id in tqdm(article_ids, desc="Validating articles", unit="article"):
            try:
                if validate_article_translations(article_id, client, verbose):
                    success_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                if verbose:
                    logger.error(f"Article {article_id} validation failed: {e}")
                failed_count += 1
                continue

        # Always show final summary
        print(
            f"\n✅ Validation complete: {success_count} succeeded, {failed_count} failed"
        )
        return success_count

    except Exception as e:
        if verbose:
            logger.error(f"Failed to validate all articles: {e}", exc_info=True)
        return 0


def main() -> int:
    """Main entry point for validation script.

    Returns:
        int: Exit code (0 for success, 1 for failure)
    """
    parser = argparse.ArgumentParser(
        description="Validate word translations using DeepSeek via OpenRouter",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python pipeline/validate.py --article-id 123           # Validate specific article
  python pipeline/validate.py --all                      # Validate all articles
  python pipeline/validate.py --all --start-from 10      # Start from article #10
  python pipeline/validate.py --all --start-from 45      # Start from article #45
  python pipeline/validate.py --all --verbose            # Validate with debug logging
        """,
    )

    parser.add_argument(
        "--article-id",
        type=int,
        help="Validate specific article by ID",
    )

    parser.add_argument(
        "--all",
        action="store_true",
        help="Validate all articles in database",
    )

    parser.add_argument(
        "--start-from",
        type=int,
        default=1,
        help="Article number to start from (1-indexed, default: 1)",
    )

    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable verbose logging",
    )

    args = parser.parse_args()

    # Must specify either --article-id or --all
    if not args.article_id and not args.all:
        parser.print_help()
        sys.exit(1)

    # Enable verbose logging if requested
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Validate specific article
    if args.article_id:
        if args.verbose:
            logger.info(f"🔍 Validating article {args.article_id}")
        success = validate_article_translations(args.article_id, verbose=args.verbose)
        return 0 if success else 1

    # Validate all articles
    if args.all:
        success_count = validate_all_articles(args.verbose, args.start_from)
        return 0 if success_count > 0 else 1

    return 1


if __name__ == "__main__":
    sys.exit(main())
