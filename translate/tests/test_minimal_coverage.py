"""
Minimal strategic tests to increase coverage for low-coverage modules.
"""

import os
from unittest.mock import MagicMock, patch

import pytest

from utils.config_common import (
    get_audio_config,
    get_environment_config,
    get_storage_url,
    get_supabase_client,
    get_voice_config,
    validate_required_config,
)
from utils.error_handling import (
    handle_import_error,
    safe_audio_operation,
    safe_database_operation,
    safe_execute,
    safe_file_operation,
)
from utils.exceptions import (
    AudioGenerationError,
    ConfigurationError,
    DatabaseError,
    TranslationError,
    ValidationError,
)
from utils.file_utils import (
    ensure_directory,
    generate_split_filename,
    read_json_file,
    read_text_file,
    write_json_file,
    write_text_file,
)


class TestExceptions:
    """Test custom exceptions."""

    def test_translation_error(self):
        """Test TranslationError exception."""
        error = TranslationError("Translation failed")
        assert str(error) == "Translation failed"

    def test_audio_generation_error(self):
        """Test AudioGenerationError exception."""
        error = AudioGenerationError("Audio generation failed")
        assert str(error) == "Audio generation failed"

    def test_configuration_error(self):
        """Test ConfigurationError exception."""
        error = ConfigurationError("Configuration failed")
        assert str(error) == "Configuration failed"

    def test_database_error(self):
        """Test DatabaseError exception."""
        error = DatabaseError("Database operation failed")
        assert str(error) == "Database operation failed"

    def test_validation_error(self):
        """Test ValidationError exception."""
        error = ValidationError("Validation failed")
        assert str(error) == "Validation failed"


class TestFileUtils:
    """Test file utility functions."""

    def test_generate_split_filename(self):
        """Test generate_split_filename function."""
        result = generate_split_filename("input.txt")
        assert result == "input_split.json"

        result = generate_split_filename("/path/to/file.md")
        assert result == "/path/to/file_split.json"

    def test_ensure_directory(self, tmp_path):
        """Test ensure_directory function."""
        test_dir = tmp_path / "test_dir"
        ensure_directory(str(test_dir))
        assert test_dir.exists()
        assert test_dir.is_dir()

    def test_read_write_text_file(self, tmp_path):
        """Test read_text_file and write_text_file functions."""
        test_file = tmp_path / "test.txt"
        test_content = "Hello, World! مرحبا بالعالم"

        write_text_file(str(test_file), test_content)
        assert test_file.exists()

        read_content = read_text_file(str(test_file))
        assert read_content == test_content

    def test_read_write_json_file(self, tmp_path):
        """Test read_json_file and write_json_file functions."""
        test_file = tmp_path / "test.json"
        test_data = {"key": "value", "number": 42, "list": [1, 2, 3]}

        write_json_file(str(test_file), test_data)
        assert test_file.exists()

        read_data = read_json_file(str(test_file))
        assert read_data == test_data


