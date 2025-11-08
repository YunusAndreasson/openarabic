#!/usr/bin/env python3
"""
Hybrid Root Validation - Optimized for Large Datasets

Uses pattern matching + AI to efficiently validate 1000+ roots:
1. Pattern-based pre-filtering (FAST - Python regex)
2. AI validation for problematic and uncertain cases
3. Validates everything by default for comprehensive accuracy

Categories:
- definite_derived: Ends with ة or Form II-X patterns → AI validates
- likely_derived: Verbal noun patterns (فَعَالٌ, فُعُولٌ) → AI validates
- uncertain: Ambiguous patterns → AI validates
- likely_correct: Simple Form I verbs/nouns → AI validates (skip with --fast)

Usage:
    # Recommended: Thorough validation (default)
    uv run python pipeline/validate_roots_hybrid.py --all

    # Optional: Fast mode (skip likely_correct roots to save ~50% time/cost)
    uv run python pipeline/validate_roots_hybrid.py --all --fast

    # Check statistics before running validation
    uv run python pipeline/validate_roots_hybrid.py --stats-only
"""

import argparse
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load API keys
try:
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
except Exception:
    pass

from tqdm import tqdm

from data.config import VALIDATION_MAX_RETRIES
from data.validation_models import RootValidationBatchResponse
from utils.camel_analyzer import batch_analyze_roots
from utils.openrouter_client import OpenRouterClient
from utils.root_pattern_checker import batch_check_roots
from utils.validation_db import (
    fetch_roots_for_validation,
    get_all_root_ids,
    save_root_validation_improvements,
)

