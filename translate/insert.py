import json
from supabase import create_client
from typing import Dict, List, Optional
import os
import shutil
from datetime import datetime, UTC
import uuid
import hashlib
import base64
from elevenlabs.client import ElevenLabs
from elevenlabs import VoiceSettings

# Check ElevenLabs version
try:
    import elevenlabs

    elevenlabs_version = getattr(elevenlabs, "__version__", "unknown")
    print(f"Using ElevenLabs version: {elevenlabs_version}")
except ImportError:
    print("Could not determine ElevenLabs version")
    elevenlabs_version = "unknown"

min_required_version = (
    "1.50.0"  # Minimum version that should support the timestamps API
)

# Execute set_keys.py to set environment variables
set_keys_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "set_keys.py")
exec(open(set_keys_path).read())

# Supabase configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# ElevenLabs configuration
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY, ELEVENLABS_API_KEY]):
    raise EnvironmentError(
        "Missing required environment variables. Please ensure SUPABASE_URL, SUPABASE_KEY, and ELEVENLABS_API_KEY are set."
    )

# Initialize clients
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
eleven_labs = ElevenLabs(api_key=ELEVENLABS_API_KEY)

# Word type mapping from POS to word_types table
WORD_TYPE_MAPPING = {
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


def _remove_final_haraka(word: str) -> str:
    """
    Remove the last short vowel (haraka) or tanween
    from an Arabic word, if present.
    """
    # Set of diacritics we want to remove from the end
    final_diacritics = {"َ", "ُ", "ِ", "ْ", "ً", "ٌ", "ٍ"}

    # Convert to a list of characters for easy popping
    chars = list(word)

    # Remove diacritics while the last character is in our set
    while chars and chars[-1] in final_diacritics:
        chars.pop()

    # Reconstruct the word after stripping final diacritics
    return "".join(chars)


def generate_content_hash(data: Dict) -> str:
    """Generate a unique hash for the article content."""
    content = json.dumps(data, sort_keys=True)
    return hashlib.sha256(content.encode()).hexdigest()


def check_article_exists(content_hash: str) -> tuple[Optional[int], Optional[str]]:
    """Check if an article with this content hash already exists and return its ID and audio_url."""
    try:
        result = (
            supabase.table("articles")
            .select("id, audio_url")
            .eq("content_hash", content_hash)
            .execute()
        )
        if result.data:
            return result.data[0]["id"], result.data[0].get("audio_url")
        return None, None
    except Exception as e:
        if "content_hash" in str(e):
            # Column doesn't exist yet, so no duplicates possible
            return None, None
        raise e


def generate_audio_filename() -> str:
    """Generate a unique filename for the audio file."""
    return f"{uuid.uuid4()}.mp3"


def _generate_audio_common(text: str, filename: str) -> Optional[Dict]:
    """Common function for generating audio files using ElevenLabs API with word timings."""
    try:
        # Use the multilingual v2 model which has good support for Arabic
        print(f"Calling ElevenLabs API with text: '{text[:30]}...'")

        # Check if convert_with_timestamps method exists
        if hasattr(eleven_labs.text_to_speech, "convert_with_timestamps"):
            print("Using convert_with_timestamps API...")
            audio_response = eleven_labs.text_to_speech.convert_with_timestamps(
                text=text,
                voice_id="nPczCjzI2devNBz1zQrb",
                model_id="eleven_multilingual_v2",
                output_format="mp3_44100_128",
                voice_settings=VoiceSettings(
                    stability=0.8,
                    similarity_boost=0.9,
                    style=0.0,
                    use_speaker_boost=True,
                    speed=0.8,
                ),
            )
        else:
            # Fall back to standard convert method if timestamp API isn't available
            print(
                "convert_with_timestamps not found, falling back to regular convert..."
            )
            print("Available methods:", dir(eleven_labs.text_to_speech))
            audio_response = eleven_labs.text_to_speech.convert(
            text=text,
            voice_id="nPczCjzI2devNBz1zQrb",
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
            voice_settings=VoiceSettings(
                stability=0.8,
                similarity_boost=0.9,
                style=0.0,
                use_speaker_boost=True,
                speed=0.8,
            ),
        )

        # Debug the response
        print(f"ElevenLabs API response type: {type(audio_response)}")
        print(f"Response attributes: {dir(audio_response)}")

        # Validate audio response
        if not audio_response:
            print("Error: Empty audio response from ElevenLabs API")
            return None

        # Extract audio data - check for both audio and audio_base_64 attributes
        audio_data = None
        if hasattr(audio_response, "audio"):
            audio_data = audio_response.audio
        elif hasattr(audio_response, "audio_base_64"):
            # Decode base64 audio data
            print("Found audio_base_64 attribute, decoding...")
            try:
                audio_data = base64.b64decode(audio_response.audio_base_64)
            except Exception as e:
                print(f"Error decoding base64 audio: {str(e)}")
                return None
        else:
            print(
                f"Error: Response doesn't have 'audio' or 'audio_base_64' attribute. Available attributes: {dir(audio_response)}"
            )

            # Try alternative attribute names that might contain the audio data
            audio_data = None
            for attr in ["audio_content", "content", "data", "audio_data"]:
                if hasattr(audio_response, attr):
                    print(f"Found alternative audio attribute: {attr}")
                    audio_data = getattr(audio_response, attr)
                    break

            # If using standard convert, the response may be the audio bytes directly
            if audio_data is None and isinstance(audio_response, bytes):
                print("Response appears to be raw audio bytes")
                audio_data = audio_response

            if audio_data is None:
                print("No suitable audio data found in response")
                return None

        # Save the audio file temporarily
        temp_audio_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "audio", filename
        )
        os.makedirs(os.path.dirname(temp_audio_path), exist_ok=True)

        # Write the complete audio data to temporary file
        with open(temp_audio_path, "wb") as f:
            f.write(audio_data)

        # Upload to Supabase storage
        with open(temp_audio_path, "rb") as f:
            supabase.storage.from_("audio").upload(filename, f)

        # Clean up temporary file
        os.remove(temp_audio_path)

        # Construct the complete storage URL
        storage_url = f"{SUPABASE_URL}/storage/v1/object/public/audio/{filename}"

        # Process the alignment data to extract word-level timings
        word_timings = []

        # Check for alignment data (safely with getattr)
        alignment = getattr(audio_response, "alignment", None)
        if not alignment:
            print("No alignment data found in response")

            # Try alternative attribute names that might contain the alignment data
            for attr in [
                "timestamps",
                "word_timestamps",
                "timing_data",
                "time_alignments",
            ]:
                if hasattr(audio_response, attr):
                    print(f"Found alternative alignment attribute: {attr}")
                    alignment = getattr(audio_response, attr)
                    break

        if alignment:
            # Safely extract alignment properties
            print(f"Alignment type: {type(alignment)}")
            print(f"Alignment attributes: {dir(alignment)}")

            # Check if we have the expected character timing data
            chars = getattr(alignment, "characters", [])
            start_times = getattr(alignment, "character_start_times_seconds", [])
            end_times = getattr(alignment, "character_end_times_seconds", [])

            # ElevenLabs might return a dict with these properties instead of object attributes
            if not (chars and start_times and end_times) and hasattr(alignment, "dict"):
                print("Using alignment.dict() method to extract data")
                alignment_dict = alignment.dict()
                chars = alignment_dict.get("characters", [])
                start_times = alignment_dict.get("character_start_times_seconds", [])
                end_times = alignment_dict.get("character_end_times_seconds", [])

            # Another possibility - alignment properties are directly accessible as dict
            if not (chars and start_times and end_times) and isinstance(
                alignment, dict
            ):
                print("Alignment is a dict, extracting directly")
                chars = alignment.get("characters", [])
                start_times = alignment.get("character_start_times_seconds", [])
                end_times = alignment.get("character_end_times_seconds", [])

            # Add explicit debug information about what we found
            print(f"Characters found: {len(chars) if chars else 0}")
            print(f"Start times found: {len(start_times) if start_times else 0}")
            print(f"End times found: {len(end_times) if end_times else 0}")

            if (
                chars
                and start_times
                and end_times
                and len(chars) == len(start_times) == len(end_times)
            ):
                # Process character timings to extract word timings
                current_word = ""
                current_word_start_time = None

                # For Arabic text, words are separated by spaces but may have different
                # characteristics than English, so we're still detecting words by spaces
                # but with enhanced validation
                for i, char in enumerate(chars):
                    # Check if this is a word boundary (space or end of text)
                    is_word_boundary = char == " " or i == len(chars) - 1

                    if is_word_boundary:
                        # If we're at the end of text, include the last character
                        if i == len(chars) - 1 and char != " ":
                            current_word += char

                        # End of a word - record its timing if we've collected characters
                        if current_word:
                            word_end_idx = i if char == " " else i + 1
                            word_end_time = end_times[word_end_idx - 1]

                            # Validate timing values
                            if (
                                current_word_start_time is not None
                                and current_word_start_time < word_end_time
                            ):
                                word_timings.append(
                                    {
                                        "word": current_word,
                                        "start_time": current_word_start_time,
                                        "end_time": word_end_time,
                                    }
                                )

                            # Reset for next word
                            current_word = ""
                            current_word_start_time = None
                    else:
                        # Part of a word
                        if not current_word:  # First character of the word
                            current_word_start_time = start_times[i]
                        current_word += char
            else:
                print(
                    f"Missing or mismatched alignment data - chars: {len(chars) if chars else 0}, start_times: {len(start_times) if start_times else 0}, end_times: {len(end_times) if end_times else 0}"
                )

        # Add explicit logging at the end to show if we got word timings
        if word_timings:
            print(f"✅ Successfully extracted {len(word_timings)} word timings")
            for i, timing in enumerate(word_timings[:3]):  # Show first 3 examples
                print(
                    f"  Word: '{timing['word']}', Start: {timing['start_time']:.2f}s, End: {timing['end_time']:.2f}s"
                )
            if len(word_timings) > 3:
                print(f"  ... and {len(word_timings) - 3} more words")
        else:
            print("❌ No word timings were extracted. Possible causes:")
            print(
                "  - ElevenLabs API might not support timestamps in your current plan"
            )
            print(
                "  - Using fallback to regular convert() method which doesn't support timestamps"
            )
            print("  - The response format doesn't match what we're expecting")
            print("  - No alignment data was returned in the response")

        return {"url": storage_url, "word_timings": word_timings}

    except Exception as e:
        print(f"Error generating/uploading audio: {str(e)}")
        import traceback

        traceback.print_exc()
        return None


