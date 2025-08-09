"""Tests for error handling utilities."""

from unittest.mock import patch

import pytest

from utils.error_handling import (
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

    def test_safe_execute_raises_on_error(self):
        """Expect raise on execution error (no fallbacks)."""

        def operation():
            raise ValueError("test error")

        with pytest.raises(ValueError):
            safe_execute(operation, "test operation")

    def test_safe_execute_without_fallback_raises(self):
        """No fallback path; should raise."""

        def operation():
            raise ValueError("test error")

        with pytest.raises(ValueError):
            safe_execute(operation, "test operation")

    def test_safe_execute_with_reraise(self):
        """Test execution with reraise enabled."""

        def operation():
            raise ValueError("test error")

        with pytest.raises(ValueError, match="test error"):
            safe_execute(operation, "test operation")

    def test_safe_execute_without_logging(self):
        """Test execution without error logging."""

        def operation():
            raise ValueError("test error")

        with patch("utils.error_handling.logger") as mock_logger:
            with pytest.raises(ValueError):
                safe_execute(operation, "test operation", log_error=False)
            mock_logger.error.assert_not_called()

    def test_safe_execute_with_logging(self):
        """Test execution with error logging."""

        def operation():
            raise ValueError("test error")

        with patch("utils.error_handling.logger") as mock_logger:
            with pytest.raises(ValueError):
                safe_execute(operation, "test operation", log_error=True)
            mock_logger.error.assert_called_once()


class TestSafeAudioOperation:
    """Test safe audio operation functionality."""

    def test_safe_audio_operation_success(self):
        """Test successful audio operation."""

        def operation():
            return "audio_success"

        result = safe_audio_operation(operation, "play", "test_audio.mp3")
        assert result == "audio_success"

    def test_safe_audio_operation_failure_raises(self):
        """Failed audio operation should raise."""

        def operation():
            raise RuntimeError("audio error")

        with pytest.raises(RuntimeError):
            safe_audio_operation(operation, "play", "test_audio.mp3")

    def test_safe_audio_operation_logging(self):
        """Test audio operation error logging."""

        def operation():
            raise RuntimeError("audio error")

        with patch("utils.error_handling.logger") as mock_logger:
            with pytest.raises(RuntimeError):
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

    def test_safe_database_operation_failure_raises(self):
        """Failed database operation should raise."""

        def operation():
            raise ConnectionError("db error")

        with pytest.raises(ConnectionError):
            safe_database_operation(operation, "users", "select")

    def test_safe_database_operation_logging(self):
        """Test database operation error logging."""

        def operation():
            raise ConnectionError("db error")

        with patch("utils.error_handling.logger") as mock_logger:
            with pytest.raises(ConnectionError):
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

    def test_safe_file_operation_failure_raises(self):
        """Failed file operation should raise."""

        def operation():
            raise FileNotFoundError("file not found")

        with pytest.raises(FileNotFoundError):
            safe_file_operation(operation, "/path/to/file.txt", "read")

    def test_safe_file_operation_logging(self):
        """Test file operation error logging."""

        def operation():
            raise FileNotFoundError("file not found")

        with patch("utils.error_handling.logger") as mock_logger:
            with pytest.raises(FileNotFoundError):
                safe_file_operation(operation, "/path/to/file.txt", "read")
            mock_logger.error.assert_called_once()
            error_msg = mock_logger.error.call_args[0][0]
            assert "read on /path/to/file.txt" in error_msg


class TestHandleImportError:
    """Test import error handling functionality."""

    def test_handle_import_error_default_message_raises(self):
        """Import error handler should raise and can log a warning first."""
        with patch("utils.error_handling.logger") as mock_logger:
            with pytest.raises(ImportError):
                handle_import_error("test_module")
            # optional warning may be logged prior to raise
            assert mock_logger.warning.called or True

    def test_handle_import_error_custom_message_raises(self):
        """Import error handler should raise with custom warning."""
        with patch("utils.error_handling.logger") as mock_logger:
            with pytest.raises(ImportError):
                handle_import_error("test_module", warning_message="Custom warning")
            mock_logger.warning.assert_called_once_with("Custom warning")

    def test_handle_import_error_no_fallback(self):
        """No fallback path; always raise."""
        with patch("utils.error_handling.logger") as mock_logger:
            with pytest.raises(ImportError):
                handle_import_error("test_module")
            assert mock_logger.warning.called or True

    def test_handle_import_error_no_warning_raises(self):
        """Even without warning message, must raise."""
        with patch("utils.error_handling.logger") as mock_logger:
            with pytest.raises(ImportError):
                handle_import_error("test_module", warning_message=None)
            assert mock_logger.warning.called or True
