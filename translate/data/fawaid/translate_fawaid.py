"""Translate Al-Fawaid page by page using Claude CLI.

Produces structured JSONL output suitable for web display and Typst PDF generation.
Supports stop/restart — resumes from last completed page.

Usage:
    python translate_fawaid.py                     # Translate all remaining (sonnet)
    python translate_fawaid.py --model opus         # Use opus model
    python translate_fawaid.py --pages 1-10         # Translate specific range
    python translate_fawaid.py --pages 5            # Translate single page
    python translate_fawaid.py --reset              # Clear progress and start over
    python translate_fawaid.py --dry-run --pages 1  # Show prompt without calling Claude
"""

from __future__ import annotations

import argparse
import fcntl
import json
import logging
import os
import re
import signal
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from tqdm import tqdm

logging.basicConfig(
    format="%(message)s",
    level=logging.INFO,
)
log = logging.getLogger(__name__)

# Paths
SCRIPT_DIR = Path(__file__).parent
INPUT_FILE = SCRIPT_DIR / "fawaid_full.json"
OUTPUT_DIR = SCRIPT_DIR / "output"
PROGRESS_FILE = SCRIPT_DIR / "progress.json"

# Retry configuration
MAX_RETRIES = 2
RETRY_DELAY_S = 10

# Graceful shutdown flag
_shutdown = False


def _handle_sigint(_sig: int, _frame: Any) -> None:
    global _shutdown
    if _shutdown:
        sys.exit(1)  # Second Ctrl+C forces exit
    _shutdown = True
    log.info("\n  Finishing current page then stopping (Ctrl+C again to force)...")


signal.signal(signal.SIGINT, _handle_sigint)


def load_source() -> list[dict]:
    """Load the source Arabic JSON."""
    with open(INPUT_FILE, encoding="utf-8") as f:
        return json.load(f)


def output_file_for(model: str) -> Path:
    """Get the JSONL output file path for a given model."""
    return OUTPUT_DIR / f"translation_{model}.jsonl"


def load_completed_pages(model: str) -> set[int]:
    """Load set of already-translated page numbers for this model."""
    path = output_file_for(model)
    if not path.exists():
        return set()

    done: set[int] = set()
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                done.add(json.loads(line)["page"])
            except (json.JSONDecodeError, KeyError):
                continue
    return done


def _locked_write(path: Path, content: str, *, mode: str = "a") -> None:
    """Write to a file with an exclusive lock to prevent concurrent corruption."""
    with open(path, mode, encoding="utf-8") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        f.write(content)
        f.flush()
        # Lock released when file closes


def append_result(result: dict, model: str) -> None:
    """Append a translation result to the JSONL output file (process-safe)."""
    line = json.dumps(result, ensure_ascii=False) + "\n"
    _locked_write(output_file_for(model), line)


def save_progress(model: str, last_page: int) -> None:
    """Update progress file (process-safe via atomic rename)."""
    progress: dict = {}
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE, encoding="utf-8") as f:
            fcntl.flock(f, fcntl.LOCK_SH)
            progress = json.load(f)

    progress[model] = {
        "last_completed_page": last_page,
        "updated": datetime.now(timezone.utc).isoformat(),
    }

    tmp = PROGRESS_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(progress, indent=2), encoding="utf-8")
    tmp.rename(PROGRESS_FILE)


