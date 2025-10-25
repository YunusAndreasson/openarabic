# Audio Regeneration Guide

This guide explains how to regenerate English audio for sentences with quality issues and update article-level audio.

## Overview

The audio regeneration process has **two steps**:

1. **Regenerate sentences** - Fix individual sentence audio for sentences marked with `english_repeat=TRUE`
2. **Regenerate articles** - Update article-level bilingual audio that includes the fixed sentences

## Prerequisites

- Mark problematic sentences in database: Set `english_repeat=TRUE` for sentences that need regeneration
- Ensure API keys are configured in `utils/set_keys.py`

## Step 1: Regenerate Sentences

This regenerates English audio for sentences marked with `english_repeat=TRUE` using optimal quality settings.

```bash
uv run python regenerate_sentences.py
```

**What it does:**

- Finds all sentences with `english_repeat=TRUE`
- Generates new English audio using ElevenLabs with optimal settings:
  - Stability: 0.95 (maximum consistency)
  - Similarity Boost: 1.0 (closest to original Adam voice)
  - Speed: 0.85 (15% slower for clarity)
  - Text cleaning (removes `...`, `?!`, etc.)
- Downloads existing Arabic audio (reuses, doesn't regenerate)
- Creates new bilingual audio (English + 500ms pause + Arabic)
- Uploads to Supabase and updates `audio_url_english` and `audio_url_bilingual`

**Cost:** 1 ElevenLabs API call per sentence

**After completion:** Review the regenerated audio and set `english_repeat=FALSE` for successful sentences.

## Step 2: Regenerate Articles

This updates article-level bilingual audio for articles that contain corrected sentences.

```bash
uv run python regenerate_articles.py
```

**What it does:**

- Finds all articles with sentences marked `english_repeat=TRUE`
- Downloads ALL existing sentence audio (both English and Arabic)
  - For corrected sentences: Uses NEW English audio from Step 1
  - For other sentences: Uses existing English audio
- Generates title audio (1 ElevenLabs call per article)
- Combines: Title + (English + Arabic) for each sentence with 500ms gaps
- Skips summary (no summary audio)
- Uploads to Supabase and updates `audio_url_bilingual`

**Cost:** 1 ElevenLabs API call per article (title only)

## Optimal Settings (Discovered Through Testing)

These settings provide the best audio quality for problematic sentences:

```python
OPTIMAL_SETTINGS = {
    "stability": 0.95,           # Maximum stability (default: 0.5)
    "similarity_boost": 1.0,     # Maximum similarity to original voice (default: 0.75)
    "style": 0.0,                # No exaggeration, pure neutral
    "use_speaker_boost": True,   # Enhanced clarity
    "speed": 0.85,               # 15% slower for better clarity
}
```

## Workflow Example

```bash
# 1. Mark problematic sentences in database
# Set english_repeat = TRUE for sentences with audio issues

# 2. Regenerate those specific sentences
uv run python regenerate_sentences.py
# Output: "Successfully regenerated 77 sentences"

# 3. Review and mark successful ones as complete
# Set english_repeat = FALSE for sentences that sound good

# 4. Regenerate article-level audio
uv run python regenerate_articles.py
# Output: "Successfully updated 35 articles"

# Done! All audio is now updated
```

## Troubleshooting

### Sentence still sounds strange after regeneration

- Check if text has unusual punctuation or formatting
- The text cleaning function handles most cases, but manual editing may help
- Consider trying alternative voice (Rachel) if Adam consistently fails

### Article audio missing sentences

- Verify Step 1 completed successfully for all sentences
- Check that `audio_url_english` was updated in database
- Ensure all sentences have both English and Arabic audio URLs

### Cost concerns

- Step 1: Only regenerates marked sentences (not all sentences)
- Step 2: Only generates titles (not sentence audio)
- Total cost = (sentences with english_repeat=TRUE) + (number of affected articles)

## Cost Optimization

**DO:**

- ✅ Only mark truly problematic sentences with `english_repeat=TRUE`
- ✅ Run Step 1, verify results, then run Step 2
- ✅ Download existing audio instead of regenerating

**DON'T:**

- ❌ Regenerate all sentences in an article (only regenerate marked ones)
- ❌ Regenerate article audio multiple times (verify sentence audio first)
- ❌ Skip text review (clean problematic text before regeneration)

## Files Overview

- **regenerate_sentences.py** - Step 1: Fix sentence audio
- **regenerate_articles.py** - Step 2: Update article audio
- **AUDIO_REGENERATION_GUIDE.md** - This guide
