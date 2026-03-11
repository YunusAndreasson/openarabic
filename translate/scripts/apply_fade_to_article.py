#!/usr/bin/env python3
"""Apply fade-out to existing sentence audio without regenerating from ElevenLabs.

Downloads each sentence's Arabic and English audio from storage, applies a fade_out
to remove the end-of-clip glitch, re-uploads, then recombines article-level audio.
No ElevenLabs API calls.

Usage:
    uv run scripts/apply_fade_to_article.py 529
"""

import io
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import utils.set_keys  # noqa: F401, E402

from audio.combiner import create_multi_audio_with_delays  # noqa: E402
from audio.storage import generate_audio_filename  # noqa: E402
from data.config import BILINGUAL_AUDIO_PAUSE_MS  # noqa: E402
from utils.config_common import get_storage_url  # noqa: E402
from utils.responses_api import load_api_keys  # noqa: E402
from utils.storage import get_supabase_client  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

FADE_MS = 60


def _download(filename: str) -> bytes | None:
    try:
        return get_supabase_client().storage.from_("audio").download(filename)
    except Exception as e:
        logger.warning(f"Failed to download {filename}: {e}")
        return None


def _upload(data: bytes) -> str:
    filename = generate_audio_filename()
    get_supabase_client().storage.from_("audio").upload(
        filename, data, file_options={"content-type": "audio/mpeg"}
    )
    return filename


def apply_fade(audio_data: bytes) -> bytes:
    from pydub import AudioSegment

    segment = AudioSegment.from_mp3(io.BytesIO(audio_data))
    segment = segment.fade_out(FADE_MS)
    buf = io.BytesIO()
    segment.export(buf, format="mp3", bitrate="128k")
    return buf.getvalue()


def process_article(article_id: int) -> None:
    supabase = get_supabase_client()

    sentences = (
        supabase.table("article_sentences")
        .select("id, position, audio_url, audio_url_english")
        .eq("article_id", article_id)
        .order("position")
        .execute()
        .data
    )

    if not sentences:
        logger.error(f"No sentences found for article {article_id}")
        return

    logger.info(f"Processing {len(sentences)} sentences for article {article_id}")

    arabic_segments: list[bytes] = []
    bilingual_segments: list[bytes] = []

    for s in sentences:
        pos = s["position"]
        ar_file = s.get("audio_url")
        en_file = s.get("audio_url_english")

        if not ar_file:
            logger.warning(f"[pos {pos}] No Arabic audio URL, skipping")
            continue

        # Download and fade Arabic
        ar_raw = _download(ar_file)
        if not ar_raw:
            logger.warning(f"[pos {pos}] Failed to download Arabic audio, skipping")
            continue

        ar_faded = apply_fade(ar_raw)
        ar_filename = _upload(ar_faded)
        ar_url = get_storage_url(ar_filename)
        arabic_segments.append(ar_faded)

        update: dict = {"audio_url": ar_url}

        # Download and fade English
        en_faded = None
        if en_file:
            en_raw = _download(en_file)
            if en_raw:
                en_faded = apply_fade(en_raw)
                en_filename = _upload(en_faded)
                update["audio_url_english"] = get_storage_url(en_filename)
            else:
                logger.warning(f"[pos {pos}] Failed to download English audio")

        # Rebuild bilingual (English + pause + Arabic)
        if en_faded:
            bilingual = create_multi_audio_with_delays(
                [en_faded, ar_faded], delay_ms=BILINGUAL_AUDIO_PAUSE_MS
            )
            if bilingual:
                bi_filename = _upload(bilingual)
                update["audio_url_bilingual"] = get_storage_url(bi_filename)
                bilingual_segments.append(en_faded)
                bilingual_segments.append(ar_faded)
        else:
            bilingual_segments.append(ar_faded)

        supabase.table("article_sentences").update(update).eq("id", s["id"]).execute()
        logger.info(f"[pos {pos}] Done")

    # Rebuild article-level audio
    if not arabic_segments:
        logger.error("No Arabic segments collected, skipping article audio")
        return

    logger.info("Rebuilding article-level audio...")
    arabic_combined = create_multi_audio_with_delays(arabic_segments, delay_ms=BILINGUAL_AUDIO_PAUSE_MS)
    bilingual_combined = create_multi_audio_with_delays(bilingual_segments, delay_ms=BILINGUAL_AUDIO_PAUSE_MS)

    ar_filename = _upload(arabic_combined)
    bi_filename = _upload(bilingual_combined)

    supabase.table("articles").update(
        {
            "audio_url": get_storage_url(ar_filename),
            "audio_url_bilingual": get_storage_url(bi_filename),
        }
    ).eq("id", article_id).execute()

    logger.info(f"Article {article_id} audio updated. Arabic: {len(arabic_combined)} bytes, Bilingual: {len(bilingual_combined)} bytes")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: uv run scripts/apply_fade_to_article.py <article_id>")
        sys.exit(1)

    load_api_keys()
    process_article(int(sys.argv[1]))
    print("Done!")