def build_system_prompt() -> str:
    """Build the static system prompt with rules and glossary.

    Separated from the user message so Claude CLI can cache it
    across pages, and to improve instruction-following.
    """
    return """You translate classical Arabic into English for Arabic language learners who read the Arabic side-by-side and map each Arabic word to its English equivalent.

<rules>
ARABIC TEXT: Copy the Arabic EXACTLY as given — every tashkeel mark (فتحة، ضمة، كسرة، سكون، شدة، تنوين) must be preserved. The learner relies on these diacritics. Never re-type the Arabic from memory; copy it character-for-character from the input.

WORD ORDER: Follow Arabic word order closely, but the English must still be readable. The learner is looking at both texts side by side. Minor rearrangements for readability are OK — just keep the general flow matching.

BRACKETS: Any English word that has NO corresponding Arabic word MUST be in [brackets]. The learner uses brackets to know which English words are "extra" helpers not in the Arabic.
Bracket these:
- Copula: Arabic has no "is/are/was" → always bracket [is], [are], [was], [were]
- Implied articles: [a] when Arabic has no tanwin acting as article (but الـ = "the" — do NOT bracket)
- Implied pronouns: [he], [it], [they] when not in the Arabic word
- English-only prepositions: [of], [to] when Arabic uses case endings instead
- Tense helpers: [will], [would], [did]
Do NOT bracket these:
- "the" when Arabic has الـ (the lam of definition)
- "of" in idafa/possessive constructs (Arabic implies it but learners expect it)
- Common set phrases: "In the name of God" (بسم الله) — don't bracket every word
- Words that directly translate an Arabic word, even loosely

READABILITY: The English must be easy to read as a sentence. Do not sacrifice readability for extreme word-order literalness.
- BAD: "for who [there] was for him [a] heart" — too awkward
- GOOD: "for whoever [there] was for him [a] heart" — keeps Arabic order but readable
- BAD: "Not it [is] except [a] reminder" — confusing in English
- GOOD: "It [is] nothing but [a] reminder" — slight reorder, still clear

VOCABULARY: Use simple everyday English. The reader may be intermediate in English.
Avoid: magnificent, locus, disposition, comprehension, cognizance, impediment, bestow, beseech, verily, thereof, wherein, henceforth, unto, inasmuch.

GLOSSARY — translate these Arabic words consistently. Use the given English every time unless context clearly demands otherwise.

Core theological terms:
- الدنيا → "this world"
- الآخرة → "the Hereafter"
- الإيمان → "faith"
- المعاد → "the Return"
- التوحيد → "monotheism"
- الشرك → "associating partners [with God]"
- التوبة → "repentance"
- الفطرة → "inborn nature"
- الجنة → "Paradise"
- النار → "the Fire"

Worship and spiritual terms:
- العبد → "the servant"
- العبادة → "worship"
- التقوى → "God-consciousness"
- الصبر → "patience"
- التوكل → "reliance [on God]"
- الذكر → "remembrance"
- المحبة → "love"
- الهوى → "desire" (not "whim" or "passion")
- الغفلة → "heedlessness"
- اليقين → "certainty"

Context-sensitive (do NOT lock — choose based on meaning):
- النفس → "the self" in psychological contexts (النفس الأمارة), "the soul" in eschatological contexts (كل نفس ذائقة الموت)
- الحق → "the truth" generally, "the Truth" when used as a name of God

Phrases:
- سبحانه → "glorified [is] He"
- تعالى → "Most High"
- قال تعالى → "[God] Most High said"
- رضي الله عنه → "may God be pleased with him"
- ﵀ / رحمه الله → "may God have mercy on him"

Do NOT add transliterations in parentheses — the reader can see the Arabic directly.

QURAN VERSES: For verses marked with ﴿...﴾, identify the exact surah:ayah reference (single verse, e.g. "50:37" not "50:37-38"). Translate with the same bracket rules.

SEGMENTATION: Split text into SHORT segments — the learner is tracking Arabic words to English side by side, so shorter is better. Target: each segment should be under 25 English words.
- Each ﴿...﴾ verse = its own segment (type "quran_verse" with reference). Long verses: split at natural pauses.
- Prose: split aggressively. Arabic has natural break points at وَ (and), فَـ (so/then), ثُمَّ (then) — use these to start new segments. Even within a single Arabic sentence, split at these connectors if the segment would otherwise exceed ~25 words.
- Keep original order. Do not merge verses.
</rules>

<examples>
Arabic: وَذَلِكَ أَن تَمام التَّأْثِير لمّا كَانَ مَوْقُوفا على مُؤثر مُقْتَض
Good: And that [is] because the completeness of the effect, since it was dependent on [a] required cause
Bad: And that is because the completeness of the effect (missing [is] and [a] brackets)
Bad: And that [is] because [the] completeness [of] [the] effect (over-bracketed — "the" from الـ and "of" from idafa should NOT be bracketed)

Arabic: فَهَذَا هُوَ الْمحل الْقَابِل
Good: so this — it [is] the receiving place
Bad: this is the receptive locus ("receptive" and "locus" too advanced, "is" missing bracket)

Arabic: قَالَ تَعَالَى
Good: [God] Most High said
Bad: He, the Most High, said (rearranges word order)

Arabic: لِمَنْ كَانَ لَهُ قَلْبٌ
Good: for whoever [there] was for him [a] heart
Bad: for who [there] was for him [a] heart (unreadable)
</examples>

<output_format>
Return valid JSON:
{
  "headings": [{"arabic": "...", "english": "..."}],
  "segments": [
    {"type": "prose", "arabic": "...", "english": "..."},
    {"type": "quran_verse", "arabic": "...", "reference": "surah:ayah", "english": "..."}
  ]
}
</output_format>"""


