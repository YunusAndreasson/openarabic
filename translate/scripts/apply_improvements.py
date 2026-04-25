"""Review and apply translation improvements to sentence_words.

Pipeline: validate (haiku) → review (opus) → apply approved changes.

The review step sends only "original → suggested" pairs to Opus for a quick
quality gate — no sentence context needed, just English quality checking.

Usage:
    # Review + apply all pending improvements
    uv run python scripts/apply_improvements.py

    # Review only (mark approved/rejected but don't update sentence_words)
    uv run python scripts/apply_improvements.py --review-only

    # Skip review, apply already-approved improvements
    uv run python scripts/apply_improvements.py --skip-review

    # Dry-run (show what would change, don't write anything)
    uv run python scripts/apply_improvements.py --dry-run

    # Filter by article IDs
    uv run python scripts/apply_improvements.py --article-ids 441 442 443

    # Use a different model for review (default: opus)
    uv run python scripts/apply_improvements.py --review-model sonnet
"""

import argparse
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import utils.set_keys  # noqa: F401

from utils.claude_cli import review_all_improvements
from utils.storage import get_supabase_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def fetch_pending_improvements(
    article_ids: list[int] | None = None,
) -> list[dict]:
    """Fetch pending improvements, optionally filtered by article IDs."""
    client = get_supabase_client()

    query = (
        client.table("translation_improvements")
        .select(
            "id, sentence_word_id, suggested_english, reviewer_notes, "
            "sentence_word:sentence_words!inner(id, english, word_form, "
            "sentence:article_sentences!inner(id, article_id))"
        )
        .eq("status", "pending")
    )

    if article_ids:
        query = query.in_(
            "sentence_word.sentence.article_id", article_ids
        )

    resp = query.execute()
    return resp.data or []


def fetch_approved_improvements(
    article_ids: list[int] | None = None,
) -> list[dict]:
    """Fetch approved improvements ready to apply."""
    client = get_supabase_client()

    query = (
        client.table("translation_improvements")
        .select(
            "id, sentence_word_id, suggested_english, "
            "sentence_word:sentence_words!inner(id, english, word_form, "
            "sentence:article_sentences!inner(id, article_id))"
        )
        .eq("status", "approved")
    )

    if article_ids:
        query = query.in_(
            "sentence_word.sentence.article_id", article_ids
        )

    resp = query.execute()
    return resp.data or []


def review_improvements(
    improvements: list[dict],
    model: str = "opus",
    dry_run: bool = False,
) -> tuple[int, int]:
    """Send improvements to Claude for quality review.

    Returns (approved_count, rejected_count).
    """
    # Build review input — just the English pairs + arabic word
    review_input = []
    for imp in improvements:
        review_input.append({
            "id": imp["id"],
            "arabic_word": imp["sentence_word"]["word_form"],
            "original_english": imp["sentence_word"]["english"],
            "suggested_english": imp["suggested_english"],
        })

    print(f"Reviewing {len(review_input)} improvements with {model}...", flush=True)
    reviews = review_all_improvements(review_input, model=model)

    # Build lookup
    verdict_map = {r["id"]: r for r in reviews}

    client = get_supabase_client()
    approved = 0
    rejected = 0

    for imp in improvements:
        verdict = verdict_map.get(imp["id"])
        if not verdict:
            logger.warning(f"  No verdict for improvement {imp['id']}, skipping")
            continue

        word_form = imp["sentence_word"]["word_form"]
        old = imp["sentence_word"]["english"]
        new = imp["suggested_english"]
        status = "approved" if verdict["approve"] else "rejected"
        symbol = "✓" if verdict["approve"] else "✗"

        logger.info(
            f"  {symbol} {word_form:20s}  \"{old}\" → \"{new}\"  — {verdict['reason']}"
        )

        if not dry_run:
            client.table("translation_improvements").update(
                {"status": status, "reviewer_notes": verdict["reason"]}
            ).eq("id", imp["id"]).execute()

        if verdict["approve"]:
            approved += 1
        else:
            rejected += 1

    return approved, rejected


def apply_approved(
    improvements: list[dict],
    dry_run: bool = False,
) -> int:
    """Apply approved improvements: update sentence_words.english, mark as applied."""
    client = get_supabase_client()
    applied = 0

    for imp in improvements:
        word_id = imp["sentence_word_id"]
        new_english = imp["suggested_english"]
        old_english = imp["sentence_word"]["english"]
        word_form = imp["sentence_word"]["word_form"]

        if old_english == new_english:
            continue

        logger.info(f"  {word_form:20s}  \"{old_english}\" → \"{new_english}\"")

        if not dry_run:
            client.table("sentence_words").update(
                {"english": new_english}
            ).eq("id", word_id).execute()

        applied += 1

    return applied


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Review and apply translation improvements",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Show changes without writing anything",
    )
    parser.add_argument(
        "--review-only", action="store_true",
        help="Review pending improvements but don't apply",
    )
    parser.add_argument(
        "--skip-review", action="store_true",
        help="Skip review, apply already-approved improvements",
    )
    parser.add_argument(
        "--review-model", default="opus",
        help="Model for review step (default: opus)",
    )
    parser.add_argument(
        "--article-ids", type=int, nargs="+",
        help="Only process improvements for these article IDs",
    )
    args = parser.parse_args()

    if args.skip_review:
        # Apply already-approved improvements
        improvements = fetch_approved_improvements(args.article_ids)
        if not improvements:
            print("No approved improvements to apply.")
            return 0

        print(f"Applying {len(improvements)} approved improvements...")
        applied = apply_approved(improvements, dry_run=args.dry_run)
        action = "Would apply" if args.dry_run else "Applied"
        print(f"\n{action} {applied} improvements to sentence_words.")
        return 0

    # Review pending improvements
    pending = fetch_pending_improvements(args.article_ids)
    if not pending:
        print("No pending improvements to review.")
        return 0

    print(f"Found {len(pending)} pending improvements")
    approved, rejected = review_improvements(
        pending, model=args.review_model, dry_run=args.dry_run,
    )
    print(f"\nReview: {approved} approved, {rejected} rejected")

    if args.review_only or args.dry_run:
        return 0

    # Apply the approved ones
    approved_imps = fetch_approved_improvements(args.article_ids)
    if not approved_imps:
        print("No approved improvements to apply.")
        return 0

    print(f"\nApplying {len(approved_imps)} approved improvements...")
    applied = apply_approved(approved_imps)
    print(f"Applied {applied} improvements to sentence_words.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
