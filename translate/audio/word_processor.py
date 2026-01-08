"""Word audio processing for the translation pipeline."""

import logging
import os
from typing import Any

from audio.word_audio import generate_arabic_word_audio
from data.config import AUDIO_TEMP_DIR
from utils.storage import get_supabase_client

logger = logging.getLogger(__name__)

os.makedirs(AUDIO_TEMP_DIR, exist_ok=True)


def generate_word_audio_with_google_tts(
    word_data_list: list[dict[str, Any]],
    sentence_id: int,
    output_dir: str,
) -> list[dict[str, Any]]:
    """
    Generate individual word audio using Google Cloud TTS.

    Args:
        word_data_list: List of word data dictionaries with 'word_form', 'position', etc.
        sentence_id: The sentence ID for generating unique filenames
        output_dir: Directory to save temporary audio files

    Returns:
        List of dictionaries with word data including audio URLs
    """
    if not word_data_list:
        logger.warning("No word data provided for audio generation")
        return []

    os.makedirs(output_dir, exist_ok=True)
    word_audio_results = []

    # Generate word audio clips using Google TTS

    for word_data in word_data_list:
        word_form = word_data.get("word_form", "").strip()
        position = word_data.get("position", 0)

        if not word_form:
            logger.warning(f"Empty word form for position {position}, skipping")
            continue

        # Create filename for this word
        filename = f"w{sentence_id}_{position:02d}.mp3"

        # Generate audio for word
        try:
            # Generate audio using Google TTS (similar to study words)
            result = generate_arabic_word_audio(word_form, filename)

            if result and result.get("url"):
                word_audio_results.append(
                    {
                        "audio_filename": filename,
                        "audio_url": result["url"],
                        "position": position,
                        "word_form": word_form,
                        "sentence_id": sentence_id,
                        "cached": result.get("cached", False),
                    }
                )

                # Word audio generated successfully

            else:
                logger.warning(
                    f"Failed to generate audio for word '{word_form}' at position {position}"
                )

        except Exception as e:
            # Check if it's a content policy violation
            error_msg = str(e).lower()
            if "content_against_policy" in error_msg or "terms of service" in error_msg:
                logger.warning(
                    f"Skipping word '{word_form}' due to content policy violation"
                )
            else:
                logger.warning(
                    f"Error generating audio for word '{word_form}' at position {position}: {e}"
                )
            continue

    # Word audio generation completed
    return word_audio_results


def process_word_audio_for_latest_articles() -> bool:
    """
    Process word audio for the most recently inserted articles.
    This is used in the full pipeline to automatically process word audio after insertion.
    """
    # Find latest articles for word audio processing

    try:
        # Query for the latest articles (most recently inserted)
        import os

        from dotenv import load_dotenv
        from supabase import create_client

        load_dotenv()

        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        if not url or not key:
            logger.error("Missing SUPABASE_URL or SUPABASE_KEY environment variables")
            return False
        supabase = create_client(url, key)

        # Get the 3 most recent articles that don't have word audio processed yet
        result = (
            supabase.table("articles")
            .select("id, title")
            .order("created_at", desc=True)
            .limit(3)
            .execute()
        )

        if not result.data:
            logger.warning("No articles found for word audio processing")
            return False

        # Process word audio for latest articles
        articles = result.data
        success_count = 0
        for article in articles:
            if not isinstance(article, dict):
                continue
            article_id = article["id"]
            _article_title = article["title"]  # Unused but kept for potential future use

            # Process word audio for article

            try:
                import tempfile

                with tempfile.TemporaryDirectory() as temp_dir:
                    success = process_word_audio_for_article(
                        article_id=int(article_id), output_dir=temp_dir
                    )

                    if success:
                        # Article word audio processing completed
                        success_count += 1
                    else:
                        logger.warning(
                            f"Failed to process word audio for article {article_id}"
                        )

            except Exception as e:
                logger.error(
                    f"Error processing word audio for article {article_id}: {e}"
                )

        # Word audio processing batch completed
        return success_count > 0

    except Exception as e:
        logger.error(f"Failed to process word audio for latest articles: {e}")
        return False


