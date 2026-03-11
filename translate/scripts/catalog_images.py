#!/usr/bin/env python3
"""
Catalog all Supabase storage images using Claude CLI vision.

Usage:
    # Test with 5 random images first:
    python scripts/catalog_images.py --test

    # Run on all images:
    python scripts/catalog_images.py

    # Run on a specific directory:
    python scripts/catalog_images.py --image-dir /path/to/images

Requires: claude CLI to be installed and authenticated (your subscription).
Run from the translate/ directory: cd translate && python scripts/catalog_images.py
"""

import argparse
import base64
import json
import random
import sys
from pathlib import Path

# Allow imports from the translate/ project root
sys.path.insert(0, str(Path(__file__).parent.parent))

from data.config import MODEL_OTHER
from openai import OpenAI

# ── Config ──────────────────────────────────────────────────────────────────

IMAGE_DIR = Path("/tmp/supabase-images")
OUTPUT_FILE = Path(__file__).parent.parent / "data" / "image_catalog.json"
SUPPORTED_EXTENSIONS = {".webp", ".jpg", ".jpeg", ".png"}

PROMPT = """You are cataloging images for an Islamic education Arabic-learning app called OpenArabic.
The app publishes articles in these categories:
  - aqeedah: Islamic creed and theology (faith, divine attributes, afterlife, angels)
  - fiqh: Islamic jurisprudence and law (prayer, fasting, charity, marriage, trade)
  - hadith: Prophetic traditions and narrations
  - quran: Quran study and recitation
  - seerah: Biography of the Prophet Muhammad (battles, companions, early Islam, Mecca/Medina)
  - ihsan: Spiritual excellence (patience, sincerity, gratitude, repentance, inner struggle)
  - tafsir: Quran interpretation and exegesis

Analyze this image and return ONLY a valid JSON object — no markdown, no code fences, no extra text.

IMPORTANT SAFETY CHECK — Islamic aqeedah requires that we never depict prophets, angels, or Allah.
You must flag any image that contains or strongly implies human figures, faces, or silhouettes,
so we can avoid accidentally pairing such images with articles about prophets or divine beings.

Fields:
  "description": One sentence describing what is depicted in the image.
  "tags": Array of 3-8 specific visual tags (e.g. "mosque", "desert", "calligraphy", "open-book",
           "mountains", "night-sky", "ocean", "old-architecture", "lantern", "minaret",
           "dome", "market", "garden", "manuscript", "candle", "prayer-rug", "forest",
           "sunset", "river", "cave", "crowd", "solitary-figure", "arabesque", "geometric-pattern").
  "mood": One of: serene, majestic, scholarly, warm, contemplative, dramatic, vibrant, mystical, peaceful, solemn.
  "suitable_categories": Array of 1-3 categories from [aqeedah, fiqh, hadith, quran, seerah, ihsan, tafsir]
                         this image pairs best with, based on its visual content and feel.
  "suitable_topics": Array of 3-6 topic keywords this image would suit. Choose from or add to:
                     patience, prayer, pilgrimage, battle, family, death, paradise, worship,
                     knowledge, divine-attributes, prophets, companions, repentance, charity,
                     fasting, marriage, trade, travel, revelation, judgment-day, creation,
                     nature, solitude, community, remembrance, gratitude, asceticism, sin.
  "contains_human_figures": true if the image contains any human faces, figures, or silhouettes
                             (even partial, stylized, or in crowd scenes) — false otherwise.
  "aqeedah_risk": One of: "safe", "caution", "avoid".
                  "safe" = no human figures, no depictions that could imply prophets or divine beings.
                  "caution" = anonymous crowd or distant/silhouetted figures; usable but review before
                              pairing with aqeedah/prophets/divine-attributes topics.
                  "avoid" = clear human face or figure that should not be used for prophet/angel topics."""


# ── Core logic ───────────────────────────────────────────────────────────────

def load_catalog(output_file: Path) -> dict:
    if output_file.exists():
        try:
            return json.loads(output_file.read_text())
        except json.JSONDecodeError:
            print(f"Warning: could not parse existing catalog, starting fresh.", file=sys.stderr)
    return {}


def save_catalog(catalog: dict, output_file: Path) -> None:
    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(json.dumps(catalog, indent=2, ensure_ascii=False))


