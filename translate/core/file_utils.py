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


def generate_split_filename(input_file: str) -> str:
    """Generate the corresponding split filename for an input file."""
    p = Path(input_file)
    return str(p.with_suffix("").with_name(p.stem + "_split.json"))
