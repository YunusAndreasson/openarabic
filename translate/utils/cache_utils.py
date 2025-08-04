import logging
from pathlib import Path

from data.config import AUDIO_CACHE_DIR

logger = logging.getLogger(__name__)


def ensure_valid_cache_files() -> None:
    """Ensure all files in the cache directory have a .mp3 extension."""
    cache_dir = Path(AUDIO_CACHE_DIR)
    cache_dir.mkdir(parents=True, exist_ok=True)
    fixed_count = 0

    for file_path in cache_dir.iterdir():
        if file_path.is_file() and not file_path.name.startswith("."):
            if file_path.suffix == "":
                new_path = file_path.with_suffix(".mp3")
                try:
                    file_path.rename(new_path)
                    fixed_count += 1
                except Exception as e:
                    logger.error(f"Error fixing cache file {file_path.name}: {str(e)}")

    if fixed_count > 0:
        pass  # Cache file fixing info removed to reduce noise
