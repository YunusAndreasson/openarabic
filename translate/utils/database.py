import logging
import os
import shutil
from pathlib import Path
from typing import Any

from audio.storage import generate_audio_filename
from data.config import ARCHIVE_DIR, VoiceSettingsDict
from data.enums import DifficultyLevel
from data.pipeline_types import WordData
from utils.arabic_text import clean_arabic_text
from utils.config_common import get_storage_url
from utils.database_common import (
    get_table_record,
    insert_table_record,
    update_table_record,
)
from utils.error_handling import handle_speech_generation_error
from utils.storage import (
    get_supabase_client,
    get_word_type_id,
)

# Audio utilities - import real implementations (conditional to avoid import-time validation)
# Type annotations for conditional imports
_create_article_audio: Any = None
_generate_speech: Any = None
_get_or_generate_root_audio: Any = None
_VoiceSettings: Any = None
_ARABIC_VOICE_ID: str | None = None
_ARABIC_VOICE_SETTINGS: VoiceSettingsDict | None = None
_ENGLISH_VOICE_ID: str | None = None
_ENGLISH_VOICE_SETTINGS: VoiceSettingsDict | None = None

try:
    from elevenlabs import VoiceSettings

    from audio import (
        create_article_audio,
        generate_speech,
    )
    from audio.root_audio import get_or_generate_root_audio
    from data.config import (
        ARABIC_VOICE_ID,
        ARABIC_VOICE_SETTINGS,
        ENGLISH_VOICE_ID,
        ENGLISH_VOICE_SETTINGS,
    )

    _create_article_audio = create_article_audio
    _generate_speech = generate_speech
    _get_or_generate_root_audio = get_or_generate_root_audio
    _VoiceSettings = VoiceSettings
    _ARABIC_VOICE_ID = ARABIC_VOICE_ID
    _ARABIC_VOICE_SETTINGS = ARABIC_VOICE_SETTINGS
    _ENGLISH_VOICE_ID = ENGLISH_VOICE_ID
    _ENGLISH_VOICE_SETTINGS = ENGLISH_VOICE_SETTINGS
except (ImportError, OSError):
    # Import failed, variables remain None
    pass

logger = logging.getLogger(__name__)


def extract_root_info(word: WordData) -> tuple[str, str | None, str | None]:
    """Extract root information from a word."""
    if word.get("root"):
        return word["root"], word.get("notes"), word["english"]

    # Since arabic and english are non-nullable, we can access them directly
    # Use the essential field (stripped root form) for root audio generation, not arabic (with prefixes/suffixes)
    letters = word["essential"]
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
        root_id: int = root["id"]
        # Generate missing audio if needed - since fields are non-nullable, we can be more direct
        if not root["audio_url"] or not root["audio_url_en"]:
            # For existing roots with missing audio, we need to regenerate
            try:
                audio_urls = _get_or_generate_root_audio(letters, english_translation)
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
    if _get_or_generate_root_audio:
        try:
            audio_urls = _get_or_generate_root_audio(letters, english_translation)
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
        new_root_id: int = new_root["id"]
        logger.info(
            f"Successfully created root '{letters}' with ID {new_root_id} and audio URLs"
        )
        return new_root_id

    # Fail loudly – cannot proceed without a valid root
    raise RuntimeError(f"Failed to create root for '{letters}'")


