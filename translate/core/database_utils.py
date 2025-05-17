import os
import json
import shutil
from datetime import datetime, UTC
from typing import Dict, List, Optional, Tuple

from translate.core.arabic_text import clean_arabic_text, clean_word_for_matching
from translate.core.storage_utils import (
    supabase,
    get_word_type_id,
    generate_audio_filename,
)
from translate.core.audio_utils import (
    generate_sentence_audio,
    concatenate_audio_files,
)


def extract_root_info(word: Dict) -> tuple[str, Optional[str]]:
    """Extract root information from a word."""
    # If root is directly specified, use it
    if word.get("root"):
        return word["root"], word.get("notes")

    # Use essential letters and translation as the root when available
    letters = word.get("essential", word.get("arabic"))
    meaning = (
        word.get("essential_translation")
        or f"Auto-generated root for: {word.get('english', '')}"
    )
    return letters, meaning


def get_or_create_root(letters: str, meaning: Optional[str] = None) -> int:
    """Get existing root or create a new one, and generate audio URLs for the root."""
    # Clean up letters (remove extra spaces)
    letters = " ".join(letters.split())

    # Check if root exists, include audio_url and audio_url_en
    result = (
        supabase.table("roots")
        .select("id", "audio_url", "audio_url_en")
        .eq("letters", letters)
        .execute()
    )
    if result.data:
        root = result.data[0]
        root_id = root["id"]
        # Generate and update audio_url/audio_url_en if missing
        if not root.get("audio_url") or not root.get("audio_url_en"):
            try:
                # Get or generate audio for the root word using cache
                from translate.core.root_audio import get_or_generate_root_audio

                audio_urls = get_or_generate_root_audio(letters)
                update_data = {}
                if audio_urls:
                    if audio_urls.get("audio_url") and not root.get("audio_url"):
                        update_data["audio_url"] = audio_urls["audio_url"]
                    if audio_urls.get("audio_url_en") and not root.get("audio_url_en"):
                        update_data["audio_url_en"] = audio_urls["audio_url_en"]
                if update_data:
                    supabase.table("roots").update(update_data).eq(
                        "id", root_id
                    ).execute()
            except Exception as e:
                print(f"Error generating audio for root '{letters}': {e}")
        return root_id

    # Create new root without audio_url first
    root_data = {"letters": letters, "meaning": meaning}
    result = supabase.table("roots").insert(root_data).execute()
    root_id = result.data[0]["id"]

    # Generate and update audio_url/audio_url_en for the new root
    try:
        from translate.core.root_audio import get_or_generate_root_audio

        audio_urls = get_or_generate_root_audio(letters)
        update_data = {}
        if audio_urls:
            if audio_urls.get("audio_url"):
                update_data["audio_url"] = audio_urls["audio_url"]
            if audio_urls.get("audio_url_en"):
                update_data["audio_url_en"] = audio_urls["audio_url_en"]
        if update_data:
            supabase.table("roots").update(update_data).eq("id", root_id).execute()
    except Exception as e:
        print(f"Error generating audio for new root '{letters}': {e}")

    return root_id


