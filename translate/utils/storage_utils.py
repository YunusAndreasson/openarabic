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
    """Get word type ID from POS."""
    if pos is None or pos.lower() in ["unknown", "none", ""]:
        # Default to noun for unknown POS values
        return WORD_TYPE_MAPPING[PartOfSpeech.NOUN.value]

    word_type_id = WORD_TYPE_MAPPING.get(pos.lower())
    if word_type_id is None:
        # Log unknown POS for debugging
        logger.warning(f"Unknown POS value: '{pos}', defaulting to noun")
        return WORD_TYPE_MAPPING[PartOfSpeech.NOUN.value]
    return word_type_id