def process_word_audio_for_sentences(
    sentences: list[dict],
    _arabic_audio_path: str,
    output_dir: str,
    sentence_id_offset: int = 0,
) -> dict[int, list[dict[str, Any]]]:
    """
    Process word-level audio for multiple sentences.

    Args:
        sentences: List of sentence data with word timestamps
        _arabic_audio_path: Path to the Arabic sentence audio file (unused, kept for API compatibility)
        output_dir: Directory to save word audio clips
        sentence_id_offset: Offset for sentence IDs in logging

    Returns:
        Dictionary mapping sentence indices to word audio data
    """
    word_audio_by_sentence = {}

    for sentence_idx, sentence in enumerate(sentences):
        sentence_id = sentence.get("id") or (sentence_idx + sentence_id_offset + 1)
        word_data_list = sentence.get("words", [])

        if not word_data_list:
            # No word data for sentence
            continue

        logger.info(
            f"Processing word audio for sentence {sentence_id} with {len(word_data_list)} words"
        )

        # Generate word audio using Google TTS
        word_audio_data = generate_word_audio_with_google_tts(
            word_data_list=word_data_list,
            sentence_id=sentence_id,
            output_dir=output_dir,
        )

        if word_audio_data:
            # Word audio is already uploaded by Google TTS, use data directly
            # Store by sentence index
            word_audio_by_sentence[sentence_idx] = word_audio_data

            logger.info(
                f"Processed {len(word_audio_data)} word audio clips for sentence {sentence_id}"
            )
        else:
            logger.warning(f"No word audio clips generated for sentence {sentence_id}")

    return word_audio_by_sentence


def process_word_audio_for_article(article_id: int, output_dir: str) -> bool:
    """
    Process word-level audio for all sentences in an article.

    This function should be called after the main pipeline has completed
    and sentence audio files are available.

    Args:
        article_id: The article ID to process
        output_dir: Directory to save temporary word audio files

    Returns:
        True if processing was successful
    """
    try:
        client = get_supabase_client()
        os.makedirs(output_dir, exist_ok=True)

        # Process word audio for article

        # Get article sentences with word timestamps
        sentences_result = (
            client.table("article_sentences")
            .select("id, arabic, audio_url")
            .eq("article_id", article_id)
            .execute()
        )

        if not sentences_result.data:
            logger.warning(f"No sentences found for article {article_id}")
            return False

        _total_sentences = len(sentences_result.data)
        processed_sentences = 0

        for sentence in sentences_result.data:
            sentence_id = sentence["id"]

            # Get words for this sentence
            words_result = (
                client.table("sentence_words")
                .select("id, position, word_form")
                .eq("sentence_id", sentence_id)
                .order("position")
                .execute()
            )

            if not words_result.data:
                # No words found for sentence
                continue

            word_data_list = []
            for word in words_result.data:
                word_data_list.append(
                    {
                        "word_form": word["word_form"],
                        "word_id": word["id"],
                        "position": word["position"],
                    }
                )

            if not word_data_list:
                # No valid word data for sentence
                continue

            # Generate word audio using Google TTS (no need to download sentence audio)
            word_audio_data = generate_word_audio_with_google_tts(
                word_data_list=word_data_list,
                sentence_id=sentence_id,
                output_dir=output_dir,
            )

            if word_audio_data:
                # Word audio is already uploaded by Google TTS, use data directly
                uploaded_word_data = word_audio_data

                # Update database with word audio URLs
                word_audio_urls = []
                for uploaded_word in uploaded_word_data:
                    audio_url = uploaded_word.get("audio_url")
                    position = uploaded_word.get("position")
                    # Process uploaded word
                    if audio_url and position is not None:
                        word_audio_urls.append((position, audio_url))
                        # Added word audio URL for update
                    else:
                        logger.warning(
                            f"Missing audio_url or position for word: position={position}, audio_url={audio_url}"
                        )

                # Update words in database
                for position, audio_url in word_audio_urls:
                    try:
                        # Update word audio URL in database
                        result = (
                            client.table("sentence_words")
                            .update({"audio_url": audio_url})
                            .eq("sentence_id", sentence_id)
                            .eq("position", position)
                            .execute()
                        )

                        # Check if the update actually affected any rows
                        if result.data:
                            # Successfully updated word with audio URL
                            pass
                        else:
                            logger.warning(
                                f"No words were updated for sentence {sentence_id}, position {position}"
                            )

                    except Exception as e:
                        logger.error(
                            f"Failed to update word audio URL for position {position}: {e}"
                        )

                # Updated word audio URLs for sentence
                processed_sentences += 1

            # No cleanup needed for Google TTS approach (no temporary sentence audio files)

            # Word audio processed for article
        return processed_sentences > 0

    except Exception as e:
        logger.error(f"Error processing word audio for article {article_id}: {e}")
        return False


__all__ = [
    "generate_word_audio_with_google_tts",
    "process_word_audio_for_article",
    "process_word_audio_for_latest_articles",
    "process_word_audio_for_sentences",
]
