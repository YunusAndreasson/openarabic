import json
import os
import sys
import logging
from datetime import datetime, UTC

# Import from the newly created modules
from translate.core.storage_utils import (
    supabase,
    generate_content_hash,
    check_article_exists,
    get_category_id,
    get_author_id,
)
from translate.core.database_utils import (
    insert_article_sentences,
    save_timing_report,
    archive_files,
    validate_article_data,
)
from translate.core.cache_utils import ensure_valid_cache_files
from translate.core.utils import load_api_keys

logger = logging.getLogger(__name__)

# Load environment variables once
load_api_keys()


def process_json_file(file_path: str, category_id: int, author_id: int) -> None:
    """Process the JSON file and insert data into Supabase."""
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Validate data before processing
    validate_article_data(data)

    # Generate content hash for idempotency
    content_hash = generate_content_hash(data)

    # Check if article already exists
    existing_article_id, existing_audio_url = check_article_exists(content_hash)

    if existing_article_id:
        # Move files to archive even for existing articles
        archive_files(file_path, existing_article_id)
        return existing_article_id

    # Prepare article data
    article_data = {
        "title": data["metadata"]["title"],
        "summary": data["metadata"]["summary"],
        "difficulty_level": data["metadata"]["difficulty_level"],
        "category_id": category_id,
        "author_id": author_id,
        "created_at": datetime.now(UTC).isoformat(),
    }

    # Only add content_hash if the column exists
    try:
        article_data["content_hash"] = content_hash
    except Exception as e:
        if "content_hash" not in str(e):
            raise e

    # Insert article
    result = supabase.table("articles").insert(article_data).execute()
    article_id = result.data[0]["id"]

    # Insert sentences and their words
    # This will also generate and concatenate sentence audio files
    timing_stats = insert_article_sentences(article_id, data["translations"])

    # Move files to archive with new article ID
    archive_files(file_path, article_id)

    # Save timing statistics to a report file
    save_timing_report(article_id, data["metadata"]["title"], file_path, timing_stats)

    return article_id


def main():
    """Main function to run the script."""
    # Ensure all cache files have proper extensions
    ensure_valid_cache_files()

    # Always reference the article directory inside the translate directory (not translate/translate/article)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    articles_dir = os.path.abspath(os.path.join(script_dir, "..", "article"))

    if not os.path.exists(articles_dir):
        logger.info(f"❌ Could not find articles directory at {articles_dir}")
        sys.exit(1)

    # Get all json files in the articles directory
    json_files = []

    # Check for output.json directly in the articles directory
    direct_output_json = os.path.join(articles_dir, "output.json")
    if os.path.exists(direct_output_json):
        json_files.append(direct_output_json)

    # Also check subdirectories
    for item in os.listdir(articles_dir):
        item_path = os.path.join(articles_dir, item)
        if os.path.isdir(item_path):  # If it's a directory
            output_json = os.path.join(item_path, "output.json")
            if os.path.exists(output_json):
                json_files.append(output_json)

    if not json_files:
        logger.info("❌ No article output.json files found in the articles directory")
        sys.exit(1)

    success_count = 0
    error_count = 0

    # Fetch category and author IDs once to avoid redundant lookups
    category_id = get_category_id("aqeedah")
    author_id = get_author_id("Ibn Kathir")

    for json_path in json_files:
        try:
            process_json_file(json_path, category_id, author_id)
            success_count += 1
        except Exception as e:
            error_count += 1
            logger.info(f"❌ Error processing {json_path}: {str(e)}")

    if error_count > 0:
        logger.info(f"❌ Failed to process: {error_count} articles")
        sys.exit(1)

    # Normal successful completion
    sys.exit(0)


if __name__ == "__main__":
    main()
