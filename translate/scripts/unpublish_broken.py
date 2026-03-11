"""Unpublish articles affected by the batch-boundary refinement bug.

These articles have wrong tashkeel/English/word_by_word for sentences at
position 12+ due to the refinement step's conversation continuity bug.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import utils.set_keys  # noqa: F401 - sets environment variables
from utils.config_common import get_supabase_client

BROKEN_ARTICLE_IDS = [
    466, 470,  # From pre-471 investigation
    471, 473, 474, 475, 476, 477, 478,  # Feb 26-27
    482, 483, 484, 486, 487, 489, 490, 491, 492,  # Feb 27-28
    495, 496, 497, 498, 499, 500, 501,  # Feb 28+
]


def main():
    supabase = get_supabase_client()

    # First check current publish status
    result = (
        supabase.table("articles")
        .select("id, title, published")
        .in_("id", BROKEN_ARTICLE_IDS)
        .order("id")
        .execute()
    )

    if not result.data:
        print("No articles found with those IDs.")
        return

    already_unpublished = []
    to_unpublish = []

    for article in result.data:
        if article["published"]:
            to_unpublish.append(article)
        else:
            already_unpublished.append(article)

    if already_unpublished:
        print(f"\n{len(already_unpublished)} articles already unpublished:")
        for a in already_unpublished:
            print(f"  [{a['id']}] {a['title']}")

    if not to_unpublish:
        print("\nAll broken articles are already unpublished. Nothing to do.")
        return

    print(f"\n{len(to_unpublish)} articles to unpublish:")
    for a in to_unpublish:
        print(f"  [{a['id']}] {a['title']}")

    # Unpublish them
    update_result = (
        supabase.table("articles")
        .update({"published": False})
        .in_("id", [a["id"] for a in to_unpublish])
        .execute()
    )

    print(f"\nUnpublished {len(update_result.data)} articles.")

    # Verify
    verify = (
        supabase.table("articles")
        .select("id, published")
        .in_("id", BROKEN_ARTICLE_IDS)
        .eq("published", True)
        .execute()
    )

    if verify.data:
        print(f"\nWARNING: {len(verify.data)} articles still published: {[a['id'] for a in verify.data]}")
    else:
        print("Verified: all broken articles are now unpublished.")


if __name__ == "__main__":
    main()
