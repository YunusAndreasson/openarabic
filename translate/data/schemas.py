"""
This file contains prompts and constants for the translation system.
Pydantic models are defined in data/models.py.
"""

from .config import VALID_CATEGORIES
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
   - Make it interesting, still not a "click bait"

2. Summary:
   - Avoid "weasel words"
   - Short and easy to understand single sentence
   - Should be exciting like its "promoting" the content

3. Category:
   - Choose the most appropriate category from the valid categories below
   - Only use one of these exact categories: """
    + ", ".join(f"'{category}'" for category in VALID_CATEGORIES.keys())
    + """
   - Base your choice on the actual content, not assumptions
   - Examples:
     * Text about Islamic beliefs and creed → 'aqeedah'
     * Text about Islamic law and jurisprudence → 'fiqh'
     * Text about Prophet's sayings and actions → 'hadith'
     * Text about Quranic verses or recitation → 'quran'
     * Text about Prophet Muhammad's biography → 'seerah'
     * Text about spiritual excellence and worship → 'ihsan'
     * Text about Quranic explanation and commentary → 'tafsir'

4. Difficulty Level (1–5):
"""
    + format_difficulty_levels()
    + """

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
   - Simple vocabulary; English‑only output (used for audiobook and reading)
   - **CRITICAL: Use English words only - never include Arabic terms in parentheses or brackets**
   - **Examples of required substitutions:**
     * Allah → God
     * Hadith → Narration
     * Sujood → Prostration
     * Ruko → Bowing
     * Dhikr → Remembrance
     * Tawhid → Monotheism
     * Shirk → Polytheism
     * Salah → Prayer
     * Zakat → Charity
     * Hajj → Pilgrimage
     * Quran → Scripture
   - Match register: solemn (supplications), precise (hadith)
   - Grammatically sound (conjugation, agreement, syntax)
2. notes:
   - Brief context or grammar observations
3. uncertainties:
   - Uncertainties in translation each with text and reason

Explicit phrasing rule:
- Always expand Arabic morphology into explicit English multi-word phrases. Avoid condensed/archaic compounds like "therein/thereof/whereby". Prefer "in it", "of it", "by which", "for him", etc.
- Do not omit functional words (prepositions, pronouns) encoded in Arabic; make them explicit in English.

Good / Bad examples (English phrasing):
- Good: فيه → "in it", لهم → "for them", وبالبيت → "and in the house"
- Bad: فيه → "therein", لهم → "theirs", وبالبيت → "withinhouse" or "andwithinhouse"

Arabic→English alignment examples (english only, not essential):
- فيه (prefix + root + suffix): english must be two words, e.g., "in it".
- وبالبيت (conj + prep + definite article + noun): english → "and in the house".
- منهم (prep + pronoun): english → "from them".
- كالكتاب (prep + al + noun): english → "like the book".

Example:
Arabic: وقال النبي صلى الله عليه وسلم
✓ `translation`: "And the Prophet, peace be upon him, said"
  `notes`: "Grammatical structure: قَالَ (perfect tense verb) + النَّبِيُّ (subject in nominative case with definite article) + صَلَّى (perfect tense verb in invocation) + اللَّهُ (subject in nominative) + عَلَيْهِ (preposition with pronoun) + وَسَلَّمَ (coordinated perfect tense verb)"
  `uncertainties`: ["The word قَالَ is not a perfect tense verb, it is a past tense verb"]
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
- Use the provided suggestion produced by camel_tools

If uncertain, include an uncertainty with: word, reason, and optionally related_translation_uncertainty.

Input text:
"""

WORD_BY_WORD_USER_PROMPT = (
    """Translate Arabic words individually with informative, user-friendly explanations.

Guidelines:
- Preserve exact Arabic formatting in arabic
- Provide 1–3 concise options for english and essential_translation when not finalized
- pos must be from the allowed set: """
    + format_valid_pos()
    + """
- **CRITICAL: Use English words only - never include Arabic terms in parentheses or brackets**
- **Required English substitutions for Islamic terms:**
  * Allah → God
  * Hadith → Narration
  * Sujood → Prostration
  * Ruko → Bowing
  * Dhikr → Remembrance
  * Tawhid → Monotheism
  * Shirk → Polytheism
  * Salah → Prayer
  * Zakat → Charity
  * Hajj → Pilgrimage
  * Quran → Scripture
- Prefer explicit multi-word English phrases that reflect Arabic morphology; avoid condensed/archaic forms like 'therein', 'thereof', 'whereby'. Use 'in it', 'of it', 'by which', 'for him', etc.
- Never omit functional words; if the Arabic token encodes a preposition+pronoun (e.g., فيه، له، منهم), the english must include both parts (e.g., "in it", "for him", "from them").

- `essential` will be used for language learning so remove prefixes and suffixes such as "الـ", "ـُ", "ـٍ"

**Rules for `essential` field:**
1. **KEEP as-is** (no changes needed):
   - Simple prepositions: "مِنْ" (from), "إِلَى" (to), "عَنْ" (about)
   - Basic particles: "لَا" (no), "مَا" (what), "هَلْ" (is it?)
   - Root forms: "كَتَبَ" (he wrote), "قَرَأَ" (he read)

2. **STRIP affixes** (remove complex grammatical endings):
   - Verbs: "يَكْتُبُ" → "كَتَبَ" (remove ي prefix and ُ suffix)
   - Nouns: "الْكِتَابُ" → "كِتَابٌ" (remove ال prefix and ُ suffix)
   - Adjectives: "كَاتِبًا" → "كَاتِبٌ" (remove ً suffix)
   - Complex forms: "تَكْتُبِينَ" → "كَتَبَ" (remove ت prefix + ين suffix)

