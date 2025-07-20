import json
import logging
import os
import sys
from datetime import UTC, datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import load_api_keys
from utils.cache_utils import ensure_valid_cache_files
from utils.database_utils import (
    archive_files,
    insert_article_sentences,
    save_timing_report,
    validate_article_data,
)
from utils.storage_utils import (
    check_article_exists,
    generate_content_hash,
    get_author_id,
    get_category_id,
    get_supabase_client,
)

# Import audio utilities for final phase
try:
    from audio.audio_utils import generate_audio_filename, generate_sentence_audio

    AUDIO_AVAILABLE = True
except Exception as e:
    logger = logging.getLogger(__name__)
    logger.warning(f"Audio generation not available: {e}")
    AUDIO_AVAILABLE = False

logger = logging.getLogger(__name__)

load_api_keys()


def generate_article_audio(article_id: int, translations: list[dict]) -> None:
    """Generate audio for all sentences in an article."""
    if not AUDIO_AVAILABLE:
        logger.warning("Audio generation not available")
        return

    for i, translation in enumerate(translations):
        try:
            # Get the Arabic text (prefer tashkeel if available)
            arabic_text = translation.get("tashkeel", translation.get("original", ""))
            if not arabic_text:
                logger.warning(f"Skipping sentence {i}: no Arabic text found")
                continue

            # Generate unique filename
            audio_filename = generate_audio_filename()

            # Get context for better audio quality
            previous_text = None
            next_text = None
            if i > 0:
                prev_translation = translations[i - 1]
                previous_text = prev_translation.get(
                    "tashkeel", prev_translation.get("original", "")
                )
            if i < len(translations) - 1:
                next_translation = translations[i + 1]
                next_text = next_translation.get(
                    "tashkeel", next_translation.get("original", "")
                )

            # Generate audio
            audio_result = generate_sentence_audio(
                text=arabic_text,
                filename=audio_filename,
                previous_text=previous_text,
                next_text=next_text,
            )

            if audio_result and audio_result.get("url"):
                # Update the database with the audio URL
                try:
                    get_supabase_client().table("article_sentences").update(
                        {"audio_url": audio_result["url"]}
                    ).eq("article_id", article_id).eq("position", i).execute()
                except Exception as e:
                    logger.error(
                        f"Failed to update audio URL for sentence {i + 1}: {e}"
                    )
            else:
                logger.error(f"Failed to generate audio for sentence {i + 1}")

        except Exception as e:
            logger.error(f"Error generating audio for sentence {i + 1}: {e}")
            # Continue with next sentence - don't fail the entire process


def process_json_file(file_path: str, category_id: int, author_id: int) -> int:
    """Process the JSON file and insert data into Supabase."""
    with open(file_path, encoding="utf-8") as f:
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

    result = get_supabase_client().table("articles").insert(article_data).execute()
    article_id = result.data[0]["id"]

    # Generate audio for sentences in the final phase
    if AUDIO_AVAILABLE:
        try:
            generate_article_audio(article_id, data["translations"])
        except Exception as e:
            logger.error(f"Audio generation failed: {e}")
            # Continue without audio - don't fail the entire pipeline

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
        sys.exit(1)

    json_files: list[str] = []

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
        sys.exit(1)

    error_count = 0

    category_id = get_category_id("aqeedah")
    author_id = get_author_id("Ibn Kathir")

    for json_path in json_files:
        try:
            process_json_file(json_path, category_id, author_id)
        except Exception:
            error_count += 1

    if error_count > 0:
        sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()