def build_prompt(page_data: dict) -> str:
    """Build the user message with just the Arabic text for this page."""
    headings_json = json.dumps(page_data.get("headings", []), ensure_ascii=False)

    return f"""Translate this page from Al-Fawaid by Ibn al-Qayyim al-Jawziyya.

<arabic_text page="{page_data['page']}" vol_page="{page_data['vol_page']}">
{page_data['text']}
</arabic_text>

<headings>
{headings_json}
</headings>"""


# JSON schema for structured output
OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "headings": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "arabic": {"type": "string"},
                    "english": {"type": "string"},
                },
                "required": ["arabic", "english"],
            },
        },
        "segments": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "enum": ["prose", "quran_verse"]},
                    "arabic": {"type": "string"},
                    "english": {"type": "string"},
                    "reference": {"type": "string"},
                },
                "required": ["type", "arabic", "english"],
            },
        },
    },
    "required": ["headings", "segments"],
}


def _extract_json(text: str) -> dict | None:
    """Extract JSON from text that may contain markdown fencing."""
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        pass

    fenced = re.search(r"```(?:json)?\s*\n(.*?)\n```", text, re.DOTALL)
    if fenced:
        try:
            return json.loads(fenced.group(1))
        except (json.JSONDecodeError, ValueError):
            pass

    # Find first { ... } block
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[start : i + 1])
                except (json.JSONDecodeError, ValueError):
                    return None
    return None


_SYSTEM_PROMPT = build_system_prompt()


def call_claude(prompt: str, model: str) -> dict | None:
    """Call Claude CLI and return parsed JSON response."""
    cmd = [
        "claude",
        "--print",
        "--output-format", "json",
        "--model", model,
        "--fallback-model", "sonnet",
        "--no-session-persistence",
        "--system-prompt", _SYSTEM_PROMPT,
        "--json-schema", json.dumps(OUTPUT_SCHEMA),
    ]

    env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}

    try:
        result = subprocess.run(
            cmd,
            input=prompt,
            capture_output=True,
            text=True,
            timeout=600,
            env=env,
        )

        if result.returncode != 0:
            log.error("  ERROR: Claude CLI exited with code %d", result.returncode)
            log.error("  stderr: %s", result.stderr[:500])
            return None

        envelope = json.loads(result.stdout)

        if envelope.get("is_error"):
            log.error("  ERROR: %s", envelope.get("result", "Unknown error"))
            return None

        structured = envelope.get("structured_output")
        if structured and isinstance(structured, dict):
            return structured

        raw = envelope.get("result", "")
        return _extract_json(raw)

    except subprocess.TimeoutExpired:
        log.error("  ERROR: Claude CLI timed out (600s)")
        return None
    except json.JSONDecodeError as e:
        log.error("  ERROR: JSON parse failed: %s", e)
        return None
    except Exception as e:
        log.error("  ERROR: %s", e)
        return None


