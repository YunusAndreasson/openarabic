# Word Translation Validation Guide

This guide explains how to use the word translation validation system that checks existing translations for accuracy using DeepSeek-v3 via OpenRouter.

## Overview

The validation system:
- ✅ Checks morphological accuracy (prefixes/suffixes correctly rendered)
- ✅ Verifies English word count matches Arabic morpheme count
- ✅ Validates theological correctness (no shirk/bidah in grammar notes)
- ✅ **Only saves to database when real improvements are suggested** (not for correct words)
- ✅ Skips words where DeepSeek confirms current translation is correct
- ✅ Uses OpenRouter's free DeepSeek-v3 tier

## Setup

### 1. OpenRouter API Key (Already Configured!)

✅ The API key is already set in `utils/set_keys.py` and loaded automatically:

```python
# In utils/set_keys.py
os.environ["OPENROUTER_API_KEY"] = "REDACTED_LEAKED_KEY"
```

The validation script automatically loads this at startup - **no manual export needed!**

### 2. Ensure Dependencies Installed

```bash
uv sync
```

The validation system requires:
- `requests` - HTTP client for OpenRouter API
- `tqdm` - Progress bars
- `pydantic` - Data validation

## Usage

### Validate Specific Article

```bash
# Validate article with ID 123
uv run python pipeline/validate.py --article-id 123
```

### Validate All Articles

```bash
# Validate all articles in database
uv run python pipeline/validate.py --all
```

### Verbose Logging

```bash
# Enable debug logging
uv run python pipeline/validate.py --all --verbose
```

## How It Works

### 1. Fetch Words from Database

The system queries `sentence_words` with sentence context:

```sql
SELECT
    sw.id, sw.word_form, sw.english, sw.grammar_note,
    asent.arabic, asent.english
FROM sentence_words sw
JOIN article_sentences asent ON sw.sentence_id = asent.id
WHERE asent.article_id = ?
ORDER BY asent.position, sw.position
```

### 2. Send to DeepSeek for Validation

**IMPORTANT**: Words are processed **sentence-by-sentence** (not entire article at once):

- Each sentence's words are validated in a single API call for optimal context
- Prevents token limit issues with large articles
- Better error handling - if one sentence fails, others can still succeed
- Validation checks:
  - Morphological accuracy (prefix/suffix count)
  - English word count matches Arabic morphemes
  - Theological correctness
  - Specific suggestions if issues found

### 3. Parse Response

The system expects JSON response:
```json
{
  "validations": [
    {
      "word_id": 123,
      "is_correct": false,
      "issues": ["Missing prefix translation"],
      "suggested_english": "so whoever",
      "suggested_grammar_note": "Conjunction 'fa' (so) + relative pronoun 'man' (whoever)",
      "reasoning": "The Arabic فَمَن contains two morphemes..."
    },
    {
      "word_id": 124,
      "is_correct": true,
      "issues": [],
      "suggested_english": null,
      "suggested_grammar_note": null,
      "reasoning": "Translation is morphologically accurate..."
    }
  ]
}
```

### 4. Filter and Save to Database

**CRITICAL**: Only words with actual improvements are saved:
- Compare `suggested_english` with current translation
- Compare `suggested_grammar_note` with current note
- **Skip saving if both match** (word is correct)
- Only save when there's a real difference

Results are saved to `translation_improvements` table:

| Field | Description |
|-------|-------------|
| `sentence_word_id` | Foreign key to `sentence_words` (current values accessed via JOIN) |
| `suggested_english` | AI-suggested improved translation |
| `suggested_grammar_note` | AI-suggested improved grammar note |
| `status` | `pending` (default, can be marked `approved`/`rejected` later) |
| `reviewer_notes` | AI reasoning for the suggestion |

### 5. Retry Logic

If JSON parsing fails:
1. Retry with stricter prompt (emphasizes JSON-only output)
2. Up to 3 attempts total
3. Log error and continue to next article if all fail

## Output Examples

### All Words Correct

```
2025-10-18 - INFO - Validating article 284 (Angels and Mercy at Jerusalem)
2025-10-18 - INFO - Fetched 53 words for validation
2025-10-18 - INFO - No improvements needed - all 53 words are correct
2025-10-18 - INFO - ✅ Article 284: All 53 words are correct! No improvements needed.
```

