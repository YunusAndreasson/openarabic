import json
from pathlib import Path
from typing import Any


def read_text_file(path: str) -> str:
    """Read and return the content of a text file using UTF-8."""
    with open(path, encoding="utf-8") as f:
        return f.read()


def read_json_file(path: str) -> Any:
    """Load a JSON file and return the parsed data."""
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_json_file(path: str, data: Any) -> None:
    """Write data as formatted JSON."""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def write_text_file(path: str, text: str) -> None:
    """Write text to a file using UTF-8 encoding."""
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def ensure_directory(path: str) -> None:
    """Create the directory if it doesn't exist."""
    Path(path).mkdir(parents=True, exist_ok=True)


def generate_split_filename(input_file: str) -> str:
    """Generate the corresponding split filename for an input file."""
    p = Path(input_file)
    return str(p.with_suffix("").with_name(p.stem + "_split.json"))


def generate_pipeline_filename(
    input_file: str,
    author_folder: str,
    suffix: str,
    output_dir: str,
) -> str:
    """
    Generate output filename with author prefix for pipeline files.

    Args:
        input_file: Path to the input file.
        author_folder: Author folder name (e.g., "01_ibn_taymiyyah").
        suffix: Suffix to add (e.g., "_split" or "_translated").
        output_dir: Directory where output file will be written.

    Returns:
        Full path to the output file with author-prefixed name.

    Example:
        generate_pipeline_filename(
            "/inbox/01_ibn_taymiyyah/article.txt",
            "01_ibn_taymiyyah",
            "_split",
            "/split"
        ) -> "/split/01_article_split.json"
    """
    import os

    input_path = Path(input_file)
    author_number = author_folder.split("_")[0]  # Extract number from folder name
    output_filename = f"{author_number}_{input_path.stem}{suffix}.json"
    return os.path.join(output_dir, output_filename)


def generate_translate_filename(split_file: str, output_dir: str) -> str:
    """
    Generate translation output filename from a split file.

    Args:
        split_file: Path to the split file.
        output_dir: Directory where output file will be written.

    Returns:
        Full path to the translation output file.

    Example:
        generate_translate_filename("/split/01_article_split.json", "/translate")
        -> "/translate/01_article_translated.json"
    """
    import os

    split_path = Path(split_file)
    # Replace _split with _translated in the filename
    base_name = split_path.stem.replace("_split", "")
    output_filename = f"{base_name}_translated.json"
    return os.path.join(output_dir, output_filename)


__all__ = [
    "ensure_directory",
    "generate_pipeline_filename",
    "generate_split_filename",
    "generate_translate_filename",
    "read_json_file",
    "read_text_file",
    "write_json_file",
    "write_text_file",
]
