import logging
import uuid
from typing import Any

from supabase import create_client

from translate.data.config import SUPABASE_KEY, SUPABASE_URL

logger = logging.getLogger(__name__)


class SupabaseClient:
    """Singleton class for managing Supabase client."""

    _instance = None
    _client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def get_client(self):
        """Get or create Supabase client with lazy initialization."""
        if self._client is None:
            if not all([SUPABASE_URL, SUPABASE_KEY]):
                raise OSError(
                    "Missing required environment variables. Please ensure SUPABASE_URL and SUPABASE_KEY are set.",
                )
            self._client = create_client(SUPABASE_URL, SUPABASE_KEY)
        return self._client


# Global instance for backward compatibility
_supabase_client_instance = SupabaseClient()


def get_supabase_client():
    """Get the Supabase client instance."""
    return _supabase_client_instance.get_client()


WORD_TYPE_MAPPING: dict[str, int] = {
    "verb": 1,
    "noun": 2,
    "particle": 3,
    "adjective": 4,
    "pronoun": 5,
    "adverb": 6,
    "preposition": 7,
    "conjunction": 8,
    "interjection": 9,
    "numeral": 56,
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
    return result.data[0]["id"]


def get_author_id(name: str = "Ibn Kathir") -> int:
    """Get author ID by name."""
    result = (
        get_supabase_client().table("authors").select("id").eq("name", name).execute()
    )
    if not result.data:
        raise ValueError(f"Author '{name}' not found")
    return result.data[0]["id"]


def get_word_type_id(pos: str) -> int:
    """Get word type ID from POS."""
    word_type_id = WORD_TYPE_MAPPING.get(pos.lower())
    if word_type_id is None:
        return WORD_TYPE_MAPPING["noun"]
    return word_type_id
