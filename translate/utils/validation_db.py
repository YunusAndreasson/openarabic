"""
Database utilities for word translation validation.

Handles fetching words from database and saving validation improvements.
"""

import logging
from typing import Any

from utils.storage_utils import get_supabase_client

logger = logging.getLogger(__name__)


def fetch_article_words_for_validation(article_id: int) -> list[dict[str, Any]]:
    """Fetch all words from an article grouped by sentence for validation.

    Args:
        article_id: ID of the article to fetch words from

    Returns:
        list: List of sentence dictionaries, each containing words_data list

    Raises:
        ValueError: If article not found or has no words
    """
    try:
        client = get_supabase_client()

        # Query article_sentences first
        sentences_response = (
            client.table("article_sentences")
            .select("id, arabic, english, position")
            .eq("article_id", article_id)
            .order("position", desc=False)
            .execute()
        )

        if not sentences_response.data:
            raise ValueError(f"No sentences found for article {article_id}")

        # Now fetch all words for these sentences
        sentence_ids = [s["id"] for s in sentences_response.data]

        words_response = (
            client.table("sentence_words")
            .select("id, word_form, english, grammar_note, position, sentence_id")
            .in_("sentence_id", sentence_ids)
            .order("sentence_id", desc=False)
            .order("position", desc=False)
            .execute()
        )

        if not words_response.data:
            raise ValueError(f"No words found for article {article_id}")

        # Create a mapping of sentence_id to sentence data
        sentence_map = {s["id"]: s for s in sentences_response.data}

        # Group words by sentence
        sentences_with_words = []
        for sentence_data in sentences_response.data:
            sentence_id = sentence_data["id"]

            # Get words for this sentence
            sentence_words = [
                w for w in words_response.data if w["sentence_id"] == sentence_id
            ]

            # Transform to validation request format
            words_data = []
            for word in sentence_words:
                word_dict = {
                    "word_id": word["id"],
                    "arabic_word": word["word_form"],
                    "current_english": word["english"],
                    "current_grammar_note": word.get("grammar_note"),
                    "sentence_arabic": sentence_data["arabic"],
                    "sentence_english": sentence_data["english"],
                }
                words_data.append(word_dict)

            if words_data:  # Only include sentences that have words
                sentences_with_words.append({
                    "sentence_id": sentence_id,
                    "sentence_arabic": sentence_data["arabic"],
                    "sentence_english": sentence_data["english"],
                    "words_data": words_data,
                })

        total_words = sum(len(s["words_data"]) for s in sentences_with_words)
        logger.info(
            f"Fetched {len(sentences_with_words)} sentences with {total_words} total words from article {article_id}"
        )
        return sentences_with_words

    except Exception as e:
        logger.error(f"Failed to fetch words for article {article_id}: {e}")
        raise


def save_validation_improvements(
    validations: list[dict[str, Any]], words_data: list[dict[str, Any]]
) -> tuple[int, int]:
    """Save validation results to translation_improvements table.

    Args:
        validations: List of validation result dictionaries
        words_data: Original words data with current english/grammar_note

    Returns:
        tuple: (count of saved records, count of skipped records)

    Raises:
        Exception: If database insertion fails
    """
    try:
        client = get_supabase_client()

        # Create lookup map for current values
        word_map = {w["word_id"]: w for w in words_data}

        records_to_insert = []
        skipped_count = 0

        for validation in validations:
            word_id = validation["word_id"]
            current_word = word_map.get(word_id, {})

            # Get suggested values (use current if DeepSeek returns None for correct words)
            suggested_english = (
                validation.get("suggested_english")
                or current_word.get("current_english")
                or ""
            )
            suggested_note = validation.get("suggested_grammar_note") or current_word.get(
                "current_grammar_note"
            )

            # Get current values for comparison
            current_english = current_word.get("current_english", "")
            current_note = current_word.get("current_grammar_note")

            # Only save if there's a real difference
            english_differs = suggested_english != current_english
            grammar_differs = suggested_note != current_note

            if not english_differs and not grammar_differs:
                # No improvement needed - skip this word
                skipped_count += 1
                continue

            # Prepare record for insertion
            record = {
                "sentence_word_id": word_id,
                "suggested_english": suggested_english,
                "suggested_grammar_note": suggested_note,
                "status": "pending",
            }

            # Add validation reasoning to reviewer_notes if available
            if "reasoning" in validation:
                record["reviewer_notes"] = validation["reasoning"]

            records_to_insert.append(record)

        if not records_to_insert:
            logger.info(f"No improvements needed - all {skipped_count} words are correct")
            return 0, skipped_count

        # Bulk insert into translation_improvements
        response = client.table("translation_improvements").insert(
            records_to_insert
        ).execute()

        saved_count = len(response.data) if response.data else 0

        logger.info(
            f"Saved {saved_count} improvements ({skipped_count} words already correct)"
        )
        return saved_count, skipped_count

    except Exception as e:
        logger.error(f"Failed to save validation improvements: {e}")
        raise


def get_all_article_ids() -> list[int]:
    """Get list of all article IDs from database.

    Returns:
        list: List of article IDs

    Raises:
        Exception: If database query fails
    """
    try:
        client = get_supabase_client()

        response = client.table("articles").select("id").execute()

        if not response.data:
            logger.warning("No articles found in database")
            return []

        article_ids = [article["id"] for article in response.data]

        logger.info(f"Found {len(article_ids)} articles in database")
        return article_ids

    except Exception as e:
        logger.error(f"Failed to fetch article IDs: {e}")
        raise


