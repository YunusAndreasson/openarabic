"""
This file contains prompts and constants for the translation system.
Pydantic models are defined in data/models.py.
"""

from .enums import DifficultyLevel, PartOfSpeech

# Define valid parts of speech
VALID_POS = [pos.value for pos in PartOfSpeech]

# Define difficulty levels with descriptions
DIFFICULTY_LEVELS = {
    DifficultyLevel.BASIC: "Basic - Simple vocabulary and grammar",
    DifficultyLevel.ELEMENTARY: "Elementary - Common vocabulary with basic grammar structures",
    DifficultyLevel.INTERMEDIATE: "Intermediate - Mixed vocabulary with moderate grammar complexity",
    DifficultyLevel.ADVANCED: "Advanced - Specialized vocabulary with complex grammar",
    DifficultyLevel.EXPERT: "Expert - Technical/scholarly vocabulary with intricate grammar",
}


def format_valid_pos() -> str:
    """Format VALID_POS as a readable list for prompts."""
    return ", ".join(f"'{pos.value}'" for pos in sorted(PartOfSpeech, key=lambda x: x.value))


def format_difficulty_levels() -> str:
    """Format difficulty levels as a readable list for prompts."""
    return "\n".join(
        f"Level {level.value}: {DIFFICULTY_LEVELS[level]}"
        for level in sorted(DifficultyLevel, key=lambda x: x.value)
    )


# Prompt instructions
GENERAL_SYSTEM_PROMPT = """Expert translator specializing in Classical Arabic Islamic texts and teaching.

Priorities:
1. Accuracy: Preserve authentic Islamic meaning
2. Context: Consider historical-religious context
3. Terminology: Handle Islamic terminology, honorifics, narrators accurately
4. Text Preservation: Maintain ALL original text formatting, punctuation, and special characters
5. Ambiguity: Document uncertainties, resolve through context
6. Consistency: Maintain consistent translations for Islamic concepts
7. Accessibility: Use simple, clear English appropriate for Islamic context

Apply these principles to all translation tasks: splitting, diacritics, word analysis, and verification."""

CONTENT_ANALYSIS_PROMPT = (
    """Analyze this Islamic text to provide:

1. Title (property: `title`):
   - Clear, simple English (3-7 words)
   - Captures main Islamic topic
   - Uses appropriate Islamic terminology

2. Summary (property: `summary`):
   - Concise description of main Islamic content (one sentence)
   - Includes key Islamic themes
   - Uses clear, accessible language
   - NO filler/weasel words (this, that, it, possibly, seems, might, could)
   - Direct, precise statements only

3. Difficulty Level (property: `difficulty_level`, 1-5):
"""
    + format_difficulty_levels()
    + """

IMPORTANT: Preserve ALL original text formatting, punctuation, and special characters throughout the analysis.

Proceed to text splitting after analysis.
"""
)

SENTENCE_SPLITTING_USER_PROMPT = (
    CONTENT_ANALYSIS_PROMPT
    + """

Split the Islamic text into learner-friendly units (property: `units`) and identify their types (property: `unit_types`):

Rules:
1. Create short learner-friendly units
2. Split at:
   - Complete thoughts
   - Distinct complete clauses
   - Natural stops such as punctuation
   - Learning friendly units
3. Special handling:
   - Keep Quran verses intact
   - Break long narrator chains
   - Keep brief prayers whole
   - Keep related phrases conveying single concepts together
   - Preserve ALL original punctuation and formatting
4. Mark unit types: simple, compound, condition, quote, verse, phrase, etc.
5. Example length: "ولا شك أن ما يصيب المسلم في هذه الدنيا من آفات ومحن ما هو إلا محض ابتلاء من الله،"

IMPORTANT:
- AVOID units that are excessively short (e.g., 1-3 words) unless grammatically necessary (like single-word interjections).
- Preserve ALL original text formatting, punctuation, and special characters in each unit

Return results as JSON matching the SplitResult structure with fields:
- units: Array of text units/sentences
- title: Concise English title (3-7 words)
- summary: One-sentence summary of main content
- difficulty_level: Difficulty rating (1-5)
- total_units: Total number of units
- unit_types: Type of each unit (optional)

Return results as valid JSON.

Input text:
"""
)