def insert_sentence_words(
    sentence_id: int, translation: Dict, word_timings: List[Dict] = None
) -> Dict:
    """
    Insert words from a sentence with their roots and relationships.
    Uses cleaned Arabic text (without non-Arabic characters) for consistency with TTS.
    """
    word_by_word = translation.get("word_by_word", [])

    # Track timing match statistics
    match_stats = {"exact": 0, "position": 0, "fuzzy": 0, "none": 0}
    total_words = len(word_by_word)
    words_with_timing = 0

    # Check if we have word timings and output a clear warning if we have fewer timings than words
    if word_timings:
        if len(word_timings) < len(word_by_word):
            print(
                f"Warning: Fewer word timings ({len(word_timings)}) than words in sentence ({len(word_by_word)})"
            )
    else:
        # Early return with empty stats if no timings
        for position, word in enumerate(word_by_word):
            # Process words without timing info
            root_letters, root_meaning = extract_root_info(word)
            root_id = get_or_create_root(root_letters, root_meaning)
            word_type_id = get_word_type_id(word.get("pos", "noun"))

            # Store the cleaned word form
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

            supabase.table("sentence_words").insert(word_data).execute()
            match_stats["none"] += 1

        return {
            "total_words": total_words,
            "words_with_timing": 0,
            "match_stats": match_stats,
        }

    # If we have word timings, prepare for matching
    # Pre-tokenize the original words using the same method for consistency
    original_tokens = []
    for word_info in word_by_word:
        # Get the original Arabic word and clean it
        original_word = clean_arabic_text(word_info["arabic"])
        original_tokens.append(original_word)

    # Extract words from word timings for comparison
    timing_words = [clean_arabic_text(timing["word"]) for timing in word_timings]

    # Sort word timings by start time to ensure proper sequencing
    sorted_timings = sorted(word_timings, key=lambda x: float(x["start_time"]))

    # Store the word data before inserting to validate timestamps
    words_data = []

    # Use a simpler, more direct matching approach
    # In the vast majority of cases, the order of words should match
    # We'll use position-based matching by default, but check for exact matches
    timing_position = 0
    last_end_time = 0.0

    for position, word in enumerate(word_by_word):
        # Extract metadata
        root_letters, root_meaning = extract_root_info(word)
        root_id = get_or_create_root(root_letters, root_meaning)
        word_type_id = get_word_type_id(word.get("pos", "noun"))

        # Store the cleaned word form
        original_word = clean_arabic_text(word["arabic"])

        # Initialize with no timing info
        timing_info = {}
        match_method = "none"

        # If we have a timing position available
        if timing_position < len(sorted_timings):
            # Use position-based matching - simplest and most reliable approach
            timing_data = sorted_timings[timing_position]
            timing_info = {
                "start_time": timing_data["start_time"],
                "end_time": timing_data["end_time"],
            }
            match_method = "position"
            timing_position += 1  # Move to next position

            # Ensure timestamps are monotonically increasing
            start_time = float(timing_info.get("start_time", 0))
            end_time = float(timing_info.get("end_time", 0))

            if start_time < last_end_time:
                start_time = last_end_time
                timing_info["start_time"] = str(start_time)

                # Ensure end time is after start time
                if end_time <= start_time:
                    end_time = start_time + 0.3  # Add minimum duration
                    timing_info["end_time"] = str(end_time)

            last_end_time = end_time

        # Update match statistics
        match_stats[match_method] += 1
        if match_method != "none":
            words_with_timing += 1

        # Create the word data
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

    # Now insert all words with validated timestamps
    for idx, word_data in enumerate(words_data):
        try:
            supabase.table("sentence_words").insert(word_data).execute()
        except Exception as e:
            print(f"Error inserting word {idx} into database: {str(e)}")
            raise

    # Return statistics for reporting
    return {
        "total_words": total_words,
        "words_with_timing": words_with_timing,
        "match_stats": match_stats,
    }