logging.basicConfig(
    level=logging.ERROR,  # Only show errors and critical issues
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Suppress HTTP request logs from supabase/httpx
logging.getLogger("httpx").setLevel(logging.CRITICAL)
logging.getLogger("httpcore").setLevel(logging.CRITICAL)


def validate_hybrid(
    verbose: bool = False,
    limit: int | None = None,
    skip_likely_correct: bool = False,
) -> dict:
    """Validate all roots using hybrid approach.

    Args:
        verbose: Enable verbose logging
        limit: Limit to first N roots (for testing)
        skip_likely_correct: Skip roots classified as "likely_correct" (saves time/cost)

    Returns:
        dict: Statistics about validation
    """
    print("\n" + "="*80)
    print("HYBRID ROOT VALIDATION")
    print("="*80 + "\n")

    # Fetch all roots
    root_ids = get_all_root_ids()
    if limit:
        root_ids = root_ids[:limit]
        print(f"⚠️  Limited to first {limit} roots for testing\n")
    roots_data = fetch_roots_for_validation(root_ids)

    print(f"Total roots to validate: {len(roots_data)}\n")

    # Phase 1: Pattern-based classification
    print("Phase 1: Pattern-Based Classification (FAST)")
    print("-" * 80)
    categorized = batch_check_roots(roots_data)

    for category, roots in categorized.items():
        print(f"  {category:20}: {len(roots):5} roots")

    # Phase 2: CAMeL Tools morphological analysis
    print("\nPhase 2: CAMeL Tools Linguistic Analysis")
    print("-" * 80)
    print(f"  Analyzing {len(roots_data)} roots with CAMeL Tools...")

    # Create analyzer once and reuse for all chunks (performance optimization)
    from utils.camel_analyzer import CamelRootAnalyzer
    analyzer = CamelRootAnalyzer()

    # Process in chunks with progress bar
    chunk_size = 100
    for i in tqdm(range(0, len(roots_data), chunk_size), desc="CAMeL analysis", unit="chunk"):
        chunk = roots_data[i:i+chunk_size]
        batch_analyze_roots(chunk, analyzer=analyzer)

    # Count successful analyses
    analyzed_count = sum(1 for r in roots_data if r.get("camel_analysis") is not None)
    print(f"  Successfully analyzed: {analyzed_count}/{len(roots_data)} roots")

    # Phase 3: AI validation for all non-correct cases
    print("\nPhase 3: AI Validation for Derived & Uncertain Cases")
    print("-" * 80)

    # Combine all categories that need AI review
    roots_needing_validation = (
        categorized["definite_derived"] +
        categorized["likely_derived"] +
        categorized["uncertain"]
    )

    # By default, validate everything (including "likely_correct")
    if not skip_likely_correct:
        roots_needing_validation += categorized["likely_correct"]

    print(f"  Definite derived: {len(categorized['definite_derived'])} roots")
    print(f"  Likely derived:   {len(categorized['likely_derived'])} roots")
    print(f"  Uncertain:        {len(categorized['uncertain'])} roots")
    print(f"  Likely correct:   {len(categorized['likely_correct'])} roots {'(SKIPPING - use --fast for speed)' if skip_likely_correct else '(VALIDATING)'}")
    print(f"  Total to AI:      {len(roots_needing_validation)} roots (in batches of 50)...")

    ai_validations = []
    failed_batches = []

    if roots_needing_validation:
        client = OpenRouterClient()
        batch_size = 50

        for i in tqdm(range(0, len(roots_needing_validation), batch_size), desc="AI validation"):
            batch = roots_needing_validation[i:i+batch_size]
            batch_num = (i // batch_size) + 1

            try:
                response = client.validate_roots_batch(batch, retry_count=0)
                validated_batch = RootValidationBatchResponse(**response)

                # Check if we got validations for all roots in batch
                received_ids = {v.root_id for v in validated_batch.validations}
                expected_ids = {r['root_id'] for r in batch}
                missing_ids = expected_ids - received_ids

                if missing_ids:
                    logger.warning(f"Batch {batch_num}: Missing validations for {len(missing_ids)} roots: {missing_ids}")

                ai_validations.extend([v.model_dump() for v in validated_batch.validations])

            except Exception as e:
                logger.error(f"Batch {batch_num} FAILED ({len(batch)} roots): {e}")
                failed_batches.append({
                    "batch_num": batch_num,
                    "root_ids": [r['root_id'] for r in batch],
                    "error": str(e)
                })
                continue

    print(f"  AI validated: {len(ai_validations)} roots")
    if failed_batches:
        print(f"  ⚠️  FAILED: {len(failed_batches)} batches ({sum(len(b['root_ids']) for b in failed_batches)} roots)")
        print(f"  Failed root IDs: {[r for b in failed_batches for r in b['root_ids']]}")

    # Phase 4: Save all validations
    print("\nPhase 4: Saving Results")
    print("-" * 80)

    if ai_validations:
        saved, skipped = save_root_validation_improvements(ai_validations, roots_needing_validation)
        print(f"  Saved: {saved} improvements")
        print(f"  Skipped: {skipped} (already correct)")
    else:
        saved, skipped = 0, 0

    # Summary statistics
    failed_count = sum(len(b['root_ids']) for b in failed_batches)
    stats = {
        "total": len(roots_data),
        "definite_derived": len(categorized["definite_derived"]),
        "likely_derived": len(categorized["likely_derived"]),
        "uncertain": len(categorized["uncertain"]),
        "likely_correct": len(categorized["likely_correct"]),
        "ai_validated": len(ai_validations),
        "saved": saved,
        "skipped": skipped,
        "failed": failed_count,
    }

    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Total roots:          {stats['total']}")
    print(f"Definite derived:     {stats['definite_derived']}")
    print(f"Likely derived:       {stats['likely_derived']}")
    print(f"Uncertain (AI):       {stats['uncertain']}")
    print(f"Likely correct:       {stats['likely_correct']} {'(SKIPPED)' if skip_likely_correct else '(VALIDATED)'}")
    print(f"\nAI validations:       {stats['ai_validated']}")
    print(f"Total saved:          {stats['saved']}")
    print(f"Already correct:      {stats['skipped']}")
    if stats['failed'] > 0:
        print(f"FAILED validations:   {stats['failed']} ⚠️")
    print("="*80 + "\n")

    return stats


def show_stats_only():
    """Show categorization statistics without validation."""
    print("\n" + "="*80)
    print("ROOT PATTERN ANALYSIS (Stats Only)")
    print("="*80 + "\n")

    root_ids = get_all_root_ids()
    roots_data = fetch_roots_for_validation(root_ids)

    print(f"Total roots: {len(roots_data)}\n")

    categorized = batch_check_roots(roots_data)

    print("Classification Results:")
    print("-" * 80)
    for category, roots in categorized.items():
        percentage = (len(roots) / len(roots_data)) * 100
        print(f"{category:20}: {len(roots):5} roots ({percentage:5.1f}%)")

    # Show some examples from each category
    print("\n" + "="*80)
    print("EXAMPLES FROM EACH CATEGORY")
    print("="*80)

    for category, roots in categorized.items():
        print(f"\n{category.upper()}:")
        print("-" * 80)
        for root in roots[:5]:  # Show first 5 examples
            print(f"  {root['current_letters']:15} = {root['current_meaning']:20} | {root['reason']}")
        if len(roots) > 5:
            print(f"  ... and {len(roots) - 5} more")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Hybrid root validation using pattern matching + AI"
    )

    parser.add_argument("--all", action="store_true", help="Validate all roots (default: thorough mode)")
    parser.add_argument("--stats-only", action="store_true", help="Show statistics only, no validation")
    parser.add_argument("--limit", type=int, help="Limit to first N roots (for testing)")
    parser.add_argument(
        "--fast",
        action="store_true",
        help="Fast mode: skip 'likely_correct' roots (saves ~50%% time/cost but may miss errors)"
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")

    args = parser.parse_args()

    if args.stats_only:
        show_stats_only()
        return 0

    if args.all:
        validate_hybrid(args.verbose, args.limit, args.fast)
        return 0

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
