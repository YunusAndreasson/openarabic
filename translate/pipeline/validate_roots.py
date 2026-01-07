#!/usr/bin/env python3
"""
Root Translation Validation Pipeline

This script validates root translations in the database using
OpenRouter's DeepSeek-v3 model. It checks for:
- Translation accuracy (core root meaning, not derived words)
- Simplicity for language learners (common English words)
- Tashkeel correctness (Arabic vocalization)

Usage:
    # Validate specific root
    uv run python pipeline/validate_roots.py --root-id 123

    # Validate all roots
    uv run python pipeline/validate_roots.py --all

    # Start from a specific root number
    uv run python pipeline/validate_roots.py --all --start-from 10

    # Validate with verbose logging
    uv run python pipeline/validate_roots.py --all --verbose
"""

import argparse
import logging
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load API keys at startup (before other imports to avoid circular dependencies)
try:
    # Direct import of set_keys module
    import importlib.util

    set_keys_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "utils",
        "set_keys.py",
    )
    if os.path.exists(set_keys_path):
        spec = importlib.util.spec_from_file_location("set_keys", set_keys_path)
        if spec and spec.loader:
            set_keys_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(set_keys_module)
            logging.getLogger(__name__).info("API keys loaded from set_keys.py")
    else:
        logging.getLogger(__name__).warning(
            "set_keys.py not found, using environment variables"
        )
except Exception as e:
    logging.getLogger(__name__).warning(
        f"Failed to load set_keys.py: {e}, using environment variables"
    )

from tqdm import tqdm

from data.config import VALIDATION_MAX_RETRIES
from data.validation_models import RootValidationBatchResponse
from utils.openrouter_client import OpenRouterClient
from utils.validation_db import (
    fetch_roots_for_validation,
    get_all_root_ids,
    save_root_validation_improvements,
)

