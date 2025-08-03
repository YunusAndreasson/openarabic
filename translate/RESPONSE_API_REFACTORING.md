# 🎯 **Response API + Pydantic Integration: Implementation Plan**

> **📋 How to use this plan:** Mark items as complete by changing `- [ ]` to `- [x]`. All TODOs are designed to be independent and can be worked on across multiple sessions.

## 📋 **Project Status & Context**

### **Current State Analysis:**

- ✅ **Excellent Pydantic models exist** in `translate/data/models.py` with proper Field descriptions
- ✅ **Response API implementation is mostly correct** in `translate/utils/responses_api.py`
- ❌ **Anti-pattern discovered**: Creating Pydantic models then immediately calling `.model_dump()`
- ❌ **Tool schemas still referenced** in prompts instead of Pydantic models
- ❌ **Missing some pipeline-specific Pydantic models** that exist only as TypedDict

### **Refactoring Goal:**

Fix Response API integration using existing `translate/data/models.py` Pydantic models without touching `pipeline_types.py`

### **Out of Scope:**

- ❌ No changes to `pipeline_types.py` (keeping dual system for now)
- ❌ No extensive test rewrites (25+ files use pipeline_types)
- ❌ No validation function changes (complex dependencies)

---

## 📝 **TODO LIST - PHASE 1: Add Missing Pydantic Models**

- [ ] **TODO 1.1: Add TranslationUncertainty Model**

  - **File:** `translate/data/models.py`
  - **Action:** Add this class after line 23 (after WordTranslation class):

  ```python
  class TranslationUncertainty(BaseModel):
      """Uncertainty in translation"""
      text: str = Field(description="Text with uncertainty")
      reason: str = Field(description="Reason for uncertainty")
  ```

- [ ] **TODO 1.2: Add TranslationResult Model**

  - **File:** `translate/data/models.py`
  - **Action:** Add this class after the TranslationUncertainty class:

  ```python
  class TranslationResult(BaseModel):
      """Result from sentence translation step"""
      translation: str = Field(description="English translation")
      notes: str = Field(description="Translation notes and context")
      uncertainties: list[TranslationUncertainty] = Field(
          default_factory=list,
          description="Areas of uncertainty in translation"
      )
      word_by_word: list[dict[str, Any]] = Field(
          default_factory=list,
          description="Word-by-word analysis"
      )
  ```

- [ ] **TODO 1.3: Add TashkeelUncertainty Model**

  - **File:** `translate/data/models.py`
  - **Action:** Add this class after the TranslationResult class:

  ```python
  class TashkeelUncertainty(BaseModel):
      """Uncertainty in tashkeel/diacritical marks"""
      word: str = Field(description="Word with uncertain diacritics")
      reason: str = Field(description="Reason for uncertainty")
      related_translation_uncertainty: str | None = Field(
          default=None,
          description="Related translation uncertainty"
      )
  ```

- [ ] **TODO 1.4: Add TashkeelResult Model**

  - **File:** `translate/data/models.py`
  - **Action:** Add this class after the TashkeelUncertainty class:

  ```python
  class TashkeelResult(BaseModel):
      """Result from tashkeel addition step"""
      tashkeel: str = Field(description="Text with diacritical marks added")
      uncertainties: list[TashkeelUncertainty] = Field(
          default_factory=list,
          description="Uncertain diacritical marks"
      )
  ```

- [ ] **TODO 1.5: Add WordTranslationResult Model**

  - **File:** `translate/data/models.py`
  - **Action:** Add this class after the TashkeelResult class:

  ```python
  class WordTranslationResult(BaseModel):
      """Result from word-by-word translation step"""
      word_translations: list[WordTranslationOptions] = Field(
          description="Word translation options before refinement"
      )
  ```

- [ ] **TODO 1.6: Add RefinementResult Model**
  - **File:** `translate/data/models.py`
  - **Action:** Add this class after the WordTranslationResult class:
  ```python
  class RefinementResult(BaseModel):
      """Result from final refinement step"""
      improved_tashkeel: str = Field(description="Refined diacritical marks")
      improved_translation: str = Field(description="Refined translation")
      improved_word_translations: list[WordTranslation] = Field(
          description="Final refined word translations"
      )
      resolved_uncertainties: list[dict[str, str]] = Field(
          default_factory=list,
          description="Uncertainties that were resolved"
      )
      remaining_uncertainties: list[dict[str, str]] = Field(
          default_factory=list,
          description="Uncertainties that remain unresolved"
      )
      changes_made: list[str] = Field(
          default_factory=list,
          description="List of changes made during refinement"
      )
  ```