def generate_audio(text: str, filename: str) -> Optional[Dict]:
    """Generate audio file for Arabic text using ElevenLabs API and upload to Supabase storage."""
    return _generate_audio_common(text, filename)


def get_category_id(name: str = "aqeedah") -> int:
    """Get category ID by name."""
    result = supabase.table("categories").select("id").eq("name", name).execute()
    if not result.data:
        raise ValueError(f"Category '{name}' not found")
    return result.data[0]["id"]


def get_author_id(name: str = "Ibn Kathir") -> int:
    """Get author ID by name."""
    result = supabase.table("authors").select("id").eq("name", name).execute()
    if not result.data:
        raise ValueError(f"Author '{name}' not found")
    return result.data[0]["id"]


def get_or_create_root(letters: str, meaning: Optional[str] = None) -> int:
    """Get existing root or create a new one."""
    # Clean up letters (remove extra spaces)
    letters = " ".join(letters.split())

    # Check if root exists
    result = supabase.table("roots").select("id").eq("letters", letters).execute()
    if result.data:
        return result.data[0]["id"]

    # Create new root
    root_data = {"letters": letters, "meaning": meaning}
    result = supabase.table("roots").insert(root_data).execute()
    return result.data[0]["id"]


def get_word_type_id(pos: str) -> int:
    """Get word type ID from POS."""
    word_type_id = WORD_TYPE_MAPPING.get(pos.lower())
    if word_type_id is None:
        # Default to noun if POS not found
        return WORD_TYPE_MAPPING["noun"]
    return word_type_id