class TestConfigCommon:
    """Test configuration common functions."""

    def test_get_voice_config(self):
        """Test get_voice_config function."""
        # Test all voice types
        arabic_sentence = get_voice_config("arabic_sentence")
        assert "voice_id" in arabic_sentence
        assert arabic_sentence["is_arabic"] is True

        arabic_word = get_voice_config("arabic_word")
        assert "voice_id" in arabic_word
        assert arabic_word["is_arabic"] is True

        english_word = get_voice_config("english_word")
        assert "voice_id" in english_word
        assert english_word["is_arabic"] is False

        # Test fallback
        default = get_voice_config("unknown_type")
        assert default == arabic_sentence

    def test_get_storage_url(self):
        """Test get_storage_url function."""
        url = get_storage_url("test.mp3", "audio")
        assert "storage/v1/object/public/audio/test.mp3" in url

        url = get_storage_url("file.txt", "documents")
        assert "storage/v1/object/public/documents/file.txt" in url

    @patch.dict(
        os.environ,
        {
            "ELEVENLABS_API_KEY": "test_key",
            "SUPABASE_URL": "test_url",
            "SUPABASE_KEY": "test_key",
            "OPENAI_API_KEY": "test_openai_key",
            "OPENAI_ORG_ID": "test_org",
        },
    )
    def test_get_environment_config(self):
        """Test get_environment_config function."""
        config = get_environment_config()
        assert config["ELEVENLABS_API_KEY"] == "test_key"
        assert config["SUPABASE_URL"] == "test_url"
        assert config["SUPABASE_KEY"] == "test_key"
        assert config["OPENAI_API_KEY"] == "test_openai_key"
        assert config["OPENAI_ORG_ID"] == "test_org"

    @patch.dict(
        os.environ,
        {
            "ELEVENLABS_API_KEY": "test_key",
            "SUPABASE_URL": "test_url",
            "SUPABASE_KEY": "test_key",
        },
    )
    def test_validate_required_config_success(self):
        """Test validate_required_config function with valid config."""
        result = validate_required_config(["ELEVENLABS_API_KEY", "SUPABASE_URL"])
        assert result is True

    @patch.dict(os.environ, {"ELEVENLABS_API_KEY": "test_key"}, clear=True)
    def test_validate_required_config_missing(self):
        """Test validate_required_config function with missing config."""
        with pytest.raises(ValueError, match="Missing required configuration"):
            validate_required_config(["ELEVENLABS_API_KEY", "MISSING_KEY"])

    def test_get_audio_config(self):
        """Test get_audio_config function."""
        config = get_audio_config()
        assert "voice_configs" in config
        assert "storage" in config
        assert "validation" in config
        assert config["storage"]["bucket"] == "audio"
        assert config["validation"]["min_file_size"] == 1000

    @patch.dict(
        os.environ,
        {"SUPABASE_URL": "https://test.supabase.co", "SUPABASE_KEY": "test_key"},
    )
    @patch("utils.config_common.create_client")
    def test_get_supabase_client_success(self, mock_create_client):
        """Test get_supabase_client function with valid environment."""
        mock_client = MagicMock()
        mock_create_client.return_value = mock_client

        client = get_supabase_client()
        assert client == mock_client
        mock_create_client.assert_called_once_with(
            "https://test.supabase.co", "test_key"
        )

    @patch.dict(os.environ, {}, clear=True)
    def test_get_supabase_client_missing_env(self):
        """Test get_supabase_client function with missing environment variables."""
        # Reset the global client to ensure the function is called again
        import utils.config_common as config_common

        config_common._supabase_client = None

        with pytest.raises(OSError, match="Missing required environment variables"):
            get_supabase_client()


class TestErrorHandling:
    """Test error handling utilities."""

    def test_safe_execute_success(self):
        """Test safe_execute with successful operation."""

        def success_operation():
            return "success"

        result = safe_execute(success_operation, "test operation")
        assert result == "success"

    def test_safe_execute_with_fallback(self):
        """Test safe_execute with fallback value."""

        def failing_operation():
            raise ValueError("test error")

        result = safe_execute(
            failing_operation, "test operation", fallback_value="fallback"
        )
        assert result == "fallback"

    def test_safe_execute_with_reraise(self):
        """Test safe_execute with reraise enabled."""

        def failing_operation():
            raise ValueError("test error")

        with pytest.raises(ValueError, match="test error"):
            safe_execute(failing_operation, "test operation", reraise=True)

    def test_safe_execute_without_logging(self):
        """Test safe_execute without error logging."""

        def failing_operation():
            raise ValueError("test error")

        result = safe_execute(failing_operation, "test operation", log_error=False)
        assert result is None

    def test_safe_audio_operation(self):
        """Test safe_audio_operation wrapper."""

        def audio_operation():
            return "audio_result"

        result = safe_audio_operation(audio_operation, "test", "item.mp3")
        assert result == "audio_result"

    def test_safe_database_operation(self):
        """Test safe_database_operation wrapper."""

        def db_operation():
            return "db_result"

        result = safe_database_operation(db_operation, "articles", "select")
        assert result == "db_result"

    def test_safe_file_operation(self):
        """Test safe_file_operation wrapper."""

        def file_operation():
            return "file_result"

        result = safe_file_operation(file_operation, "/path/to/file.txt", "read")
        assert result == "file_result"

    def test_handle_import_error_default(self):
        """Test handle_import_error with default message."""
        result = handle_import_error("test_module", fallback_value="fallback")
        assert result == "fallback"

    def test_handle_import_error_custom_message(self):
        """Test handle_import_error with custom message."""
        result = handle_import_error(
            "test_module", fallback_value="fallback", warning_message="Custom warning"
        )
        assert result == "fallback"