def insert_sentence_words(
    sentence_id: int,
    translation: dict[str, Any],
    word_audio_urls: list[str] | None = None,
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

        # Add audio URL if available
        if word_audio_urls and position < len(word_audio_urls):
            word_data["audio_url"] = word_audio_urls[position]

        words_data.append(word_data)

    # Insert words first (without timestamps to avoid client issues)
    # inserted_words = []
    if words_data:
        try:
            result = (
                get_supabase_client()
                .table("sentence_words")
                .insert(words_data)
                .execute()
            )
            if result.data:
                pass  # Words inserted successfully
        except Exception as e:
            logger.error(f"Failed to insert words for sentence {sentence_id}: {e}")
            return {"total_words": 0}

    return {
        "total_words": total_words,
    }


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


def insert_article_sentences(
    article_id: int, translations: list[dict], progress_tracker: Any = None
) -> None:
    """Insert article sentences into the database and create streamlined article audio."""
    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_audio")
    os.makedirs(temp_dir, exist_ok=True)

    use_progress = progress_tracker is not None

    # Track audio generation failures for summary
    failed_arabic_count = 0
    failed_english_count = 0
    failed_bilingual_count = 0
    total_sentences = len(translations)

    try:
        # Insert sentences into database first
        for idx, translation in enumerate(translations):
            if use_progress:
                progress_tracker.set_description(
                    f"Inserting sentence {idx + 1}/{len(translations)}"
                )
                progress_tracker.update(1)

            cleaned_arabic = clean_arabic_text(translation["original"])

            # Generate individual sentence audio to satisfy database constraints
            arabic_text = translation.get("tashkeel") or translation["original"]
            english_text = translation["full_translation"]

            # Generate Arabic audio for this sentence
            arabic_filename = generate_audio_filename()

            # Generate Arabic audio for this sentence
            arabic_response = None
            arabic_audio_url = None

            try:
                arabic_response = _generate_speech(
                    text=arabic_text,
                    voice_id=_ARABIC_VOICE_ID,
                    voice_settings=_VoiceSettings(**_ARABIC_VOICE_SETTINGS)
                    if _VoiceSettings and _ARABIC_VOICE_SETTINGS
                    else None,
                )

                if arabic_response and arabic_response.get("audio"):
                    # Upload Arabic audio to Supabase storage
                    try:
                        get_supabase_client().storage.from_("audio").upload(
                            arabic_filename,
                            arabic_response["audio"],
                            file_options={"content-type": "audio/mpeg"},
                        )
                        arabic_audio_url = get_storage_url(arabic_filename)
                    except Exception as e:
                        logger.warning(f"Failed to upload Arabic sentence audio: {e}")
                else:
                    logger.warning(
                        f"Failed to generate Arabic audio for sentence {idx + 1}"
                    )
            except Exception as e:
                handle_speech_generation_error(e, "Arabic", idx)

            # Log error if Arabic audio generation failed - no silent placeholders
            if not arabic_audio_url:
                failed_arabic_count += 1
                logger.error(
                    f"AUDIO GENERATION FAILED: Arabic sentence {idx + 1} will have no audio"
                )

            # Generate English audio for this sentence
            english_filename = generate_audio_filename()
            english_response = None
            english_audio_url = None

            try:
                english_response = _generate_speech(
                    text=english_text,
                    voice_id=_ENGLISH_VOICE_ID,
                    voice_settings=_VoiceSettings(**_ENGLISH_VOICE_SETTINGS)
                    if _VoiceSettings and _ENGLISH_VOICE_SETTINGS
                    else None,
                )

                if english_response and english_response.get("audio"):
                    # Upload English audio to Supabase storage
                    try:
                        get_supabase_client().storage.from_("audio").upload(
                            english_filename,
                            english_response["audio"],
                            file_options={"content-type": "audio/mpeg"},
                        )
                        english_audio_url = get_storage_url(english_filename)
                    except Exception as e:
                        logger.warning(f"Failed to upload English sentence audio: {e}")
                else:
                    logger.warning(
                        f"Failed to generate English audio for sentence {idx + 1}"
                    )
            except Exception as e:
                handle_speech_generation_error(e, "English", idx)

            # Log error if English audio generation failed - no silent placeholders
            if not english_audio_url:
                failed_english_count += 1
                logger.error(
                    f"AUDIO GENERATION FAILED: English sentence {idx + 1} will have no audio"
                )

            # Generate bilingual audio for this sentence (English + Arabic)
            bilingual_filename = generate_audio_filename()

            # Create bilingual audio by combining English and Arabic with a delay
            if (
                english_response
                and english_response.get("audio")
                and arabic_response
                and arabic_response.get("audio")
            ):
                try:
                    from audio import create_multi_audio_with_delays
                    from data.config import BILINGUAL_AUDIO_PAUSE_MS

                    # Create bilingual audio with 500ms delay between English and Arabic
                    bilingual_audio = create_multi_audio_with_delays(
                        [english_response["audio"], arabic_response["audio"]],
                        delay_ms=BILINGUAL_AUDIO_PAUSE_MS,
                    )

                    if bilingual_audio:
                        # Upload bilingual audio to Supabase storage
                        get_supabase_client().storage.from_("audio").upload(
                            bilingual_filename,
                            bilingual_audio,
                            file_options={"content-type": "audio/mpeg"},
                        )
                        bilingual_audio_url = get_storage_url(bilingual_filename)
                    else:
                        bilingual_audio_url = None
                        logger.warning(
                            f"Failed to create bilingual audio for sentence {idx + 1}"
                        )

                except Exception as e:
                    logger.warning(
                        f"Failed to generate bilingual audio for sentence {idx + 1}: {e}"
                    )
                    bilingual_audio_url = None
            else:
                logger.warning(
                    f"Missing audio for bilingual generation in sentence {idx + 1}"
                )

            # Log error if bilingual audio generation failed - no silent placeholders
            if not bilingual_audio_url:
                failed_bilingual_count += 1
                logger.error(
                    f"AUDIO GENERATION FAILED: Bilingual sentence {idx + 1} will have no audio"
                )

            sentence_data = {
                "article_id": article_id,
                "position": idx,
                "arabic": cleaned_arabic,
                "english": translation["full_translation"],
                "audio_url": arabic_audio_url,  # Individual Arabic sentence audio
                "audio_url_english": english_audio_url,  # Individual English sentence audio
                "audio_url_bilingual": bilingual_audio_url,  # Individual bilingual sentence audio
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

        # Log audio generation summary
        total_failures = (
            failed_arabic_count + failed_english_count + failed_bilingual_count
        )
        if total_failures > 0:
            logger.error(
                f"AUDIO GENERATION SUMMARY: {total_failures} failures out of "
                f"{total_sentences * 3} audio files "
                f"(Arabic: {failed_arabic_count}, English: {failed_english_count}, "
                f"Bilingual: {failed_bilingual_count})"
            )
        else:
            logger.info(
                f"Audio generation complete: all {total_sentences * 3} audio files generated successfully"
            )

        # Create streamlined article audio files
        if _create_article_audio:
            logger.info("Creating streamlined article audio files...")

            # Prepare sentence data for audio generation
            sentences = []
            for translation in translations:
                sentences.append(
                    {
                        "arabic_text": translation.get("tashkeel")
                        or translation["original"],
                        "english_text": translation["full_translation"],
                        "tashkeel": translation.get("tashkeel"),
                    }
                )

            # Get article metadata for bilingual audio intro
            try:
                article_data = (
                    get_supabase_client()
                    .table("articles")
                    .select("title")
                    .eq("id", article_id)
                    .execute()
                )
                article_title = (
                    article_data.data[0].get("title") if article_data.data else None
                )
            except Exception as e:
                logger.warning(f"Could not fetch article metadata: {e}")
                article_title = None

            # Create article audio files in one pass
            audio_urls = _create_article_audio(
                sentences=sentences,
                article_title=article_title,
                output_dir=temp_dir,
            )

            if audio_urls:
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
                    logger.error(f"Failed to update article audio URLs: {e}")
            else:
                logger.error("Failed to create article audio files")

        # Clean up temporary directory
        cleanup_temp_files([], temp_dir)

    except Exception as e:
        logger.error(f"Error processing sentences: {e!s}")
        cleanup_temp_files([], temp_dir)
        raise


def archive_files(json_path: str, article_id: int) -> None:
    """Move input and output files to archive directory with article ID as name."""
    from data.config import (
        AUTHOR_FOLDER_MAPPING,
        AUTHOR_NUMBER_MAPPING,
        INBOX_DIR,
        SPLIT_DIR,
    )

    archive_dir = ARCHIVE_DIR
    os.makedirs(archive_dir, exist_ok=True)

    # Parse the translated filename to find original input file
    # Format: [author_number]_[base_filename]_translated.json
    filename = Path(json_path).name
    if not filename.endswith("_translated.json"):
        logger.warning(f"Unexpected filename format: {filename}")
        return

    # Extract author number and base filename
    parts = filename.replace("_translated.json", "").split("_", 1)
    if len(parts) != 2:
        logger.warning(f"Could not parse filename: {filename}")
        return

    author_number, base_filename = parts

    # Look up author folder name
    if author_number not in AUTHOR_NUMBER_MAPPING:
        logger.warning(f"Unknown author number: {author_number}")
        return

    author_folder = None
    for folder, author_name in AUTHOR_FOLDER_MAPPING.items():
        if author_name == AUTHOR_NUMBER_MAPPING[author_number]:
            author_folder = folder
            break

    if not author_folder:
        logger.warning(
            f"Could not find author folder for: {AUTHOR_NUMBER_MAPPING[author_number]}"
        )
        return

    # Construct file paths
    input_file = os.path.join(INBOX_DIR, author_folder, f"{base_filename}.txt")
    split_file = os.path.join(SPLIT_DIR, f"{author_number}_{base_filename}_split.json")
    output_file = json_path

    archived_input = os.path.join(archive_dir, f"{article_id}_input.txt")
    archived_output = os.path.join(archive_dir, f"{article_id}_output.json")

    # Move input file from inbox to archive
    if os.path.exists(input_file):
        shutil.move(input_file, archived_input)
        logger.info(f"Archived input file: {input_file} -> {archived_input}")
    else:
        logger.warning(f"Input file not found: {input_file}")

    # Move output file to archive
    if os.path.exists(output_file):
        shutil.move(output_file, archived_output)
        logger.info(f"Archived output file: {output_file} -> {archived_output}")
    else:
        logger.warning(f"Output file not found: {output_file}")

    # Clean up intermediate split file
    if os.path.exists(split_file):
        os.remove(split_file)
        logger.info(f"Cleaned up intermediate split file: {split_file}")
    else:
        logger.warning(f"Split file not found for cleanup: {split_file}")


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

    # Validate essential field lengths and tashkeel content
    for idx, translation in enumerate(data["translations"]):
        # Check tashkeel is not from a different sentence
        if translation.get("tashkeel") and translation.get("original"):
            orig_words = set(translation["original"].split()[:3])
            tashkeel_stripped = clean_arabic_text(translation["tashkeel"])
            tashkeel_words = set(tashkeel_stripped.split()[:3])
            # If first few words don't overlap at all, tashkeel is likely from wrong sentence
            if orig_words and tashkeel_words and not any(
                tw.startswith(ow[:3]) or ow.startswith(tw[:3])
                for ow in orig_words
                for tw in tashkeel_words
            ):
                raise ValueError(
                    f"Tashkeel at position {idx} does not match original text "
                    f"(possible sentence mix-up)"
                )

        for word_idx, word in enumerate(translation.get("word_by_word", [])):
            essential = word.get("essential", "")
            if len(essential) > 30:
                raise ValueError(
                    f"Essential field too long at translation {idx}, word {word_idx}: "
                    f"'{essential[:40]}...' ({len(essential)} chars, max 30). "
                    f"This usually means multiple words were concatenated."
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