def extract_root_info(word: Dict) -> tuple[str, Optional[str]]:
    """Extract root information from a word."""
    # If root is directly specified, use it
    if word.get("root"):
        return word["root"], word.get("notes")

    # If no root is specified, create one based on the word form
    # For Arabic words, we'll use the word form itself as the root
    # This is a simplification but ensures we meet the not-null constraint
    return word["arabic"], f"Auto-generated root for: {word['english']}"


def generate_word_audio(word: str, filename: str) -> Optional[Dict]:
    """Generate audio file for a single Arabic word using ElevenLabs API and upload to Supabase storage."""
    return _generate_audio_common(word, filename)


def insert_sentence_words(
    sentence_id: int, translation: Dict, article_word_timings: List[Dict] = None
) -> None:
    """Insert words from a sentence with their roots and relationships."""
    word_by_word = translation.get("word_by_word", [])

    for position, word in enumerate(word_by_word):
        # Extract root information
        root_letters, root_meaning = extract_root_info(word)

        # Get or create root
        root_id = get_or_create_root(root_letters, root_meaning)

        # Get word type ID
        word_type_id = get_word_type_id(word.get("pos", "noun"))

        # Generate audio for the individual word - for playback purposes only
        audio_filename = generate_audio_filename()
        audio_result = generate_word_audio(word["arabic"], audio_filename)
        audio_url = None

        if audio_result is not None:
            audio_url = audio_result.get("url")

        # Remove final haraka from word form before saving
        cleaned_word_form = _remove_final_haraka(word["arabic"])

        # Prepare word data
        word_data = {
            "sentence_id": sentence_id,
            "position": position,
            "word_form": cleaned_word_form,  # Use the cleaned word form
            "english": word["english"],
            "word_type_id": word_type_id,
            "root_id": root_id,
            "difficulty_level": 1,  # Default difficulty
            "grammar_note": word.get("notes"),
            "audio_url": audio_url,  # Add the audio URL
        }

        # Insert word
        supabase.table("sentence_words").insert(word_data).execute()