SENTENCE_TRANSLATION_USER_PROMPT = """Translate Classical Arabic sentences from Islamic texts to English with proper context and linguistic accuracy.

Focus on preserving Islamic terminology and classical Arabic meanings. Handle Arabic script complexities carefully including proper tashkeel preservation.

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
   - Each object should have `text` (the uncertain part) and `reason` (why it's uncertain).
   - Only list actual uncertainties, not alternative translations.

Example:
Arabic: وقال النبي صلى الله عليه وسلم
✓ `translation`: "And the Prophet [Muhammad], peace be upon him, said"
  `notes`: "Grammatical structure: قَالَ (perfect tense verb) + النَّبِيُّ (subject in nominative case with definite article) + صَلَّى (perfect tense verb in invocation) + اللَّهُ (subject in nominative) + عَلَيْهِ (preposition with pronoun) + وَسَلَّمَ (coordinated perfect tense verb)"
  `uncertainties`: []
✗ `translation`: "And spoke the Prophet prayers and peace upon him"

IMPORTANT: Do not modify, normalize, or clean any part of the original Arabic text. Preserve ALL formatting.

VALIDATION CHECKLIST:
- Every translation has a non-empty `translation` field
- Every translation has an `uncertainties` array (even if empty)
- Every translation has a `word_by_word` array with proper structure
- All original text formatting is preserved
- No fields are missing or null

Provide a natural, accessible English translation that preserves the meaning and tone of the original Classical Arabic text.

Input sentences:
"""

TASHKEEL_USER_PROMPT = """Add complete diacritical marks (tashkīl) to Islamic Arabic text with full vocalization.

Focus on grammatical accuracy and proper case endings. Handle Arabic script complexities carefully.

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

WORD_BY_WORD_USER_PROMPT = (
    """Translate Arabic words individually. Return JSON matching WordTranslationResult structure with fields:
- word_translations: Array of WordTranslationOptions objects (REQUIRED)

Each WordTranslationOptions object must include ALL of these required fields:
- arabic: Original Arabic word (REQUIRED - preserve exact formatting)
- english_options: Array of English translation options (REQUIRED - 1-3 options, ordered most to least likely)
- pos: Part of speech from valid options (REQUIRED - never null)
- essential: Essential root letters (REQUIRED - never null, core letters without affixes)
- essential_translation_options: Array of essential translation options (REQUIRED - 1-3 options)
- notes: Translation notes (REQUIRED - never null, provide grammar context)
- uncertainties: Array of uncertainty objects (REQUIRED - can be empty array)

VALIDATION REQUIREMENTS:
- ALL fields above are mandatory and must be present for every word
- `pos` must be one of: """
    + format_valid_pos()
    + """
- `essential` should contain core letters, stripped of affixes/suffixes and case/mood endings
- Basic standard diacritics (like on فَعَلَ) are acceptable in `essential` field
- Preserve ALL original text formatting, punctuation, and special characters in `arabic` field
- Provide 1-3 options for `english_options` and `essential_translation_options`, ordered by likelihood

CRITICAL: Return only valid JSON matching WordTranslationResult schema. Every word must have ALL required fields populated.

Input for word-by-word translation:
"""
)

FINAL_VERIFICATION_USER_PROMPT = """Review and refine the provided Islamic Arabic translation components. Return JSON matching RefinementResult structure with ALL required fields:

REQUIRED FIELDS:
- improved_tashkeel: Refined diacritical marks (REQUIRED - string)
- improved_translation: Refined translation (REQUIRED - string)
- improved_word_translations: Array of final WordTranslation objects (REQUIRED - each must have: arabic, english, pos, essential, essential_translation, notes)

OPTIONAL FIELDS (provide null if not applicable):
- resolved_uncertainties: Array of resolved uncertainty objects (OPTIONAL - null or array)
- remaining_uncertainties: Array of unresolved uncertainty objects (OPTIONAL - null or array)
- changes_made: Array of change descriptions (OPTIONAL - null or array)

PROCESSING REQUIREMENTS:
- Resolve ambiguities and select the single best option for each word translation
- Ensure consistency across all components (tashkeel, translation, word translations)
- Address any uncertainties that can be resolved based on context
- For `improved_word_translations`, each WordTranslation object must include ALL required fields:
  * arabic: Original Arabic word
  * english: Single best English translation (not array)
  * pos: Part of speech from valid options
  * essential: Essential root letters
  * essential_translation: Single best root meaning (not array)
  * notes: Grammar and translation notes

CRITICAL: Return valid JSON with ALL required fields populated. Optional fields can be null.

Input components to refine:
"""
