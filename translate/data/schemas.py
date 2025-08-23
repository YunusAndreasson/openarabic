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
    return ", ".join(
        f"'{pos.value}'" for pos in sorted(PartOfSpeech, key=lambda x: x.value)
    )


def format_difficulty_levels() -> str:
    """Format difficulty levels as a readable list for prompts."""
    return "\n".join(
        f"Level {level.value}: {DIFFICULTY_LEVELS[level]}"
        for level in sorted(DifficultyLevel, key=lambda x: x.value)
    )


# Prompt instructions (behavioral guidance only; structure/validation is defined in data/models.py)
GENERAL_SYSTEM_PROMPT = """Expert translator specializing in Classical Arabic Islamic texts and teaching.

Priorities:
1. Accuracy: Preserve authentic Islamic meaning
2. Context: Consider historical-religious context
3. Terminology: Handle Islamic terminology, honorifics, narrators accurately
4. Text Preservation: Maintain ALL original text formatting, punctuation, and special characters
5. Ambiguity: Document uncertainties, resolve through context
6. Consistency: Maintain consistent translations for Islamic concepts
7. Accessibility: Use simple, clear English appropriate for Islamic context

Apply these principles to all translation tasks (splitting, diacritics, word analysis, verification)."""

CONTENT_ANALYSIS_PROMPT = (
    """Analyze this Islamic text and then split it for learning. In your analysis:

1. Title:
   - Clear, simple English (3–7 words)
   - Captures the main Islamic topic using appropriate terminology

2. Summary:
   - One concise sentence describing the main content and key Islamic themes
   - Direct language only (no filler/weasel words)

3. Difficulty Level (1–5):
"""
    + format_difficulty_levels()
    + """

Important: Preserve ALL original formatting, punctuation, and special characters throughout.

Proceed to text splitting after analysis.
"""
)

SENTENCE_SPLITTING_USER_PROMPT = (
    CONTENT_ANALYSIS_PROMPT
    + """

Now split the text into learner‑friendly units:

Guidelines:
1. Create short units at natural boundaries:
   - Complete thoughts, distinct clauses, punctuation
   - The sentences will later be converted to audio
2. Special handling:
   - Keep Quran verses intact
   - Break long narrator chains
   - Keep brief prayers whole
   - Keep tightly related phrases together
3. Avoid units that are too short (1–3 words) unless grammatically necessary.
4. Always preserve original punctuation and formatting.

Return valid JSON matching the SplitResult model schema.

Input text:
"""
)

SENTENCE_TRANSLATION_USER_PROMPT = """Translate Classical Arabic (fusha) to accessible English with contextual accuracy.

Focus on preserving Islamic terminology and classical Arabic meanings. Handle Arabic script complexities carefully including proper tashkeel preservation.

For each sentence, provide:
1. translation:
   - Simple vocabulary; English‑only output (used for audio)
   - Match register: solemn (supplications), precise (hadith)
   - Grammatically sound (conjugation, agreement, syntax)
2. notes:
   - Brief context or grammar observations
3. uncertainties:
   - Uncertainties in translation each with text and reason

Example:
Arabic: وقال النبي صلى الله عليه وسلم
✓ `translation`: "And the Prophet [Muhammad], peace be upon him, said"
  `notes`: "Grammatical structure: قَالَ (perfect tense verb) + النَّبِيُّ (subject in nominative case with definite article) + صَلَّى (perfect tense verb in invocation) + اللَّهُ (subject in nominative) + عَلَيْهِ (preposition with pronoun) + وَسَلَّمَ (coordinated perfect tense verb)"
  `uncertainties`: []
✗ `translation`: "And spoke the Prophet prayers and peace upon him"

IMPORTANT: Do not modify, normalize, or clean any part of the original Arabic text. Preserve ALL formatting.

Provide a natural translation that preserves meaning and tone. Structure and validation are enforced by the TranslationResult/WordTranslation models.

Input sentences:
"""

TASHKEEL_USER_PROMPT = """Add complete diacritical marks (tashkīl) with full vocalization.

Focus on grammatical accuracy and proper case endings. Handle Arabic script complexities carefully.

Requirements:
- Ensure full vocalization; apply appropriate diacritics to every eligible letter
- Use context and notes to resolve vowelization ambiguities
- Pay attention to case endings, verb forms, tense/mood, and agreement
- Preserve ALL original punctuation, formatting, and special characters
- Use English translation for hints to resolve ambiguities

If uncertain, include an uncertainty with: word, reason, and optionally related_translation_uncertainty.

Input text:
"""

