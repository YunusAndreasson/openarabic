import json
import logging
import os
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load API keys at startup
try:
    import utils.set_keys  # noqa: F401  # Import for side effects only

    logging.getLogger(__name__).info("API keys loaded from set_keys.py")
except ImportError:
    logging.getLogger(__name__).warning(
        "set_keys.py not found, using environment variables"
    )

from audio.audio_utils import (
    create_article_audio,
    generate_audio_filename,
    generate_speech,
)
from data.config import (
    AUTHOR_NUMBER_MAPPING,
    TRANSLATE_DIR,
)
from data.models import ArticleData, SentenceTranslation
from utils import load_api_keys

# Cache utilities removed - using Supabase Storage as single source of truth
from utils.config_common import get_storage_url
from utils.database_utils import (
    archive_files,
    cleanup_temp_files,
    insert_article_sentences,
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
        create_article_audio,
    )

    AUDIO_AVAILABLE = True
except Exception as e:
    logger = logging.getLogger(__name__)
    logger.warning(f"Audio generation not available: {e}")
    AUDIO_AVAILABLE = False

logger = logging.getLogger(__name__)

load_api_keys()


def generate_article_audio(
    article_id: int,
    translations: list[SentenceTranslation],
    progress_tracker: Any = None,
) -> None:
    """Generate article-level audio files in one streamlined pass."""
    if not AUDIO_AVAILABLE:
        raise RuntimeError("Audio generation not available - failing per strict mode")

    use_progress = progress_tracker is not None
    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_audio")
    os.makedirs(temp_dir, exist_ok=True)

    try:
        # Prepare sentence data for the new streamlined function
        sentences = []
        for i, translation in enumerate(translations):
            if use_progress:
                progress_tracker.set_description(
                    f"Preparing sentence {i + 1}/{len(translations)} for audio generation"
                )
                progress_tracker.update(1)

            sentences.append(
                {
                    "arabic_text": translation.tashkeel or translation.original,
                    "english_text": translation.full_translation,
                    "tashkeel": translation.tashkeel,
                }
            )

        # Get article metadata for bilingual audio intro
        try:
            article_data = (
                get_supabase_client()
                .table("articles")
                .select("title, summary")
                .eq("id", article_id)
                .execute()
            )
            if article_data.data:
                article_title = article_data.data[0].get("title")
                article_summary = article_data.data[0].get("summary")
            else:
                article_title = None
                article_summary = None
        except Exception as e:
            logger.warning(f"Could not fetch article metadata: {e}")
            article_title = None
            article_summary = None

        # Create article audio files in one pass
        logger.info("Creating article audio files...")
        audio_urls = create_article_audio(
            sentences=sentences,
            article_title=article_title,
            article_summary=article_summary,
            output_dir=temp_dir,
        )

        if not audio_urls:
            raise RuntimeError("Failed to create article audio files")

        # Update database with article-level audio URLs
        try:
            get_supabase_client().table("articles").update(
                {
                    "audio_url": audio_urls["arabic_url"],
                    "audio_url_bilingual": audio_urls["bilingual_url"],
                }
            ).eq("id", article_id).execute()

            logger.info("Article audio URLs updated in database successfully")

        except Exception as e:
            raise RuntimeError(f"Failed to update article audio URLs: {e}")

        # Clean up temporary directory
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

    except Exception as e:
        # Clean up on error
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        raise RuntimeError(f"Failed to generate article audio: {e}")


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

    # Fail loudly – author mapping must be correct
    raise ValueError(
        f"Could not detect author from file path '{file_path}'. Ensure filename starts with known author number."
    )


def process_json_file(file_path: str, category_id: int = None) -> int:
    """Process the JSON file and insert data into Supabase."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    # Detect author from file path
    author_name, author_id = detect_author_from_file_path(file_path)

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

    # Get a random image URL for the article
    from utils.storage_utils import get_random_article_image_url

    image_url = get_random_article_image_url()
    if not image_url:
        logger.error("No random image available - images should always be available")
        raise ValueError(
            "Failed to get random image for article - images bucket is empty or inaccessible"
        )

    # Convert dict translations back to SentenceTranslation objects for validation
    translations = [SentenceTranslation(**t) for t in data["translations"]]

    # Validate translations before processing
    try:
        validate_batch_before_processing(translations)
    except Exception as e:
        logger.error(f"Validation failed: {e}")
        raise

    # CRITICAL: Final validation to prevent placeholder data insertion
    try:
        validate_batch_no_placeholder_data(translations)
    except Exception as e:
        logger.error(f"CRITICAL: Placeholder data detected - aborting insertion: {e}")
        raise

    # CRITICAL: Generate audio BEFORE inserting the article
    # This ensures audio_url is available when the article is inserted
    article_audio_url = None
    if AUDIO_AVAILABLE:
        try:
            # Create temporary directory for audio processing
            temp_dir = tempfile.mkdtemp()

            # Use the new streamlined audio generation function
            logger.info("Generating streamlined article audio...")

            # Prepare sentence data for the new streamlined function
            sentences = []
            for translation in translations:
                sentences.append(
                    {
                        "arabic_text": translation.tashkeel or translation.original,
                        "english_text": translation.full_translation,
                        "tashkeel": translation.tashkeel,
                    }
                )

            # Create article audio files in one pass
            audio_urls = create_article_audio(
                sentences=sentences,
                article_title=data["metadata"]["title"],
                article_summary=data["metadata"]["summary"],
                output_dir=temp_dir,
            )

            if audio_urls:
                # Get the Arabic audio URL for the article
                article_audio_url = audio_urls["arabic_url"]
                logger.info(f"Generated article audio: {article_audio_url}")
            else:
                raise RuntimeError("Failed to create article audio files")

            # Clean up temporary directory
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)

        except Exception as e:
            logger.error(f"Audio generation failed: {e}")
            raise RuntimeError(f"Audio generation is mandatory and failed: {e}") from e

    # Create ArticleData object with audio_url
    article_data = ArticleData(
        title=data["metadata"]["title"],
        summary=data["metadata"]["summary"],
        difficulty_level=data["metadata"]["difficulty_level"],
        category_id=category_id,
        author_id=author_id,
        content_hash=content_hash,
        image_url=image_url,
        audio_url=article_audio_url,  # This will be None if AUDIO_AVAILABLE is False
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

    # Use global progress tracker for sentence-level updates
    try:
        from utils.progress_tracker import progress_tracker

        use_progress = True
    except ImportError:
        use_progress = False

    insert_article_sentences(
        article_id, data["translations"], progress_tracker if use_progress else None
    )

    archive_files(file_path, article_id)

    return article_id


def find_translation_files() -> list[str]:
    """Find all translation files in the translate directory."""
    translation_files: list[str] = []
    import re

    filename_re = re.compile(r"^\d+_.*_translated\.json$")

    if not os.path.exists(TRANSLATE_DIR):
        logger.warning(f"Translate directory not found: {TRANSLATE_DIR}")
        return translation_files

    # Look for translated JSON files that match our author-number convention
    for file_name in os.listdir(TRANSLATE_DIR):
        if filename_re.match(file_name):
            translation_file = os.path.join(TRANSLATE_DIR, file_name)
            translation_files.append(translation_file)

    return translation_files


def main() -> int:
    """Main function to run the script."""
    # Cache validation removed - using Supabase Storage as single source of truth

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
            process_json_file(json_path)

        except Exception as e:
            error_count += 1
            logger.error(f"Failed to process {json_path}: {e}")

    if error_count > 0:
        logger.error(f"Failed to process {error_count} files")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
