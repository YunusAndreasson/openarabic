"""Pytest configuration and fixtures."""

import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

# Add the project root to Python path for imports
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


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


@pytest.fixture(autouse=True)
def disable_claude_cli():
    """Disable Claude CLI in tests so OpenAI mocks work correctly."""
    with patch("data.config.USE_CLAUDE_CLI", False):
        yield


@pytest.fixture
def temp_dir():
    """Create a temporary directory for tests."""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield temp_dir


@pytest.fixture
def mock_conversation_manager():
    """Create a mock ResponsesAPIManager with current_response_id set."""
    from unittest.mock import MagicMock

    manager = MagicMock()
    manager.current_response_id = "test-response-id-12345"
    manager.continue_with_stage.return_value = {
        "success": True,
        "data": {},
    }
    return manager


@pytest.fixture
def sample_translation_result():
    """Create a sample TranslationResult for testing."""
    from data.models import TranslationResult

    return TranslationResult(
        translation="Hello world",
        notes="A greeting",
        uncertainties=[],
        word_by_word=[],
    )


@pytest.fixture
def sample_tashkeel_result():
    """Create a sample TashkeelResult for testing."""
    from data.models import TashkeelResult

    return TashkeelResult(
        tashkeel="مَرْحَبًا بِالْعَالَمِ",
        uncertainties=[],
    )


@pytest.fixture
def sample_word_translation():
    """Create a sample WordTranslation for testing."""
    from data.models import WordTranslation

    return WordTranslation(
        arabic="مَرْحَبًا",
        english="hello",
        pos="interjection",
        essential="مرحبا",
        essential_translation="hello",
        notes="A common greeting",
        uncertainties=[],
    )