def insert_article_sentences(article_id: int, translations: List[Dict]) -> None:
    """Insert article sentences into the database."""
    # Combine all Arabic text for audio generation
    full_arabic_text = " ".join(t["original"] for t in translations)

    # Generate audio file and get storage URL
    audio_filename = generate_audio_filename()
    audio_result = generate_audio(full_arabic_text, audio_filename)
    storage_url = None
    word_timings = []

    if audio_result is not None:
        storage_url = audio_result.get("url")
        # Get word timings data for later storage in article record
        word_timings = audio_result.get("word_timings", [])

        if word_timings:
            print(f"✅ Got {len(word_timings)} word timings for article audio")
        else:
            print("⚠️ No word timings found for article audio")

    for idx, translation in enumerate(translations):
        # Insert sentence
        sentence_data = {
            "article_id": article_id,
            "position": idx,
            "arabic": translation["original"],
            "english": translation["full_translation"],
        }
        result = supabase.table("article_sentences").insert(sentence_data).execute()
        sentence_id = result.data[0]["id"]

        # Insert words for this sentence
        insert_sentence_words(sentence_id, translation)

    # Update article with storage URL and word timing data if generated successfully
    if storage_url:
        update_data = {"audio_url": storage_url}

        # Store the complete word timing data as JSON in the article record
        if word_timings:
            try:
                update_data["word_timings"] = json.dumps(word_timings)
                print(
                    f"Storing word timings JSON data in article record (id: {article_id})"
                )
                supabase.table("articles").update(update_data).eq(
                    "id", article_id
                ).execute()
            except Exception as e:
                # If word_timings column doesn't exist, just update the audio_url
                if "word_timings" in str(e):
                    print(
                        "Warning: word_timings column not available in articles table."
                    )
                    print(
                        "To add it, run: ALTER TABLE articles ADD COLUMN word_timings JSONB;"
                    )
                    # Still update the audio_url
                    supabase.table("articles").update({"audio_url": storage_url}).eq(
                        "id", article_id
                    ).execute()
                else:
                    # If it's some other error, re-raise
                    raise e
        else:
            # If no word timings, just update audio_url
        supabase.table("articles").update({"audio_url": storage_url}).eq(
            "id", article_id
        ).execute()


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


