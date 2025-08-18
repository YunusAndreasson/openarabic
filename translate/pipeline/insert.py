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
    download_audio_for_concat,
    generate_audio_filename,
    generate_bilingual_sentence_audio,
    generate_english_sentence_audio,
    generate_sentence_audio,
)
from data.config import (
    AUTHOR_NUMBER_MAPPING,
    SUPABASE_URL,
    TRANSLATE_DIR,
)
from data.models import ArticleData, SentenceTranslation
from utils import load_api_keys
from utils.cache_utils import ensure_valid_cache_files
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
        concatenate_audio_files,
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
    article_id: int,
    translations: list[SentenceTranslation],
    progress_tracker: Any = None,
) -> None:
    """Generate audio for all sentences in an article and create concatenated article audio."""
    if not AUDIO_AVAILABLE:
        raise RuntimeError("Audio generation not available - failing per strict mode")

    use_progress = progress_tracker is not None
    sentence_audio_files = []
    sentence_english_audio_files = []
    sentence_bilingual_audio_files = []
    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_audio")
    os.makedirs(temp_dir, exist_ok=True)

    for i, translation in enumerate(translations):
        try:
            # Update progress for current sentence
            if use_progress:
                progress_tracker.set_description(
                    f"Generating audio for sentence {i + 1}/{len(translations)}"
                )
                progress_tracker.update(1)

            # Get the Arabic text (prefer tashkeel if available)
            arabic_text = translation.tashkeel or translation.original
            english_text = translation.full_translation
            if not arabic_text:
                raise RuntimeError(f"No Arabic text found for sentence {i + 1}")
            if not english_text:
                raise RuntimeError(f"No English text found for sentence {i + 1}")

            # Generate unique filenames for different audio types
            arabic_audio_filename = generate_audio_filename()
            english_audio_filename = generate_audio_filename()
            bilingual_audio_filename = generate_audio_filename()

            # Get context for better audio quality
            previous_text = None
            next_text = None
            if i > 0:
                prev_translation = translations[i - 1]
                previous_text = prev_translation.tashkeel or prev_translation.original
            if i < len(translations) - 1:
                next_translation = translations[i + 1]
                next_text = next_translation.tashkeel or next_translation.original

            # Generate Arabic-only audio
            arabic_audio_result = generate_sentence_audio(
                text=arabic_text,
                filename=arabic_audio_filename,
                previous_text=previous_text,
                next_text=next_text,
            )

            if arabic_audio_result and arabic_audio_result.url:
                # Download audio for concatenation
                temp_audio_file = os.path.join(temp_dir, f"sentence_arabic_{i}.mp3")
                if download_audio_for_concat(arabic_audio_filename, temp_audio_file):
                    sentence_audio_files.append(temp_audio_file)
            else:
                raise RuntimeError(
                    f"Failed to generate Arabic audio for sentence {i + 1}"
                )

            # Generate English-only audio
            english_audio_result = generate_english_sentence_audio(
                english_text=english_text,
                filename=english_audio_filename,
            )

            if english_audio_result and english_audio_result.url:
                # Download audio for concatenation
                temp_english_audio_file = os.path.join(
                    temp_dir, f"sentence_english_{i}.mp3"
                )
                if download_audio_for_concat(
                    english_audio_filename, temp_english_audio_file
                ):
                    sentence_english_audio_files.append(temp_english_audio_file)
            else:
                raise RuntimeError(
                    f"Failed to generate English audio for sentence {i + 1}"
                )

            # Generate bilingual audio
            bilingual_audio_result = generate_bilingual_sentence_audio(
                english_text=english_text,
                arabic_text=arabic_text,
                filename=bilingual_audio_filename,
                tashkeel_text=translation.tashkeel,
                previous_text=previous_text,
                next_text=next_text,
            )

            if bilingual_audio_result and bilingual_audio_result.url:
                # Download audio for concatenation
                temp_bilingual_audio_file = os.path.join(
                    temp_dir, f"sentence_bilingual_{i}.mp3"
                )
                if download_audio_for_concat(
                    bilingual_audio_filename, temp_bilingual_audio_file
                ):
                    sentence_bilingual_audio_files.append(temp_bilingual_audio_file)
            else:
                raise RuntimeError(
                    f"Failed to generate bilingual audio for sentence {i + 1}"
                )

            # Update the database with all audio URLs for this sentence
            try:
                get_supabase_client().table("article_sentences").update(
                    {
                        "audio_url": arabic_audio_result.url,
                        "audio_url_english": english_audio_result.url,
                        "audio_url_bilingual": bilingual_audio_result.url,
                    }
                ).eq("article_id", article_id).eq("position", i).execute()

            except Exception as e:
                raise RuntimeError(
                    f"Failed to update audio URLs for sentence {i + 1}: {e}"
                ) from e

        except Exception as e:
            raise RuntimeError(
                f"Failed to generate audio for sentence {i + 1}: {e}"
            ) from e

    # Create concatenated article audio files
    if sentence_audio_files:
        # Arabic-only article audio
        arabic_article_filename = generate_audio_filename()
        arabic_article_path = os.path.join(temp_dir, arabic_article_filename)

        if concatenate_audio_files(sentence_audio_files, arabic_article_path):
            try:
                with open(arabic_article_path, "rb") as f:
                    get_supabase_client().storage.from_("audio").upload(
                        arabic_article_filename,
                        f,
                        file_options={"content-type": "audio/mpeg"},
                    )

                article_audio_url = f"{SUPABASE_URL}/storage/v1/object/public/audio/{arabic_article_filename}"
                get_supabase_client().table("articles").update(
                    {"audio_url": article_audio_url}
                ).eq("id", article_id).execute()

            except Exception as e:
                logger.error(f"Error uploading Arabic article audio: {str(e)}")

    if sentence_bilingual_audio_files:
        # Bilingual article audio
        bilingual_article_filename = generate_audio_filename()
        bilingual_article_path = os.path.join(temp_dir, bilingual_article_filename)

        if concatenate_audio_files(
            sentence_bilingual_audio_files, bilingual_article_path
        ):
            try:
                with open(bilingual_article_path, "rb") as f:
                    get_supabase_client().storage.from_("audio").upload(
                        bilingual_article_filename,
                        f,
                        file_options={"content-type": "audio/mpeg"},
                    )

                bilingual_article_audio_url = f"{SUPABASE_URL}/storage/v1/object/public/audio/{bilingual_article_filename}"
                get_supabase_client().table("articles").update(
                    {"audio_url_bilingual": bilingual_article_audio_url}
                ).eq("id", article_id).execute()

            except Exception as e:
                logger.error(f"Error uploading bilingual article audio: {str(e)}")

    # Clean up temporary files
    all_temp_files = (
        sentence_audio_files
        + sentence_english_audio_files
        + sentence_bilingual_audio_files
    )
    if sentence_audio_files:
        all_temp_files.append(os.path.join(temp_dir, arabic_article_filename))
    if sentence_bilingual_audio_files:
        all_temp_files.append(os.path.join(temp_dir, bilingual_article_filename))

    cleanup_temp_files(all_temp_files, temp_dir)