class TestAudioCommon:
    """Test audio common utilities."""

    def test_create_voice_settings(self):
        """Test create_voice_settings function."""
        from utils.audio_common import create_voice_settings

        settings = create_voice_settings(speed=0.9)
        assert settings.speed == 0.9
        assert hasattr(settings, "stability")
        assert hasattr(settings, "similarity_boost")

    def test_get_temp_audio_path(self):
        """Test get_temp_audio_path function."""
        from utils.audio_common import get_temp_audio_path

        path = get_temp_audio_path("test.mp3")
        assert "test.mp3" in path
        assert path.endswith("test.mp3")

    def test_get_storage_url(self):
        """Test get_storage_url function."""
        from utils.audio_common import get_storage_url

        url = get_storage_url("test.mp3", "audio")
        assert "storage/v1/object/public/audio/test.mp3" in url

    def test_validate_audio_response_success(self):
        """Test validate_audio_response with valid response."""
        from utils.audio_common import validate_audio_response

        result = validate_audio_response(b"audio_data", "test", "item.mp3")
        assert result is True

    def test_validate_audio_response_empty(self):
        """Test validate_audio_response with empty response."""
        from utils.audio_common import validate_audio_response

        result = validate_audio_response(None, "test", "item.mp3")
        assert result is False

    def test_validate_audio_response_empty_bytes(self):
        """Test validate_audio_response with empty bytes."""
        from utils.audio_common import validate_audio_response

        result = validate_audio_response(b"", "test", "item.mp3")
        assert result is False

    @patch("utils.audio_common.os.path.exists")
    @patch("utils.audio_common.os.remove")
    def test_cleanup_temp_file_exists(self, mock_remove, mock_exists):
        """Test cleanup_temp_file when file exists."""
        from utils.audio_common import cleanup_temp_file

        mock_exists.return_value = True

        cleanup_temp_file("/path/to/file.mp3", "test")
        mock_remove.assert_called_once_with("/path/to/file.mp3")

    @patch("utils.audio_common.os.path.exists")
    @patch("utils.audio_common.os.remove")
    def test_cleanup_temp_file_not_exists(self, mock_remove, mock_exists):
        """Test cleanup_temp_file when file doesn't exist."""
        from utils.audio_common import cleanup_temp_file

        mock_exists.return_value = False

        cleanup_temp_file("/path/to/file.mp3", "test")
        mock_remove.assert_not_called()


class TestStorageUtils:
    """Test storage utilities."""

    def test_generate_content_hash(self):
        """Test generate_content_hash function."""
        from utils.storage_utils import generate_content_hash

        data = {"title": "Test", "content": "Hello"}
        hash1 = generate_content_hash(data)
        hash2 = generate_content_hash(data)

        assert hash1 == hash2
        assert len(hash1) == 64  # SHA-256 hex length

    def test_generate_content_hash_different_data(self):
        """Test generate_content_hash with different data."""
        from utils.storage_utils import generate_content_hash

        data1 = {"title": "Test", "content": "Hello"}
        data2 = {"title": "Test", "content": "World"}

        hash1 = generate_content_hash(data1)
        hash2 = generate_content_hash(data2)

        assert hash1 != hash2

    def test_generate_audio_filename(self):
        """Test generate_audio_filename function."""
        from utils.storage_utils import generate_audio_filename

        filename = generate_audio_filename()
        assert filename.endswith(".mp3")
        assert len(filename) == 40  # UUID (36 chars) + .mp3 (4 chars)

    def test_get_word_type_id_valid(self):
        """Test get_word_type_id with valid POS."""
        from data.enums import PartOfSpeech
        from utils.storage_utils import get_word_type_id

        # Test with valid POS
        result = get_word_type_id(PartOfSpeech.NOUN.value)
        assert result == 2

    def test_get_word_type_id_invalid(self):
        """Test get_word_type_id with invalid POS."""
        from utils.storage_utils import get_word_type_id

        # Test with invalid POS - should default to NOUN
        result = get_word_type_id("invalid_pos")
        assert result == 2  # Default to NOUN

    def test_get_word_type_id_case_insensitive(self):
        """Test get_word_type_id with different cases."""
        from utils.storage_utils import get_word_type_id

        # Test case insensitivity
        result1 = get_word_type_id("VERB")
        result2 = get_word_type_id("verb")
        assert result1 == result2 == 1

    @patch("utils.storage_utils.get_supabase_client")
    def test_check_file_exists_true(self, mock_client):
        """Test check_file_exists when file exists."""
        from utils.storage_utils import check_file_exists

        mock_client.return_value.storage.from_.return_value.create_signed_url.return_value = "url"

        result = check_file_exists("bucket", "file.mp3")
        assert result is True

    @patch("utils.storage_utils.get_supabase_client")
    def test_check_file_exists_false(self, mock_client):
        """Test check_file_exists when file doesn't exist."""
        from utils.storage_utils import check_file_exists

        mock_client.return_value.storage.from_.return_value.create_signed_url.side_effect = Exception(
            "Object not found"
        )

        result = check_file_exists("bucket", "file.mp3")
        assert result is False