def process_json_file(file_path: str) -> None:
    """Process the JSON file and insert data into Supabase."""
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Validate data before processing
    validate_article_data(data)

    # Generate content hash for idempotency
    content_hash = generate_content_hash(data)

    # Check if article already exists
    existing_article_id, existing_audio_url = check_article_exists(content_hash)

    if existing_article_id:
        print(f"Article already exists with ID: {existing_article_id}")
        # If article exists but has no audio, generate it
        if not existing_audio_url:
            print("Generating missing audio for existing article...")
            full_arabic_text = " ".join(t["original"] for t in data["translations"])
            audio_filename = generate_audio_filename()
            storage_url = generate_audio(full_arabic_text, audio_filename)
            if storage_url:
                supabase.table("articles").update({"audio_url": storage_url}).eq(
                    "id", existing_article_id
                ).execute()
                print(f"Added audio to existing article: {storage_url}")

        # Move files to archive even for existing articles
        archive_files(file_path, existing_article_id)
        return existing_article_id

    # Get category and author IDs
    category_id = get_category_id("aqeedah")  # Using aqeedah as default category
    author_id = get_author_id("Ibn Kathir")  # Using Ibn Kathir as default author

    # Prepare article data
    article_data = {
        "title": data["metadata"]["title"],
        "summary": data["metadata"]["summary"],
        "difficulty_level": data["metadata"]["difficulty_level"],
        "category_id": category_id,
        "author_id": author_id,
        "created_at": datetime.now(UTC).isoformat(),
    }

    # Only add content_hash if the column exists
    try:
        article_data["content_hash"] = content_hash
    except Exception as e:
        if "content_hash" not in str(e):
            raise e
        print("Note: content_hash column not available, skipping idempotency check")

    # Insert article
    result = supabase.table("articles").insert(article_data).execute()
    article_id = result.data[0]["id"]

    # Insert sentences and their words
    insert_article_sentences(article_id, data["translations"])

    # Move files to archive with new article ID
    archive_files(file_path, article_id)

    print(f"Successfully inserted article with ID: {article_id}")
    return article_id


def archive_files(json_path: str, article_id: int) -> None:
    """Move input and output files to archive directory with article ID as name."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    archive_dir = os.path.join(script_dir, "archive")
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
        print(f"Moved input file to {archived_input}")

    if os.path.exists(output_file):
        shutil.move(output_file, archived_output)
        print(f"Moved output file to {archived_output}")


def main():
    """Main function to run the script."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    articles_dir = os.path.join(script_dir, "article")

    if not os.path.exists(articles_dir):
        print(f"Error: Could not find articles directory at {articles_dir}")
        return

    # Get all json files in the articles directory
    json_files = []

    # Check for output.json directly in the articles directory
    direct_output_json = os.path.join(articles_dir, "output.json")
    if os.path.exists(direct_output_json):
        json_files.append(direct_output_json)

    # Also check subdirectories
    for item in os.listdir(articles_dir):
        item_path = os.path.join(articles_dir, item)
        if os.path.isdir(item_path):  # If it's a directory
            output_json = os.path.join(item_path, "output.json")
            if os.path.exists(output_json):
                json_files.append(output_json)

    if not json_files:
        print("No article output.json files found in the articles directory")
        return

    success_count = 0
    error_count = 0

    for json_path in json_files:
        try:
            print(f"\nProcessing {json_path}...")
            process_json_file(json_path)
            success_count += 1
            print(f"Successfully processed {json_path}")
        except Exception as e:
            error_count += 1
            print(f"Error processing {json_path}: {str(e)}")

    print("\nProcessing complete!")
    print(f"Successfully processed: {success_count} articles")
    if error_count > 0:
        print(f"Failed to process: {error_count} articles")


if __name__ == "__main__":
    main()
