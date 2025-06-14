from pathlib import Path

from translate.core.audio_utils import AUDIO_CACHE_DIR


def ensure_valid_cache_files() -> None:
    """Ensure all files in the cache directory have a .mp3 extension."""
    cache_dir = Path(AUDIO_CACHE_DIR)
    fixed_count = 0

    for file_path in cache_dir.iterdir():
        if file_path.is_file() and not file_path.name.startswith('.'):
            if file_path.suffix == '':
                new_path = file_path.with_suffix('.mp3')
                try:
                    file_path.rename(new_path)
                    fixed_count += 1
                except Exception as e:
                    print(f"Error fixing cache file {file_path.name}: {str(e)}")

    if fixed_count > 0:
        print(f"Fixed {fixed_count} cache files with missing extensions")
