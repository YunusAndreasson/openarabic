"""Fix oversized sentences (31+ Arabic words) by splitting, retranslating, and reinserting."""

import argparse
import json
import logging
import os
import sys
import tempfile
from typing import Any

# Bootstrap: add translate/ to sys.path so we can import pipeline modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load API keys at startup
try:
    import utils.set_keys  # noqa: F401
except ImportError:
    pass

from utils import load_api_keys

load_api_keys()

from audio import create_article_audio, create_multi_audio_with_delays, generate_speech
from audio.storage import generate_audio_filename
from data.config import (
    ARABIC_VOICE_ID,
    ARABIC_VOICE_SETTINGS,
    BILINGUAL_AUDIO_PAUSE_MS,
    ENGLISH_VOICE_ID,
    ENGLISH_VOICE_SETTINGS,
    MAX_TRANSLATION_BATCH_SIZE,
)
from elevenlabs import VoiceSettings
from pipeline.split_file import _split_long_unit
from pipeline.translate import process_batch
from utils.arabic_text import clean_arabic_text
from utils.config_common import get_storage_url
from utils.database import insert_sentence_words
from utils.storage import get_supabase_client

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BACKUP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backups")
DEFAULT_MIN_WORDS = 31
SUPABASE_PAGE_SIZE = 1000


# ---------------------------------------------------------------------------
# 1. Find oversized sentences
# ---------------------------------------------------------------------------
def find_oversized_sentences(min_words: int) -> list[dict[str, Any]]:
    """Paginated fetch of all article_sentences, filter by word count."""
    supabase = get_supabase_client()
    results: list[dict[str, Any]] = []
    offset = 0

    while True:
        resp = (
            supabase.table("article_sentences")
            .select("id, article_id, position, arabic")
            .order("article_id")
            .order("position")
            .range(offset, offset + SUPABASE_PAGE_SIZE - 1)
            .execute()
        )
        rows = resp.data
        if not rows:
            break

        for row in rows:
            word_count = len(row["arabic"].split())
            if word_count >= min_words:
                results.append(
                    {
                        "id": row["id"],
                        "article_id": row["article_id"],
                        "position": row["position"],
                        "arabic": row["arabic"],
                        "word_count": word_count,
                    }
                )

        if len(rows) < SUPABASE_PAGE_SIZE:
            break
        offset += SUPABASE_PAGE_SIZE

    return results


# ---------------------------------------------------------------------------
# 2. Fetch full article data (for backup + rebuilding)
# ---------------------------------------------------------------------------
def fetch_article_data(article_id: int) -> dict[str, Any]:
    """Fetch article metadata, sentences, and sentence_words."""
    supabase = get_supabase_client()

    article = (
        supabase.table("articles")
        .select("id, title, audio_url, audio_url_bilingual")
        .eq("id", article_id)
        .single()
        .execute()
    ).data

    sentences = (
        supabase.table("article_sentences")
        .select("*")
        .eq("article_id", article_id)
        .order("position")
        .execute()
    ).data

    sentence_ids = [s["id"] for s in sentences]

    # Fetch words for all sentences (batched to avoid URL length limits)
    all_words: list[dict[str, Any]] = []
    for sid in sentence_ids:
        words = (
            supabase.table("sentence_words")
            .select("*")
            .eq("sentence_id", sid)
            .order("position")
            .execute()
        ).data
        all_words.extend(words)

    return {
        "article": article,
        "sentences": sentences,
        "sentence_words": all_words,
    }