def call_claude_with_retry(prompt: str, model: str) -> dict | None:
    """Call Claude CLI with retry on transient failures."""
    for attempt in range(1, MAX_RETRIES + 2):
        result = call_claude(prompt, model)
        if result is not None:
            return result
        if attempt <= MAX_RETRIES:
            log.info("    Retry %d/%d in %ds...", attempt, MAX_RETRIES, RETRY_DELAY_S)
            time.sleep(RETRY_DELAY_S)
    return None


def enrich_with_sahih(page_result: dict) -> dict:
    """Add Sahih International translations and verify references."""
    try:
        from quran_lookup import lookup_verse, verify_verse_reference
    except ImportError:
        return page_result

    seen_refs: set[str] = set()
    for segment in page_result.get("segments", []):
        if segment.get("type") != "quran_verse" or not segment.get("reference"):
            continue

        ref = segment["reference"]
        arabic = segment.get("arabic", "")

        # Verify reference against actual Quran text
        if not verify_verse_reference(arabic, ref):
            # Try fixing range references (e.g. "36:69-70" → try "36:69" then "36:70")
            if "-" in ref:
                base, _, end = ref.partition("-")
                surah = base.split(":")[0]
                for ayah in [base, f"{surah}:{end}"]:
                    if verify_verse_reference(arabic, ayah):
                        segment["reference"] = ayah
                        ref = ayah
                        break

        sahih = lookup_verse(ref)
        if sahih:
            # Only include Sahih for substantial quotes (>5 words),
            # not tiny fragments like "for whoever has a heart"
            arabic_words = len(arabic.split())
            # Skip if we already attached Sahih for this ref (split verse)
            if arabic_words >= 5 and ref not in seen_refs:
                segment["sahih_international"] = sahih
                seen_refs.add(ref)

    return page_result


_ARABIC_LETTER_RE = re.compile(r"[\u0600-\u06FF]")


def validate_coverage(source_text: str, result: dict) -> list[str]:
    """Check that the translation covers the source Arabic text.

    Returns a list of warning strings (empty = all good).
    """
    warnings: list[str] = []

    # Count Arabic characters in source vs translation segments
    source_arabic_chars = len(_ARABIC_LETTER_RE.findall(source_text))
    translated_arabic = " ".join(s.get("arabic", "") for s in result.get("segments", []))
    translated_arabic_chars = len(_ARABIC_LETTER_RE.findall(translated_arabic))

    if source_arabic_chars == 0:
        return warnings

    coverage = translated_arabic_chars / source_arabic_chars
    if coverage < 0.8:
        warnings.append(
            f"Low Arabic coverage: {coverage:.0%} "
            f"({translated_arabic_chars}/{source_arabic_chars} chars)"
        )

    # Check headings are accounted for
    source_headings = result.get("_source_headings", [])
    translated_headings = result.get("headings", [])
    if source_headings and not translated_headings:
        warnings.append("Source has headings but translation has none")

    # Check no empty segments
    empty = [i for i, s in enumerate(result.get("segments", [])) if not s.get("english", "").strip()]
    if empty:
        warnings.append(f"Empty English in segments: {empty}")

    return warnings


def translate_page(page_data: dict, model: str, *, dry_run: bool = False) -> dict | None:
    """Translate a single page and return the enriched result."""
    prompt = build_prompt(page_data)

    if dry_run:
        print(f"\n{'=' * 60}")
        print(f"PROMPT for page {page_data['page']}:")
        print(f"{'=' * 60}")
        print(prompt)
        print(f"{'=' * 60}\n")
        return None

    result = call_claude_with_retry(prompt, model)
    if result is None:
        return None

    result["page"] = page_data["page"]
    result["vol_page"] = page_data["vol_page"]
    result["model"] = model
    result["timestamp"] = datetime.now(timezone.utc).isoformat()

    # Validate content coverage before saving
    warnings = validate_coverage(page_data["text"], result)
    if warnings:
        for w in warnings:
            log.warning("    ⚠ %s", w)

    return enrich_with_sahih(result)


