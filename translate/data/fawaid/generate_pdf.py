"""Generate PDF from translation JSONL using Typst.

Reads structured translation output, exports filtered JSON, and compiles
via Typst template (template.typ handles all layout logic).

Usage:
    python generate_pdf.py                                          # All pages
    python generate_pdf.py --pages 1-10                             # Specific range
    python generate_pdf.py --input output/translation_sonnet.jsonl  # Specific file
    python generate_pdf.py --output output/fawaid_sample.pdf        # Custom output
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR / "output"
TEMPLATE_FILE = SCRIPT_DIR / "template.typ"
FONTS_DIR = SCRIPT_DIR / "fonts"


def load_translations(input_path: Path, pages: set[int] | None = None) -> list[dict]:
    """Load translations from JSONL, optionally filtering by page number."""
    results = []
    with open(input_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                if pages is None or obj["page"] in pages:
                    results.append(obj)
            except (json.JSONDecodeError, KeyError):
                continue

    results.sort(key=lambda x: x["page"])
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate PDF from translation JSONL")
    parser.add_argument("--input", help="Input JSONL file (default: latest in output/)")
    parser.add_argument("--output", help="Output PDF path")
    parser.add_argument("--pages", help="Page range (e.g. '1-10')")
    parser.add_argument("--typ-only", action="store_true", help="Export JSON only, skip PDF compilation")
    args = parser.parse_args()

    # Find input file
    if args.input:
        input_path = Path(args.input)
    else:
        jsonl_files = sorted(OUTPUT_DIR.glob("translation_*.jsonl"))
        if not jsonl_files:
            print("No translation files found in output/")
            sys.exit(1)
        input_path = jsonl_files[0]
        print(f"Using: {input_path}")

    # Parse page filter
    page_filter = None
    if args.pages:
        if "-" in args.pages:
            start, end = args.pages.split("-")
            page_filter = set(range(int(start), int(end) + 1))
        else:
            page_filter = {int(args.pages)}

    # Load translations
    translations = load_translations(input_path, page_filter)
    if not translations:
        print("No translations found matching criteria")
        sys.exit(1)

    print(f"Generating PDF for {len(translations)} pages...")

    # Write JSON data for Typst to consume
    model_name = input_path.stem.replace("translation_", "")
    pages_suffix = f"_p{args.pages}" if args.pages else ""
    json_path = OUTPUT_DIR / f"fawaid_{model_name}{pages_suffix}.json"
    json_path.write_text(json.dumps(translations, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote data: {json_path}")

    if args.typ_only:
        return

    # Compile PDF via Typst — template.typ loads the JSON directly
    pdf_path = Path(args.output) if args.output else json_path.with_suffix(".pdf")

    try:
        import typst as typst_lib

        # Path must be relative to the template file
        rel_json = json_path.relative_to(SCRIPT_DIR)
        font_paths = [str(FONTS_DIR)] if FONTS_DIR.exists() else []
        typst_lib.compile(
            str(TEMPLATE_FILE),
            output=str(pdf_path),
            sys_inputs={"data": str(rel_json)},
            font_paths=font_paths,
        )
        print(f"PDF generated: {pdf_path}")
    except ImportError:
        # Fall back to CLI
        try:
            cmd = [
                "typst", "compile",
                "--input", f"data={json_path.relative_to(SCRIPT_DIR)}",
            ]
            if FONTS_DIR.exists():
                cmd += ["--font-path", str(FONTS_DIR)]
            cmd += [str(TEMPLATE_FILE), str(pdf_path)]
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,
            )
            if result.returncode != 0:
                print(f"Typst compilation failed:\n{result.stderr}")
                sys.exit(1)
            print(f"PDF generated: {pdf_path}")
        except FileNotFoundError:
            print("typst not found. Install with: pip install typst")
            sys.exit(1)


if __name__ == "__main__":
    main()