def insert_article_sentences(article_id: int, translations: List[Dict]) -> Dict:
    """Insert article sentences into the database."""
    timing_stats = {
        "total_sentences": len(translations),
        "sentences_with_audio": 0,
        "sentences_with_timings": 0,
        "sentences_without_timings": 0,
        "total_words": 0,
        "words_with_timings": 0,
    }

    # List to store temporary audio files for concatenation
    sentence_audio_files = []
    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_audio")
    os.makedirs(temp_dir, exist_ok=True)

    try:
        for idx, translation in enumerate(translations):
            # Get previous and next sentences for better continuity
            # Use tashkeel version if available for better pronunciation
            previous_text = None
            next_text = None

            if idx > 0:
                prev_translation = translations[idx - 1]
                # Prefer tashkeel version for better pronunciation
                previous_text = prev_translation.get(
                    "tashkeel", prev_translation["original"]
                )

            if idx < len(translations) - 1:
                next_translation = translations[idx + 1]
                # Prefer tashkeel version for better pronunciation
                next_text = next_translation.get(
                    "tashkeel", next_translation["original"]
                )

            # Generate audio for this individual sentence with timestamps
            temp_audio_file = os.path.join(temp_dir, f"sentence_{idx}.mp3")
            audio_filename = generate_audio_filename()

            # Use enhanced audio generation with tashkeel, SSML, and sentence context
            audio_result = generate_sentence_audio(
                text=translation["original"],
                filename=audio_filename,
                tashkeel_text=translation.get("tashkeel"),
                is_last_sentence=(idx == len(translations) - 1),
                previous_text=previous_text,
                next_text=next_text,
            )

            # Extract statistics from audio result
            if audio_result is not None:
                storage_url = audio_result.get("url", None)
                word_timings = audio_result.get("word_timings", [])
                timing_stats["sentences_with_audio"] += 1

                # Download the audio file for concatenation
                try:
                    response = supabase.storage.from_("audio").download(audio_filename)
                    if response:
                        with open(temp_audio_file, "wb") as f:
                            f.write(response)
                        sentence_audio_files.append(temp_audio_file)
                except Exception as e:
                    print(f"Error downloading audio file: {str(e)}")

                if word_timings:
                    timing_stats["sentences_with_timings"] += 1
                else:
                    timing_stats["sentences_without_timings"] += 1

            # Clean the text before storing in database
            cleaned_arabic = clean_arabic_text(translation["original"])

            # Insert sentence with audio URL
            sentence_data = {
                "article_id": article_id,
                "position": idx,
                "arabic": cleaned_arabic,
                "english": translation[
                    "full_translation"
                ],  # Changed back to full_translation
                "audio_url": storage_url,
            }
            result = supabase.table("article_sentences").insert(sentence_data).execute()
            sentence_id = result.data[0]["id"]

            # Insert words with their timing information
            if translation.get("word_by_word"):
                word_stats = insert_sentence_words(
                    sentence_id, translation, word_timings
                )
                timing_stats["total_words"] += word_stats["total_words"]
                timing_stats["words_with_timings"] += word_stats["words_with_timing"]
            else:
                print(
                    "Warning: No word-by-word translation found, skipping word insertion"
                )

        # After processing all sentences, concatenate their audio files
        if sentence_audio_files:
            final_audio_filename = generate_audio_filename()
            final_audio_path = os.path.join(temp_dir, final_audio_filename)

            if concatenate_audio_files(sentence_audio_files, final_audio_path):
                # Upload the concatenated file
                try:
                    with open(final_audio_path, "rb") as f:
                        supabase.storage.from_("audio").upload(
                            final_audio_filename,
                            f,
                            file_options={"content-type": "audio/mpeg"},
                        )

                    # Update the article with the concatenated audio URL
                    article_audio_url = f"{os.environ.get('SUPABASE_URL')}/storage/v1/object/public/audio/{final_audio_filename}"
                    supabase.table("articles").update(
                        {"audio_url": article_audio_url}
                    ).eq("id", article_id).execute()

                    print(
                        "Successfully created and uploaded concatenated article audio"
                    )
                except Exception as e:
                    print(f"Error uploading concatenated audio: {str(e)}")

            # Clean up temporary files
            for file in sentence_audio_files:
                try:
                    os.remove(file)
                except:
                    pass
            try:
                os.remove(final_audio_path)
                os.rmdir(temp_dir)
            except:
                pass

    except Exception as e:
        print(f"Error processing sentences: {str(e)}")
        # Clean up on error
        for file in sentence_audio_files:
            try:
                os.remove(file)
            except:
                pass
        try:
            os.rmdir(temp_dir)
        except:
            pass
        raise

    return timing_stats


