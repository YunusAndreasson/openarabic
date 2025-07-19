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


__all__ = [
    "read_text_file",
    "read_json_file",
    "write_json_file",
    "write_text_file",
    "ensure_directory",
    "generate_split_filename",
]