def concatenate_and_upload_article_audio(
    files: list[str],
    temp_dir: str,
    article_id: int,
) -> None:
    """Concatenate sentence audio files and upload as article audio."""
    try:
        final_audio_filename = generate_audio_filename()
        final_audio_path = os.path.join(temp_dir, final_audio_filename)

        if concatenate_audio_files and concatenate_audio_files(files, final_audio_path):
            with open(final_audio_path, "rb") as f:
                get_supabase_client().storage.from_("audio").upload(
                    final_audio_filename,
                    f,
                    file_options={"content-type": "audio/mpeg"},
                )

            article_audio_url = (
                f"{SUPABASE_URL}/storage/v1/object/public/audio/{final_audio_filename}"
            )
            get_supabase_client().table("articles").update(
                {"audio_url": article_audio_url}
            ).eq("id", article_id).execute()

            logger.info(f"Created concatenated article audio: {article_audio_url}")
        else:
            logger.warning("Failed to concatenate audio files")

    except Exception as e:
        logger.error(f"Error creating concatenated article audio: {e}")


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

            # Generate audio for all sentences first
            sentence_audio_files = []
            for i, translation in enumerate(translations):
                try:
                    # Get the Arabic text (prefer tashkeel if available)
                    arabic_text = translation.tashkeel or translation.original
                    if not arabic_text:
                        raise RuntimeError(f"No Arabic text found for sentence {i + 1}")

                    # Generate unique filename
                    audio_filename = generate_audio_filename()

                    # Get context for better audio quality
                    previous_text = None
                    next_text = None
                    if i > 0:
                        prev_translation = translations[i - 1]
                        previous_text = (
                            prev_translation.tashkeel or prev_translation.original
                        )
                    if i < len(translations) - 1:
                        next_translation = translations[i + 1]
                        next_text = (
                            next_translation.tashkeel or next_translation.original
                        )

                    # Generate audio
                    audio_result = generate_sentence_audio(
                        text=arabic_text,
                        filename=audio_filename,
                        previous_text=previous_text,
                        next_text=next_text,
                    )

                    if audio_result and audio_result.url:
                        # Download audio for concatenation
                        temp_audio_file = os.path.join(temp_dir, f"sentence_{i}.mp3")
                        if download_audio_for_concat(audio_filename, temp_audio_file):
                            sentence_audio_files.append(temp_audio_file)
                    else:
                        raise RuntimeError(
                            f"Failed to generate audio for sentence {i + 1}"
                        )

                except Exception as e:
                    raise RuntimeError(
                        f"Failed to generate audio for sentence {i + 1}: {e}"
                    ) from e

            # Create concatenated article audio
            if sentence_audio_files:
                try:
                    final_audio_filename = generate_audio_filename()
                    final_audio_path = os.path.join(temp_dir, final_audio_filename)

                    if concatenate_audio_files(sentence_audio_files, final_audio_path):
                        with open(final_audio_path, "rb") as f:
                            get_supabase_client().storage.from_("audio").upload(
                                final_audio_filename,
                                f,
                                file_options={"content-type": "audio/mpeg"},
                            )

                        article_audio_url = f"{SUPABASE_URL}/storage/v1/object/public/audio/{final_audio_filename}"
                        logger.info(f"Generated article audio: {article_audio_url}")
                    else:
                        raise RuntimeError("Failed to concatenate audio files")

                except Exception as e:
                    raise RuntimeError(
                        f"Failed to create concatenated article audio: {e}"
                    ) from e

            # Clean up temporary files
            cleanup_temp_files(sentence_audio_files, temp_dir)
            if os.path.exists(temp_dir):
                try:
                    # Add a small delay to ensure all file handles are closed
                    import time

                    time.sleep(0.1)
                    shutil.rmtree(temp_dir)
                except OSError as e:
                    logger.warning(
                        f"Could not remove temporary directory {temp_dir}: {e}"
                    )
                    # Try to remove individual files if directory removal fails
                    try:
                        for file_path in sentence_audio_files:
                            if os.path.exists(file_path):
                                os.remove(file_path)
                    except Exception as cleanup_error:
                        logger.warning(
                            f"Could not clean up some temporary files: {cleanup_error}"
                        )

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

    # Update sentence audio URLs in the database
    if AUDIO_AVAILABLE and article_audio_url:
        for i, translation in enumerate(translations):
            try:
                # Get the Arabic text (prefer tashkeel if available)
                arabic_text = translation.tashkeel or translation.original
                if not arabic_text:
                    continue

                # Generate unique filename for this sentence
                audio_filename = generate_audio_filename()

                # Generate audio for this sentence
                audio_result = generate_sentence_audio(
                    text=arabic_text,
                    filename=audio_filename,
                    previous_text=None,  # No context needed for individual sentence storage
                    next_text=None,
                )

                if audio_result and audio_result.url:
                    # Update the database with the audio URL
                    get_supabase_client().table("article_sentences").update(
                        {"audio_url": audio_result.url}
                    ).eq("article_id", article_id).eq("position", i).execute()

            except Exception as e:
                logger.warning(f"Failed to update audio URL for sentence {i + 1}: {e}")

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