WORD_BY_WORD_USER_PROMPT = (
    """Translate Arabic words individually.

Guidelines:
- Preserve exact Arabic formatting in arabic
- Provide 1–3 concise options for english and essential_translation when not finalized
- pos must be from the allowed set: """
    + format_valid_pos()
    + """
- `essential` must retain root letters + diacritics while removing only complex affixes/case endings
- `essential` will be used for language learning flashcards so the form be based on that

**Rules for essential field:**
1. **KEEP as-is** (no changes needed):
   - Simple prepositions: "مِنْ" (from), "إِلَى" (to), "عَنْ" (about)
   - Basic particles: "لَا" (no), "مَا" (what), "هَلْ" (is it?)
   - Root forms: "كَتَبَ" (he wrote), "قَرَأَ" (he read)
   - **Root nouns/adjectives**: "مُتَضَمَّنٌ" (contained), "كَاتِبٌ" (writer), "قَارِئٌ" (reader)
   - **IMPORTANT**: For prepositions, particles, and root forms, the essential field CAN be identical to the arabic field

2. **STRIP affixes** (remove complex grammatical endings):
   - Verbs: "يَكْتُبُ" → "كَتَبَ" (remove ي prefix and ُ suffix)
   - Nouns: "الْكِتَابُ" → "كِتَابٌ" (remove ال prefix and ُ suffix)
   - Adjectives: "كَاتِبًا" → "كَاتِبٌ" (remove ً suffix)
   - Complex forms: "تَكْتُبِينَ" → "كَتَبَ" (remove ت prefix + ين suffix)

**Examples:**
- "مِنْ" → "مِنْ" (keep as-is: simple preposition)
- "يَكْتُبُ" → "كَتَبَ" (strip: ي prefix + ُ suffix)
- "الْكِتَابُ" → "كِتَابٌ" (strip: ال prefix + ُ suffix)
- "كَاتِبًا" → "كَاتِبٌ" (strip: ً suffix)
- "تَكْتُبِينَ" → "كَتَبَ" (strip: ت prefix + ين suffix)

**❌ INCORRECT Examples (what NOT to do):**
- "مِنْ" → "من" (❌ Don't strip diacritics from prepositions)
- "يَكْتُبُ" → "كتب" (❌ Don't strip ALL diacritics, only affixes)
- "شَيْءٍ" → "شيء" (❌ Don't strip tanween ٍ from nouns)
- "إِلَّا" → "إلا" (❌ Don't strip shadda ّ from particles)

**IMPORTANT**: The essential field must preserve diacritics (fatha, kasra, damma, shadda) while only removing grammatical affixes (prefixes, suffixes, case endings).

**Canonicalization rules (for essential):**
- Verbs: return past tense, 3rd person masculine singular (e.g., "يَكْتُبُ" → "كَتَبَ") with correct vowels.
- Nouns/adjectives: return indefinite singular nominative with proper tanwīn (e.g., "الْكِتَابُ" → "كِتَابٌ", "كَاتِبًا" → "كَاتِبٌ").
- Do not strip core diacritics from the base form (e.g., don’t remove tanwīn from nouns or shadda from particles).
- Only remove grammatical affixes: definite article "الـ", person/number verb affixes, and case/mood endings.

**Form constraints:**
- `essential` (Arabic) MUST be exactly one word/token (no whitespace).
- Diacritics are mandatory in `essential`; do not remove them.

**Ambiguity handling:**
- If multiple plausible essentials exist, choose the simplest canonical base per the rules above and include a brief uncertainty note (why others were rejected).
- When uncertain, prefer the tashkīl produced in the diacritics step rather than inventing a new pattern.
- Never drop diacritics due to uncertainty; err on the side of preserving them.

Return valid JSON matching the WordTranslationResult model schema.

Input for word‑by‑word translation:
"""
)

FINAL_VERIFICATION_USER_PROMPT = """Review and refine the provided components.

Goals:
- Resolve ambiguities; select single best options for words
- Ensure consistency across tashkeel, translation, and word translations
- Address uncertainties when possible

**CRITICAL**: Do NOT modify the essential field unless there are actual errors.
- If the AI provided "مِنْ" for a preposition, keep it as "مِنْ" (with sukoon)
- If the AI provided "كَتَبَ" for a verb, keep it as "كَتَبَ" (with diacritics)
- If the AI provided "شَيْء" for a noun, keep it as "شَيْء" (with diacritics)
- Only change essential fields if they are grammatically incorrect or missing

- Prefer canonical forms: verbs as past 3ms; nouns/adjectives as indefinite singular nominative with tanwīn.

**What NOT to do:**
- ❌ Don't "clean up" diacritics from correct essential forms
- ❌ Don't strip fatha, kasra, damma, shadda unless they're part of affixes
- ❌ Don't change "مِنْ" to "من" (this removes necessary diacritics)
- ❌ Don't change "كَتَبَ" to "كتب" (this removes necessary diacritics)

**What TO do:**
- ✅ Keep correct essential forms exactly as provided
- ✅ Only fix actual grammatical errors
- ✅ Preserve all diacritics that are part of the root form
- ✅ Ensure consistency with tashkeel and translations

Return valid JSON matching the RefinementResult model schema. Each improved_word_translation must be finalized (no option arrays).

Hard output constraints (to satisfy schema validation):
- improved_word_translation.english MUST be a single string (never an array). It may be a multi‑word phrase (e.g., "for him", "with force").
- improved_word_translation.essential MUST be a single Arabic word/token (no whitespace).
- improved_word_translation.essential_translation MUST be a single string (never an array). It may be multi‑word if needed.
- Remove all alternative options; only keep the best single choice

Bad → Good examples:
- Bad: "english": ["thing", "an entity"], "essential_translation": ["thing"]
- Good: "english": "for him", "essential_translation": "for him"

Input components to refine:
"""
