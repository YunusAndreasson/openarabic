import json
import logging
import os
import sys
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.config import AUTHOR_NUMBER_MAPPING, TRANSLATE_DIR
from data.models import ArticleData, SentenceTranslation
from utils import load_api_keys
from utils.cache_utils import ensure_valid_cache_files
from utils.database_utils import (
    archive_files,
    insert_article_sentences,
    save_timing_report,
)
from utils.storage_utils import (
    check_article_exists,
    generate_content_hash,
    get_author_id,
    get_category_id,
    get_supabase_client,
)
from utils.validation import (
    validate_batch_before_processing,
    validate_batch_no_placeholder_data,
)

# Import audio utilities for final phase
try:
    from audio.audio_utils import (
        generate_audio_filename,
        generate_sentence_audio,
    )

    AUDIO_AVAILABLE = True
except Exception as e:
    logger = logging.getLogger(__name__)
    logger.warning(f"Audio generation not available: {e}")
    AUDIO_AVAILABLE = False

logger = logging.getLogger(__name__)

load_api_keys()


def generate_article_audio(
    article_id: int, translations: list[SentenceTranslation]
) -> None:
    """Generate audio for all sentences in an article."""
    if not AUDIO_AVAILABLE:
        logger.warning("Audio generation not available")
        return

    for i, translation in enumerate(translations):
        try:
            # Get the Arabic text (prefer tashkeel if available)
            arabic_text = translation.tashkeel or translation.original
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
                previous_text = prev_translation.tashkeel or prev_translation.original
            if i < len(translations) - 1:
                next_translation = translations[i + 1]
                next_text = next_translation.tashkeel or next_translation.original

            # Generate audio
            audio_result = generate_sentence_audio(
                text=arabic_text,
                filename=audio_filename,
                previous_text=previous_text,
                next_text=next_text,
            )

            if audio_result and audio_result.url:
                # Update the database with the audio URL
                try:
                    get_supabase_client().table("article_sentences").update(
                        {"audio_url": audio_result.url}
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


def detect_author_from_file_path(file_path: str) -> tuple[str, int]:
    """
    Detect author from file path structure.
    Returns (author_name, author_id)
    """
    # Extract author number from filename (e.g., "5_test_article_translated.json" -> "5")
    filename = Path(file_path).name
    author_number = filename.split("_")[0]

    # Look up author name by number
    if author_number in AUTHOR_NUMBER_MAPPING:
        author_name = AUTHOR_NUMBER_MAPPING[author_number]
        try:
            author_id = get_author_id(author_name)
            return author_name, author_id
        except ValueError:
            logger.error(f"Author not found in database: {author_name}")
            raise

    # Fallback to default author if not found
    logger.warning("Could not detect author from file path, using default")
    default_author = "Ibn Kathir"
    author_id = get_author_id(default_author)
    return default_author, author_id


def process_json_file(file_path: str, category_id: int = None) -> int:
    """Process the JSON file and insert data into Supabase."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    # Detect author from file path
    author_name, author_id = detect_author_from_file_path(file_path)
    logger.info(f"Processing file for author: {author_name} (ID: {author_id})")

    # Use default category if not specified
    if category_id is None:
        category_id = get_category_id("aqeedah")

    try:
        with open(file_path, encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        logger.error(f"Failed to read JSON file: {e}")
        raise

    # Validate required fields
    if "metadata" not in data or "translations" not in data:
        raise ValueError("Invalid JSON structure: missing metadata or translations")

    # Check if article already exists
    content_hash = generate_content_hash(data)
    existing_article_id, existing_audio_url = check_article_exists(content_hash)

    if existing_article_id:
        logger.info(
            f"Article already exists with ID {existing_article_id} and audio URL: {existing_audio_url}"
        )
        return existing_article_id

    # Create ArticleData object
    article_data = ArticleData(
        title=data["metadata"]["title"],
        summary=data["metadata"]["summary"],
        difficulty_level=data["metadata"]["difficulty_level"],
        category_id=category_id,
        author_id=author_id,
        content_hash=content_hash,
        created_at=datetime.now(UTC).isoformat(),
    )

    try:
        result = (
            get_supabase_client()
            .table("articles")
            .insert(article_data.model_dump())
            .execute()
        )
        article_id = result.data[0]["id"]
    except Exception as e:
        logger.error(f"Failed to insert article: {e}")
        raise

    # Convert dict translations back to SentenceTranslation objects for validation
    translations = [SentenceTranslation(**t) for t in data["translations"]]

    # Validate translations before processing
    try:
        validate_batch_before_processing(translations)
        logger.info(f"Validation passed for {len(translations)} translations")
    except Exception as e:
        logger.error(f"Validation failed: {e}")
        raise

    # CRITICAL: Final validation to prevent placeholder data insertion
    try:
        validate_batch_no_placeholder_data(translations)
        logger.info(
            f"Placeholder validation passed for {len(translations)} translations"
        )
    except Exception as e:
        logger.error(f"CRITICAL: Placeholder data detected - aborting insertion: {e}")
        raise

    timing_stats = insert_article_sentences(article_id, data["translations"])

    # Generate audio for sentences after they've been inserted
    if AUDIO_AVAILABLE:
        try:
            generate_article_audio(article_id, translations)
        except Exception as e:
            logger.error(f"Audio generation failed: {e}")
            # Continue without audio - don't fail the entire pipeline

    archive_files(file_path, article_id)

    save_timing_report(article_id, data["metadata"]["title"], file_path, timing_stats)

    return article_id


def find_translation_files() -> list[str]:
    """Find all translation files in the translate directory."""
    translation_files: list[str] = []

    if not os.path.exists(TRANSLATE_DIR):
        logger.warning(f"Translate directory not found: {TRANSLATE_DIR}")
        return translation_files

    # Look for translated JSON files in flat directory
    for file_name in os.listdir(TRANSLATE_DIR):
        if file_name.endswith("_translated.json"):
            translation_file = os.path.join(TRANSLATE_DIR, file_name)
            translation_files.append(translation_file)
            logger.info(f"Found translation file: {translation_file}")

    return translation_files


def main() -> int:
    """Main function to run the script."""
    ensure_valid_cache_files()

    # Find all translation files
    translation_files = find_translation_files()

    if not translation_files:
        logger.error("No translation files found")
        logger.info(
            f"Please run the translation phase first. Expected location: {TRANSLATE_DIR}"
        )
        return 1

    error_count = 0

    for json_path in translation_files:
        try:
            article_id = process_json_file(json_path)
            logger.info(
                f"Successfully processed: {json_path} -> Article ID: {article_id}"
            )
        except Exception as e:
            error_count += 1
            logger.error(f"Failed to process {json_path}: {e}")

    if error_count > 0:
        logger.error(f"Failed to process {error_count} files")
        return 1

    logger.info("All files processed successfully")
    return 0


if __name__ == "__main__":
    sys.exit(main())
