"""Tests for cache utilities."""

from unittest.mock import patch

from utils.cache_utils import ensure_valid_cache_files


class TestEnsureValidCacheFiles:
    """Test cache file validation functionality."""

    def test_ensure_valid_cache_files_empty_directory(self, tmp_path):
        """Test with empty cache directory."""
        with patch("utils.cache_utils.AUDIO_CACHE_DIR", str(tmp_path)):
            with patch("utils.cache_utils.logger") as mock_logger:
                ensure_valid_cache_files()
                mock_logger.info.assert_not_called()

    def test_ensure_valid_cache_files_with_valid_files(self, tmp_path):
        """Test with files that already have .mp3 extension."""
        # Create files with .mp3 extension
        (tmp_path / "file1.mp3").touch()
        (tmp_path / "file2.mp3").touch()

        with patch("utils.cache_utils.AUDIO_CACHE_DIR", str(tmp_path)):
            with patch("utils.cache_utils.logger") as mock_logger:
                ensure_valid_cache_files()
                mock_logger.info.assert_not_called()

    def test_ensure_valid_cache_files_fixes_extensions(self, tmp_path):
        """Test fixing files without .mp3 extension."""
        # Create files without extension
        (tmp_path / "file1").touch()
        (tmp_path / "file2").touch()

        with patch("utils.cache_utils.AUDIO_CACHE_DIR", str(tmp_path)):
            with patch("utils.cache_utils.logger") as mock_logger:
                ensure_valid_cache_files()

                # Check that files were renamed
                assert (tmp_path / "file1.mp3").exists()
                assert (tmp_path / "file2.mp3").exists()
                assert not (tmp_path / "file1").exists()
                assert not (tmp_path / "file2").exists()

                # Check logging
                mock_logger.info.assert_called_once_with(
                    "✅ Fixed 2 cache files by adding .mp3 extension"
                )

    def test_ensure_valid_cache_files_ignores_hidden_files(self, tmp_path):
        """Test that hidden files are ignored."""
        # Create hidden file without extension
        (tmp_path / ".hidden_file").touch()

        with patch("utils.cache_utils.AUDIO_CACHE_DIR", str(tmp_path)):
            with patch("utils.cache_utils.logger") as mock_logger:
                ensure_valid_cache_files()
                mock_logger.info.assert_not_called()
                assert (tmp_path / ".hidden_file").exists()  # Should not be renamed

    def test_ensure_valid_cache_files_ignores_directories(self, tmp_path):
        """Test that directories are ignored."""
        # Create a directory
        (tmp_path / "subdir").mkdir()

        with patch("utils.cache_utils.AUDIO_CACHE_DIR", str(tmp_path)):
            with patch("utils.cache_utils.logger") as mock_logger:
                ensure_valid_cache_files()
                mock_logger.info.assert_not_called()

    def test_ensure_valid_cache_files_handles_rename_errors(self, tmp_path):
        """Test handling of rename errors."""
        # Create a file without extension
        (tmp_path / "file1").touch()

        # Mock rename to raise an exception
        with patch("utils.cache_utils.AUDIO_CACHE_DIR", str(tmp_path)):
            with patch("pathlib.Path.rename") as mock_rename:
                mock_rename.side_effect = OSError("Permission denied")

                with patch("utils.cache_utils.logger") as mock_logger:
                    ensure_valid_cache_files()

                    # Should log error but continue
                    mock_logger.error.assert_called_once()
                    error_msg = mock_logger.error.call_args[0][0]
                    assert "Error fixing cache file file1" in error_msg
                    assert "Permission denied" in error_msg

    def test_ensure_valid_cache_files_mixed_scenario(self, tmp_path):
        """Test mixed scenario with various file types."""
        # Create various files
        (tmp_path / "file1").touch()  # No extension
        (tmp_path / "file2.mp3").touch()  # Already has extension
        (tmp_path / ".hidden").touch()  # Hidden file
        (tmp_path / "subdir").mkdir()  # Directory

        with patch("utils.cache_utils.AUDIO_CACHE_DIR", str(tmp_path)):
            with patch("utils.cache_utils.logger") as mock_logger:
                ensure_valid_cache_files()

                # Only file1 should be fixed
                assert (tmp_path / "file1.mp3").exists()
                assert (tmp_path / "file2.mp3").exists()
                assert (tmp_path / ".hidden").exists()
                assert (tmp_path / "subdir").exists()

                mock_logger.info.assert_called_once_with(
                    "✅ Fixed 1 cache files by adding .mp3 extension"
                )

    def test_ensure_valid_cache_files_creates_directory_if_not_exists(self, tmp_path):
        """Test that cache directory is created if it doesn't exist."""
        cache_dir = tmp_path / "nonexistent_cache"

        with patch("utils.cache_utils.AUDIO_CACHE_DIR", str(cache_dir)):
            with patch("utils.cache_utils.logger") as mock_logger:
                ensure_valid_cache_files()

                assert cache_dir.exists()
                mock_logger.info.assert_not_called()
