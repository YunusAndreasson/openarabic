# Arabic Word-Level Timestamp Implementation

## Overview

**Simple, focused implementation** to add word-level timestamps to Arabic TTS generation during the existing audio creation process.

## What We Need

1. **Modify `generate_speech()` function** in `translate/audio/audio_utils.py` to use `convert_with_timestamps()`
2. **Extract word timestamps** from character-level ElevenLabs response
3. **Store timestamps in database** alongside existing audio files
4. **No API endpoints** - just database storage for future frontend use

## Integration Points Analysis

Based on my analysis of the translate app, here's exactly where and how to integrate word timestamps:

### Current Audio Generation Flow

1. **Pipeline Processing** (`translate/pipeline/insert.py`):

   - `SentenceTranslation` objects have `tashkeel` field (Arabic text with diacritics)
   - Each sentence is processed individually for audio generation

2. **Audio Generation** (`translate/audio/audio_utils.py`):

   - `create_article_audio()` processes each sentence
   - `generate_speech()` is called with `tashkeel_text` (diacritical Arabic)
   - ElevenLabs API generates audio for each sentence

3. **Data Structure**:
   - Sentences: `{"arabic_text": "...", "english_text": "...", "tashkeel": "..."}`
   - `tashkeel` is the actual Arabic text used for TTS (with diacritics)

### Integration Implementation

### 1. Update `generate_speech()` Function

**File**: `translate/audio/audio_utils.py`
**Function**: `generate_speech()` (lines ~169-279)

**Change**: Replace ElevenLabs API call:

```python
# Current (line ~195):
response = client.text_to_speech.convert(
    text=text,
    voice_id=voice_id,
    model_id=ELEVENLABS_TTS_MODEL_ID,
    voice_settings=voice_settings,
)

# New:
response = client.text_to_speech.convert_with_timestamps(
    text=text,
    voice_id=voice_id,
    model_id=ELEVENLABS_TTS_MODEL_ID,
    voice_settings=voice_settings,
)
```

### 2. Add Word Timestamp Extraction Function

**Add to `translate/audio/audio_utils.py`**:

```python
def extract_word_timestamps(text: str, alignment: dict) -> list[dict]:
    """Convert ElevenLabs character timestamps to word timestamps for Arabic text."""
    words = []
    char_index = 0

    # Split Arabic text into words (respecting diacritics)
    arabic_words = text.split()

    for word in arabic_words:
        word_length = len(word)

        # Handle edge case where word might be longer than remaining characters
        if char_index + word_length > len(alignment['character_start_times_seconds']):
            logger.warning(f"Word '{word}' exceeds character alignment length")
            break

        # Get start/end times from character arrays
        start_time = alignment['character_start_times_seconds'][char_index]
        end_time = alignment['character_end_times_seconds'][char_index + word_length - 1]

        words.append({
            'word': word,
            'start_time': start_time,
            'end_time': end_time,
            'duration': end_time - start_time
        })

        # Move to next word (skip the space character)
        char_index += word_length + 1

    return words
```

### 3. Modify `generate_speech()` Return Value

**Update return structure** to include timestamps:

```python
# Current return (line ~270):
return {
    "audio": audio_data,
    "duration": getattr(response, "duration", 0.0),
    "voice_id": voice_id,
    "text": text,
}

# New return with timestamps:
word_timestamps = extract_word_timestamps(text, response.alignment)

return {
    "audio": audio_data,
    "duration": getattr(response, "duration", 0.0),
    "voice_id": voice_id,
    "text": text,
    "word_timestamps": word_timestamps,  # Add this
}
```

### 4. Update `create_article_audio()` Function

**File**: `translate/audio/audio_utils.py`
**Function**: `create_article_audio()` (lines ~668-708)

**Collect timestamps** from each sentence:

