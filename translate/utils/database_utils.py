import logging
import os
import shutil
from typing import Any

# Audio utilities - import real implementations (conditional to avoid import-time validation)
try:
    from audio.audio_utils import (
        concatenate_audio_files,
        download_audio_for_concat,
        generate_audio_filename,
        generate_bilingual_sentence_audio,
        generate_sentence_audio,
    )
    from audio.root_audio import get_or_generate_root_audio
except (ImportError, OSError):
    # Import failed, but we'll handle this gracefully in the functions
    generate_sentence_audio = None
    generate_bilingual_sentence_audio = None
    generate_audio_filename = None
    download_audio_for_concat = None
    concatenate_audio_files = None
    get_or_generate_root_audio = None
# Import common database utilities
from data.config import ARCHIVE_DIR
from data.enums import DifficultyLevel
from data.pipeline_types import WordData
from utils.arabic_text import clean_arabic_text
from utils.config_common import get_storage_url
from utils.database_common import (
    get_table_record,
    insert_table_record,
    update_table_record,
)
from utils.storage_utils import (
    generate_audio_filename,
    get_supabase_client,
    get_word_type_id,
)

logger = logging.getLogger(__name__)


def extract_root_info(word: WordData) -> tuple[str, str | None, str | None]:
    """Extract root information from a word."""
    if word.get("root"):
        return word["root"], word.get("notes"), word["english"]

    # Since arabic and english are non-nullable, we can access them directly
    # Use the arabic field (with tashkeel) for root audio generation, not essential (without tashkeel)
    letters = word["arabic"]
    english = word["english"]
    meaning = word.get("essential_translation") or f"Auto-generated root for: {english}"
    english_translation = word.get("essential_translation", "") or english

    return letters, meaning, english_translation


def get_or_create_root(
    letters: str,
    meaning: str | None = None,
    english_translation: str | None = None,
) -> int:
    """Get existing root or create a new one, and generate audio URLs for the root.

    Args:
        letters: The Arabic root letters
        meaning: The meaning description
        english_translation: The direct English translation for audio generation
    """

    letters = " ".join(letters.split())

    # Check if root exists
    root = get_table_record(
        "roots",
        ["id", "audio_url", "audio_url_en"],
        {"letters": letters},
        f"root lookup for '{letters}'",
    )

    if root:
        root_id = root["id"]
        # Generate missing audio if needed - since fields are non-nullable, we can be more direct
        if not root["audio_url"] or not root["audio_url_en"]:
            # For existing roots with missing audio, we need to regenerate
            try:
                audio_urls = get_or_generate_root_audio(letters, english_translation)
                if (
                    audio_urls
                    and audio_urls.get("audio_url")
                    and audio_urls.get("audio_url_en")
                ):
                    update_data = {
                        "audio_url": audio_urls["audio_url"],
                        "audio_url_en": audio_urls["audio_url_en"],
                    }
                    update_table_record(
                        "roots",
                        update_data,
                        {"id": root_id},
                        f"root audio update for '{letters}'",
                    )
                    logger.info(f"Updated missing audio for existing root '{letters}'")
                else:
                    logger.warning(
                        f"Could not regenerate audio for existing root '{letters}'"
                    )
            except Exception as e:
                logger.error(
                    f"Failed to regenerate audio for existing root '{letters}': {e}"
                )
        return root_id

    # CRITICAL: Generate audio BEFORE creating the root to satisfy NOT NULL constraints
    audio_urls = None
    if get_or_generate_root_audio:
        try:
            audio_urls = get_or_generate_root_audio(letters, english_translation)
        except Exception as e:
            logger.error(f"Failed to generate root audio for '{letters}': {e}")
            # Since audio generation is mandatory, we cannot proceed
            raise RuntimeError(
                f"Root audio generation failed for '{letters}': {e}"
            ) from e

    # Validate that we have both audio URLs
    if (
        not audio_urls
        or not audio_urls.get("audio_url")
        or not audio_urls.get("audio_url_en")
    ):
        raise RuntimeError(
            f"Failed to generate required audio URLs for root '{letters}'"
        )

    # Create new root with audio URLs already populated
    root_data = {
        "letters": letters,
        "meaning": meaning,
        "audio_url": audio_urls["audio_url"],
        "audio_url_en": audio_urls["audio_url_en"],
    }

    new_root = insert_table_record("roots", root_data, f"root creation for '{letters}'")

    if new_root:
        root_id = new_root["id"]
        logger.info(
            f"Successfully created root '{letters}' with ID {root_id} and audio URLs"
        )
        return root_id

    # Fail loudly – cannot proceed without a valid root
    raise RuntimeError(f"Failed to create root for '{letters}'")


