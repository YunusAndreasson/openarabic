"""Tests for error handling utilities."""

from unittest.mock import patch

import pytest

from translate.utils.error_handling import (
    handle_import_error,
    safe_audio_operation,
    safe_database_operation,
    safe_execute,
    safe_file_operation,
)


class TestSafeExecute:
    """Test safe execution functionality."""

    def test_safe_execute_success(self):
        """Test successful execution."""

        def operation():
            return "success"

        result = safe_execute(operation, "test operation")
        assert result == "success"

    def test_safe_execute_with_fallback(self):
        """Test execution with fallback value."""

        def operation():
            raise ValueError("test error")

        result = safe_execute(operation, "test operation", fallback_value="fallback")
        assert result == "fallback"

    def test_safe_execute_without_fallback(self):
        """Test execution without fallback value."""

        def operation():
            raise ValueError("test error")

        result = safe_execute(operation, "test operation")
        assert result is None

    def test_safe_execute_with_reraise(self):
        """Test execution with reraise enabled."""

        def operation():
            raise ValueError("test error")

        with pytest.raises(ValueError, match="test error"):
            safe_execute(operation, "test operation", reraise=True)

    def test_safe_execute_without_logging(self):
        """Test execution without error logging."""

        def operation():
            raise ValueError("test error")

        with patch("translate.utils.error_handling.logger") as mock_logger:
            result = safe_execute(operation, "test operation", log_error=False)
            assert result is None
            mock_logger.error.assert_not_called()

    def test_safe_execute_with_logging(self):
        """Test execution with error logging."""

        def operation():
            raise ValueError("test error")

        with patch("translate.utils.error_handling.logger") as mock_logger:
            result = safe_execute(operation, "test operation", log_error=True)
            assert result is None
            mock_logger.error.assert_called_once()


class TestSafeAudioOperation:
    """Test safe audio operation functionality."""

    def test_safe_audio_operation_success(self):
        """Test successful audio operation."""

        def operation():
            return "audio_success"

        result = safe_audio_operation(operation, "play", "test_audio.mp3")
        assert result == "audio_success"

    def test_safe_audio_operation_failure(self):
        """Test failed audio operation."""

        def operation():
            raise RuntimeError("audio error")

        result = safe_audio_operation(
            operation, "play", "test_audio.mp3", fallback_value="fallback"
        )
        assert result == "fallback"

    def test_safe_audio_operation_logging(self):
        """Test audio operation error logging."""

        def operation():
            raise RuntimeError("audio error")

        with patch("translate.utils.error_handling.logger") as mock_logger:
            safe_audio_operation(operation, "play", "test_audio.mp3")
            mock_logger.error.assert_called_once()
            error_msg = mock_logger.error.call_args[0][0]
            assert "play 'test_audio.mp3'" in error_msg


class TestSafeDatabaseOperation:
    """Test safe database operation functionality."""

    def test_safe_database_operation_success(self):
        """Test successful database operation."""

        def operation():
            return "db_success"

        result = safe_database_operation(operation, "users", "select")
        assert result == "db_success"

    def test_safe_database_operation_failure(self):
        """Test failed database operation."""

        def operation():
            raise ConnectionError("db error")

        result = safe_database_operation(
            operation, "users", "select", fallback_value="fallback"
        )
        assert result == "fallback"

    def test_safe_database_operation_logging(self):
        """Test database operation error logging."""

        def operation():
            raise ConnectionError("db error")

        with patch("translate.utils.error_handling.logger") as mock_logger:
            safe_database_operation(operation, "users", "select")
            mock_logger.error.assert_called_once()
            error_msg = mock_logger.error.call_args[0][0]
            assert "select on users" in error_msg


class TestSafeFileOperation:
    """Test safe file operation functionality."""

    def test_safe_file_operation_success(self):
        """Test successful file operation."""

        def operation():
            return "file_success"

        result = safe_file_operation(operation, "/path/to/file.txt", "read")
        assert result == "file_success"

    def test_safe_file_operation_failure(self):
        """Test failed file operation."""

        def operation():
            raise FileNotFoundError("file not found")

        result = safe_file_operation(
            operation, "/path/to/file.txt", "read", fallback_value="fallback"
        )
        assert result == "fallback"

    def test_safe_file_operation_logging(self):
        """Test file operation error logging."""

        def operation():
            raise FileNotFoundError("file not found")

        with patch("translate.utils.error_handling.logger") as mock_logger:
            safe_file_operation(operation, "/path/to/file.txt", "read")
            mock_logger.error.assert_called_once()
            error_msg = mock_logger.error.call_args[0][0]
            assert "read on /path/to/file.txt" in error_msg


class TestHandleImportError:
    """Test import error handling functionality."""

    def test_handle_import_error_default_message(self):
        """Test import error handling with default message."""
        with patch("translate.utils.error_handling.logger") as mock_logger:
            result = handle_import_error("test_module")
            assert result is None
            mock_logger.warning.assert_called_once()
            warning_msg = mock_logger.warning.call_args[0][0]
            assert "Module 'test_module' not available" in warning_msg

    def test_handle_import_error_custom_message(self):
        """Test import error handling with custom message."""
        with patch("translate.utils.error_handling.logger") as mock_logger:
            result = handle_import_error(
                "test_module", warning_message="Custom warning"
            )
            assert result is None
            mock_logger.warning.assert_called_once_with("Custom warning")

    def test_handle_import_error_with_fallback(self):
        """Test import error handling with fallback value."""
        with patch("translate.utils.error_handling.logger") as mock_logger:
            result = handle_import_error("test_module", fallback_value="fallback_value")
            assert result == "fallback_value"
            mock_logger.warning.assert_called_once()

    def test_handle_import_error_no_warning(self):
        """Test import error handling without warning message."""
        with patch("translate.utils.error_handling.logger") as mock_logger:
            result = handle_import_error("test_module", warning_message=None)
            assert result is None
            mock_logger.warning.assert_called_once()
            warning_msg = mock_logger.warning.call_args[0][0]
            assert "Module 'test_module' not available" in warning_msg
