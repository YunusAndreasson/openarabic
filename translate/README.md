# Arabic Translation Pipeline

A sophisticated multi-stage pipeline for processing Arabic texts through AI-powered translation, morphological analysis, and database insertion.

## Pipeline Structure

The pipeline uses a numbered directory system to organize files by processing phase:

```
translate/
├── 0_inbox/                    # Raw input files organized by author
│   ├── 1_al_imam_an_nawawi/
│   ├── 2_ibn_al_qayyim_al_jawziyyah/
│   ├── 3_ibn_taymiyyah/
│   ├── 4_ibn_al_jawzi/
│   ├── 5_ibn_kathir/
│   ├── 6_al_imam_al_bukhari/
│   ├── 7_al_imam_muslim/
│   ├── 8_ibn_hajar_al_asqalani/
│   ├── 9_al_imam_malik/
│   ├── 10_al_imam_ash_shafii/
│   ├── 11_al_imam_ahmad_ibn_hanbal/
│   ├── 12_al_imam_at_tirmidhi/
│   ├── 13_al_imam_as_suyuti/
│   ├── 14_at_tabari/
│   └── 15_al_imam_al_dhahabi/
├── 1_split/                    # Sentence-split files (flat structure)
├── 2_translate/                # Translated files (flat structure)
├── 3_insert/                   # Final processed files (flat structure)
├── archive/                    # Processed files archive
├── audio_cache/                # Audio file caching
├── pipeline/                   # Core processing modules
├── data/                       # Configuration and data models
├── utils/                      # Utility functions
└── tests/                      # Test suite
```

## Translation Pipeline Architecture

The pipeline uses a sophisticated 6-stage process:

### Stage 0: Intelligent Text Splitting

- **Function**: `split_text_into_sentences`
- **Model**: GPT-4o-mini for content analysis
- **Features**: AI-powered text analysis and learner-friendly unit creation
- **Output**: Structured units with metadata, difficulty assessment, and unit types

### Stage 1: Sentence Translation

- **Function**: `batch_translate_full_sentences`
- **Model**: GPT-4o-mini for high-volume processing
- **Features**: Context-aware translation with fallback logic
- **Output**: Initial translation with uncertainties and grammar notes

### Stage 2: Tashkeel Generation

- **Function**: `batch_add_tashkeel`
- **Primary Tool**: Camel-tools for morphological analysis
- **Integration**: OpenAI for refinement and verification
- **Output**: Complete diacritical marks (fatḥa, kasra, ḍamma, sukūn, shadda, tanwīn)

### Stage 3: Word-by-Word Translation

- **Function**: `batch_translate_words`
- **Features**: Individual word analysis with essential root extraction
- **Output**: Multiple translation options per word with POS tagging

### Stage 4: Google Cloud Integration

- **Function**: `batch_translate_root_words_with_google_cloud`
- **Purpose**: Fallback translations when OpenAI fails
- **Features**: Retry logic with exponential backoff
- **API**: Google Cloud Translate v3

### Stage 5: Final Verification

- **Function**: `batch_refine_translations`
- **Model**: GPT-4o for quality-critical verification
- **Purpose**: Resolve ambiguities and select best options
- **Output**: Finalized translation with comprehensive uncertainty tracking

## Workflow

### Phase 1: Input Preparation

1. Place `.txt` files in the appropriate author folder under `0_inbox/`
2. The folder name determines which author the article will be assigned to
3. Example: `0_inbox/5_ibn_kathir/my_article.txt`

### Phase 2: Intelligent Splitting

```bash
uv run python main.py --split
```

- Processes all `.txt` files from `0_inbox/`
- **Content Analysis**: AI-powered analysis of Islamic text content
- **Intelligent Splitting**: Creates learner-friendly units based on:
  - Complete thoughts and distinct clauses
  - Natural punctuation and learning boundaries
  - Quran verses (kept intact)
  - Narrator chains (broken appropriately)
  - Brief prayers (kept whole)
  - Related phrases conveying single concepts
- **Metadata Generation**:
  - **Title**: Concise English title (3-7 words)
  - **Summary**: One-sentence summary of main content
  - **Difficulty Level**: 1-5 rating (Basic to Expert)
  - **Unit Types**: Classification (simple, compound, condition, quote, verse, phrase)
- Saves results to `1_split/` with author folder structure
- Automatically proceeds to next phase when complete

### Phase 3: Translation

```bash
uv run python main.py --translate
```

- Processes all split files from `1_split/`
- Executes 5-stage translation pipeline:
  1. Sentence translation with GPT-4o-mini
  2. Tashkeel generation with camel-tools + OpenAI
  3. Word-by-word analysis with multiple options
  4. Google Cloud fallback translations
  5. Final verification with GPT-4o