---

## 📝 **TODO LIST - PHASE 2: Update Imports**

- [ ] **TODO 2.1: Remove Tool Imports from translation_engine.py**

  - **File:** `translate/pipeline/translation_engine.py`
  - **Current lines:** 24-33
  - **Action:** Remove these import lines:

  ```python
  # REMOVE THESE:
  from data.schemas import (
      FINAL_VERIFICATION_USER_PROMPT,
      GENERAL_SYSTEM_PROMPT,
      REFINEMENT_TOOL,
      SENTENCE_TRANSLATION_USER_PROMPT,
      TASHKEEL_TOOL,
      TRANSLATE_SENTENCES_TOOL,
      WORD_BY_WORD_USER_PROMPT,
      WORD_TRANSLATION_TOOL,
  )
  ```

- [ ] **TODO 2.2: Add Pydantic Model Imports to translation_engine.py**

  - **File:** `translate/pipeline/translation_engine.py`
  - **Action:** Update the import from `data.models` (around line 10) to include new models:

  ```python
  # CHANGE FROM:
  from data.models import WordTranslationOptions

  # CHANGE TO:
  from data.models import (
      WordTranslationOptions,
      TranslationResult,
      TashkeelResult,
      WordTranslationResult,
      RefinementResult,
  )
  ```

- [ ] **TODO 2.3: Re-add Required Prompt Imports**
  - **File:** `translate/pipeline/translation_engine.py`
  - **Action:** Add back the prompt imports (keep prompts, remove tools):
  ```python
  # ADD THESE BACK:
  from data.schemas import (
      FINAL_VERIFICATION_USER_PROMPT,
      GENERAL_SYSTEM_PROMPT,
      SENTENCE_TRANSLATION_USER_PROMPT,
      TASHKEEL_USER_PROMPT,
      WORD_BY_WORD_USER_PROMPT,
  )
  ```

---

## 📝 **TODO LIST - PHASE 3: Fix Response API Integration**

- [ ] **TODO 3.1: Fix Translation Response API Call**
  - **File:** `translate/pipeline/translation_engine.py`
  - **Location:** Around line 125 (in `batch_translate_full_sentences` function)
  - **Current code:**
  ```python
  response = conversation_manager.continue_with_stage(
      message, [TRANSLATE_SENTENCES_TOOL]
  )
  ```
  - **Change to:**
  ```python
  response = conversation_manager.continue_with_stage(
      message, response_model=TranslationResult
  )
  ```

### **TODO 3.2: Fix Tashkeel Response API Call**

**File:** `translate/pipeline/translation_engine.py`
**Location:** Around line 325 (in `batch_add_tashkeel` function)
**Current code:**

```python
response = conversation_manager.continue_with_stage(message, [TASHKEEL_TOOL])
```

**Change to:**

```python
response = conversation_manager.continue_with_stage(
    message, response_model=TashkeelResult
)
```

### **TODO 3.3: Fix Word Translation Response API Call**

**File:** `translate/pipeline/translation_engine.py`
**Location:** Around line 456 (in `batch_translate_words` function)
**Current code:**

```python
response = conversation_manager.continue_with_stage(
    message, [WORD_TRANSLATION_TOOL]
)
```

**Change to:**

```python
response = conversation_manager.continue_with_stage(
    message, response_model=WordTranslationResult
)
```

### **TODO 3.4: Fix Refinement Response API Call**

**File:** `translate/pipeline/translation_engine.py`
**Location:** Around line 660 (in `batch_refine_translations` function)
**Current code:**

```python
response = conversation_manager.continue_with_stage(
    message, [REFINEMENT_TOOL]
)
```

**Change to:**

```python
response = conversation_manager.continue_with_stage(
    message, response_model=RefinementResult
)
```

### **TODO 3.5: Fix Split Response API Call**

**File:** `translate/pipeline/split_file.py`
**Action:** Find the `continue_with_stage` call and update to use existing SplitResult model:

```python
response = conversation_manager.continue_with_stage(
    message, response_model=SplitResult
)
```

### **TODO 3.6: Update call_response_api calls to use Pydantic models**

**File:** `translate/pipeline/translation_engine.py`
**Locations:** Look for `call_response_api` calls with `tools=[TOOL_NAME]`
**Action:** Replace with appropriate response_model parameter
**Example:**

