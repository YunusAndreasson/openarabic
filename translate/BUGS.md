# Potential Issues in Translation System

Below are some observations that might lead to bugs or unexpected behaviour:

- `cache_utils.ensure_valid_cache_files()` assumes the cache directory exists. If called before `audio_utils` creates `AUDIO_CACHE_DIR`, a `FileNotFoundError` can occur.
- Several functions in `core` modules call `sys.exit()` on failure (e.g. in `translate.py` and `batch_operations.py`). Using exits inside library code may terminate long running processes unexpectedly.
- `audio_utils.generate_sentence_audio()` uploads a file using `open(temp_audio_path, "rb")` without explicitly closing it, which might leak file descriptors under heavy load.
- `storage_utils.upload_to_storage()` relies on repeated polling with `time.sleep()` to verify uploads which may cause delays; failed uploads could leave temporary files behind.
- `main.py` ignores the value returned from `run_split_file()`; if the output path is ever changed, `run_translation()` may read the wrong file.
- Environment variables like `SUPABASE_URL`, `SUPABASE_KEY`, and `ELEVENLABS_API_KEY` are required at import time. Missing variables raise errors before the app can handle them gracefully.
- `main.py`'s `run_pipeline()` prompts the user but does not respect the confirmation result, so translation continues even when the user answers "no".
- Temporary audio files created by `generate_sentence_audio()`, `generate_arabic_word_audio()`, and `generate_english_word_audio()` are never removed after uploading, which can eventually fill up disk space.

These areas could benefit from additional validation and error handling.