- Saves results to `2_translate/` with author folder structure
- Automatically proceeds to next phase when complete

### Phase 4: Database Insertion

```bash
uv run python main.py --insert
```

- Processes all translated files from `2_translate/`
- Generates audio for sentences using ElevenLabs
- Inserts articles into database with correct author assignment
- Archives processed files

### Full Pipeline

```bash
uv run python main.py --split --translate --insert
```

## Command Line Interface

The pipeline supports the following arguments:

- `--split` - Split input files from 0_inbox into sentences
- `--translate` - Translate split files
- `--insert` - Process through ElevenLabs and insert into database
- `--batch-size` / `-b` - Batch size for translation (default: 12, max: 15)

## Author Mapping

The pipeline automatically maps folder names to database authors:

| Folder                         | Author Name                |
| ------------------------------ | -------------------------- |
| `1_al_imam_an_nawawi`          | al-Imam an-Nawawi          |
| `2_ibn_al_qayyim_al_jawziyyah` | Ibn al-Qayyim al-Jawziyyah |
| `3_ibn_taymiyyah`              | Ibn Taymiyyah              |
| `4_ibn_al_jawzi`               | Ibn al-Jawzi               |
| `5_ibn_kathir`                 | Ibn Kathir                 |
| `6_al_imam_al_bukhari`         | al-Imam al-Bukhari         |
| `7_al_imam_muslim`             | al-Imam Muslim             |
| `8_ibn_hajar_al_asqalani`      | Ibn Hajar al-Asqalani      |
| `9_al_imam_malik`              | al-Imam Malik              |
| `10_al_imam_ash_shafii`        | al-Imam ash-Shafii         |
| `11_al_imam_ahmad_ibn_hanbal`  | al-Imam Ahmad ibn Hanbal   |
| `12_al_imam_at_tirmidhi`       | al-Imam at-Tirmidhi        |
| `13_al_imam_as_suyuti`         | al-Imam as-Suyuti          |
| `14_at_tabari`                 | at-Tabari                  |
| `15_al_imam_al_dhahabi`        | al-Imam al-Dhahabi         |

## File Naming Convention

### Input Files

- Place `.txt` files in author folders under `0_inbox/`
- Example: `0_inbox/5_ibn_kathir/my_article.txt`

### Processed Files (Flat Structure)

- **Split files**: `{author_number}_{article_name}_split.json`
- **Translated files**: `{author_number}_{article_name}_translated.json`

### Examples

- Input: `0_inbox/5_ibn_kathir/test_article.txt`
- Split: `1_split/5_test_article_split.json`
- Translated: `2_translate/5_test_article_translated.json`

## Translation Features

### Intelligent Text Splitting

- **Content Analysis**: AI-powered analysis of Islamic text content
- **Learner-Friendly Units**: Creates optimal learning segments
- **Metadata Generation**: Title, summary, difficulty level, unit types
- **Special Handling**: Quran verses, narrator chains, prayers, related phrases
- **Format Preservation**: Maintains all original formatting and punctuation

### Word-by-Word Translation

- **Essential Letter Extraction**: Strips affixes/suffixes to find root letters
- **Multiple Options**: Provides 1-3 translation options per word
- **Part-of-Speech Tagging**: Identifies grammatical function
- **Grammatical Notes**: Context and usage information
- **Uncertainty Tracking**: Documents ambiguous translations

### Tashkeel Processing

- **Camel-Tools Integration**: Uses Calima MSA database for morphological analysis
- **Complete Vocalization**: Adds all necessary diacritical marks
- **Grammatical Accuracy**: Ensures proper case endings and verb forms
- **Format Preservation**: Maintains original text structure
- **Quality Verification**: OpenAI refinement for accuracy

### Quality Assurance

- **Multi-Stage Verification**: 6-stage pipeline with quality checks
- **Ambiguity Resolution**: Resolves uncertain translations
- **Consistency Checks**: Ensures grammatical and terminological consistency
- **Comprehensive Tracking**: Documents all uncertainties and resolutions

## Difficulty Levels

The pipeline automatically assesses text difficulty:

| Level            | Description                                           |
| ---------------- | ----------------------------------------------------- |
| 1 (Basic)        | Simple vocabulary and grammar                         |
| 2 (Elementary)   | Common vocabulary with basic grammar structures       |
| 3 (Intermediate) | Mixed vocabulary with moderate grammar complexity     |
| 4 (Advanced)     | Specialized vocabulary with complex grammar           |
| 5 (Expert)       | Technical/scholarly vocabulary with intricate grammar |

## Unit Types

Split units are classified into types:

- **simple**: Basic sentence structures
- **compound**: Complex sentence structures
- **condition**: Conditional statements
- **quote**: Direct quotations or narrations
- **verse**: Quranic verses
- **phrase**: Short phrases or expressions

