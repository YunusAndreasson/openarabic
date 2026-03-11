#!/usr/bin/env python3
"""Recombine article-level audio from existing sentence audio in storage.

Downloads existing sentence audio from Supabase — no ElevenLabs calls except for
the article title intro in the bilingual version.

Usage:
    uv run scripts/recombine_article_audio.py 530
"""

import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import utils.set_keys  # noqa: F401, E402

from scripts.regenerate_audio import regenerate_article_audio  # noqa: E402
from utils.responses_api import load_api_keys  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: uv run scripts/recombine_article_audio.py <article_id>")
        sys.exit(1)

    load_api_keys()
    article_id = int(sys.argv[1])
    print(f"Recombining audio for article {article_id}...")
    regenerate_article_audio(article_id)
    print("Done!")