**Examples for `essential` only (strip affixes; keep diacritics on core):**
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

**📝 GRAMMAR NOTES - USER-FRIENDLY EXPLANATIONS:**
The `notes` field will be shown directly to users, so make them informative and interesting. Follow these guidelines:

**✍️ WRITING STYLE:**
- Use clear, helpful language that explains linguistic concepts
- Avoid advanced grammatical terms - keep it accessible
- Make explanations informative and educational
- Use relevant examples when they clarify the concept

**🔤 NEVER USE ARABIC LETTERS:**
- Use transliterations like "-hum" (for them), "-ha" (for her), "-un" (for he/it)
- Example: Instead of writing "هُمْ", write "-hum" (meaning them)

**📋 WHEN TO ADD INFORMATIVE NOTES:**

1. **Two-Word Translations:** When one Arabic word becomes two English words
   - "This single Arabic word becomes two English words: 'for him'"
   - "Arabic combines two concepts in one word: 'in it'"

2. **Interesting Context:** When there's notable grammatical background
   - "This word uses a special honorific form reserved for prophets"
   - "This ending indicates respect for Allah"

3. **Different Translation:** When the word is translated differently in this context
   - "Normally means 'house', but here refers to 'family' - Arabic's poetic usage"
   - "Usually 'to write', but in this religious context means 'to decree'"

4. **Pronoun Attachments:** When pronouns attach to words
   - "The '-hum' ending indicates 'their' - Arabic often attaches pronouns to words"
   - "The '-ha' shows this belongs to 'her' - similar to adding 's in English"

**💡 EXAMPLES OF GOOD NOTES:**
❌ POOR: "Third person masculine plural pronoun suffix"
✅ BETTER: "The '-hum' ending indicates 'their' - Arabic attaches pronouns to words"

❌ POOR: "Preposition + pronoun combination"
✅ BETTER: "Arabic combines two concepts in one word: 'in it'"

❌ POOR: "Honorific form for prophets"
✅ BETTER: "This special form is reserved for prophets - shows ultimate respect"

❌ POOR: "Context-dependent translation"
✅ BETTER: "Normally means 'to send', but here means 'to reveal' - religious context changes the meaning"

**📏 FORMATTING GUIDELINES:**
- Keep explanations clear and concise
- Compare to English patterns when helpful
- Limit to 1-2 sentences for mobile readability
- Focus on educational value over entertainment

Return valid JSON matching the WordTranslationResult model schema. Ensure the `english` string uses explicit multi‑word phrasing whenever morphology encodes multiple concepts (e.g., preposition + pronoun).

Input for word‑by‑word translation:
"""
)

FINAL_VERIFICATION_USER_PROMPT = """Review and refine the provided components.

Goals:
- Resolve ambiguities; select single best options for words
- Ensure consistency across tashkeel, translation, and word translations
- Address uncertainties when possible

**What NOT to do:**
- ❌ Don't "clean up" diacritics from correct essential forms
- ❌ Don't strip fatha, kasra, damma, shadda unless they're part of affixes
- ❌ Don't change "مِنْ" to "من" (this removes necessary diacritics)
- ❌ Don't change "كَتَبَ" to "كتب" (this removes necessary diacritics)
- ❌ Don't use condensed/archaic English compounds like "therein/thereof/whereby" when the Arabic encodes separate concepts (e.g., preposition + pronoun).
- ❌ **NEVER include Arabic terms in English translations** (e.g., "God (Allah)", "prayer (salah)", "scripture (Quran)")

**What TO do:**
- ✅ Keep correct essential forms exactly as provided
- ✅ Only fix actual grammatical errors
- ✅ Preserve all diacritics that are part of the root form
- ✅ Ensure consistency with tashkeel and translations
- ✅ Expand condensed English into explicit phrases that mirror Arabic morphology (e.g., "therein" → "in it", "thereof" → "of it").
- ✅ Ensure functional words are present; do not omit prepositions/pronouns encoded in Arabic tokens.
- ✅ **CRITICAL**: Select only ONE final English translation from the alternatives provided in the previous phase
- ✅ Remove all option arrays; each word must have a single, definitive English translation and no synonyms such as "book/scripture"
- ✅ **ENSURE PURE ENGLISH**: Replace any Arabic terms with English equivalents:
  * Allah → God
  * Hadith → Narration
  * Sujood → Prostration
  * Ruko → Bowing
  * Dhikr → Remembrance
  * Tawhid → Monotheism
  * Shirk → Polytheism
  * Salah → Prayer
  * Zakat → Charity
  * Hajj → Pilgrimage
  * Quran → Scripture

**📝 GRAMMAR NOTES REFINEMENT:**
- ✅ **PRESERVE INFORMATIVE STYLE**: Keep grammar notes clear and educational
- ✅ **MAINTAIN USER-FOCUS**: Ensure notes are helpful and accessible for learners
- ✅ **KEEP TRANSLITERATIONS**: Never use Arabic letters, only transliterations like "-hum", "-ha"
- ✅ **PRESERVE CLARITY**: Keep explanations clear and professional
- ✅ **MAINTAIN LENGTH**: Keep notes under 2 sentences for mobile reading
- ✅ **ENHANCE IF NEEDED**: If a note is unclear, make it more informative during refinement

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