```python
# CHANGE FROM:
response = call_response_api(
    messages,
    tools=[TRANSLATE_SENTENCES_TOOL],
    model=MODEL_TRANSLATION,
)

# CHANGE TO:
response = call_response_api(
    messages,
    response_model=TranslationResult,
    model=MODEL_TRANSLATION,
)
```

---

## 📝 **TODO LIST - PHASE 4: Update Prompts**

### **TODO 4.1: Update SENTENCE_TRANSLATION_USER_PROMPT**

**File:** `translate/data/schemas.py`
**Location:** Around line 700
**Current:** References `TRANSLATE_SENTENCES_TOOL` schema
**Change to:**

```python
SENTENCE_TRANSLATION_USER_PROMPT = """Translate Classical Arabic sentences from Islamic texts to English. Return response as JSON matching the TranslationResult structure with fields:
- translation: English translation string
- notes: Translation notes and context
- uncertainties: Array of uncertainty objects with text and reason
- word_by_word: Array for word-by-word analysis

CRITICAL: You MUST provide ALL required fields. The `uncertainties` array must be present for every translation, even if empty.

For each sentence, provide:
1. `translation` (string):
   - Use accessible English, preserving Arabic word order where possible.
   - Use simple vocabulary appropriate for Islamic content (no obscure terms).
   - Add bracketed words [like this] for clarity if needed but not present in the original text.
   - Match register: solemn for supplications, precise for hadith.
   - Ensure EVERY eligible letter has appropriate diacritics (full vocalization).
   - Use translation context and provided grammatical notes to resolve vowelization ambiguities.
   - Pay special attention to case endings based on grammatical roles noted.
   - Consider verb forms, tenses, and moods indicated in the notes.
   - Ensure grammatical accuracy (case endings, conjugations).
   - Ensure full vocalization according to standard Classical Arabic rules, applying diacritics to all letters requiring them based on grammar and context.
   - Preserve ALL original punctuation, formatting, and special characters.
2. `notes` (string, required):
   - Additional context or explanations regarding the translation.
3. `uncertainties` (array of objects, optional):
   - List specific words where diacritics are uncertain.
   - Include both the uncertain text and the reason for uncertainty.
4. `word_by_word` (array, optional):
   - Preliminary word-by-word analysis if helpful for context.

Provide a natural, accessible English translation that preserves the meaning and tone of the original Classical Arabic text.

Input sentences:
"""
```

### **TODO 4.2: Update TASHKEEL_USER_PROMPT**

**File:** `translate/data/schemas.py`
**Location:** Around line 742
**Current:** References `TASHKEEL_TOOL` schema
**Change to:**

```python
TASHKEEL_USER_PROMPT = """Add complete diacritical marks (tashkīl) to EVERY word in the Islamic Arabic text. Return JSON matching TashkeelResult structure with fields:
- tashkeel: Text with diacritical marks added
- uncertainties: Array of uncertainty objects for unclear diacritics

CRITICAL: You MUST provide ALL required fields. The `uncertainties` array must be present for every tashkeel result, even if empty.

Requirements:
- Ensure EVERY eligible letter has appropriate diacritics (full vocalization).
- Use translation context and provided grammatical notes to resolve vowelization ambiguities.
- Pay special attention to case endings based on grammatical roles noted.
- Consider verb forms, tenses, and moods indicated in the notes.
- Ensure grammatical accuracy (case endings, conjugations).
- Ensure full vocalization according to standard Classical Arabic rules, applying diacritics to all letters requiring them based on grammar and context.
- Preserve ALL original punctuation, formatting, and special characters.

For uncertain diacritics, include in uncertainties array with:
- word: The specific word with uncertain diacritics
- reason: Explanation of why the diacritics are uncertain
- related_translation_uncertainty: Any related translation uncertainty (optional)

Input text:
"""
```

### **TODO 4.3: Update WORD_BY_WORD_USER_PROMPT**

**File:** `translate/data/schemas.py`
**Location:** Around line 784
**Current:** References `WORD_TRANSLATION_TOOL` schema
**Change to:**