def insert_sentence_words(
    sentence_id: int,
    translation: dict[str, Any],
) -> dict[str, Any]:
    """
    Insert words from a sentence with their roots and relationships.
    Uses cleaned Arabic text (without non-Arabic characters) for consistency with TTS.
    """
    word_by_word = translation["word_by_word"]

    total_words = len(word_by_word)

    words_data: list[dict[str, Any]] = []

    for position, word in enumerate(word_by_word):
        root_letters, root_meaning, english_translation = extract_root_info(word)
        root_id = get_or_create_root(
            root_letters,
            root_meaning,
            english_translation,
        )
        word_type_id = get_word_type_id(word["pos"])

        original_word = clean_arabic_text(word["arabic"])

        word_data = {
            "sentence_id": sentence_id,
            "position": position,
            "word_form": original_word,
            "english": word["english"],
            "word_type_id": word_type_id,
            "root_id": root_id,
            "difficulty_level": DifficultyLevel.BASIC.value,
            "grammar_note": word.get("notes"),
        }

        words_data.append(word_data)

    if words_data:
        get_supabase_client().table("sentence_words").insert(words_data).execute()

    return {
        "total_words": total_words,
    }


def get_adjacent_texts(
    translations: list[dict],
    idx: int,
) -> tuple[str | None, str | None]:
    """Return previous and next sentence text for context."""
    prev_text = None
    next_text = None
    if idx > 0:
        prev = translations[idx - 1]
        prev_text = prev.get("tashkeel", prev.get("original"))
    if idx < len(translations) - 1:
        nxt = translations[idx + 1]
        next_text = nxt.get("tashkeel", nxt.get("original"))
    return prev_text, next_text


def cleanup_temp_files(files: list[str], temp_dir: str) -> None:
    """Remove temporary files and directory if possible."""
    for file in files:
        try:
            os.remove(file)
        except FileNotFoundError:
            # File was already removed, this is fine
            pass
        except PermissionError as e:
            logger.warning(f"Permission denied removing file {file}: {e}")
        except OSError as e:
            logger.warning(f"Failed to remove file {file}: {e}")
        except Exception as e:
            logger.error(f"Unexpected error removing file {file}: {e}")

    try:
        os.rmdir(temp_dir)
    except FileNotFoundError:
        # Directory was already removed, this is fine
        pass
    except OSError as e:
        logger.warning(f"Failed to remove directory {temp_dir}: {e}")
    except Exception as e:
        logger.error(f"Unexpected error removing directory {temp_dir}: {e}")


def concatenate_and_upload_audio(
    files: list[str],
    temp_dir: str,
    article_id: int,
) -> None:
    """Concatenate sentence audio files, upload, and clean up."""
    final_audio_filename = generate_audio_filename()
    final_audio_path = os.path.join(temp_dir, final_audio_filename)

    if files:  # Only concatenate if there are files to concatenate
        if download_audio_for_concat(
            files[0], final_audio_path
        ):  # Download the first file to get its content type
            with open(final_audio_path, "rb") as f:
                get_supabase_client().storage.from_("audio").upload(
                    final_audio_filename,
                    f,
                    file_options={"content-type": "audio/mpeg"},
                )

            article_audio_url = get_storage_url(final_audio_filename)
            get_supabase_client().table("articles").update(
                {"audio_url": article_audio_url}
            ).eq(
                "id",
                article_id,
            ).execute()

        cleanup_temp_files(files + [final_audio_path], temp_dir)
    else:
        cleanup_temp_files([], temp_dir)


