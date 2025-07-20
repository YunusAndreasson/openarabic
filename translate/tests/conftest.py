"""Pytest configuration and fixtures."""

import os
import tempfile
from unittest.mock import patch

import pytest


@pytest.fixture(autouse=True)
def mock_api_keys():
    """Mock API keys to avoid actual API calls in tests."""
    with patch.dict(
        os.environ,
        {
            "OPENAI_API_KEY": "test-key",
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_KEY": "test-supabase-key",
            "ELEVENLABS_API_KEY": "test-elevenlabs-key",
        },
    ):
        yield


@pytest.fixture
def temp_dir():
    """Create a temporary directory for tests."""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield temp_dir


@pytest.fixture
def sample_arabic_text():
    """Sample Arabic text for testing."""
    return "مرحبا بالعالم. هذا نص تجريبي. لاختبار الترجمة."


@pytest.fixture
def sample_split_data():
    """Sample split data structure."""
    return {
        "title": "Test Article",
        "summary": "A test article for translation",
        "difficulty_level": "intermediate",
        "units": [
            {"text": "مرحبا بالعالم."},
            {"text": "هذا نص تجريبي."},
            {"text": "لاختبار الترجمة."},
        ],
    }


@pytest.fixture
def sample_translation_data():
    """Sample translation data structure."""
    return {
        "metadata": {
            "title": "Test Article",
            "summary": "A test article for translation",
            "difficulty_level": "intermediate",
        },
        "translations": [
            {
                "original": "مرحبا بالعالم.",
                "full_translation": "Hello world.",
                "tashkeel": "مَرْحَبًا بِالْعَالَمِ.",
                "word_by_word": [
                    {
                        "arabic": "مرحبا",
                        "english": "hello",
                        "essential": "مرحب",
                        "essential_translation": "hello",
                    },
                    {
                        "arabic": "بالعالم",
                        "english": "world",
                        "essential": "عالم",
                        "essential_translation": "world",
                    },
                ],
            },
            {
                "original": "هذا نص تجريبي.",
                "full_translation": "This is a test text.",
                "tashkeel": "هَذَا نَصٌّ تَجْرِيبِيٌّ.",
                "word_by_word": [
                    {
                        "arabic": "هذا",
                        "english": "this",
                        "essential": "هذا",
                        "essential_translation": "this",
                    },
                    {
                        "arabic": "نص",
                        "english": "text",
                        "essential": "نص",
                        "essential_translation": "text",
                    },
                ],
            },
        ],
    }


@pytest.fixture
def mock_openai_response():
    """Mock OpenAI API response."""
    return {
        "results": [
            {
                "translation": "Hello world.",
                "uncertainties": [],
            },
            {
                "translation": "This is a test text.",
                "uncertainties": [],
            },
        ],
    }


@pytest.fixture
def mock_split_response():
    """Mock split API response."""
    return {
        "title": "Test Article",
        "summary": "A test article for translation",
        "difficulty_level": "intermediate",
        "units": [
            {"text": "مرحبا بالعالم."},
            {"text": "هذا نص تجريبي."},
            {"text": "لاختبار الترجمة."},
        ],
    }
