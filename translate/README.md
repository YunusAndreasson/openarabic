# Arabic Translation Pipeline

A comprehensive pipeline for translating Arabic text to English with audio generation and database storage.

## Architecture Overview

The pipeline is organized into clear, focused modules:

### Core Pipeline (`pipeline/`)

- **`split_file.py`** - Splits input text into sentences
- **`translate.py`** - Orchestrates the translation process
- **`translation_engine.py`** - Core AI translation operations with proper error handling
- **`insert.py`** - Database insertion and audio processing

### Utilities (`utils/`)

- **`exceptions.py`** - Custom domain-specific exceptions
- **`translation_processor.py`** - Translation workflow management
- **`api_utils.py`** - OpenAI API integration with retry logic
- **`database_utils.py`** - Database operations and validation
- **`storage_utils.py`** - Supabase storage operations with singleton pattern
- **`text_utils.py`** - Text processing utilities
- **`validation.py`** - Data validation
- **`file_utils.py`** - File I/O operations
- **`cache_utils.py`** - Cache management
- **`arabic_text.py`** - Arabic text processing
- **`set_keys.py`** - API key management
- **`setup.py`** - Environment setup

### Data (`data/`)

- **`config.py`** - Configuration constants with correct model names
- **`models.py`** - Pydantic data models
- **`schemas.py`** - API schemas and prompts

### Audio (`audio/`)

- **`audio_utils.py`** - Audio generation with ElevenLabs API
- **`root_audio.py`** - Root word audio processing

## Pipeline Flow

1. **Split** (`split_file.py`) - Break input text into sentences
2. **Translate** (`translate.py` + `translation_engine.py`) - AI-powered translation
3. **Insert** (`insert.py`) - Database storage and audio generation

## Usage

```bash
# Activate virtual environment
cd translate
source venv/bin/activate

# Full pipeline
python main.py --split --translate --insert

# Individual phases
python main.py --split
python main.py --translate
python main.py --insert
```

## Code Quality

The codebase follows modern Python 3.12 best practices:

- **Type Safety**: Modern union types (`|`) and comprehensive type hints
- **Error Handling**: Custom domain-specific exceptions with proper chaining
- **Resource Management**: Context managers for automatic cleanup
- **State Management**: Singleton patterns instead of global variables
- **Configuration**: Valid OpenAI model names and proper validation

## Development

```bash
# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies using uv
uv sync

# Install development dependencies
uv sync --dev

# Run code quality checks
uv run ruff check . --output-format=full
uv run ruff format --check .

# Run tests
uv run pytest tests/ -v
```

## Key Features

- **Modern Python 3.12**: Uses latest language features and type hints
- **Robust Error Handling**: Custom exceptions with proper error chaining
- **Resource Safety**: Context managers for automatic resource cleanup
- **Clean Architecture**: Modular design with single responsibilities
- **Comprehensive Testing**: 37%+ test coverage with mocked external dependencies
- **Production Ready**: Proper configuration validation and error handling
- **Fast Package Management**: Uses uv for lightning-fast dependency resolution