def insert_article_sentences(
    article_id: int, translations: list[dict], progress_tracker: Any = None
) -> None:
    """Insert article sentences into the database."""
    sentence_audio_files = []
    sentence_english_audio_files = []
    sentence_bilingual_audio_files = []
    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_audio")
    os.makedirs(temp_dir, exist_ok=True)

    use_progress = progress_tracker is not None

    try:
        for idx, translation in enumerate(translations):
            # Update progress for current sentence
            if use_progress:
                progress_tracker.set_description(
                    f"Inserting sentence {idx + 1}/{len(translations)}"
                )
                progress_tracker.update(1)
            previous_text, next_text = get_adjacent_texts(translations, idx)

            temp_audio_file = os.path.join(temp_dir, f"sentence_arabic_{idx}.mp3")
            temp_english_audio_file = os.path.join(
                temp_dir, f"sentence_english_{idx}.mp3"
            )
            temp_bilingual_audio_file = os.path.join(
                temp_dir, f"sentence_bilingual_{idx}.mp3"
            )

            arabic_audio_filename = generate_audio_filename()
            english_audio_filename = generate_audio_filename()
            bilingual_audio_filename = generate_audio_filename()

            arabic_audio_result = None
            bilingual_audio_result = None
            storage_url = None
            storage_url_english = None
            storage_url_bilingual = None

            if generate_sentence_audio:
                # Generate Arabic-only audio
                arabic_audio_result = generate_sentence_audio(
                    text=translation["original"],
                    filename=arabic_audio_filename,
                    previous_text=previous_text,
                    next_text=next_text,
                )

                if arabic_audio_result is not None:
                    storage_url = arabic_audio_result.url
                    if download_audio_for_concat(
                        arabic_audio_filename, temp_audio_file
                    ):
                        sentence_audio_files.append(temp_audio_file)

            # Generate English-only audio using unified function
            from elevenlabs import VoiceSettings

            from audio.audio_utils import generate_speech, validate_mp3
            from data.config import (
                AUDIO_TEMP_DIR,
                ENGLISH_VOICE_ID,
                ENGLISH_VOICE_SETTINGS,
            )
            from utils.storage_utils import get_supabase_client

            try:
                english_response = generate_speech(
                    text=translation["full_translation"],
                    voice_id=ENGLISH_VOICE_ID,
                    voice_settings=VoiceSettings(**ENGLISH_VOICE_SETTINGS),
                )

                if english_response and english_response.get("audio"):
                    english_audio_data = english_response["audio"]

                    # Validate and save audio
                    if validate_mp3(english_audio_data):
                        # Save to temporary file
                        temp_english_audio_path = os.path.join(
                            AUDIO_TEMP_DIR, english_audio_filename
                        )
                        with open(temp_english_audio_path, "wb") as f:
                            f.write(english_audio_data)

                        # Upload to Supabase storage
                        with open(temp_english_audio_path, "rb") as f:
                            get_supabase_client().storage.from_("audio").upload(
                                english_audio_filename,
                                f,
                                file_options={"content-type": "audio/mpeg"},
                            )
                            storage_url_english = get_storage_url(
                                english_audio_filename
                            )

                        # Clean up temporary file
                        if os.path.exists(temp_english_audio_path):
                            os.remove(temp_english_audio_path)

                        if download_audio_for_concat(
                            english_audio_filename, temp_english_audio_file
                        ):
                            sentence_english_audio_files.append(temp_english_audio_file)
            except Exception as e:
                logger.warning(f"Failed to generate English audio: {e}")

            if generate_bilingual_sentence_audio:
                # Generate bilingual audio
                bilingual_audio_result = generate_bilingual_sentence_audio(
                    english_text=translation["full_translation"],
                    arabic_text=translation["original"],
                    filename=bilingual_audio_filename,
                    tashkeel_text=translation.get("tashkeel"),
                    previous_text=previous_text,
                    next_text=next_text,
                )

                if bilingual_audio_result is not None:
                    storage_url_bilingual = bilingual_audio_result.url
                    if download_audio_for_concat(
                        bilingual_audio_filename, temp_bilingual_audio_file
                    ):
                        sentence_bilingual_audio_files.append(temp_bilingual_audio_file)

            cleaned_arabic = clean_arabic_text(translation["original"])

            sentence_data = {
                "article_id": article_id,
                "position": idx,
                "arabic": cleaned_arabic,
                "english": translation["full_translation"],
                "audio_url": storage_url,
                "audio_url_english": storage_url_english,
                "audio_url_bilingual": storage_url_bilingual,
            }
            result = (
                get_supabase_client()
                .table("article_sentences")
                .insert(sentence_data)
                .execute()
            )
            sentence_id = result.data[0]["id"]

            if translation.get("word_by_word"):
                insert_sentence_words(
                    sentence_id,
                    translation,
                )

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

                    article_audio_url = get_storage_url(arabic_article_filename)
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

                    bilingual_article_audio_url = get_storage_url(
                        bilingual_article_filename
                    )
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

    except Exception as e:
        logger.error(f"Error processing sentences: {str(e)}")
        cleanup_temp_files(sentence_audio_files, temp_dir)
        raise


