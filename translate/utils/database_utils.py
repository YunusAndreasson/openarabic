import logging
import os
import shutil
from datetime import UTC, datetime
from typing import Any

from translate.data.config import ARCHIVE_DIR, ROOT_DIR, SUPABASE_URL
from translate.utils.arabic_text import clean_arabic_text
from translate.utils.storage_utils import (
    generate_audio_filename,
    get_word_type_id,
    supabase,
)

logger = logging.getLogger(__name__)


# Audio utilities are not available - audio module removed
# Stub functions to prevent import errors
def concatenate_audio_files(files: list[str], output_path: str) -> bool:
    """Stub function - audio concatenation not available."""
    logger.warning("Audio concatenation not available - audio module removed")
    return False


def generate_sentence_audio(
    text: str,
    filename: str,
    tashkeel_text: str | None = None,
    previous_text: str | None = None,
    next_text: str | None = None,
) -> dict[str, Any] | None:
    """Stub function - sentence audio generation not available."""
    logger.warning("Sentence audio generation not available - audio module removed")
    return None


def get_or_generate_root_audio(
    letters: str,
    english_text: str,
) -> dict[str, str] | None:
    """Stub function - root audio generation not available."""
    logger.warning("Root audio generation not available - audio module removed")
    return None


def extract_root_info(word: dict[str, Any]) -> tuple[str, str | None, str | None]:
    """Extract root information from a word.

    Returns:
        tuple: (arabic_root, meaning, english_translation)
    """
    if word.get("root"):
        return word["root"], word.get("notes"), word.get("english", "")

    letters = word.get("essential", word.get("arabic"))
    english = word.get("english", "")
    meaning = word.get("essential_translation") or f"Auto-generated root for: {english}"

    english_translation = word.get("essential_translation", "")
    if not english_translation:
        english_translation = english

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

    result = (
        supabase.table("roots")
        .select("id", "audio_url", "audio_url_en")
        .eq("letters", letters)
        .execute()
    )
    if result.data:
        root = result.data[0]
        root_id = root["id"]
        if not root.get("audio_url") or not root.get("audio_url_en"):
            try:
                english_audio_text = english_translation
                if not english_audio_text and meaning:
                    if "Auto-generated root for:" in meaning:
                        english_audio_text = meaning.replace(
                            "Auto-generated root for:",
                            "",
                        ).strip()
                    else:
                        english_audio_text = meaning

                audio_urls = get_or_generate_root_audio(letters, english_audio_text)

                update_data = {}
                if audio_urls:
                    if audio_urls.get("audio_url") and not root.get("audio_url"):
                        update_data["audio_url"] = audio_urls["audio_url"]
                    if audio_urls.get("audio_url_en") and not root.get("audio_url_en"):
                        update_data["audio_url_en"] = audio_urls["audio_url_en"]

                if update_data:
                    supabase.table("roots").update(update_data).eq(
                        "id",
                        root_id,
                    ).execute()
            except Exception as e:
                logger.info(f"Error generating audio for root '{letters}': {e}")
        return root_id

    root_data = {"letters": letters, "meaning": meaning}
    result = supabase.table("roots").insert(root_data).execute()
    root_id = result.data[0]["id"]

    try:
        english_audio_text = english_translation

        if not english_audio_text and meaning:
            if "Auto-generated root for:" in meaning:
                english_audio_text = meaning.replace(
                    "Auto-generated root for:",
                    "",
                ).strip()
            else:
                english_audio_text = meaning

        audio_urls = get_or_generate_root_audio(letters, english_audio_text)

        update_data = {}
        if audio_urls:
            if audio_urls.get("audio_url"):
                update_data["audio_url"] = audio_urls["audio_url"]
            if audio_urls.get("audio_url_en"):
                update_data["audio_url_en"] = audio_urls["audio_url_en"]

        if update_data:
            supabase.table("roots").update(update_data).eq("id", root_id).execute()
    except Exception as e:
        logger.info(f"Error generating audio for new root '{letters}': {e}")

    return root_id