```python
# Add to function variables at top
all_word_timestamps = []

# In the sentence processing loop (around line ~680-708)
for i, sentence in enumerate(sentences):
    arabic_text = sentence.get("arabic_text", "")
    english_text = sentence.get("english_text", "")
    tashkeel_text = sentence.get("tashkeel", arabic_text)

    if not arabic_text or not english_text:
        logger.warning(f"Skipping sentence {i + 1} - missing text")
        continue

    # Generate Arabic audio for this sentence
    arabic_response = generate_speech(
        text=tashkeel_text,  # This is the key - diacritical Arabic text
        voice_id=ARABIC_VOICE_ID,
        voice_settings=VoiceSettings(**DEFAULT_VOICE_SETTINGS),
    )

    if arabic_response and arabic_response.get("audio"):
        arabic_audio = arabic_response["audio"]
        arabic_segments.append(arabic_audio)

        # Collect word timestamps for this sentence
        if "word_timestamps" in arabic_response:
            all_word_timestamps.extend(arabic_response["word_timestamps"])

    # ... existing English audio generation continues ...
```

### 5. Update Function Return

**Modify return value** of `create_article_audio()`:

```python
# Final return (around line ~790)
return {
    "arabic_url": arabic_url,
    "bilingual_url": bilingual_url,
    "word_timestamps": all_word_timestamps,  # Add this
}
```

### 6. Update Database Insertion

**File**: `translate/pipeline/insert.py`
**Function**: `generate_article_audio()` (lines ~66-151)

**Store timestamps** in database:

```python
# After audio generation (around line ~130)
if audio_urls:
    # Update database with timestamps
    get_supabase_client().table("articles").update({
        "audio_url": audio_urls["arabic_url"],
        "audio_url_bilingual": audio_urls["bilingual_url"],
        "word_timestamps": audio_urls.get("word_timestamps", []),  # Add this
    }).eq("id", article_id).execute()
```

### 7. Database Schema Update

**Add column** to articles table:

```sql
ALTER TABLE articles ADD COLUMN word_timestamps JSONB;
```

## Key Integration Insights

### 1. **Arabic Text Source**

- Use `sentence.get("tashkeel", arabic_text)` for TTS input
- This ensures we have proper diacritical marks for accurate pronunciation
- The same text used for timestamps matches the audio generation

### 2. **Word Splitting**

- Arabic text with diacritics requires careful splitting
- Use `text.split()` which respects Arabic word boundaries
- Handle cases where diacritics might affect character counts

### 3. **Sentence-Level Processing**

- Each `SentenceTranslation` object has complete Arabic text
- Process one sentence at a time to maintain accuracy
- Accumulate timestamps across all sentences in the article

### 4. **Data Flow**

```
SentenceTranslation.tashkeel → generate_speech() → extract_word_timestamps() → all_word_timestamps → Database
```

This approach ensures every Arabic word in every sentence gets accurate timestamps during the existing audio generation pipeline.

## Timeline

**30 min**: Add `word_timestamps` column to articles table
**1 hour**: Update `generate_speech()` to use `convert_with_timestamps()`
**1 hour**: Add `extract_word_timestamps()` function with Arabic text handling
**30 min**: Update `create_article_audio()` to collect timestamps from each sentence
**30 min**: Update database insertion to store timestamps alongside audio URLs
**1 hour**: Test integration with sample Arabic sentences

**Total: 4 hours**

## Integration Points

- **`translate/audio/audio_utils.py`**: Core timestamp extraction
- **`translate/pipeline/insert.py`**: Database storage during article creation
- **Database**: `articles.word_timestamps` JSONB column
- **Existing pipeline**: No changes needed to main workflow

## Benefits

- ✅ **Minimal changes** to existing codebase
- ✅ **No new API endpoints** needed
- ✅ **Future-ready** for frontend timestamp usage
- ✅ **Preserves existing functionality**
- ✅ **Simple, maintainable code**

That's it - straightforward integration with the existing audio generation pipeline.
