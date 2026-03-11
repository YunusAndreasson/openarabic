#!/usr/bin/env python3
"""
Fetch high-quality images from Pexels, have GPT vision pick the best candidate
per query, convert the winner to webp, and drop it into data/images/.

Setup:
    Get a free Pexels API key at https://www.pexels.com/api/
    Add to utils/set_keys.py:  os.environ["PEXELS_API_KEY"] = "your_key_here"

Usage:
    # Fetch defaults (fills known catalog gaps), GPT picks best per query
    python scripts/fetch_images.py

    # Custom queries
    python scripts/fetch_images.py --queries "islamic calligraphy" "cave mountain"

    # After fetching, auto-catalog the new images
    python scripts/fetch_images.py --catalog

    # Download more candidates for GPT to choose from (default: 5)
    python scripts/fetch_images.py --candidates 8
"""

import argparse
import importlib.util
import subprocess
import sys
import tempfile
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent.parent))

set_keys_path = Path(__file__).parent.parent / "utils" / "set_keys.py"
if set_keys_path.exists():
    spec = importlib.util.spec_from_file_location("set_keys", set_keys_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

import os  # noqa: E402

from data.config import MODEL_OTHER  # noqa: E402
from openai import OpenAI  # noqa: E402
from utils.config_common import get_supabase_client  # noqa: E402

IMAGE_DIR = Path(__file__).parent.parent / "data" / "images"

# Default searches targeting known catalog gaps
DEFAULT_QUERIES: list[str] = [
    "dark cave rocky entrance mountain",
    "islamic calligraphy arabic script art",
    "al-aqsa mosque jerusalem dome of rock",
    "medina mosque prophet green dome",
    "ancient islamic manuscript parchment",
    "arab market souk lanterns historic street",
    "islamic geometric pattern tile architecture",
    "ancient battle field dust dramatic sky",
    "olive trees ancient stone courtyard",
]

PEXELS_API = "https://api.pexels.com/v1/search"

SELECTION_PROMPT = """\
You are selecting the single best image for an Islamic education app called OpenArabic.
The app publishes scholarly Arabic articles on aqeedah, fiqh, hadith, quran, seerah, ihsan, and tafsir.

The search query was: "{query}"

You are shown {n} candidate images. Choose the ONE that best fits this criteria:
1. Most thematically relevant to the search query and Islamic scholarly context
2. High visual quality (sharp, well-composed, good lighting)
3. Culturally appropriate — no faces that could imply depictions of prophets or angels
4. Evocative mood suitable for a religious education app (serene, majestic, contemplative, scholarly)
5. Prefers landscapes, architecture, objects, nature over generic stock-photo people

Reply with ONLY a JSON object:
{{"winner": <index 0-{max_idx}>, "reason": "<one sentence why>"}}
"""


def fetch_pexels(query: str, count: int, api_key: str) -> list[dict]:
    resp = requests.get(
        PEXELS_API,
        headers={"Authorization": api_key},
        params={"query": query, "per_page": count, "size": "large", "orientation": "landscape"},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json().get("photos", [])


def download_bytes(url: str) -> bytes | None:
    try:
        r = requests.get(url, timeout=30, stream=True)
        r.raise_for_status()
        return r.content
    except Exception as e:
        print(f"    Download failed: {e}", file=sys.stderr)
        return None


def pick_best(client: OpenAI, query: str, photos: list[dict]) -> int:
    """Send all candidate image URLs to GPT vision and return the index of the winner."""
    n = len(photos)
    prompt = SELECTION_PROMPT.format(query=query, n=n, max_idx=n - 1)

    content: list[dict] = [{"type": "text", "text": prompt}]
    for i, photo in enumerate(photos):
        url = photo["src"]["medium"]  # medium size is enough for selection
        content.append({"type": "text", "text": f"Image {i}:"})
        content.append({
            "type": "image_url",
            "image_url": {"url": url, "detail": "low"},
        })

    response = client.chat.completions.create(
        model=MODEL_OTHER,
        messages=[{"role": "user", "content": content}],
        max_completion_tokens=2000,
    )

    import json
    raw = (response.choices[0].message.content or "").strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    result = json.loads(raw)
    winner = int(result["winner"])
    reason = result.get("reason", "")
    print(f"    GPT picked #{winner}: {reason}")
    return winner


def convert_to_webp(img_bytes: bytes, dest: Path) -> bool:
    """Convert raw image bytes to webp (max 1280px wide) using ImageMagick."""
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(img_bytes)
        tmp_path = Path(tmp.name)
    try:
        result = subprocess.run(
            ["magick", str(tmp_path), "-resize", "1280x>", "-quality", "85", str(dest)],
            capture_output=True,
            timeout=30,
        )
        if result.returncode != 0:
            print(f"    magick error: {result.stderr.decode()[:100]}", file=sys.stderr)
            return False
        return True
    finally:
        tmp_path.unlink(missing_ok=True)


def upload_to_supabase(dest: Path) -> bool:
    """Upload a webp image to Supabase images bucket. Returns True if uploaded or already exists."""
    try:
        client = get_supabase_client()
        with open(dest, "rb") as f:
            img_data = f.read()
        client.storage.from_("images").upload(
            dest.name,
            img_data,
            file_options={"content-type": "image/webp"},
        )
        print(f"    Uploaded to Supabase: {dest.name}")
        return True
    except Exception as e:
        msg = str(e)
        if "409" in msg or "Duplicate" in msg or "already exists" in msg.lower():
            print(f"    Already on Supabase: {dest.name}")
            return True
        print(f"    Supabase upload failed: {e}", file=sys.stderr)
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch + GPT-curate images from Pexels")
    parser.add_argument("--queries", nargs="+", help="Search queries (overrides defaults)")
    parser.add_argument("--candidates", type=int, default=5, help="Candidates per query for GPT to choose from (default: 5)")
    parser.add_argument("--catalog", action="store_true", help="Run catalog_images.py on new images after fetching")
    args = parser.parse_args()

    pexels_key = os.getenv("PEXELS_API_KEY", "")
    if not pexels_key:
        print("Error: PEXELS_API_KEY not set. Add it to utils/set_keys.py.", file=sys.stderr)
        sys.exit(1)

    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    existing = {p.name for p in IMAGE_DIR.glob("*.webp")}
    client = OpenAI()

    queries = args.queries or DEFAULT_QUERIES
    total_saved = 0

    for query in queries:
        print(f'\n🔍 "{query}"')

        try:
            photos = fetch_pexels(query, args.candidates, pexels_key)
        except requests.HTTPError as e:
            print(f"  Pexels error: {e}", file=sys.stderr)
            continue

        if not photos:
            print("  No results from Pexels")
            continue

        # GPT picks the best using image URLs (no download needed yet)
        print(f"  Asking GPT to pick best from {len(photos)} candidates...")
        try:
            winner_idx = pick_best(client, query, photos)
            winner_idx = max(0, min(winner_idx, len(photos) - 1))
        except Exception as e:
            print(f"  GPT selection failed: {e} — using first candidate", file=sys.stderr)
            winner_idx = 0

        winner = photos[winner_idx]
        winner_id = winner["id"]
        filename = f"pexels-{winner_id}.webp"

        if filename in existing:
            print(f"  [skip] {filename} already exists")
            continue

        # Download winner at ~1280px width (Pexels "large" size)
        print(f"  Downloading winner #{winner_idx} (pexels-{winner_id}) by {winner.get('photographer','?')}...")
        img_bytes = download_bytes(winner["src"]["large"])
        if not img_bytes:
            print("  Download failed")
            continue

        dest = IMAGE_DIR / filename
        print(f"  Converting → {filename} ... ", end="", flush=True)
        if convert_to_webp(img_bytes, dest):
            print("✓")
            upload_to_supabase(dest)
            existing.add(filename)
            total_saved += 1
        else:
            print("FAILED")

    print(f"\n{'─' * 50}")
    print(f"Saved {total_saved} new images to {IMAGE_DIR}")

    if args.catalog and total_saved > 0:
        print("\nRunning cataloger on new images...")
        subprocess.run(
            [sys.executable, "scripts/catalog_images.py", "--image-dir", str(IMAGE_DIR)],
            check=False,
        )


if __name__ == "__main__":
    main()