def insert_sentence_words(
    sentence_id: int,
    translation: dict[str, Any],
    word_timings: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """
    Insert words from a sentence with their roots and relationships.
    Uses cleaned Arabic text (without non-Arabic characters) for consistency with TTS.
    """
    word_by_word = translation.get("word_by_word", [])

    match_stats = {"exact": 0, "position": 0, "fuzzy": 0, "none": 0}
    total_words = len(word_by_word)
    words_with_timing = 0

    words_data: list[dict[str, Any]] = []

    if word_timings:
        if len(word_timings) < len(word_by_word):
            pass
        sorted_timings = sorted(word_timings, key=lambda x: float(x["start_time"]))
        timing_position = 0
        last_end_time = 0.0

        for position, word in enumerate(word_by_word):
            root_letters, root_meaning, english_translation = extract_root_info(word)
            root_id = get_or_create_root(
                root_letters,
                root_meaning,
                english_translation,
            )
            word_type_id = get_word_type_id(word.get("pos", "noun"))

            original_word = clean_arabic_text(word["arabic"])

            timing_info: dict[str, str] = {}
            match_method = "none"

            if timing_position < len(sorted_timings):
                timing_data = sorted_timings[timing_position]
                timing_info = {
                    "start_time": timing_data["start_time"],
                    "end_time": timing_data["end_time"],
                }
                match_method = "position"
                timing_position += 1

                start_time = float(timing_info.get("start_time", 0))
                end_time = float(timing_info.get("end_time", 0))

                if start_time < last_end_time:
                    start_time = last_end_time
                    timing_info["start_time"] = str(start_time)

                    if end_time <= start_time:
                        end_time = start_time + 0.3
                        timing_info["end_time"] = str(end_time)

                last_end_time = end_time

            match_stats[match_method] += 1
            if match_method != "none":
                words_with_timing += 1

            word_data = {
                "sentence_id": sentence_id,
                "position": position,
                "word_form": original_word,
                "english": word["english"],
                "word_type_id": word_type_id,
                "root_id": root_id,
                "difficulty_level": 1,
                "grammar_note": word.get("notes"),
                "audio_start": timing_info.get("start_time"),
                "audio_end": timing_info.get("end_time"),
            }

            words_data.append(word_data)
    else:
        for position, word in enumerate(word_by_word):
            root_letters, root_meaning, english_translation = extract_root_info(word)
            root_id = get_or_create_root(
                root_letters,
                root_meaning,
                english_translation,
            )
            word_type_id = get_word_type_id(word.get("pos", "noun"))

            original_word = clean_arabic_text(word["arabic"])

            word_data = {
                "sentence_id": sentence_id,
                "position": position,
                "word_form": original_word,
                "english": word["english"],
                "word_type_id": word_type_id,
                "root_id": root_id,
                "difficulty_level": 1,
                "grammar_note": word.get("notes"),
            }

            words_data.append(word_data)
            match_stats["none"] += 1

    if words_data:
        supabase.table("sentence_words").insert(words_data).execute()

    return {
        "total_words": total_words,
        "words_with_timing": words_with_timing,
        "match_stats": match_stats,
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


def download_audio_for_concat(filename: str, dest_path: str) -> bool:
    """Download an audio file from storage for concatenation."""
    try:
        response = supabase.storage.from_("audio").download(filename)
        if response:
            with open(dest_path, "wb") as f:
                f.write(response)
            return True
    except Exception as e:
        logger.info(f"Error downloading audio file: {str(e)}")
    return False


def cleanup_temp_files(files: list[str], temp_dir: str) -> None:
    """Remove temporary files and directory if possible."""
    for file in files:
        try:
            os.remove(file)
        except Exception as e:
            logger.debug(f"Failed to remove file {file}: {e}")
    try:
        os.rmdir(temp_dir)
    except Exception as e:
        logger.debug(f"Failed to remove directory {temp_dir}: {e}")


def concatenate_and_upload_audio(
    files: list[str],
    temp_dir: str,
    article_id: int,
) -> None:
    """Concatenate sentence audio files, upload, and clean up."""
    final_audio_filename = generate_audio_filename()
    final_audio_path = os.path.join(temp_dir, final_audio_filename)

    if concatenate_audio_files(files, final_audio_path):
        try:
            with open(final_audio_path, "rb") as f:
                supabase.storage.from_("audio").upload(
                    final_audio_filename,
                    f,
                    file_options={"content-type": "audio/mpeg"},
                )

            article_audio_url = (
                f"{SUPABASE_URL}/storage/v1/object/public/audio/{final_audio_filename}"
            )
            supabase.table("articles").update({"audio_url": article_audio_url}).eq(
                "id",
                article_id,
            ).execute()

        except Exception as e:
            logger.info(f"Error uploading concatenated audio: {str(e)}")

    cleanup_temp_files(files + [final_audio_path], temp_dir)


def insert_article_sentences(article_id: int, translations: list[dict]) -> dict:
    """Insert article sentences into the database."""
    timing_stats = {
        "total_sentences": len(translations),
        "sentences_with_audio": 0,
        "sentences_with_timings": 0,
        "sentences_without_timings": 0,
        "total_words": 0,
        "words_with_timings": 0,
    }

    sentence_audio_files = []
    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_audio")
    os.makedirs(temp_dir, exist_ok=True)

    try:
        for idx, translation in enumerate(translations):
            previous_text, next_text = get_adjacent_texts(translations, idx)

            temp_audio_file = os.path.join(temp_dir, f"sentence_{idx}.mp3")
            audio_filename = generate_audio_filename()

            audio_result = generate_sentence_audio(
                text=translation["original"],
                filename=audio_filename,
                tashkeel_text=translation.get("tashkeel"),
                previous_text=previous_text,
                next_text=next_text,
            )

            if audio_result is not None:
                storage_url = audio_result.get("url", None)
                word_timings = audio_result.get("word_timings", [])
                timing_stats["sentences_with_audio"] += 1

                if download_audio_for_concat(audio_filename, temp_audio_file):
                    sentence_audio_files.append(temp_audio_file)

                if word_timings:
                    timing_stats["sentences_with_timings"] += 1
                else:
                    timing_stats["sentences_without_timings"] += 1

            cleaned_arabic = clean_arabic_text(translation["original"])

            sentence_data = {
                "article_id": article_id,
                "position": idx,
                "arabic": cleaned_arabic,
                "english": translation["full_translation"],
                "audio_url": storage_url,
            }
            result = supabase.table("article_sentences").insert(sentence_data).execute()
            sentence_id = result.data[0]["id"]

            if translation.get("word_by_word"):
                word_stats = insert_sentence_words(
                    sentence_id,
                    translation,
                    word_timings,
                )
                timing_stats["total_words"] += word_stats["total_words"]
                timing_stats["words_with_timings"] += word_stats["words_with_timing"]

        if sentence_audio_files:
            concatenate_and_upload_audio(sentence_audio_files, temp_dir, article_id)
        else:
            cleanup_temp_files([], temp_dir)

    except Exception as e:
        logger.info(f"Error processing sentences: {str(e)}")
        cleanup_temp_files(sentence_audio_files, temp_dir)
        raise

    return timing_stats


def save_timing_report(
    article_id: int,
    title: str,
    json_path: str,
    timing_stats: dict,
) -> None:
    """Save timing statistics to a CSV report file."""
    os.path.dirname(os.path.abspath(__file__))
    reports_dir = os.path.join(ROOT_DIR, "reports")
    os.makedirs(reports_dir, exist_ok=True)

    report_file = os.path.join(reports_dir, "timing_reports.csv")
    file_exists = os.path.exists(report_file)

    now = datetime.now(UTC).isoformat()

    try:
        words_with_timing_pct = 0
        if timing_stats["total_words"] > 0:
            words_with_timing_pct = (
                timing_stats["words_with_timings"] / timing_stats["total_words"]
            ) * 100

        if words_with_timing_pct >= 90:
            quality = "EXCELLENT"
        elif words_with_timing_pct >= 75:
            quality = "GOOD"
        elif words_with_timing_pct >= 50:
            quality = "FAIR"
        else:
            quality = "POOR"

        with open(report_file, "a", encoding="utf-8", newline="") as f:
            if not file_exists:
                f.write(
                    "article_id,title,timestamp,total_sentences,sentences_with_audio,sentences_with_timings,sentences_with_partial_timings,sentences_without_timings,total_words,words_with_timing,timing_percentage,quality\n",
                )

            title_escaped = title.replace('"', '""')
            f.write(
                f'{article_id},"{title_escaped}",{now},'
                f"{timing_stats['total_sentences']},"
                f"{timing_stats['sentences_with_audio']},"
                f"{timing_stats['sentences_with_timings']},"
                f"{timing_stats['sentences_without_timings']},"
                f"{timing_stats['total_words']},"
                f"{timing_stats['words_with_timings']},"
                f"{words_with_timing_pct:.1f},"
                f"{quality}\n",
            )

    except Exception as e:
        logger.info(f"Failed to save timing report: {str(e)}")


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
    """
    Validate article data before processing. Raises ValueError with detailed message if validation fails.
    """
    required_metadata = ["title", "summary", "difficulty_level"]
    missing_fields = [
        field for field in required_metadata if not data.get("metadata", {}).get(field)
    ]
    if missing_fields:
        raise ValueError(
            f"Missing required metadata fields: {', '.join(missing_fields)}",
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
                f"Translation at position {idx} has failed verification status",
            )

        if "[BATCH PROCESSING ERROR]" in translation.get("full_translation", ""):
            raise ValueError(
                f"Translation at position {idx} contains error marker - translation is incomplete",
            )

        if "[ERROR]" in translation.get("full_translation", ""):
            raise ValueError(
                f"Translation at position {idx} contains error marker - translation is incomplete",
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

    difficulty = data["metadata"]["difficulty_level"]
    if not isinstance(difficulty, int) or difficulty < 1 or difficulty > 5:
        raise ValueError("Difficulty level must be an integer between 1 and 5")
