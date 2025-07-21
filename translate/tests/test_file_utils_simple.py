"""Simple tests for file utility functions."""

import json
import tempfile
from pathlib import Path

import pytest


def test_read_text_file_basic():
    """Test reading a basic text file."""
    from utils.file_utils import read_text_file

    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        f.write("مرحبا بالعالم")
        temp_file = f.name

    try:
        result = read_text_file(temp_file)
        assert result == "مرحبا بالعالم"
    finally:
        Path(temp_file).unlink(missing_ok=True)


def test_read_text_file_empty():
    """Test reading an empty text file."""
    from utils.file_utils import read_text_file

    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        temp_file = f.name

    try:
        result = read_text_file(temp_file)
        assert result == ""
    finally:
        Path(temp_file).unlink(missing_ok=True)


def test_read_text_file_not_found():
    """Test reading a non-existent file."""
    from utils.file_utils import read_text_file

    with pytest.raises(FileNotFoundError):
        read_text_file("nonexistent_file.txt")


def test_read_json_file_basic():
    """Test reading a basic JSON file."""
    from utils.file_utils import read_json_file

    test_data = {"title": "Test", "content": "مرحبا بالعالم"}
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(test_data, f)
        temp_file = f.name

    try:
        result = read_json_file(temp_file)
        assert result == test_data
    finally:
        Path(temp_file).unlink(missing_ok=True)


def test_read_json_file_not_found():
    """Test reading a non-existent JSON file."""
    from utils.file_utils import read_json_file

    with pytest.raises(FileNotFoundError):
        read_json_file("nonexistent_file.json")


def test_write_json_file_basic():
    """Test writing a basic JSON file."""
    from utils.file_utils import write_json_file

    test_data = {"title": "Test", "content": "مرحبا بالعالم"}
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
        temp_file = f.name

    try:
        write_json_file(temp_file, test_data)

        with open(temp_file, encoding="utf-8") as f:
            result = json.load(f)

        assert result == test_data
    finally:
        Path(temp_file).unlink(missing_ok=True)


def test_write_text_file_basic():
    """Test writing a basic text file."""
    from utils.file_utils import write_text_file

    test_content = "مرحبا بالعالم"
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as f:
        temp_file = f.name

    try:
        write_text_file(temp_file, test_content)

        with open(temp_file, encoding="utf-8") as f:
            result = f.read()

        assert result == test_content
    finally:
        Path(temp_file).unlink(missing_ok=True)


def test_ensure_directory_new():
    """Test creating a new directory."""
    from utils.file_utils import ensure_directory

    with tempfile.TemporaryDirectory() as temp_dir:
        new_dir = Path(temp_dir) / "new_directory"
        ensure_directory(str(new_dir))
        assert new_dir.exists()
        assert new_dir.is_dir()


def test_ensure_directory_exists():
    """Test ensuring an existing directory."""
    from utils.file_utils import ensure_directory

    with tempfile.TemporaryDirectory() as temp_dir:
        ensure_directory(temp_dir)
        assert Path(temp_dir).exists()
        assert Path(temp_dir).is_dir()


def test_generate_split_filename_basic():
    """Test basic split filename generation."""
    from utils.file_utils import generate_split_filename

    input_file = "input.txt"
    result = generate_split_filename(input_file)
    assert result == "input_split.json"


def test_generate_split_filename_with_path():
    """Test split filename generation with path."""
    from utils.file_utils import generate_split_filename

    input_file = "/path/to/input.txt"
    result = generate_split_filename(input_file)
    assert result == "/path/to/input_split.json"


def test_generate_split_filename_with_different_extension():
    """Test split filename generation with different extension."""
    from utils.file_utils import generate_split_filename

    input_file = "input.md"
    result = generate_split_filename(input_file)
    assert result == "input_split.json"
