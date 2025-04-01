import json
from supabase import create_client
from typing import Dict, List, Optional
import os
import shutil
from datetime import datetime, UTC
import uuid
import hashlib
from elevenlabs.client import ElevenLabs
from elevenlabs import VoiceSettings

# Execute set_keys.py to set environment variables
exec(open("set_keys.py").read())

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


def _generate_audio_common(text: str, filename: str) -> Optional[str]:
    """Common function for generating audio files using ElevenLabs API."""
    try:
        # Use the multilingual v2 model which has good support for Arabic
        audio_stream = eleven_labs.text_to_speech.convert(
            text=text,
            voice_id="pqHfZKP75CvOlQylNhV4",  # Default Arabic voice
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
            voice_settings=VoiceSettings(
                stability=0.8,
                similarity_boost=0.9,
                style=0.0,
                use_speaker_boost=True,
                speed=0.9,
            ),
        )

        # Save the audio file temporarily
        temp_audio_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "audio", filename
        )
        os.makedirs(os.path.dirname(temp_audio_path), exist_ok=True)

        # Collect all audio data
        audio_data = b""
        for chunk in audio_stream:
            if isinstance(chunk, bytes):
                audio_data += chunk

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
        return storage_url

    except Exception as e:
        print(f"Error generating/uploading audio: {str(e)}")
        return None


def generate_audio(text: str, filename: str) -> Optional[str]:
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


def generate_word_audio(word: str, filename: str) -> Optional[str]:
    """Generate audio file for a single Arabic word using ElevenLabs API and upload to Supabase storage."""
    return _generate_audio_common(word, filename)


def insert_sentence_words(sentence_id: int, translation: Dict) -> None:
    """Insert words from a sentence with their roots and relationships."""
    word_by_word = translation.get("word_by_word", [])

    for position, word in enumerate(word_by_word):
        # Extract root information
        root_letters, root_meaning = extract_root_info(word)

        # Get or create root
        root_id = get_or_create_root(root_letters, root_meaning)

        # Get word type ID
        word_type_id = get_word_type_id(word.get("pos", "noun"))

        # Generate audio for the individual word
        audio_filename = generate_audio_filename()
        audio_url = generate_word_audio(word["arabic"], audio_filename)

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
    storage_url = generate_audio(full_arabic_text, audio_filename)

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

    # Update article with storage URL if generated successfully
    if storage_url:
        supabase.table("articles").update({"audio_url": storage_url}).eq(
            "id", article_id
        ).execute()


def process_json_file(file_path: str) -> None:
    """Process the JSON file and insert data into Supabase."""
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

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