def parse_page_range(pages_str: str, max_page: int) -> list[int]:
    """Parse page spec like '1-10', '5', or '1,3,7-10' into list of page numbers."""
    result: list[int] = []
    for part in pages_str.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-", 1)
            result.extend(range(int(start), min(int(end), max_page) + 1))
        else:
            result.append(int(part))
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Translate Al-Fawaid page by page")
    parser.add_argument(
        "--model", default="sonnet", choices=["sonnet", "opus", "haiku"],
        help="Claude model to use (default: sonnet)",
    )
    parser.add_argument("--pages", help="Pages to translate (e.g. '1-10', '5', '66,91,104')")
    parser.add_argument("--force", action="store_true", help="Re-translate pages even if already done")
    parser.add_argument("--reset", action="store_true", help="Clear progress and start over")
    parser.add_argument("--dry-run", action="store_true", help="Show prompt without calling Claude")
    args = parser.parse_args()

    source = load_source()
    max_page = max(p["page"] for p in source)
    page_map = {p["page"]: p for p in source}

    OUTPUT_DIR.mkdir(exist_ok=True)

    if args.reset:
        out_path = output_file_for(args.model)
        if out_path.exists():
            out_path.unlink()
            log.info("Deleted %s", out_path)
        if PROGRESS_FILE.exists():
            with open(PROGRESS_FILE, encoding="utf-8") as f:
                progress = json.load(f)
            progress.pop(args.model, None)
            PROGRESS_FILE.write_text(json.dumps(progress, indent=2), encoding="utf-8")
        log.info("Reset progress for model=%s", args.model)
        return

    target_pages = parse_page_range(args.pages, max_page) if args.pages else list(range(1, max_page + 1))

    if args.force and args.pages and not args.dry_run:
        # Remove old entries for forced pages so they get re-translated
        force_set = set(target_pages)
        out_path = output_file_for(args.model)
        if out_path.exists():
            kept = []
            with open(out_path, encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        entry = json.loads(line)
                        if entry["page"] not in force_set:
                            kept.append(line)
            out_path.write_text("".join(kept), encoding="utf-8")
            log.info("Removed %d pages from output for re-translation", len(force_set))

    if not args.dry_run:
        done = load_completed_pages(args.model)
        remaining = [p for p in target_pages if p not in done]
        if done:
            log.info("Already translated %d pages for model=%s", len(done), args.model)
    else:
        remaining = target_pages

    if not remaining:
        log.info("All requested pages already translated. Use --reset or --force to redo.")
        return

    log.info("Translating %d pages with model=%s", len(remaining), args.model)
    log.info("Output: %s\n", output_file_for(args.model))

    success = 0
    errors = 0

    pbar = tqdm(
        remaining,
        desc=f"Translating ({args.model})",
        unit="page",
        bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, {rate_fmt}] {postfix}",
    )

    for page_num in pbar:
        if _shutdown:
            pbar.close()
            log.info("\nStopped by user after %d pages.", success)
            break

        page_data = page_map.get(page_num)
        if not page_data:
            continue

        heading = ""
        if page_data.get("headings"):
            heading = page_data["headings"][0][:35]
        pbar.set_postfix_str(f"p{page_num}" + (f" {heading}" if heading else ""))

        result = translate_page(page_data, args.model, dry_run=args.dry_run)

        if args.dry_run:
            continue

        if result is None:
            errors += 1
            pbar.set_postfix_str(f"p{page_num} FAILED")
            continue

        n_segments = len(result.get("segments", []))
        n_verses = sum(1 for s in result.get("segments", []) if s.get("type") == "quran_verse")

        append_result(result, args.model)
        save_progress(args.model, page_num)
        success += 1

        pbar.set_postfix_str(f"p{page_num} ✓ {n_segments}seg {n_verses}v")

    pbar.close()

    if not args.dry_run and (success or errors):
        log.info("\nDone: %d translated, %d errors", success, errors)


if __name__ == "__main__":
    main()
