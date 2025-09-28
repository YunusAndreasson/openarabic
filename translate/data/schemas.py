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

Apply these principles to all translation tasks (splitting, diacritics, word analysis, verification).

Core Rules (apply in every phase):
- English-only output for all English fields (title, summary, translations, notes); never include Arabic script or transliterations in English fields.
- All English content will be read aloud via text-to-speech, so use natural, flowing language suitable for audio reading.
- Expand Arabic morphology into explicit multi-word English (e.g., "therein" -> "in it"); do not omit functional words encoded in Arabic.
- Do not add parenthetical Arabic terms in any English output.
"""

CONTENT_ANALYSIS_PROMPT = (
    """Analyze this Islamic text and then split it for learning. In your analysis:

1. Title:
   - Clear, simple English (3-7 words) suitable for text-to-speech reading
   - Captures the main Islamic topic using specific terminology
   - Avoid generic phrases like "Islamic text", "this passage", "the content"
   - Make it interesting but not "click bait"
   - English-only words (no Arabic or transliteration)
   - Use natural phrasing that flows well when spoken aloud
2. Summary:
   - Single clear sentence that captures the main Islamic concept
   - Avoid vague phrases like "this text", "the passage", "the content"
   - Use specific Islamic terminology and meaningful descriptions
   - English-only wording (no Arabic terms or transliterations)
   - Make it informative and engaging for readers
   - Write in natural, flowing language suitable for text-to-speech reading

3. Category:
   - Choose the most appropriate category from the valid categories below
   - Only use one of these exact categories: """
    + ", ".join(f"'{category}'" for category in VALID_CATEGORIES.keys())
    + """
   - Base your choice on the actual content, not assumptions

4. Difficulty Level (1-5):
"""
    + format_difficulty_levels()
    + """

Proceed to text splitting after analysis.
"""
)

SENTENCE_SPLITTING_USER_PROMPT = (
    CONTENT_ANALYSIS_PROMPT
    + """

Now split the text into learner-friendly units:

Guidelines:
1. Create short units at natural boundaries:
   - Complete thoughts, distinct clauses, punctuation
   - The sentences will be read aloud via text-to-speech, so ensure they flow naturally when spoken
   - Avoid awkward breaks that would sound unnatural in audio
2. Special handling:
   - Keep Quran verses intact
   - Break long narrator chains
   - Keep brief prayers whole
   - Keep tightly related phrases together
3. Avoid units that are too short (1-3 words) unless grammatically necessary.
4. Always preserve original punctuation and formatting.
5. Ensure each unit makes complete sense when read aloud independently.

Return valid JSON matching the SplitResult model schema.

Input text:
"""
)

SENTENCE_TRANSLATION_USER_PROMPT = """Translate Classical Arabic (fusha) to accessible English with contextual accuracy.

Focus on preserving Islamic terminology and classical Arabic meanings. Handle Arabic script complexities carefully including proper tashkeel preservation.

For each sentence, provide:
1. translation:
   - Simple vocabulary; English-only output (used for audiobook and reading)
   - Write in natural, flowing language suitable for text-to-speech reading
   - Follow Core Rules: no Arabic script/transliteration in English fields; expand morphology into explicit multi-word English; no parenthetical Arabic terms
2. notes:
   - Brief context or grammar observations
3. uncertainties:
   - Always expand Arabic morphology into explicit English multi-word phrases. Avoid condensed/archaic compounds like "therein/thereof/whereby". Prefer "in it", "of it", "by which", "for him", etc.
   - Do not omit functional words (prepositions, pronouns) encoded in Arabic; make them explicit in English.
   - Use natural, flowing language that sounds natural when read aloud via text-to-speech.

Example (concise):
- فيه -> "in it" (good)
- فيه -> "therein" (bad)

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
- Provide 1-3 concise options for english and essential_translation when not finalized
- pos must be from the allowed set: """
    + format_valid_pos()
    + """
- Follow Core Rules: English-only in English fields; no Arabic terms or transliteration; expand morphology explicitly
- Prefer explicit multi-word English phrases that reflect Arabic morphology; avoid condensed/archaic forms like 'therein', 'thereof', 'whereby'. Use 'in it', 'of it', 'by which', 'for him', etc.
- Never omit functional words; if the Arabic token encodes a preposition+pronoun (e.g., فيه, له, منهم), the english must include both parts (e.g., "in it", "for him", "from them").

- `essential` is a single Arabic token (no whitespace). Strip only affixes; preserve core diacritics.
  Example: "الْكِتَابُ" -> "كِتَابٌ" (OK); "مِنْ" -> "من" (NOT OK, do not strip diacritics from simple prepositions).

**Grammar notes (concise):**
- Write in clear, accessible language; 1-2 sentences max; no Arabic letters, use transliterations like "-hum".
- Add notes when a single Arabic word yields two English words (e.g., "for him"), or when context shifts meaning.

Return valid JSON matching the WordTranslationResult model schema. Ensure the `english` string uses explicit multi-word phrasing whenever morphology encodes multiple concepts (e.g., preposition + pronoun).

Input for word-by-word translation:
"""
)

FINAL_VERIFICATION_USER_PROMPT = """Review and refine the provided components.

Checklist:
- Single best choice per word (no arrays, no synonyms); enforce English-only across all outputs (Core Rules)
- Preserve correct diacritics on essential forms; do not "clean up" valid diacritics
- Ensure explicit English phrasing mirrors Arabic morphology (e.g., "therein" -> "in it")
- Keep functional words present when encoded in Arabic (prepositions/pronouns)
- Fix only real grammatical errors; maintain consistency across tashkeel, translations, and word entries
- Notes concise (<= 20 words); at most 2 uncertainties per sentence if needed

Return valid JSON matching the RefinementResult model schema. Each improved_word_translation must be finalized (no option arrays).

Hard output constraints (to satisfy schema validation):
- improved_word_translation.english is a single string (may be multi-word)
- improved_word_translation.essential is a single Arabic token (no whitespace)
- improved_word_translation.essential_translation is a single string (may be multi-word)

Input components to refine:
"""