class TestTranslationProcessor:
    """Test translation processor utilities."""

    def test_run_full_translation_validation(self):
        """Test run_full_translation with validation."""
        from data.models import TranslationResult
        from utils.translation_processor import run_full_translation

        # Mock the translation engine function
        with patch(
            "utils.translation_processor._get_translation_engine_functions"
        ) as mock_get:
            mock_translate = MagicMock()
            mock_translate.return_value = [
                TranslationResult(
                    translation="Hello world",
                    notes="Test notes",
                    uncertainties=[],
                    word_by_word=[
                        {
                            "arabic": "مرحبا",
                            "english": "hello",
                            "pos": "interjection",
                            "essential": "مرحبا",
                            "essential_translation": "hello",
                            "notes": "greeting",
                            "uncertainties": [],
                        }
                    ],
                )
            ]
            mock_get.return_value = (
                MagicMock(),
                MagicMock(),
                mock_translate,
                MagicMock(),
            )

            sentences = ["مرحبا بالعالم"]
            contexts = ["test context"]

            result = run_full_translation(sentences, contexts)
            assert len(result) == 1
            assert result[0].translation == "Hello world"

    def test_apply_tashkeel_validation(self):
        """Test apply_tashkeel with validation."""
        from data.models import TashkeelResult, TranslationResult
        from utils.translation_processor import apply_tashkeel

        # Mock the translation engine function
        with patch(
            "utils.translation_processor._get_translation_engine_functions"
        ) as mock_get:
            mock_tashkeel = MagicMock()
            mock_tashkeel.return_value = [
                TashkeelResult(tashkeel="مَرْحَبًا بِالْعَالَمِ", uncertainties=[])
            ]
            mock_get.return_value = (
                mock_tashkeel,
                MagicMock(),
                MagicMock(),
                MagicMock(),
            )

            sentences = ["مرحبا بالعالم"]
            translations = [
                TranslationResult(
                    translation="Hello world",
                    notes="Test notes",
                    uncertainties=[],
                    word_by_word=[
                        {
                            "arabic": "مرحبا",
                            "english": "hello",
                            "pos": "interjection",
                            "essential": "مرحبا",
                            "essential_translation": "hello",
                            "notes": "greeting",
                            "uncertainties": [],
                        }
                    ],
                )
            ]

            result = apply_tashkeel(sentences, translations)
            assert len(result) == 1
            assert "مَرْحَبًا" in result[0].tashkeel

    def test_translate_words_validation(self):
        """Test translate_words with validation."""
        from data.models import (
            TashkeelResult,
            TranslationResult,
            WordTranslationResult,
        )
        from utils.translation_processor import translate_words

        # Mock the translation engine function
        with patch(
            "utils.translation_processor._get_translation_engine_functions"
        ) as mock_get:
            mock_words = MagicMock()
            mock_words.return_value = [
                WordTranslationResult(
                    word_translations=[
                        {
                            "arabic": "مرحبا",
                            "english": "hello",
                            "pos": "interjection",
                            "essential": "مرحبا",
                            "essential_translation": "hello",
                            "notes": "greeting",
                            "uncertainties": [],
                        }
                    ]
                )
            ]
            mock_get.return_value = (MagicMock(), MagicMock(), MagicMock(), mock_words)

            sentences = ["مرحبا بالعالم"]
            tashkeel_results = [
                TashkeelResult(tashkeel="مَرْحَبًا بِالْعَالَمِ", uncertainties=[])
            ]
            translations = [
                TranslationResult(
                    translation="Hello world",
                    notes="Test notes",
                    uncertainties=[],
                    word_by_word=[
                        {
                            "arabic": "مرحبا",
                            "english": "hello",
                            "pos": "interjection",
                            "essential": "مرحبا",
                            "essential_translation": "hello",
                            "notes": "greeting",
                            "uncertainties": [],
                        }
                    ],
                )
            ]

            result = translate_words(sentences, tashkeel_results, translations)
            assert len(result) == 1
            assert len(result[0].word_translations) == 1
            assert result[0].word_translations[0].arabic == "مرحبا"
