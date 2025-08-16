# IslamQA Arabic Excerpt Harvester

A Python tool for discovering and extracting Arabic excerpts from IslamQA using LLM filtering.

## Setup

1. **Install Python 3.8+** if you haven't already

2. **Run the setup script:**

   **Linux/Mac:**

   ```bash
   ./setup-uv.sh
   ```

   **Windows:**

   ```cmd
   setup-uv.bat
   ```

3. **Set your OpenAI API key:**
   ```bash
   export OPENAI_API_KEY=sk-your-key-here
   ```

## Usage

### Basic Examples

**Harvest Aqeedah excerpts quoting Ibn al-Qayyim:**

```bash
uv run python main.py --authors IBN_AL_QAYYIM --categories AQEEDAH --output-md data/excerpts_aqeedah_ibn_al_qayyim.md
```

**Multiple authors, Arabic-only:**

```bash
uv run python main.py --authors IBN_AL_QAYYIM IBN_TAYMIYYAH IBN_BAZ --categories AQEEDAH --limit 1000
```

**Any quoted scholar but Aqeedah-only:**

```bash
uv run python main.py --authors ANY --categories AQEEDAH --output-md data/aqeedah_various.md
```

### Command Line Options

- `--authors`: Space-separated author enums (IBN_AL_QAYYIM, IBN_TAYMIYYAH, etc.)
- `--categories`: Space-separated category enums (AQEEDAH, TAWHEED, etc.)
- `--limit`: Maximum URLs to process (default: all)
- `--concurrency`: Concurrent fetch/LLM pipelines (default: 4)
- `--min-words`: Minimum words in excerpt (default: 120)
- `--max-words`: Maximum words in excerpt (default: 300)
- `--model`: OpenAI model name (default: gpt-5-mini)
- `--output-md`: Optional Markdown file to append excerpts
- `--verbose`: Enable verbose logging

### Available Authors

- `IBN_AL_QAYYIM` - ابن القيم
- `IBN_TAYMIYYAH` - ابن تيمية
- `IBN_UTHAYMEEN` - ابن عثيمين
- `AL_ALBANI` - الألباني
- `IBN_BAZ` - ابن باز
- `AN_NAWAWI` - النووي
- `IBN_KATHIR` - ابن كثير
- `ANY` - Any quoted scholar

### Available Categories

- `AQEEDAH` - عقيدة
- `TAWHEED` - توحيد
- `NAMES_ATTRIBUTES` - الأسماء والصفات
- `BIDAH` - بدعة
- `EEMAN` - الإيمان
- `SHIRK` - شرك
- `MANHAJ` - منهج
- `OTHER` - أخرى

## Output

The tool creates:

- `data/pages.jsonl` - Raw page data
- `data/excerpts.jsonl` - Extracted excerpts
- `data/seen/` - Tracking files for resuming
- Optional Markdown file with formatted excerpts

## Development

Install development dependencies:

```bash
uv sync --group dev
```

Run tests:

```bash
pytest
```

Format code:

```bash
black .
isort .
```

Type checking:

```bash
mypy .
```
