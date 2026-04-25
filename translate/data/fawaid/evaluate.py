"""Evaluate and compare translation outputs from different models.

Compares Sonnet vs Opus translations side-by-side with quality metrics.

Usage:
    python evaluate.py                    # Compare all overlapping pages
    python evaluate.py --pages 1-5        # Compare specific pages
    python evaluate.py --model sonnet     # Show single model output
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent / "output"


def load_translations(model: str) -> dict[int, dict]:
    """Load all translations for a model from JSONL file."""
    path = OUTPUT_DIR / f"translation_{model}.jsonl"
    if not path.exists():
        return {}

    pages = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                pages[obj["page"]] = obj
            except (json.JSONDecodeError, KeyError):
                continue
    return pages


def count_brackets(text: str) -> int:
    """Count [bracketed] insertions in English text."""
    return len(re.findall(r"\[.*?\]", text))


def simple_reading_level(text: str) -> float:
    """Rough reading level estimate based on average word length."""
    words = text.split()
    if not words:
        return 0
    return sum(len(w) for w in words) / len(words)


def verse_ref_accuracy(segments: list[dict]) -> tuple[int, int]:
    """Count verse segments with and without references."""
    verses = [s for s in segments if s.get("type") == "quran_verse"]
    with_ref = sum(1 for v in verses if v.get("reference"))
    return with_ref, len(verses)


def compute_metrics(translation: dict) -> dict:
    """Compute quality metrics for a single page translation."""
    segments = translation.get("segments", [])
    all_english = " ".join(s.get("english", "") for s in segments)

    refs_found, total_verses = verse_ref_accuracy(segments)

    return {
        "segment_count": len(segments),
        "verse_count": total_verses,
        "verse_refs_found": refs_found,
        "bracket_count": count_brackets(all_english),
        "total_english_words": len(all_english.split()),
        "avg_word_length": round(simple_reading_level(all_english), 2),
        "has_sahih": any(s.get("sahih_international") for s in segments),
    }


def print_page_comparison(page_num: int, models: dict[str, dict]) -> None:
    """Print side-by-side comparison for a single page."""
    print(f"\n{'='*80}")
    print(f"PAGE {page_num}")
    print(f"{'='*80}")

    # Print headings
    for model_name, translation in models.items():
        headings = translation.get("headings", [])
        if headings:
            for h in headings:
                print(f"  [{model_name}] Heading: {h.get('english', '?')}")

    # Print metrics
    print(f"\n  {'Metric':<25}", end="")
    for model_name in models:
        print(f"  {model_name:<15}", end="")
    print()
    print(f"  {'-'*25}", end="")
    for _ in models:
        print(f"  {'-'*15}", end="")
    print()

    metrics_by_model = {}
    for model_name, translation in models.items():
        metrics_by_model[model_name] = compute_metrics(translation)

    metric_keys = [
        ("segment_count", "Segments"),
        ("verse_count", "Quran verses"),
        ("verse_refs_found", "Verse refs found"),
        ("bracket_count", "[Bracket] inserts"),
        ("total_english_words", "English words"),
        ("avg_word_length", "Avg word length"),
        ("has_sahih", "Has Sahih Intl"),
    ]

    for key, label in metric_keys:
        print(f"  {label:<25}", end="")
        for model_name in models:
            val = metrics_by_model[model_name].get(key, "?")
            print(f"  {str(val):<15}", end="")
        print()

    # Print first few segments side by side
    print("\n  Sample segments:")
    model_list = list(models.keys())
    if len(model_list) >= 2:
        segs_a = models[model_list[0]].get("segments", [])
        segs_b = models[model_list[1]].get("segments", [])
        for i in range(min(3, len(segs_a), len(segs_b))):
            sa = segs_a[i]
            sb = segs_b[i]
            print(f"\n  Arabic: {sa.get('arabic', '')[:80]}...")
            print(f"  [{model_list[0]}]: {sa.get('english', '')[:120]}")
            print(f"  [{model_list[1]}]: {sb.get('english', '')[:120]}")
            if sa.get("type") == "quran_verse":
                print(f"  Refs: {model_list[0]}={sa.get('reference','?')} | {model_list[1]}={sb.get('reference','?')}")
    elif len(model_list) == 1:
        segs = models[model_list[0]].get("segments", [])
        for i in range(min(5, len(segs))):
            s = segs[i]
            type_tag = f"[{s.get('type', '?')}]"
            if s.get("reference"):
                type_tag += f" {s['reference']}"
            print(f"\n  {type_tag}")
            print(f"  AR: {s.get('arabic', '')[:100]}")
            print(f"  EN: {s.get('english', '')[:120]}")
            if s.get("sahih_international"):
                print(f"  SI: {s['sahih_international'][:120]}")


def print_summary(all_metrics: dict[str, list[dict]]) -> None:
    """Print aggregate summary across all pages."""
    print(f"\n{'='*80}")
    print("AGGREGATE SUMMARY")
    print(f"{'='*80}")

    for model_name, metrics_list in all_metrics.items():
        if not metrics_list:
            continue
        n = len(metrics_list)
        avg_segs = sum(m["segment_count"] for m in metrics_list) / n
        avg_verses = sum(m["verse_count"] for m in metrics_list) / n
        avg_brackets = sum(m["bracket_count"] for m in metrics_list) / n
        avg_words = sum(m["total_english_words"] for m in metrics_list) / n
        avg_wl = sum(m["avg_word_length"] for m in metrics_list) / n
        total_refs = sum(m["verse_refs_found"] for m in metrics_list)
        total_verses = sum(m["verse_count"] for m in metrics_list)
        ref_pct = (total_refs / total_verses * 100) if total_verses else 0

        print(f"\n  {model_name} ({n} pages):")
        print(f"    Avg segments/page:     {avg_segs:.1f}")
        print(f"    Avg Quran verses/page: {avg_verses:.1f}")
        print(f"    Verse ref accuracy:    {total_refs}/{total_verses} ({ref_pct:.0f}%)")
        print(f"    Avg [brackets]/page:   {avg_brackets:.1f}")
        print(f"    Avg English words/page:{avg_words:.0f}")
        print(f"    Avg word length:       {avg_wl:.2f} (lower = simpler vocabulary)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate translation quality")
    parser.add_argument("--pages", help="Page range to compare (e.g. '1-5')")
    parser.add_argument("--model", help="Show single model only")
    args = parser.parse_args()

    # Determine which models to compare
    if args.model:
        model_names = [args.model]
    else:
        model_names = []
        for f in OUTPUT_DIR.glob("translation_*.jsonl"):
            name = f.stem.replace("translation_", "")
            model_names.append(name)

    if not model_names:
        print("No translation output files found in output/")
        sys.exit(1)

    # Load translations
    all_translations = {}
    for model in model_names:
        all_translations[model] = load_translations(model)
        print(f"Loaded {len(all_translations[model])} pages for {model}")

    # Determine pages to compare
    all_pages = set()
    for translations in all_translations.values():
        all_pages.update(translations.keys())

    if args.pages:
        if "-" in args.pages:
            start, end = args.pages.split("-")
            target = set(range(int(start), int(end) + 1))
        else:
            target = {int(args.pages)}
        all_pages = all_pages & target

    pages_sorted = sorted(all_pages)

    if not pages_sorted:
        print("No matching pages found")
        sys.exit(1)

    # Compare
    all_metrics: dict[str, list[dict]] = {m: [] for m in model_names}

    for page_num in pages_sorted:
        models_for_page = {}
        for model in model_names:
            if page_num in all_translations[model]:
                models_for_page[model] = all_translations[model][page_num]
                all_metrics[model].append(compute_metrics(all_translations[model][page_num]))

        if models_for_page:
            print_page_comparison(page_num, models_for_page)

    print_summary(all_metrics)


if __name__ == "__main__":
    main()