def archive_files(json_path: str, article_id: int) -> None:
    """Move input and output files to archive directory with article ID as name."""
    archive_dir = ARCHIVE_DIR
    os.makedirs(archive_dir, exist_ok=True)

    article_dir = os.path.dirname(json_path)

    input_file = os.path.join(article_dir, "input.txt")
    output_file = json_path

    archived_input = os.path.join(archive_dir, f"{article_id}_input.txt")
    archived_output = os.path.join(archive_dir, f"{article_id}_output.json")

    if os.path.exists(input_file):
        shutil.move(input_file, archived_input)

    if os.path.exists(output_file):
        shutil.move(output_file, archived_output)


def validate_article_data(data: dict) -> None:
    """Validate article data before processing."""
    required_metadata = ["title", "summary", "difficulty_level"]
    missing_fields = [
        field for field in required_metadata if not data.get("metadata", {}).get(field)
    ]
    if missing_fields:
        raise ValueError(
            f"Missing required metadata fields: {', '.join(missing_fields)}"
        )

    if (
        not data.get("translations")
        or not isinstance(data["translations"], list)
        or len(data["translations"]) == 0
    ):
        raise ValueError("Article must contain at least one translation")

    for idx, translation in enumerate(data["translations"]):
        if not translation.get("original"):
            raise ValueError(f"Missing Arabic text in translation at position {idx}")
        if not translation.get("full_translation"):
            raise ValueError(f"Missing English translation at position {idx}")

        if translation.get("verification_status") == "Failed":
            raise ValueError(
                f"Translation at position {idx} has failed verification status"
            )

        if "[BATCH PROCESSING ERROR]" in translation.get("full_translation", ""):
            raise ValueError(
                f"Translation at position {idx} contains error marker - translation is incomplete"
            )

        if "[ERROR]" in translation.get("full_translation", ""):
            raise ValueError(
                f"Translation at position {idx} contains error marker - translation is incomplete"
            )

        if "word_by_word" in translation:
            if not isinstance(translation["word_by_word"], list):
                raise ValueError(
                    f"word_by_word must be a list in translation at position {idx}",
                )

            for word_idx, word in enumerate(translation["word_by_word"]):
                if not word.get("arabic"):
                    raise ValueError(
                        f"Missing Arabic word in word_by_word at translation {idx}, word {word_idx}",
                    )
                if not word.get("english"):
                    raise ValueError(
                        f"Missing English translation in word_by_word at translation {idx}, word {word_idx}",
                    )
                if not word.get("pos"):
                    raise ValueError(
                        f"Missing part of speech in word_by_word at translation {idx}, word {word_idx}",
                    )
                if not word.get("essential"):
                    raise ValueError(
                        f"Missing essential letters in word_by_word at translation {idx}, word {word_idx}",
                    )
                if not word.get("essential_translation"):
                    raise ValueError(
                        f"Missing essential translation in word_by_word at translation {idx}, word {word_idx}",
                    )

    difficulty = data["metadata"]["difficulty_level"]
    if (
        not isinstance(difficulty, int)
        or difficulty < DifficultyLevel.BASIC.value
        or difficulty > DifficultyLevel.EXPERT.value
    ):
        raise ValueError(
            f"Difficulty level must be an integer between {DifficultyLevel.BASIC.value} and {DifficultyLevel.EXPERT.value}"
        )