# ---------------------------------------------------------------------------
# 3. Save backup
# ---------------------------------------------------------------------------
def save_backup(data: dict[str, Any], article_id: int) -> str:
    os.makedirs(BACKUP_DIR, exist_ok=True)
    path = os.path.join(BACKUP_DIR, f"{article_id}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    logger.info(f"Backup saved: {path}")
    return path


# ---------------------------------------------------------------------------
# 4. Build new sentence list (kept + new from splits)
# ---------------------------------------------------------------------------
def build_new_sentence_list(
    sentences: list[dict[str, Any]],
    all_words: list[dict[str, Any]],
    max_words: int,
) -> list[dict[str, Any]]:
    """Build new sentence list: keep normal sentences, split oversized ones."""
    # Index words by sentence_id
    words_by_sentence: dict[int, list[dict[str, Any]]] = {}
    for w in all_words:
        words_by_sentence.setdefault(w["sentence_id"], []).append(w)

    result: list[dict[str, Any]] = []
    for sent in sentences:
        word_count = len(sent["arabic"].split())
        if word_count <= max_words:
            result.append(
                {
                    "status": "kept",
                    "arabic": sent["arabic"],
                    "english": sent["english"],
                    "audio_url": sent.get("audio_url"),
                    "audio_url_english": sent.get("audio_url_english"),
                    "audio_url_bilingual": sent.get("audio_url_bilingual"),
                    "words": words_by_sentence.get(sent["id"], []),
                }
            )
        else:
            sub_units = _split_long_unit(sent["arabic"], max_words)
            for unit in sub_units:
                result.append(
                    {
                        "status": "new",
                        "arabic": unit,
                    }
                )

    return result


# ---------------------------------------------------------------------------
# 5. Translate new sentences via process_batch()
# ---------------------------------------------------------------------------
def translate_new_sentences(sentence_list: list[dict[str, Any]]) -> None:
    """Translate all 'new' entries in-place using process_batch()."""
    new_entries = [(i, s) for i, s in enumerate(sentence_list) if s["status"] == "new"]
    if not new_entries:
        return

    arabic_texts = [s["arabic"] for _, s in new_entries]
    logger.info(f"Translating {len(arabic_texts)} new sub-units...")

    # All sentences as context
    all_sentences = [s["arabic"] for s in sentence_list]
    contexts = [""] * len(arabic_texts)

    # Build context cache for proper surrounding-sentence context
    from utils.context_cache import ContextCache

    context_cache = ContextCache(all_sentences)

    results = process_batch(
        batch_sentences=arabic_texts,
        start_index=0,
        batch_contexts=contexts,
        all_sentences=all_sentences,
        context_cache=context_cache,
    )

    if len(results) != len(new_entries):
        raise RuntimeError(
            f"Translation returned {len(results)} results for {len(new_entries)} sentences"
        )

    for (idx, _), translation in zip(new_entries, results):
        sentence_list[idx]["english"] = translation.full_translation
        sentence_list[idx]["tashkeel"] = translation.tashkeel
        sentence_list[idx]["translation_dict"] = translation.model_dump()


# ---------------------------------------------------------------------------
# 6. Generate sentence audio for a single new sentence
# ---------------------------------------------------------------------------
def generate_sentence_audio(sentence: dict[str, Any]) -> None:
    """Generate Arabic, English, and bilingual audio for a new sentence."""
    arabic_text = sentence.get("tashkeel") or sentence["arabic"]
    english_text = sentence["english"]

    # Arabic audio
    arabic_filename = generate_audio_filename()
    arabic_response = generate_speech(
        text=arabic_text,
        voice_id=ARABIC_VOICE_ID,
        voice_settings=VoiceSettings(**ARABIC_VOICE_SETTINGS),
    )
    arabic_audio_url = None
    if arabic_response and arabic_response.get("audio"):
        get_supabase_client().storage.from_("audio").upload(
            arabic_filename,
            arabic_response["audio"],
            file_options={"content-type": "audio/mpeg"},
        )
        arabic_audio_url = get_storage_url(arabic_filename)
    if not arabic_audio_url:
        logger.error(f"Failed to generate Arabic audio for: {arabic_text[:60]}...")

    # English audio
    english_filename = generate_audio_filename()
    english_response = generate_speech(
        text=english_text,
        voice_id=ENGLISH_VOICE_ID,
        voice_settings=VoiceSettings(**ENGLISH_VOICE_SETTINGS),
    )
    english_audio_url = None
    if english_response and english_response.get("audio"):
        get_supabase_client().storage.from_("audio").upload(
            english_filename,
            english_response["audio"],
            file_options={"content-type": "audio/mpeg"},
        )
        english_audio_url = get_storage_url(english_filename)
    if not english_audio_url:
        logger.error(f"Failed to generate English audio for: {english_text[:60]}...")

    # Bilingual audio
    bilingual_audio_url = None
    if (
        english_response
        and english_response.get("audio")
        and arabic_response
        and arabic_response.get("audio")
    ):
        bilingual_filename = generate_audio_filename()
        bilingual_audio = create_multi_audio_with_delays(
            [english_response["audio"], arabic_response["audio"]],
            delay_ms=BILINGUAL_AUDIO_PAUSE_MS,
        )
        if bilingual_audio:
            get_supabase_client().storage.from_("audio").upload(
                bilingual_filename,
                bilingual_audio,
                file_options={"content-type": "audio/mpeg"},
            )
            bilingual_audio_url = get_storage_url(bilingual_filename)

    sentence["audio_url"] = arabic_audio_url
    sentence["audio_url_english"] = english_audio_url
    sentence["audio_url_bilingual"] = bilingual_audio_url


# ---------------------------------------------------------------------------
# 7a. Smart article audio rebuild (download existing + generate only new)
# ---------------------------------------------------------------------------
def _download_audio_from_storage(filename: str) -> bytes | None:
    """Download an audio file from Supabase storage by filename."""
    if not filename:
        return None
    try:
        data = get_supabase_client().storage.from_("audio").download(filename)
        return data
    except Exception as e:
        logger.warning(f"Failed to download audio {filename}: {e}")
        return None


def _rebuild_article_audio_smart(
    supabase: Any,
    article_id: int,
    sentence_list: list[dict[str, Any]],
    article_title: str | None,
) -> None:
    """Rebuild article audio by reusing existing sentence audio and only generating new clips."""
    from audio.combiner import create_multi_audio_with_delays
    from audio.storage import generate_audio_filename
    from data.config import BILINGUAL_AUDIO_PAUSE_MS, ENGLISH_VOICE_ID, ENGLISH_VOICE_SETTINGS
    from utils.config_common import get_storage_url

    arabic_segments: list[bytes] = []
    bilingual_segments: list[bytes] = []

    # Add title to bilingual audio
    if article_title and article_title.strip():
        title_response = generate_speech(
            text=article_title.strip(),
            voice_id=ENGLISH_VOICE_ID,
            voice_settings=VoiceSettings(**ENGLISH_VOICE_SETTINGS),
        )
        if title_response and title_response.get("audio"):
            bilingual_segments.append(title_response["audio"])

    kept_count = 0
    downloaded_count = 0
    for sent in sentence_list:
        if sent["status"] == "kept":
            # Download existing audio from storage
            ar_audio = _download_audio_from_storage(sent.get("audio_url"))
            en_audio = _download_audio_from_storage(sent.get("audio_url_english"))
            if ar_audio:
                arabic_segments.append(ar_audio)
                downloaded_count += 1
            if en_audio and ar_audio:
                bilingual_segments.append(en_audio)
                bilingual_segments.append(ar_audio)
            kept_count += 1
        else:
            # New sentence — audio was already generated in generate_sentence_audio()
            ar_audio = _download_audio_from_storage(sent.get("audio_url"))
            en_audio = _download_audio_from_storage(sent.get("audio_url_english"))
            if ar_audio:
                arabic_segments.append(ar_audio)
            if en_audio and ar_audio:
                bilingual_segments.append(en_audio)
                bilingual_segments.append(ar_audio)

    logger.info(
        f"Article audio: {downloaded_count} downloaded from storage, "
        f"{len(arabic_segments) - downloaded_count} newly generated"
    )

    if not arabic_segments:
        logger.error("No audio segments available — skipping article audio rebuild")
        return

    # Combine into article-level tracks
    arabic_combined = create_multi_audio_with_delays(
        arabic_segments, delay_ms=BILINGUAL_AUDIO_PAUSE_MS
    )
    bilingual_combined = create_multi_audio_with_delays(
        bilingual_segments, delay_ms=BILINGUAL_AUDIO_PAUSE_MS
    )

    if not arabic_combined or not bilingual_combined:
        logger.error("Failed to combine article audio segments")
        return

    # Upload
    ar_filename = generate_audio_filename()
    bi_filename = generate_audio_filename()

    supabase.storage.from_("audio").upload(
        ar_filename, arabic_combined, file_options={"content-type": "audio/mpeg"}
    )
    supabase.storage.from_("audio").upload(
        bi_filename, bilingual_combined, file_options={"content-type": "audio/mpeg"}
    )

    supabase.table("articles").update(
        {
            "audio_url": get_storage_url(ar_filename),
            "audio_url_bilingual": get_storage_url(bi_filename),
        }
    ).eq("id", article_id).execute()
    logger.info(f"Updated article {article_id} audio URLs (smart rebuild)")


# ---------------------------------------------------------------------------
# 7b. Reinsert article data
# ---------------------------------------------------------------------------
def reinsert_article(
    article_id: int,
    sentence_list: list[dict[str, Any]],
    article_title: str | None,
) -> None:
    """Delete old sentences/words and reinsert with corrected positions."""
    supabase = get_supabase_client()

    # Get old sentence IDs
    old_sentences = (
        supabase.table("article_sentences")
        .select("id")
        .eq("article_id", article_id)
        .execute()
    ).data
    old_ids = [s["id"] for s in old_sentences]

    # Delete sentence_words for all old sentences
    for sid in old_ids:
        supabase.table("sentence_words").delete().eq("sentence_id", sid).execute()
    logger.info(f"Deleted sentence_words for {len(old_ids)} sentences")

    # Delete old sentences
    supabase.table("article_sentences").delete().eq("article_id", article_id).execute()
    logger.info(f"Deleted {len(old_ids)} old sentences")

    # Verify deletion completed before reinserting (unique constraint on position)
    import time

    for attempt in range(10):
        remaining = (
            supabase.table("article_sentences")
            .select("id", count="exact")
            .eq("article_id", article_id)
            .execute()
        )
        if remaining.count == 0:
            break
        logger.info(f"Waiting for deletion to propagate ({remaining.count} remaining)...")
        time.sleep(1)
    else:
        raise RuntimeError(
            f"Old sentences for article {article_id} not fully deleted after 10 retries"
        )

    # Re-insert sentences with sequential positions
    for pos, sent in enumerate(sentence_list):
        cleaned_arabic = clean_arabic_text(sent["arabic"])
        sentence_data = {
            "article_id": article_id,
            "position": pos,
            "arabic": cleaned_arabic,
            "english": sent["english"],
            "audio_url": sent.get("audio_url"),
            "audio_url_english": sent.get("audio_url_english"),
            "audio_url_bilingual": sent.get("audio_url_bilingual"),
        }

        result = supabase.table("article_sentences").insert(sentence_data).execute()
        new_sentence_id = result.data[0]["id"]

        if sent["status"] == "kept" and sent.get("words"):
            # Re-insert backed up words with new sentence_id
            for word in sent["words"]:
                word_data = {
                    k: v
                    for k, v in word.items()
                    if k not in ("id", "sentence_id", "created_at", "updated_at")
                }
                word_data["sentence_id"] = new_sentence_id
                supabase.table("sentence_words").insert(word_data).execute()
        elif sent["status"] == "new" and sent.get("translation_dict"):
            # Insert words from translation pipeline output
            insert_sentence_words(new_sentence_id, sent["translation_dict"])

    logger.info(f"Inserted {len(sentence_list)} sentences for article {article_id}")

    # Rebuild article-level audio by downloading existing sentence audio
    # and only generating for new sentences (avoids re-generating everything)
    _rebuild_article_audio_smart(supabase, article_id, sentence_list, article_title)


# ---------------------------------------------------------------------------
# 8. Process a single article end-to-end
# ---------------------------------------------------------------------------
def process_article(article_id: int, max_words: int) -> None:
    """Full fix pipeline for one article."""
    logger.info(f"\n{'='*60}")
    logger.info(f"Processing article {article_id}")
    logger.info(f"{'='*60}")

    # Fetch and backup
    data = fetch_article_data(article_id)
    save_backup(data, article_id)
    article_title = data["article"].get("title")

    # Build new sentence list
    sentence_list = build_new_sentence_list(
        data["sentences"], data["sentence_words"], max_words
    )

    new_count = sum(1 for s in sentence_list if s["status"] == "new")
    kept_count = sum(1 for s in sentence_list if s["status"] == "kept")
    logger.info(
        f"Sentence plan: {kept_count} kept, {new_count} new "
        f"(was {len(data['sentences'])} → now {len(sentence_list)})"
    )

    if new_count == 0:
        logger.info("No new sentences needed — skipping")
        return

    # Translate new sub-units
    translate_new_sentences(sentence_list)

    # Generate audio for new sentences
    for sent in sentence_list:
        if sent["status"] == "new":
            logger.info(f"Generating audio for: {sent['arabic'][:60]}...")
            generate_sentence_audio(sent)

    # Delete old data and reinsert
    reinsert_article(article_id, sentence_list, article_title)
    logger.info(f"Article {article_id} complete!")


# ---------------------------------------------------------------------------
# 9. Main with argparse
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fix oversized sentences (31+ Arabic words)"
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Execute changes (default is dry-run)",
    )
    parser.add_argument(
        "--article-id",
        type=int,
        default=None,
        help="Process only this article ID",
    )
    parser.add_argument(
        "--min-words",
        type=int,
        default=DEFAULT_MIN_WORDS,
        help=f"Word count threshold (default: {DEFAULT_MIN_WORDS})",
    )
    args = parser.parse_args()

    oversized = find_oversized_sentences(args.min_words)
    if not oversized:
        print(f"\nNo sentences with {args.min_words}+ words found. Nothing to do.")
        return

    # Group by article
    by_article: dict[int, list[dict[str, Any]]] = {}
    for row in oversized:
        by_article.setdefault(row["article_id"], []).append(row)

    # Filter to single article if requested
    if args.article_id is not None:
        if args.article_id not in by_article:
            print(f"\nArticle {args.article_id} has no oversized sentences.")
            return
        by_article = {args.article_id: by_article[args.article_id]}

    # Display summary
    total = sum(len(v) for v in by_article.values())
    print(f"\nFound {total} oversized sentences across {len(by_article)} articles:\n")

    for aid, rows in sorted(by_article.items()):
        # Fetch title for display
        try:
            title_resp = (
                get_supabase_client()
                .table("articles")
                .select("title")
                .eq("id", aid)
                .single()
                .execute()
            )
            title = title_resp.data.get("title", "Unknown")
        except Exception:
            title = "Unknown"

        print(f'Article {aid}: "{title}" ({len(rows)} oversized)')
        for row in rows:
            splits = _split_long_unit(row["arabic"], args.min_words)
            print(
                f"  pos={row['position']}  {row['word_count']} words "
                f"→ splits into {len(splits)} units"
            )
        print()

    if not args.apply:
        print("DRY RUN — no changes made. Use --apply to execute.")
        print("Use --article-id N to test on a single article first.")
        return

    # Apply changes
    for aid in sorted(by_article.keys()):
        try:
            process_article(aid, args.min_words)
        except Exception:
            logger.exception(f"FAILED on article {aid} — skipping")
            continue

    print(f"\nDone! Processed {len(by_article)} articles.")
    print("Re-run without --apply to verify 0 oversized sentences remain.")


if __name__ == "__main__":
    main()
