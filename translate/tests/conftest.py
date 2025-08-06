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


@pytest.fixture
def temp_dir():
    """Create a temporary directory for tests."""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield temp_dir
