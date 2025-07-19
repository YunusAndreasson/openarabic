import json
import logging
import os
import sys
from datetime import UTC, datetime
from typing import Any, Dict, List

from translate.utils import load_api_keys
from translate.utils.cache_utils import ensure_valid_cache_files
from translate.utils.database_utils import (
    archive_files,
    insert_article_sentences,
    save_timing_report,
    validate_article_data,
)
from translate.utils.storage_utils import (
    check_article_exists,
    generate_content_hash,
    get_author_id,
    get_category_id,
    supabase,
)

logger = logging.getLogger(__name__)

load_api_keys()


def process_json_file(file_path: str, category_id: int, author_id: int) -> int:
    """Process the JSON file and insert data into Supabase."""
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    validate_article_data(data)

    content_hash = generate_content_hash(data)

    existing_article_id, _ = check_article_exists(content_hash)

    if existing_article_id:
        archive_files(file_path, existing_article_id)
        return existing_article_id

    article_data = {
        "title": data["metadata"]["title"],
        "summary": data["metadata"]["summary"],
        "difficulty_level": data["metadata"]["difficulty_level"],
        "category_id": category_id,
        "author_id": author_id,
        "created_at": datetime.now(UTC).isoformat(),
    }

    try:
        article_data["content_hash"] = content_hash
    except Exception as e:
        if "content_hash" not in str(e):
            raise e

    result = supabase.table("articles").insert(article_data).execute()
    article_id = result.data[0]["id"]

    timing_stats = insert_article_sentences(article_id, data["translations"])

    archive_files(file_path, article_id)

    save_timing_report(article_id, data["metadata"]["title"], file_path, timing_stats)

    return article_id


def main() -> None:
    """Main function to run the script."""
    ensure_valid_cache_files()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    articles_dir = os.path.abspath(os.path.join(script_dir, "..", "article"))

    if not os.path.exists(articles_dir):
        logger.info(f"❌ Could not find articles directory at {articles_dir}")
        sys.exit(1)

    json_files: List[str] = []

    direct_output_json = os.path.join(articles_dir, "output.json")
    if os.path.exists(direct_output_json):
        json_files.append(direct_output_json)

    for item in os.listdir(articles_dir):
        item_path = os.path.join(articles_dir, item)
        if os.path.isdir(item_path):
            output_json = os.path.join(item_path, "output.json")
            if os.path.exists(output_json):
                json_files.append(output_json)

    if not json_files:
        logger.info("❌ No article output.json files found in the articles directory")
        sys.exit(1)

    error_count = 0

    category_id = get_category_id("aqeedah")
    author_id = get_author_id("Ibn Kathir")

    for json_path in json_files:
        try:
            process_json_file(json_path, category_id, author_id)
        except Exception as e:
            error_count += 1
            logger.info(f"❌ Error processing {json_path}: {str(e)}")

    if error_count > 0:
        logger.info(f"❌ Failed to process: {error_count} articles")
        sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()