# Configure logging - suppress all except errors during progress bar
logging.basicConfig(
    level=logging.WARNING,  # Only show warnings and errors
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def validate_root_batch(
    root_ids: list[int], client: OpenRouterClient | None = None, verbose: bool = False
) -> tuple[int, int]:
    """Validate a batch of root translations.

    Args:
        root_ids: List of root IDs to validate
        client: Optional pre-configured OpenRouter client
        verbose: Enable verbose logging

    Returns:
        tuple: (count of saved improvements, count of correct roots)
    """
    if verbose:
        logger.info(f"Validating {len(root_ids)} roots")

    try:
        # Fetch roots with examples
        roots_data = fetch_roots_for_validation(root_ids)

        if not roots_data:
            if verbose:
                logger.warning(f"No roots found for IDs: {root_ids}")
            return 0, 0

        if verbose:
            logger.info(f"Fetched {len(roots_data)} roots with example sentences")
            print("\n" + "=" * 80)
            print("VALIDATION INPUT:")
            print("=" * 80)
            for root in roots_data:
                print(f"\nRoot ID {root['root_id']}:")
                print(
                    f'  Current: {root["current_letters"]} = "{root["current_meaning"]}"'
                )
                print(f"  Examples: {len(root['examples'])} sentences")

        # Create client if not provided
        if client is None:
            client = OpenRouterClient()

        # Validate roots with retry logic
        validation_response = _validate_with_retry(client, roots_data, verbose)

        if not validation_response:
            if verbose:
                logger.error(f"Validation failed for roots: {root_ids}")
            return 0, 0

        # Parse response using Pydantic
        validated_batch = RootValidationBatchResponse(**validation_response)
        validations = [v.model_dump() for v in validated_batch.validations]

        # Log validation results
        if verbose:
            print("\n" + "=" * 80)
            print("VALIDATION RESULTS:")
            print("=" * 80)
            for validation in validations:
                root_data = next(
                    (r for r in roots_data if r["root_id"] == validation["root_id"]), {}
                )
                print(f"\nRoot ID {validation['root_id']}:")
                print(
                    f'  Current: {root_data.get("current_letters")} = "{root_data.get("current_meaning")}"'
                )
                print(f"  Is Correct: {validation['is_correct']}")

                if not validation["is_correct"]:
                    if validation.get("suggested_english"):
                        print(
                            f'  ❌ English: "{root_data.get("current_meaning")}" → "{validation["suggested_english"]}"'
                        )
                    if validation.get("suggested_tashkeel"):
                        print(
                            f"  ❌ Tashkeel: {root_data.get('current_letters')} → {validation['suggested_tashkeel']}"
                        )
                    print(f"  Issues: {', '.join(validation['issues'])}")
                else:
                    print("  ✅ Accepted as correct")

                # Show reasoning (first 200 chars)
                reasoning = validation.get("reasoning", "")
                print(
                    f"  Reasoning: {reasoning[:200]}{'...' if len(reasoning) > 200 else ''}"
                )
            print("=" * 80 + "\n")

        # Save validations to database
        saved_count, skipped_count = save_root_validation_improvements(
            validations, roots_data
        )

        if verbose:
            if saved_count > 0:
                logger.info(
                    f"✅ {saved_count} improvements saved, {skipped_count} correct"
                )
            else:
                logger.info(
                    f"✅ All {len(roots_data)} roots are correct! No improvements needed."
                )

        return saved_count, skipped_count

    except Exception as e:
        logger.error(f"Failed to validate roots {root_ids}: {e}", exc_info=True)
        return 0, 0


def _validate_with_retry(
    client: OpenRouterClient, roots_data: list[dict], verbose: bool = False
) -> dict | None:
    """Validate roots with retry logic for parse errors.

    Args:
        client: OpenRouter client
        roots_data: List of root dictionaries
        verbose: Enable verbose logging

    Returns:
        dict: Parsed validation response or None if all retries fail
    """
    for retry_count in range(VALIDATION_MAX_RETRIES):
        try:
            # Call API with current retry count (affects prompt strictness)
            response = client.validate_roots_batch(roots_data, retry_count)
            return response

        except ValueError as e:
            # Parse error - retry with stricter prompt
            if retry_count < VALIDATION_MAX_RETRIES - 1:
                if verbose:
                    logger.warning(
                        f"Parse error on attempt {retry_count + 1}, retrying: {e}"
                    )
                continue
            else:
                if verbose:
                    logger.error(
                        f"Parse error after {VALIDATION_MAX_RETRIES} attempts: {e}"
                    )
                return None

        except Exception as e:
            # Other errors (API errors, etc.) - log and fail
            if verbose:
                logger.error(f"Validation API call failed: {e}")
            return None

    return None


def validate_all_roots(
    verbose: bool = False, start_from: int = 1, batch_size: int = 20
) -> int:
    """Validate all roots in database.

    Args:
        verbose: Enable verbose logging
        start_from: Root number to start from (1-indexed, default: 1)
        batch_size: Number of roots to validate per batch (default: 20)

    Returns:
        int: Count of successfully validated roots
    """
    if verbose:
        logging.getLogger().setLevel(logging.INFO)

    try:
        # Fetch all root IDs
        root_ids = get_all_root_ids()

        if not root_ids:
            if verbose:
                logger.warning("No roots found in database")
            return 0

        # Apply start_from offset (convert from 1-indexed to 0-indexed)
        total_roots = len(root_ids)
        if start_from > 1:
            start_index = start_from - 1
            if start_index >= total_roots:
                logger.warning(
                    f"start_from ({start_from}) exceeds total roots ({total_roots})"
                )
                return 0
            root_ids = root_ids[start_index:]
            if verbose:
                logger.info(
                    f"Starting from root #{start_from} (skipping first {start_index} roots)"
                )

        # Create client once for all roots
        client = OpenRouterClient()

        # Process roots in batches with progress bar
        total_saved = 0
        total_correct = 0
        total_processed = 0

        # Split into batches
        batches = [
            root_ids[i : i + batch_size] for i in range(0, len(root_ids), batch_size)
        ]

        for batch in tqdm(batches, desc="Validating root batches", unit="batch"):
            try:
                saved, correct = validate_root_batch(batch, client, verbose)
                total_saved += saved
                total_correct += correct
                total_processed += len(batch)
            except Exception as e:
                if verbose:
                    logger.error(f"Batch validation failed: {e}")
                continue

        # Always show final summary
        print(
            f"\n✅ Validation complete: {total_processed} roots processed, "
            f"{total_saved} improvements saved, {total_correct} already correct"
        )
        return total_processed

    except Exception as e:
        if verbose:
            logger.error(f"Failed to validate all roots: {e}", exc_info=True)
        return 0


def validate_single_root(
    root_id: int, client: OpenRouterClient | None = None, verbose: bool = False
) -> bool:
    """Validate a single root translation.

    Args:
        root_id: ID of the root to validate
        client: Optional pre-configured OpenRouter client
        verbose: Enable verbose logging

    Returns:
        bool: True if validation succeeded, False otherwise
    """
    if verbose:
        logger.info(f"Validating root {root_id}")

    saved, correct = validate_root_batch([root_id], client, verbose)
    return (saved + correct) > 0


def main() -> int:
    """Main entry point for validation script.

    Returns:
        int: Exit code (0 for success, 1 for failure)
    """
    parser = argparse.ArgumentParser(
        description="Validate root translations using DeepSeek via OpenRouter",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python pipeline/validate_roots.py --root-id 123            # Validate specific root
  python pipeline/validate_roots.py --all                    # Validate all roots
  python pipeline/validate_roots.py --all --start-from 10    # Start from root #10
  python pipeline/validate_roots.py --all --verbose          # Validate with debug logging
  python pipeline/validate_roots.py --all --batch-size 10    # Process 10 roots per batch
        """,
    )

    parser.add_argument(
        "--root-id",
        type=int,
        help="Validate specific root by ID",
    )

    parser.add_argument(
        "--all",
        action="store_true",
        help="Validate all roots in database",
    )

    parser.add_argument(
        "--start-from",
        type=int,
        default=1,
        help="Root number to start from (1-indexed, default: 1)",
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=20,
        help="Number of roots to validate per batch (default: 20)",
    )

    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable verbose logging",
    )

    args = parser.parse_args()

    # Must specify either --root-id or --all
    if not args.root_id and not args.all:
        parser.print_help()
        sys.exit(1)

    # Enable verbose logging if requested
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Validate specific root
    if args.root_id:
        if args.verbose:
            logger.info(f"🔍 Validating root {args.root_id}")
        success = validate_single_root(args.root_id, verbose=args.verbose)
        return 0 if success else 1

    # Validate all roots
    if args.all:
        success_count = validate_all_roots(
            args.verbose, args.start_from, args.batch_size
        )
        return 0 if success_count > 0 else 1

    return 1


if __name__ == "__main__":
    sys.exit(main())
