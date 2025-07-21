# Arabic Translation Pipeline

A comprehensive pipeline for translating Arabic text to English with audio generation and database storage.

## Pipeline Overview

The pipeline processes Arabic text through three distinct phases, each with specific inputs, outputs, and data types:

```
Input Text → [SPLIT] → [TRANSLATE] → [INSERT] → Database + Audio
```

## Pipeline Phases

### Phase 1: Split (`split_file.py`)

**Purpose**: Intelligently split raw Arabic text into learner-friendly sentences and analyze content

**Input**:

- `str` - Raw Arabic text file (default: `input.txt`)

**Output**:

- `SplitResult` - Pydantic model with structure:
  ```python
  SplitResult(
    units: list[str],                    # Array of text units/sentences
    title: str,                         # Concise English title (3-7 words)
    summary: str,                       # One-sentence summary of main content
    difficulty_level: int,              # Difficulty rating (1-5)
    total_units: int,                   # Total number of units
    unit_types: list[str] | None        # Type of each unit (simple, compound, etc.)
  )
  ```

**API Response Type**: `SplitAPIResponse` - Matches OpenAI function schema

**Key Features**:

- Uses GPT-4.1 for intelligent sentence splitting
- Analyzes content difficulty and generates metadata
- Creates learner-friendly units (not just mechanical splits)
- Supports unit type classification (simple, compound, condition, quote, verse, phrase)

### Phase 2: Translate (`translate.py` + `translation_engine.py`)

**Purpose**: Translate Arabic sentences to English with word-by-word analysis

**Input**:

- `SplitResult` - Split data from Phase 1
- `list[str]` - Individual sentences to translate

**Output**:

- `list[SentenceTranslation]` - Complete translations with structure:
  ```python
  SentenceTranslation(
    index: int,                         # Sentence position
    original: str,                      # Original Arabic
    tashkeel: str,                     # Arabic with diacritics
    word_by_word: list[WordTranslation], # Individual word translations
    full_translation: str,             # Complete English translation
    notes: str | None,                 # Translation notes
    verification_status: str | None,   # Quality verification
    verification_issues: list[str] | None
  )
  ```

**Word Translation Structure**:

```python
WordTranslation(
  arabic: str,                         # Arabic word
  english: str,                        # English translation
  pos: str | None,                     # Part of speech
  essential: str | None,               # Root letters for flashcards
  essential_translation: str | None,   # One-word meaning
  notes: str | None                    # Special notes
)
```

**Key Features**:

- Batch processing with context optimization
- Multi-step translation: basic → tashkeel → word analysis → refinement
- Comprehensive error handling and uncertainty tracking
- Context-aware translations using surrounding sentences

### Phase 3: Insert (`insert.py`)

**Purpose**: Store translations in database and generate audio files

**Input**:

- `list[SentenceTranslation]` - Complete translations from Phase 2
- `TextMetadata` - Article metadata (title, summary, difficulty)

**Output**:

- Database records in Supabase tables
- Audio files via ElevenLabs API
- Audio URLs stored in database

**Audio Generation Result**:

```python
AudioResult(
  url: str,                            # Audio file URL in storage
  word_timings: list[WordTiming],      # Word-level timing information
  filename: str | None,                # Generated filename
  duration: float | None               # Audio duration in seconds
)

WordTiming(
  word: str,                           # Original Arabic word
  cleaned_word: str,                   # Cleaned word for matching
  start_time: str,                     # Start time in seconds
  end_time: str                        # End time in seconds
)
```

**Article Data Structure**:

```python
ArticleData(
  title: str,                          # Article title
  summary: str,                        # Article summary
  difficulty_level: int,               # Difficulty level (1-5)
  category_id: int,                    # Category ID in database
  author_id: int,                      # Author ID in database
  content_hash: str,                   # SHA-256 hash for deduplication
  created_at: str                      # ISO format timestamp
)
```

**Database Schema**:

- `articles` - Article metadata and content hash
- `article_sentences` - Individual sentence translations with audio URLs
- `words` - Individual word translations for vocabulary learning

**Key Features**:

- Content deduplication using SHA-256 hashing
- Audio generation with context for better quality
- Comprehensive error handling and rollback
- Timing reports for performance monitoring

## Data Flow Between Phases

```
Phase 1 (Split):
  input.txt → split_file.py → input_split.json
  [str] → [SplitResult]

Phase 2 (Translate):
  input_split.json → translate.py → input_translated.json
  [SplitResult] → [list[SentenceTranslation]]

Phase 3 (Insert):
  input_translated.json → insert.py → Database + Audio Files
  [list[SentenceTranslation]] → [Database Records + AudioResult]
```

## Type Safety

The pipeline uses comprehensive type safety with:

- **Pydantic Models**: `SplitResult`, `AudioResult`, `WordTiming`, `ArticleData`
- **TypedDict Aliases**: `SplitAPIResponse`, `AudioGenerationResult`, `ArticleInsertData`
- **Validation**: Field constraints (e.g., difficulty_level 1-5, non-empty strings)
- **Documentation**: Detailed field descriptions for IDE support

## Usage

### Full Pipeline (All Phases)

```bash
# Install dependencies
cd translate
uv sync

# Run complete pipeline
python main.py --split --translate --insert
```

### Individual Phases

```bash
# Phase 1: Split text into sentences
python main.py --split

# Phase 2: Translate sentences (requires split file)
python main.py --translate

# Phase 3: Insert into database (requires translation file)
python main.py --insert
```

### Interactive Mode

```bash
# Run with user confirmation between phases
python main.py --split --translate --insert --interactive
```

## Configuration

### Input/Output Files

- **Input**: `input.txt` (default) - Raw Arabic text
- **Split Output**: `input_split.json` - Sentence splits and metadata
- **Translation Output**: `input_translated.json` - Complete translations
- **Audio Output**: `audio/` directory - Generated audio files

### Batch Processing

- **Default Batch Size**: 5 sentences per API call
- **Context Window**: 2 sentences before/after for context
- **Retry Logic**: Exponential backoff for API failures

## Code Quality

The codebase follows modern Python 3.12 best practices:

- **Type Safety**: Comprehensive type hints with Pydantic models
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
- **Multi-Phase Processing**: Clear separation of concerns with explicit data types
- **Audio Integration**: ElevenLabs API integration for high-quality Arabic audio
- **Database Integration**: Supabase for scalable data storage and retrieval
- **Type Safety**: Pydantic models and TypedDict aliases for comprehensive type checking