## Configuration

- **Batch size**: Default 12, maximum 15, configurable with `--batch-size`
- **AI Models**:
  - GPT-4o-mini for high-volume phases (analysis, translation)
  - GPT-4o for quality-critical verification phase
- **Voice Configuration**:
  - **Sentences**: ElevenLabs Rachel (21m00Tcm4TlvDq8ikWAM) - multilingual voice supporting Arabic
  - **Single Words**: Google Cloud TTS - ar-XA-Wavenet-A (Arabic) and en-US-Wavenet-A (English) - Premium Wavenet Voices
- **Translation Settings**:
  - Root word batch size: 100
  - Retry attempts: 3
  - Timeout: 30 seconds
- **Audio generation**: Enabled if ElevenLabs API key is available

## Requirements

- Python 3.12 or higher
- UV package manager (version 0.8.0+)
- Dependencies: openai, pydantic, tqdm, supabase, python-dotenv, elevenlabs, google-cloud-translate, google-cloud-texttospeech, camel-tools, and others

## Environment Setup

### UV Package Manager

The project uses UV for package management:

```bash
# Install dependencies
uv sync

# Run with UV
uv run python main.py --help

# Development dependencies
uv sync --dev

# Validation
uv run ruff check .
uv run mypy .
uv run pytest
```

### Environment Activation

UV automatically manages the virtual environment:

- **Automatic**: Use `uv run` for all commands
- **Manual**: `source .venv/bin/activate` (if needed)

## API Setup

### OpenAI API (Required)

Set your OpenAI API key:

```bash
export OPENAI_API_KEY="your_openai_api_key_here"
```

Optional: Set organization ID for billing:

```bash
export OPENAI_ORG_ID="your_organization_id_here"
```

### Google Cloud Translate API (Required for root word translation)

For individual root word translation, set up Google Cloud Translate:

1. **Create a Google Cloud Project**:

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Note your Project ID

2. **Enable the Cloud Translation API**:

   - In the Google Cloud Console, go to "APIs & Services" > "Library"
   - Search for "Cloud Translation API"
   - Click "Enable"

3. **Create API Credentials**:

   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key

4. **Create Service Account Credentials**:

   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in service account details and click "Create"
   - Click "Create Key" > "JSON" and download the credentials file
   - Save the JSON file securely (e.g., `~/google-credentials.json`)

5. **Set Environment Variables**:
   ```bash
   export GOOGLE_CLOUD_PROJECT_ID="your_project_id_here"
   export GOOGLE_CLOUD_CREDENTIALS_PATH="~/google-credentials.json"
   ```

### Google Cloud Text-to-Speech API (Required for single word audio)

For single word audio generation, set up Google Cloud TTS:

1. **Enable the Text-to-Speech API**:

   - In the Google Cloud Console, go to "APIs & Services" > "Library"
   - Search for "Text-to-Speech API"
   - Click "Enable"

2. **Use Existing Credentials**:

   - The same service account credentials used for Google Cloud Translate will work
   - Ensure your JSON credentials file has access to the Text-to-Speech API
   - The `GOOGLE_CLOUD_CREDENTIALS_PATH` environment variable should already be set

3. **Voice Selection**:
   - **Arabic**: ar-XA-Wavenet-A (Premium Wavenet Arabic - Modern Standard Arabic)
   - **English**: en-US-Wavenet-A (Premium Wavenet English - US English)

### ElevenLabs API (Optional)

For sentence audio generation, set your ElevenLabs API key:

```bash
export ELEVENLABS_API_KEY="your_elevenlabs_api_key_here"
```

### Supabase (Optional)

For database operations, set your Supabase credentials:

```bash
export SUPABASE_URL="your_supabase_url_here"
export SUPABASE_KEY="your_supabase_key_here"
```

## Error Handling

- Each phase validates input files before processing
- Failed files are logged with detailed error messages
- Pipeline continues processing other files if one fails
- Duplicate articles are detected and skipped
- Batch size validation (must be between 1 and 15)
- Comprehensive error logging with timestamps
- Retry logic with exponential backoff for API calls

## Development

### Installation

```bash
# Install dependencies
uv sync

# For development
uv sync --dev
```

### Testing

```bash
# Run tests
uv run pytest

# Run with coverage
uv run pytest --cov=translate

# Run validation
./validate.sh
```

### Code Quality

The project uses:

- **Ruff** for linting and formatting
- **MyPy** for type checking
- **Pytest** for testing
- **Vulture** for dead code detection

### Validation Script

The `validate.sh` script runs comprehensive checks:

- Linting (ruff)
- Code formatting
- Type checking (mypy)
- Dead code detection (vulture)
- Test execution
