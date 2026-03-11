"""Translate all Arabic inbox passages to English for review.

Creates matching files under 0_inbox_en/ so filenames line up with 0_inbox/.
Uses Claude CLI for translation (no API cost with Max subscription).
Processes files in parallel for speed.
"""

import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

INBOX_DIR = Path("0_inbox")
OUTPUT_DIR = Path("0_inbox_en")

PROMPT_TEMPLATE = """Translate this Arabic passage to clear, readable English.
Keep it natural — not word-by-word. Preserve paragraph breaks.
Just output the translation, nothing else.

---
{text}
"""


def translate_file(arabic_path: Path) -> tuple[Path, bool, str]:
    """Translate a single Arabic file to English using Claude CLI."""
    rel = arabic_path.relative_to(INBOX_DIR)
    out_path = OUTPUT_DIR / rel

    if out_path.exists() and out_path.stat().st_size > 100:
        return out_path, True, "already exists"

    out_path.parent.mkdir(parents=True, exist_ok=True)

    arabic_text = arabic_path.read_text(encoding="utf-8")
    prompt = PROMPT_TEMPLATE.format(text=arabic_text)

    env = {k: v for k, v in os.environ.items() if k not in ("CLAUDE_CODE_ENTRYPOINT", "CLAUDECODE")}

    try:
        result = subprocess.run(
            ["claude", "-p", "--output-format", "text", "--max-turns", "1"],
            input=prompt,
            capture_output=True,
            text=True,
            timeout=120,
            env=env,
        )
        if result.returncode != 0:
            return out_path, False, f"claude error: {result.stderr[:200]}"

        translation = result.stdout.strip()
        if len(translation) < 50:
            return out_path, False, f"too short: {translation[:100]}"

        out_path.write_text(translation, encoding="utf-8")
        return out_path, True, "ok"

    except subprocess.TimeoutExpired:
        return out_path, False, "timeout"
    except Exception as e:
        return out_path, False, str(e)


def main():
    files = sorted(INBOX_DIR.glob("*/*.txt"))
    print(f"Found {len(files)} files to translate")
    print(f"Output: {OUTPUT_DIR}/\n")

    # Process with limited parallelism (Claude CLI can handle a few concurrent)
    workers = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    done = 0
    failed = 0

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(translate_file, f): f for f in files}
        for future in as_completed(futures):
            src = futures[future]
            rel = src.relative_to(INBOX_DIR)
            out_path, success, msg = future.result()
            done += 1
            if success:
                status = "✓" if msg == "ok" else "⊘"
                print(f"  [{done}/{len(files)}] {status} {rel}  ({msg})")
            else:
                failed += 1
                print(f"  [{done}/{len(files)}] ✗ {rel}  ({msg})")

    print(f"\nDone: {done - failed} translated, {failed} failed")


if __name__ == "__main__":
    main()