```python
WORD_BY_WORD_USER_PROMPT = """Translate Arabic words individually. Return JSON matching WordTranslationResult structure with fields:
- word_translations: Array of WordTranslationOptions objects

Each WordTranslationOptions object must include:
- arabic: Original Arabic word
- english_options: Array of English translation options
- pos: Part of speech (required)
- essential: Essential letters (required)
- essential_translation_options: Array of essential translation options
- notes: Translation notes (required)
- uncertainties: Array of uncertainty objects

ENSURE: The `essential` field must be populated for every word; never return null for this.
ENSURE: The `pos` field must be populated for every word; never return null for this.
ENSURE: The `notes` field must be populated for every word; never return null for this.

ENSURE: The `essential` field should contain the core letters, stripped of affixes/suffixes and case/mood endings. Basic standard diacritics (like on فَعَلَ) are acceptable, but avoid complex or preserved original diacritics.
ENSURE: Preserve ALL original text formatting, punctuation, and special characters in the `arabic` field.

IMPORTANT: Return only a JSON object matching the WordTranslationResult schema.

Input for word-by-word translation:
"""
```

### **TODO 4.4: Update FINAL_VERIFICATION_USER_PROMPT**

**File:** `translate/data/schemas.py`
**Location:** Around line 811
**Current:** References `REFINEMENT_TOOL` schema
**Change to:**

```python
FINAL_VERIFICATION_USER_PROMPT = """Review and refine the provided Islamic Arabic translation components. Return JSON matching RefinementResult structure with fields:
- improved_tashkeel: Refined diacritical marks
- improved_translation: Refined translation
- improved_word_translations: Array of final WordTranslation objects
- resolved_uncertainties: Array of resolved uncertainty objects
- remaining_uncertainties: Array of unresolved uncertainty objects
- changes_made: Array of change descriptions

Resolve ambiguities and select the single best option for word translation. Ensure consistency across all components and address any uncertainties that can be resolved based on context.

Return your response as valid JSON.

Input components to refine:
"""
```

### **TODO 4.5: Update SENTENCE_SPLITTING_USER_PROMPT**

**File:** `translate/data/schemas.py`
**Location:** Around line 695
**Current:** References `SPLIT_TEXT_TOOL` schema
**Change to:**

```python
SENTENCE_SPLITTING_USER_PROMPT = """Split Arabic text into learner-friendly units. Return JSON matching SplitResult structure with fields:
- units: Array of text units/sentences
- title: Concise English title (3-7 words)
- summary: One-sentence summary of main content
- difficulty_level: Difficulty rating (1-5)
- total_units: Total number of units
- unit_types: Type of each unit (optional)

IMPORTANT:
- AVOID units that are excessively short (e.g., 1-3 words) unless grammatically necessary (like single-word interjections).
- Preserve ALL original text formatting, punctuation, and special characters in each unit

Return results as valid JSON.

Input text:
"""
```

---

## 📝 **TODO LIST - PHASE 5: Fix Anti-Patterns**

### **TODO 5.1: Fix model_dump() Anti-Pattern in translation_engine.py**

**File:** `translate/pipeline/translation_engine.py`
**Location:** Lines around 517 and 546 (in `batch_translate_words` function)
**Current anti-pattern:**

```python
word_translations_options.append(
    WordTranslationOptions(
        arabic=arabic_text,
        english_options=eng_opts,
        pos=word_data.get("pos") or None,
        essential=essential_letters,
        essential_translation_options=ess_opts,
        notes=word_data.get("notes") or None,
        uncertainties=_validate_uncertainties(
            word_data.get("uncertainties", [])
        ),
    ).model_dump(),  # ❌ REMOVE THIS!
)
```

**Change to:**

```python
word_option = WordTranslationOptions(
    arabic=arabic_text,
    english_options=eng_opts,
    pos=word_data.get("pos") or None,
    essential=essential_letters,
    essential_translation_options=ess_opts,
    notes=word_data.get("notes") or None,
    uncertainties=_validate_uncertainties(
        word_data.get("uncertainties", [])
    ),
)
word_translations_options.append(word_option)  # ✅ Keep as Pydantic model
```

### **TODO 5.2: Update Function Return Types**

**File:** `translate/pipeline/translation_engine.py`
**Action:** Update function signatures to use new Pydantic models:

```python
# Find and update these function signatures:

def batch_translate_full_sentences(...) -> list[TranslationResult]:

def batch_add_tashkeel(...) -> list[TashkeelResult]:

def batch_translate_words(...) -> list[WordTranslationResult]:

def batch_refine_translations(...) -> list[RefinementResult]:
```

---

## 📝 **TODO LIST - PHASE 6: Remove Tool Definitions**

### **TODO 6.1: Remove TRANSLATE_SENTENCES_TOOL**