MEDIA_TYPES = {
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
}

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        # Load keys from set_keys.py if present
        set_keys_path = Path(__file__).parent.parent / "utils" / "set_keys.py"
        if set_keys_path.exists():
            import importlib.util

            spec = importlib.util.spec_from_file_location("set_keys", set_keys_path)
            if spec and spec.loader:
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
        _client = OpenAI()
    return _client


def analyze_image(image_path: Path) -> dict | None:
    """Call OpenAI vision to analyze an image. Returns parsed JSON or None on failure."""
    try:
        image_data = base64.b64encode(image_path.read_bytes()).decode("utf-8")
        media_type = MEDIA_TYPES.get(image_path.suffix.lower(), "image/jpeg")

        response = _get_client().chat.completions.create(
            model=MODEL_OTHER,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{media_type};base64,{image_data}"},
                        },
                        {"type": "text", "text": PROMPT},
                    ],
                }
            ],
            max_completion_tokens=2000,
        )

        raw = (response.choices[0].message.content or "").strip()

        # Strip markdown code fences if model wrapped the JSON
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        return json.loads(raw)

    except json.JSONDecodeError as e:
        print(f"  Bad JSON for {image_path.name}: {e}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"  Error analyzing {image_path.name}: {e}", file=sys.stderr)
        return None


# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Catalog images using Claude vision")
    parser.add_argument(
        "--test",
        action="store_true",
        help="Process only 5 random images to validate output quality",
    )
    parser.add_argument(
        "--image-dir",
        type=Path,
        default=IMAGE_DIR,
        help=f"Directory containing images (default: {IMAGE_DIR})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_FILE,
        help=f"Output JSON file (default: {OUTPUT_FILE})",
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        default=True,
        help="Skip images already in the catalog (default: true)",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Re-analyze images already in the catalog",
    )
    args = parser.parse_args()

    # Collect images
    image_dir: Path = args.image_dir
    if not image_dir.exists():
        print(f"Image directory not found: {image_dir}", file=sys.stderr)
        sys.exit(1)

    all_images = [
        p for p in sorted(image_dir.iterdir())
        if p.suffix.lower() in SUPPORTED_EXTENSIONS
    ]

    if not all_images:
        print(f"No images found in {image_dir}", file=sys.stderr)
        sys.exit(1)

    # Load existing catalog
    catalog = load_catalog(args.output)

    # Filter out already-cataloged images unless --overwrite
    if not args.overwrite:
        pending = [p for p in all_images if p.name not in catalog]
    else:
        pending = all_images

    if not pending:
        print(f"All {len(all_images)} images already in catalog. Use --overwrite to re-analyze.")
        sys.exit(0)

    # In test mode, pick 5 random images
    if args.test:
        pending = random.sample(pending, min(5, len(pending)))
        print(f"TEST MODE — analyzing {len(pending)} random images")
        print(f"Images: {[p.name for p in pending]}\n")
    else:
        print(f"Analyzing {len(pending)} images ({len(all_images) - len(pending)} already done)...")

    # Process images sequentially (claude CLI handles its own rate limiting)
    success = 0
    failed = []

    for i, image_path in enumerate(pending, 1):
        prefix = f"[{i}/{len(pending)}]"
        print(f"{prefix} {image_path.name}... ", end="", flush=True)

        data = analyze_image(image_path)
        if data is None:
            print("FAILED")
            failed.append(image_path.name)
            continue

        catalog[image_path.name] = data
        save_catalog(catalog, args.output)  # Save after each image so progress isn't lost
        success += 1

        mood = data.get("mood", "?")
        cats = ", ".join(data.get("suitable_categories", []))
        print(f"OK  [{mood}] [{cats}]")

        if args.test:
            print(f"  description: {data.get('description', '')}")
            print(f"  tags: {data.get('tags', [])}")
            print(f"  topics: {data.get('suitable_topics', [])}")
            print(f"  human figures: {data.get('contains_human_figures')}  aqeedah_risk: {data.get('aqeedah_risk', '?')}")
            print()

    # Summary
    print(f"\n{'─' * 50}")
    print(f"Done: {success} analyzed, {len(failed)} failed")
    print(f"Catalog: {len(catalog)} total images → {args.output}")
    if failed:
        print(f"Failed: {failed}")


if __name__ == "__main__":
    main()
