# Arabic Translation Pipeline

A comprehensive pipeline for translating Arabic text to English with audio generation and database storage.

## Architecture Overview

The pipeline is organized into clear, focused modules:

### Core Pipeline (`pipeline/`)

- **`split_file.py`** - Splits input text into sentences
- **`translate.py`** - Orchestrates the translation process
- **`translation_engine.py`** - Core AI translation operations (renamed from batch_operations.py)
- **`insert.py`** - Database insertion and audio processing

### Utilities (`utils/`)

- **`translation_processor.py`** - Translation workflow management (renamed from batch_utils.py)
- **`api_utils.py`** - OpenAI API integration (renamed from utils.py)
- **`database_utils.py`** - Database operations and validation
- **`storage_utils.py`** - Supabase storage operations
- **`text_utils.py`** - Text processing utilities
- **`validation.py`** - Data validation
- **`file_utils.py`** - File I/O operations
- **`cache_utils.py`** - Cache management
- **`arabic_text.py`** - Arabic text processing
- **`set_keys.py`** - API key management
- **`setup.py`** - Environment setup

### Data (`data/`)

- **`config.py`** - Configuration constants
- **`models.py`** - Pydantic data models
- **`schemas.py`** - API schemas and prompts

## Pipeline Flow

1. **Split** (`split_file.py`) - Break input text into sentences
2. **Translate** (`translate.py` + `translation_engine.py`) - AI-powered translation
3. **Insert** (`insert.py`) - Database storage and audio generation

## Usage

```bash
# Full pipeline
python main.py --split --translate --insert

# Individual phases
python main.py --split
python main.py --translate
python main.py --insert
```

## Key Improvements

- **Clear naming**: `batch_operations.py` → `translation_engine.py`
- **Logical grouping**: Translation processing separated from core engine
- **API focus**: `utils.py` → `api_utils.py` for OpenAI integration
- **Modular design**: Each module has a single, clear responsibility