**File:** `translate/data/schemas.py`
**Location:** Lines 26-164 (approximately)
**Action:** Delete the entire `TRANSLATE_SENTENCES_TOOL` definition (~140 lines)

### **TODO 6.2: Remove TASHKEEL_TOOL**

**File:** `translate/data/schemas.py`
**Location:** Lines around 165-221 (approximately)
**Action:** Delete the entire `TASHKEEL_TOOL` definition (~57 lines)

### **TODO 6.3: Remove WORD_TRANSLATION_TOOL**

**File:** `translate/data/schemas.py`
**Location:** Lines around 222-347 (approximately)
**Action:** Delete the entire `WORD_TRANSLATION_TOOL` definition (~126 lines)

### **TODO 6.4: Remove REFINEMENT_TOOL**

**File:** `translate/data/schemas.py`
**Location:** Lines around 348-579 (approximately)
**Action:** Delete the entire `REFINEMENT_TOOL` definition (~232 lines)

### **TODO 6.5: Remove SPLIT_TEXT_TOOL**

**File:** `translate/data/schemas.py`
**Location:** Lines around 580-693 (approximately)
**Action:** Delete the entire `SPLIT_TEXT_TOOL` definition (~114 lines)

### **TODO 6.6: Update schemas.py Header Comment**

**File:** `translate/data/schemas.py`
**Location:** Lines 1-3
**Current:**

```python
"""
This file contains all the schemas, prompts, and constants for the translation system.
"""
```

**Change to:**

```python
"""
This file contains prompts and constants for the translation system.
Pydantic models are defined in data/models.py.
"""
```

---

## ✅ **VALIDATION CHECKLIST**

- [ ] **TODO V.1: Validate No Tool References in Prompts**

  - **Command:** `grep -r "TRANSLATE_SENTENCES_TOOL\|TASHKEEL_TOOL\|WORD_TRANSLATION_TOOL\|REFINEMENT_TOOL\|SPLIT_TEXT_TOOL" translate/data/schemas.py`
  - **Expected:** No results

- [ ] **TODO V.2: Validate No Tool Imports in Pipeline**

  - **Command:** `grep -r "from data.schemas import.*TOOL" translate/pipeline/`
  - **Expected:** No results

- [ ] **TODO V.3: Validate No Tool Passing to continue_with_stage**

  - **Command:** `grep -r "continue_with_stage.*\[.*TOOL" translate/pipeline/`
  - **Expected:** No results

- [ ] **TODO V.4: Validate Pydantic Model Imports**

  - **Command:** `grep -r "from data.models import.*Result" translate/pipeline/`
  - **Expected:** Shows imports of new Pydantic models

- [ ] **TODO V.5: Validate Response API with Pydantic Models**

  - **Command:** `grep -r "response_model=" translate/pipeline/`
  - **Expected:** Shows response_model usage instead of tools

- [ ] **TODO V.6: Validate No Immediate model_dump() Conversions**

  - **Command:** `grep -r "\.model_dump()" translate/pipeline/translation_engine.py`
  - **Expected:** Only legitimate uses (file output, database insertion) - should be minimal

- [ ] **TODO V.7: Test Pipeline Functionality**
  - **Action:** Run the translation pipeline end-to-end to ensure:
    - Response API returns structured Pydantic models
    - No JSON parsing errors
    - Pipeline processes correctly with new models

---

## 🎯 **SESSION MANAGEMENT NOTES**

### **For Each Work Session:**

1. **Start:** Check current branch and pull latest changes
2. **Pick:** Choose TODO items from any phase (they're mostly independent)
3. **Complete:** Change `- [ ]` to `- [x]` when done
4. **Test:** Run validation commands relevant to your changes
5. **Commit:** Small, focused commits per TODO item
6. **Document:** Include completed TODO numbers in commit messages

### **Dependencies:**

- **Phase 1** must be completed before **Phase 2-3** (models need to exist before import)
- **Phase 4** can be done independently
- **Phase 5** should be done after **Phase 3** (API calls fixed first)
- **Phase 6** should be done last (remove tools after replacing usage)

### **Critical Files:**

- `translate/data/models.py` - Add new Pydantic models here
- `translate/pipeline/translation_engine.py` - Main integration work
- `translate/data/schemas.py` - Update prompts and remove tools
- `translate/utils/responses_api.py` - Already correct, minimal changes

This plan provides clear, actionable TODOs that can be executed independently across multiple work sessions.