def get_article_title(article_id: int) -> str | None:
    """Get article title for logging purposes.

    Args:
        article_id: ID of the article

    Returns:
        str: Article title or None if not found
    """
    try:
        client = get_supabase_client()

        response = client.table("articles").select("title").eq("id", article_id).execute()

        if response.data and len(response.data) > 0:
            return response.data[0]["title"]

        return None

    except Exception:
        return None


def fetch_roots_for_validation(root_ids: list[int] | None = None) -> list[dict[str, Any]]:
    """Fetch roots with example sentences for validation.

    Args:
        root_ids: Optional list of specific root IDs to fetch. If None, fetches all roots.

    Returns:
        list: List of root dictionaries with example sentences

    Raises:
        ValueError: If no roots found
    """
    try:
        client = get_supabase_client()

        # Fetch roots
        query = client.table("roots").select("id, letters, meaning")
        if root_ids:
            query = query.in_("id", root_ids)

        roots_response = query.execute()

        if not roots_response.data:
            raise ValueError("No roots found in database")

        roots_data = []
        for root in roots_response.data:
            root_id = root["id"]

            # Fetch 3-5 example sentences showing this root in use
            examples_response = (
                client.table("sentence_words")
                .select("word_form, sentence:article_sentences(arabic, english)")
                .eq("root_id", root_id)
                .limit(5)
                .execute()
            )

            # Format examples
            examples = []
            if examples_response.data:
                for example in examples_response.data:
                    if example.get("sentence"):
                        # Handle both list and single object from Supabase
                        sentence = (
                            example["sentence"][0]
                            if isinstance(example["sentence"], list)
                            else example["sentence"]
                        )
                        examples.append({
                            "word_form": example["word_form"],
                            "sentence_arabic": sentence["arabic"],
                            "sentence_english": sentence["english"],
                        })

            root_data = {
                "root_id": root_id,
                "current_letters": root["letters"],
                "current_meaning": root["meaning"],
                "examples": examples,
            }
            roots_data.append(root_data)

        logger.info(f"Fetched {len(roots_data)} roots for validation")
        return roots_data

    except Exception as e:
        logger.error(f"Failed to fetch roots for validation: {e}")
        raise


def save_root_validation_improvements(
    validations: list[dict[str, Any]], roots_data: list[dict[str, Any]]
) -> tuple[int, int]:
    """Save root validation results to root_translation_improvements table.

    Args:
        validations: List of validation result dictionaries
        roots_data: Original roots data with current letters/meaning

    Returns:
        tuple: (count of saved records, count of skipped records)

    Raises:
        Exception: If database insertion fails
    """
    try:
        client = get_supabase_client()

        # Create lookup map for current values
        root_map = {r["root_id"]: r for r in roots_data}

        records_to_insert = []
        skipped_count = 0

        for validation in validations:
            root_id = validation["root_id"]
            current_root = root_map.get(root_id, {})

            # Get suggested values (use current if DeepSeek returns None for correct roots)
            suggested_english = (
                validation.get("suggested_english")
                or current_root.get("current_meaning")
                or ""
            )
            suggested_tashkeel = (
                validation.get("suggested_tashkeel")
                or current_root.get("current_letters")
                or ""
            )

            # Get current values for comparison
            current_english = current_root.get("current_meaning", "")
            current_tashkeel = current_root.get("current_letters", "")

            # Only save if there's a real difference
            english_differs = suggested_english != current_english
            tashkeel_differs = suggested_tashkeel != current_tashkeel

            if not english_differs and not tashkeel_differs:
                # No improvement needed - skip this root
                skipped_count += 1
                continue

            # Prepare record for insertion
            record = {
                "root_id": root_id,
                "suggested_english": suggested_english,
                "suggested_tashkeel": suggested_tashkeel,
                "status": "pending",
            }

            # Add validation reasoning to reviewer_notes if available
            if "reasoning" in validation:
                record["reviewer_notes"] = validation["reasoning"]

            records_to_insert.append(record)

        if not records_to_insert:
            logger.info(f"No improvements needed - all {skipped_count} roots are correct")
            return 0, skipped_count

        # Bulk insert into root_translation_improvements
        response = client.table("root_translation_improvements").insert(
            records_to_insert
        ).execute()

        saved_count = len(response.data) if response.data else 0

        logger.info(
            f"Saved {saved_count} root improvements ({skipped_count} roots already correct)"
        )
        return saved_count, skipped_count

    except Exception as e:
        logger.error(f"Failed to save root validation improvements: {e}")
        raise


def get_all_root_ids() -> list[int]:
    """Get list of all root IDs from database.

    Returns:
        list: List of root IDs

    Raises:
        Exception: If database query fails
    """
    try:
        client = get_supabase_client()

        # Fetch all roots with pagination (Supabase default limit is 1000)
        all_roots = []
        page_size = 1000
        offset = 0

        while True:
            response = (
                client.table("roots")
                .select("id")
                .range(offset, offset + page_size - 1)
                .execute()
            )

            if not response.data:
                break

            all_roots.extend(response.data)

            # If we got less than page_size, we're done
            if len(response.data) < page_size:
                break

            offset += page_size

        if not all_roots:
            logger.warning("No roots found in database")
            return []

        root_ids = [root["id"] for root in all_roots]

        print(f"Found {len(root_ids)} roots in database")
        return root_ids

    except Exception as e:
        logger.error(f"Failed to fetch root IDs: {e}")
        raise