def save_timing_report(
    article_id: int, title: str, json_path: str, timing_stats: Dict
) -> None:
    """Save timing statistics to a CSV report file."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.abspath(os.path.join(script_dir, ".."))
    reports_dir = os.path.join(root_dir, "reports")
    os.makedirs(reports_dir, exist_ok=True)

    report_file = os.path.join(reports_dir, "timing_reports.csv")
    file_exists = os.path.exists(report_file)

    now = datetime.now(UTC).isoformat()

    try:
        # Calculate quality rating
        words_with_timing_pct = 0
        if timing_stats["total_words"] > 0:
            words_with_timing_pct = (
                timing_stats["words_with_timings"] / timing_stats["total_words"]
            ) * 100

        # Quality rating
        if words_with_timing_pct >= 90:
            quality = "EXCELLENT"
        elif words_with_timing_pct >= 75:
            quality = "GOOD"
        elif words_with_timing_pct >= 50:
            quality = "FAIR"
        else:
            quality = "POOR"

        # Write to CSV
        with open(report_file, "a", encoding="utf-8", newline="") as f:
            # Write header if file is new
            if not file_exists:
                f.write(
                    "article_id,title,timestamp,total_sentences,sentences_with_audio,sentences_with_timings,sentences_with_partial_timings,sentences_without_timings,total_words,words_with_timing,timing_percentage,quality\n"
                )

            # Write data row with all the detailed statistics
            f.write(
                f'{article_id},"{title.replace('"', '""')}",{now},'
                f"{timing_stats['total_sentences']},"
                f"{timing_stats['sentences_with_audio']},"
                f"{timing_stats['sentences_with_timings']},"
                f"{timing_stats['sentences_without_timings']},"
                f"{timing_stats['total_words']},"
                f"{timing_stats['words_with_timings']},"
                f"{words_with_timing_pct:.1f},"
                f"{quality}\n"
            )

        print(f"Saved timing report to {report_file}")

    except Exception as e:
        print(f"Failed to save timing report: {str(e)}")


def archive_files(json_path: str, article_id: int) -> None:
    """Move input and output files to archive directory with article ID as name."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.abspath(os.path.join(script_dir, ".."))
    archive_dir = os.path.join(root_dir, "archive")
    os.makedirs(archive_dir, exist_ok=True)

    # Get the article directory path
    article_dir = os.path.dirname(json_path)

    # Define source and destination paths
    input_file = os.path.join(article_dir, "input.txt")
    output_file = json_path  # This is output.json

    # Define new paths in archive
    archived_input = os.path.join(archive_dir, f"{article_id}_input.txt")
    archived_output = os.path.join(archive_dir, f"{article_id}_output.json")

    # Move files if they exist
    if os.path.exists(input_file):
        shutil.move(input_file, archived_input)

    if os.path.exists(output_file):
        shutil.move(output_file, archived_output)


def validate_article_data(data: Dict) -> None:
    """
    Validate article data before processing. Raises ValueError with detailed message if validation fails.
    """
    # 1. Check required metadata fields
    required_metadata = ["title", "summary", "difficulty_level"]
    missing_fields = [
        field for field in required_metadata if not data.get("metadata", {}).get(field)
    ]
    if missing_fields:
        raise ValueError(
            f"Missing required metadata fields: {', '.join(missing_fields)}"
        )

    # 2. Check translations array exists and is not empty
    if (
        not data.get("translations")
        or not isinstance(data["translations"], list)
        or len(data["translations"]) == 0
    ):
        raise ValueError("Article must contain at least one translation")

    # 3. Validate each translation entry
    for idx, translation in enumerate(data["translations"]):
        if not translation.get("original"):
            raise ValueError(f"Missing Arabic text in translation at position {idx}")
        if not translation.get("full_translation"):
            raise ValueError(f"Missing English translation at position {idx}")

        # 4. Validate word-by-word translations if present
        if "word_by_word" in translation:
            if not isinstance(translation["word_by_word"], list):
                raise ValueError(
                    f"word_by_word must be a list in translation at position {idx}"
                )

            for word_idx, word in enumerate(translation["word_by_word"]):
                if not word.get("arabic"):
                    raise ValueError(
                        f"Missing Arabic word in word_by_word at translation {idx}, word {word_idx}"
                    )
                if not word.get("english"):
                    raise ValueError(
                        f"Missing English translation in word_by_word at translation {idx}, word {word_idx}"
                    )

    # 5. Check difficulty level is within valid range
    difficulty = data["metadata"]["difficulty_level"]
    if not isinstance(difficulty, int) or difficulty < 1 or difficulty > 5:
        raise ValueError("Difficulty level must be an integer between 1 and 5")