### Some Improvements Found

```
2025-10-18 - INFO - Validating article 123 (The Virtues of Patience)
2025-10-18 - INFO - Fetched 45 words for validation
2025-10-18 - INFO - Saved 3 improvements (42 words already correct)
2025-10-18 - INFO - ✅ Article 123: 3 improvements saved, 42 correct
2025-10-18 - INFO -    3/45 words need review
```

### Validation with Retry

```
2025-10-18 - WARNING - Parse error on attempt 1, retrying: Invalid JSON in response
2025-10-18 - INFO - Saved 5 improvements (48 words already correct)
2025-10-18 - INFO - ✅ Article 123: 5 improvements saved, 48 correct
```

### Batch Validation

```
Validating articles: 100%|████████████████| 150/150 [12:30<00:00,  5.00s/article]
2025-10-18 - INFO - ✅ Validation complete: 148 succeeded, 2 failed
```

## Review Improvements

After validation, review improvements in the database:

```sql
-- View all pending improvements
SELECT * FROM translation_improvements
WHERE status = 'pending'
ORDER BY created_at DESC;

-- View improvements for specific article
SELECT
    ti.id,
    sw.word_form,
    ti.original_english,
    ti.suggested_english,
    ti.reviewer_notes
FROM translation_improvements ti
JOIN sentence_words sw ON ti.sentence_word_id = sw.id
JOIN article_sentences asent ON sw.sentence_id = asent.id
WHERE asent.article_id = 123;
```

## Common Issues

### Issue: "OpenRouter API key not found"

**Solution:** Set the `OPENROUTER_API_KEY` environment variable or add to `set_keys.py`

### Issue: "No words found for article X"

**Solution:** Article may not exist or has no sentence_words. Check:
```sql
SELECT COUNT(*) FROM article_sentences WHERE article_id = X;
SELECT COUNT(*) FROM sentence_words sw
JOIN article_sentences asent ON sw.sentence_id = asent.id
WHERE asent.article_id = X;
```

### Issue: Parse errors persist after 3 retries

**Solution:** Check API response manually. DeepSeek may be returning markdown instead of raw JSON. The system handles markdown code blocks, but edge cases may occur.

## Architecture

### File Structure

```
translate/
├── pipeline/
│   └── validate.py          # Main validation script (standalone)
├── utils/
│   ├── openrouter_client.py # OpenRouter API client
│   └── validation_db.py     # Database operations
├── data/
│   ├── validation_models.py # Pydantic models
│   └── config.py            # OpenRouter configuration
└── VALIDATION_GUIDE.md      # This file
```

### Key Components

1. **OpenRouterClient** (`utils/openrouter_client.py`)
   - HTTP client for OpenRouter API
   - Constructs validation prompts
   - Parses JSON responses
   - Implements retry logic

2. **ValidationModels** (`data/validation_models.py`)
   - `WordValidationRequest` - Input structure
   - `WordValidationResponse` - Output structure
   - `ValidationBatchResponse` - Batch wrapper

3. **ValidationDB** (`utils/validation_db.py`)
   - `fetch_article_words_for_validation()` - Query words
   - `save_validation_improvements()` - Save results
   - `get_all_article_ids()` - Get article list

4. **ValidatePipeline** (`pipeline/validate.py`)
   - `validate_article_translations()` - Single article
   - `validate_all_articles()` - All articles
   - CLI interface

## Cost Estimate

Using OpenRouter's DeepSeek-v3:
- **Model:** `deepseek/deepseek-chat-v3` (free tier available)
- **Avg tokens per article:** ~2000 input + 1000 output = 3000 total
- **150 articles:** ~450K tokens

**Cost:** Free tier should cover ~450K-1M tokens. Check OpenRouter dashboard for limits.

## Next Steps

1. ✅ Files created and syntax validated
2. ⏳ Test on single article (requires database access)
3. ⏳ Review validation quality
4. ⏳ Batch process all articles
5. ⏳ Review improvement suggestions
6. ⏳ Apply approved improvements to production data
