#!/usr/bin/env python3
"""
For articles with weak or mismatched images, suggest adapted titles
that better connect article content with available catalog images.

Usage:
    # Analyse all articles, output suggestions to review:
    python scripts/adapt_titles.py

    # Apply approved suggestions from the review file:
    python scripts/adapt_titles.py --apply suggestions.json

    # Limit to N articles (for testing):
    python scripts/adapt_titles.py --limit 20
"""

import argparse
import importlib.util
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

set_keys_path = Path(__file__).parent.parent / "utils" / "set_keys.py"
if set_keys_path.exists():
    spec = importlib.util.spec_from_file_location("set_keys", set_keys_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

from data.config import MODEL_OTHER  # noqa: E402
from openai import OpenAI  # noqa: E402
from utils.config_common import get_supabase_client  # noqa: E402
from utils.image_matcher import _load_catalog, match_image  # noqa: E402

SUGGEST_PROMPT = """\
You are an editor for OpenArabic, an Islamic education app. Article titles are \
AI-generated and can be freely adapted.

You will be given:
- The current article title
- A one-sentence article summary
- The description of the image that will appear with the article

Your task: suggest a slightly adapted title (4–9 words) that:
1. Stays true to the article's core topic and Islamic meaning
2. Feels more visually connected to the image mood and subject
3. Reads naturally as an article headline
4. Does NOT mention the image explicitly

Reply with ONLY a JSON object:
{{"title": "<suggested title>", "reason": "<one sentence why this fits better>"}}

Article title: {title}
Summary: {summary}
Image: {image_desc}
"""

# Images that are too generic to be worth adapting titles around
GENERIC_IMAGES = {
    "shutterstock_521516479.webp",  # rural house with window
    "70edf730.webp",                # city skyline
    "0e0bce43.webp",                # foggy urban avenue
    "288c66e6.webp",                # generic nature
}


def score_match(category: str, title: str, summary: str, current_image: str, catalog: dict) -> float:
    """Return a rough quality score for the current image assignment (0–5)."""
    if not current_image or current_image not in catalog:
        return 0.0

    data = catalog[current_image]
    img_categories = set(data.get("suitable_categories", []))
    img_topics = set(data.get("suitable_topics", []))
    img_mood = data.get("mood", "")

    import re
    stop = {"a","an","the","and","or","of","in","on","at","to","for","with","by","is","are","was","its"}
    words = {w for w in re.findall(r"[a-zA-Z]+", f"{title} {summary}".lower()) if w not in stop and len(w) > 2}

    score = 0.0
    if category in img_categories:
        score += 2.0
    score += len(words & img_topics) * 0.5
    if img_mood in ("scholarly", "contemplative", "serene", "majestic"):
        score += 0.5
    if current_image in GENERIC_IMAGES:
        score -= 2.0

    return score


def find_best_image(category: str, title: str, summary: str) -> str | None:
    """Run matcher with fresh session to find the best catalog image."""
    from utils.image_matcher import _session_usage
    _session_usage.clear()
    return match_image(category, title, summary)


def suggest_title(client: OpenAI, title: str, summary: str, image_desc: str) -> dict | None:
    prompt = SUGGEST_PROMPT.format(title=title, summary=summary[:200], image_desc=image_desc[:150])
    try:
        response = client.chat.completions.create(
            model=MODEL_OTHER,
            messages=[{"role": "user", "content": prompt}],
            max_completion_tokens=2000,
        )
        raw = (response.choices[0].message.content or "").strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1].lstrip("json").strip()
        return json.loads(raw)
    except Exception as e:
        print(f"    GPT error: {e}", file=sys.stderr)
        return None


def main() -> None:
    parser = argparse.ArgumentParser(description="Suggest adapted titles for better image fit")
    parser.add_argument("--apply", metavar="FILE", help="Apply approved suggestions from JSON file")
    parser.add_argument("--limit", type=int, default=0, help="Max articles to analyse (0 = all)")
    parser.add_argument("--threshold", type=float, default=1.5, help="Score below this triggers suggestion (default: 1.5)")
    parser.add_argument("--output", default="suggestions.json", help="Output file for suggestions (default: suggestions.json)")
    args = parser.parse_args()

    db = get_supabase_client()
    catalog = _load_catalog()

    # --- Apply mode ---
    if args.apply:
        approved = json.loads(Path(args.apply).read_text())
        applied = 0
        for item in approved:
            if not item.get("approved"):
                continue
            db.table("articles").update({"title": item["new_title"], "image_url": item["image"]}).eq("id", item["id"]).execute()
            print(f"  ✓ {item['id']}: {item['old_title']!r} → {item['new_title']!r} + {item['image']}")
            applied += 1
        print(f"\nApplied {applied} changes.")
        return

    # --- Analysis mode ---
    client = OpenAI()
    query = db.table("articles").select("id, title, summary, image_url, categories(name)")
    if args.limit:
        query = query.limit(args.limit)
    articles = query.execute().data

    suggestions = []
    candidates = 0

    # Pre-load title override keys so we can skip already-handled articles
    from utils.image_matcher import _TITLE_OVERRIDES
    override_keywords = [kw for keywords, _ in _TITLE_OVERRIDES for kw in keywords]

    for a in articles:
        cat = a["categories"]["name"]
        title = a["title"]
        summary = a.get("summary") or ""
        current_img = (a.get("image_url") or "").split("/")[-1]
        title_lower = title.lower()

        # Skip articles already handled by a title override
        if any(kw in title_lower for kw in override_keywords):
            continue

        score = score_match(cat, title, summary, current_img, catalog)
        if score >= args.threshold:
            continue  # good enough match, skip

        candidates += 1
        best_img = find_best_image(cat, title, summary) or current_img
        img_data = catalog.get(best_img, {})
        img_desc = img_data.get("description", "")

        print(f"\n[{candidates}] {a['id']} [{cat}] score={score:.1f}")
        print(f"  Title:   {title}")
        print(f"  Image:   {best_img}")
        print(f"  ImgDesc: {img_desc[:80]}")

        result = suggest_title(client, title, summary, img_desc)
        if not result:
            continue

        new_title = result.get("title", "")
        reason = result.get("reason", "")
        print(f"  → '{new_title}'  ({reason})")

        suggestions.append({
            "id": a["id"],
            "category": cat,
            "old_title": title,
            "new_title": new_title,
            "image": best_img,
            "old_image": current_img,
            "reason": reason,
            "score": score,
            "approved": False,  # set to true to apply
        })

    output_path = Path(args.output)
    output_path.write_text(json.dumps(suggestions, indent=2, ensure_ascii=False))
    print(f"\n{'─' * 60}")
    print(f"Found {candidates} weak matches → {len(suggestions)} suggestions saved to {output_path}")
    print(f"Review the file, set 'approved': true on items to keep, then run:")
    print(f"  python scripts/adapt_titles.py --apply {output_path}")


if __name__ == "__main__":
    main()
