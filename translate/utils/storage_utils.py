"""Storage utilities for Supabase integration."""

import logging
import uuid
from typing import Any

from data.enums import PartOfSpeech

from .config_common import get_supabase_client

logger = logging.getLogger(__name__)

# Word type mapping using enum values
WORD_TYPE_MAPPING: dict[str, int] = {
    PartOfSpeech.VERB.value: 1,
    PartOfSpeech.NOUN.value: 2,
    PartOfSpeech.PARTICLE.value: 3,
    PartOfSpeech.ADJECTIVE.value: 4,
    PartOfSpeech.PRONOUN.value: 5,
    PartOfSpeech.ADVERB.value: 6,
    PartOfSpeech.PREPOSITION.value: 7,
    PartOfSpeech.CONJUNCTION.value: 8,
    PartOfSpeech.INTERJECTION.value: 9,
    PartOfSpeech.NUMERAL.value: 56,
    PartOfSpeech.PROPER_NOUN.value: 107,
    PartOfSpeech.DEMONSTRATIVE_PRONOUN.value: 108,
    PartOfSpeech.RELATIVE_PRONOUN.value: 109,
}


def check_file_exists(bucket: str, file_path: str) -> bool:
    """Check if a file exists in Supabase storage."""
    try:
        get_supabase_client().storage.from_(bucket).create_signed_url(file_path, 1)
        return True
    except Exception as e:
        msg = str(e)
        if any(
            token in msg
            for token in (
                "The specified key does not exist",
                "Object not found",
                "No such object",
                "Not Found",
            )
        ):
            return False

        logging.error(f"check_file_exists failed for {file_path}: {msg}")
        return False


def generate_content_hash(data: dict[str, Any]) -> str:
    """Generate a unique hash for the article content."""
    import hashlib
    import json

    content = json.dumps(data, sort_keys=True)
    return hashlib.sha256(content.encode()).hexdigest()


def check_article_exists(content_hash: str) -> tuple[int | None, str | None]:
    """Check if an article with this content hash already exists and return its ID and audio_url."""
    try:
        result = (
            get_supabase_client()
            .table("articles")
            .select("id, audio_url")
            .eq("content_hash", content_hash)
            .execute()
        )
        if result.data:
            return result.data[0]["id"], result.data[0].get("audio_url")
        return None, None
    except Exception as e:
        if "content_hash" in str(e):
            return None, None
        raise e


def generate_audio_filename() -> str:
    """Generate a unique filename for the audio file."""
    return f"{uuid.uuid4()}.mp3"


def get_category_id(name: str = "aqeedah") -> int:
    """Get category ID by name."""
    result = (
        get_supabase_client()
        .table("categories")
        .select("id")
        .eq("name", name)
        .execute()
    )
    if not result.data:
        raise ValueError(f"Category '{name}' not found")
    return int(result.data[0]["id"])


def get_author_id(name: str = "Ibn Kathir") -> int:
    """Get author ID by name."""
    result = (
        get_supabase_client().table("authors").select("id").eq("name", name).execute()
    )
    if not result.data:
        raise ValueError(f"Author '{name}' not found")
    return int(result.data[0]["id"])


def get_word_type_id(pos: str | None) -> int:
    """Get word type ID from POS. Fail loudly when POS is invalid."""
    if pos is None or pos.lower() in ["unknown", "none", ""]:
        raise ValueError("POS must be provided and valid; received empty/unknown")

    word_type_id = WORD_TYPE_MAPPING.get(pos.lower())
    if word_type_id is None:
        raise ValueError(f"Unknown POS value: '{pos}'")
    return word_type_id


def get_random_image_url(
    bucket: str = "images", folder: str = "", max_retries: int = 3
) -> str | None:
    """
    Get a random image URL from the specified Supabase storage bucket.

    Args:
        bucket: Storage bucket name (default: "images")
        folder: Optional folder path within the bucket
        max_retries: Maximum number of retries if listing fails

    Returns:
        Public URL of a random image, or None if no images found
    """
    import secrets

    from .config_common import SUPABASE_URL

    for attempt in range(max_retries):
        try:
            # List all files in the bucket/folder
            result = get_supabase_client().storage.from_(bucket).list(folder)

            # Supabase storage.list() returns a list of file objects directly
            files = result if isinstance(result, list) else []

            if not files:
                logger.warning(f"No files found in bucket '{bucket}' folder '{folder}'")
                return None

            # Filter for image files
            image_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}
            image_files = []

            for file in files:
                # Since we know files are dictionaries, access name directly
                if isinstance(file, dict) and "name" in file:
                    filename = file["name"]
                    if any(filename.lower().endswith(ext) for ext in image_extensions):
                        image_files.append(file)

            if not image_files:
                logger.warning(
                    f"No image files found in bucket '{bucket}' folder '{folder}'"
                )
                return None

            # Select a random image
            random_image = secrets.choice(image_files)
            filename = random_image["name"]
            file_path = f"{folder}/{filename}" if folder else filename
            public_url = f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{file_path}"

            logger.info(f"Selected random image: {filename}")
            return public_url

        except Exception as e:
            logger.error(
                f"Failed to get random image (attempt {attempt + 1}/{max_retries}): {e}"
            )
            if attempt == max_retries - 1:
                logger.error(
                    f"All attempts failed to get random image from bucket '{bucket}'"
                )
                return None

    return None


def get_random_article_image_url() -> str | None:
    """
    Get a random image URL from the images bucket for articles.
    """
    return get_random_image_url("images", "")
