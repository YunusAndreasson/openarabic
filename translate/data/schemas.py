"""
This file contains all the schemas, prompts, and constants for the translation system.
"""

from .enums import DifficultyLevel, PartOfSpeech

# Define valid parts of speech
VALID_POS = PartOfSpeech.values()

# Define difficulty levels with descriptions
DIFFICULTY_LEVELS = {level.value: level.description for level in DifficultyLevel}


def format_valid_pos() -> str:
    """Format VALID_POS as a readable list for prompts."""
    return PartOfSpeech.format_for_prompt()


def format_difficulty_levels() -> str:
    """Format difficulty levels as a readable list for prompts."""
    return DifficultyLevel.format_for_prompt()


# Define tool schemas for Response API operations
# Tool for translating sentences
TRANSLATE_SENTENCES_TOOL = {
    "name": "translate_sentences",
    "type": "function",
    "function": {
        "description": "Translate Classical Arabic sentences from Islamic texts to English, preserving word order where possible and noting uncertainties",
        "parameters": {
            "type": "object",
            "properties": {
                "translations": {
                    "type": "array",
                    "description": "Array of translation results",
                    "items": {
                        "type": "object",
                        "properties": {
                            "translation": {
                                "type": "string",
                                "description": "The English translation",
                            },
                            "notes": {
                                "type": "string",
                                "description": "Translation notes (always expected)",
                            },
                            "uncertainties": {
                                "type": "array",
                                "description": "List of uncertain parts",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "text": {
                                            "type": "string",
                                            "description": "Uncertain text",
                                        },
                                        "reason": {
                                            "type": "string",
                                            "description": "Reason for uncertainty",
                                        },
                                    },
                                    "required": ["text", "reason"],
                                },
                            },
                            "word_by_word": {
                                "type": "array",
                                "description": "Word-by-word analysis (always expected)",
                                "items": {"type": "object"},
                            },
                        },
                        "required": [
                            "translation",
                            "word_by_word",
                        ],
                    },
                },
            },
            "required": ["translations"],
            "examples": [
                {
                    "translations": [
                        {
                            "translation": "And the Prophet [Muhammad], peace be upon him, said",
                            "notes": "Grammatical structure: قَالَ (perfect tense verb) + النَّبِيُّ (subject in nominative case with definite article)",
                            "uncertainties": [],
                            "word_by_word": [],
                        },
                    ],
                },
            ],
        },
    },
}

# Tool for adding tashkeel (diacritical marks)
TASHKEEL_TOOL = {
    "name": "add_tashkeel",
    "type": "function",
    "function": {
        "description": "Add proper diacritical marks (tashkeel/harakat) to Arabic texts",
        "parameters": {
            "type": "object",
            "properties": {
                "tashkeels": {
                    "type": "array",
                    "description": "Array of texts with diacritics added",
                    "items": {
                        "type": "object",
                        "properties": {
                            "tashkeel": {
                                "type": "string",
                                "description": "The text with diacritics",
                            },
                            "uncertainties": {
                                "type": "array",
                                "description": "List of uncertain diacritics",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "word": {
                                            "type": "string",
                                            "description": "Word with uncertain diacritic",
                                        },
                                        "reason": {
                                            "type": "string",
                                            "description": "Reason for uncertainty",
                                        },
                                        "related_translation_uncertainty": {
                                            "type": "string",
                                            "description": "Related uncertainty from translation step (always expected)",
                                        },
                                    },
                                    "required": [
                                        "word",
                                        "reason",
                                    ],
                                },
                            },
                        },
                        "required": ["tashkeel", "uncertainties"],
                    },
                },
            },
            "required": ["tashkeels"],
            "examples": [
                {"tashkeels": [{"tashkeel": "قَالَ النَّبِيُّ", "uncertainties": []}]}
            ],
        },
    },
}

# Tool for word-by-word translation
WORD_TRANSLATION_TOOL = {
    "name": "translate_words",
    "type": "function",
    "function": {
        "description": "Create word-by-word translations for Arabic sentences, providing top options",
        "parameters": {
            "type": "object",
            "properties": {
                "results": {
                    "type": "array",
                    "description": "Array of word translation results for each sentence",
                    "items": {
                        "type": "object",
                        "properties": {
                            "word_translations": {
                                "type": "array",
                                "description": "Word-by-word translations for the sentence",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "arabic": {
                                            "type": "string",
                                            "description": "The original Arabic word with original formatting",
                                        },
                                        "english_options": {
                                            "type": "array",
                                            "description": "Top 3 likely English translations in context (most likely first)",
                                            "items": {"type": "string"},
                                        },
                                        "pos": {
                                            "type": "string",
                                            "enum": VALID_POS,
                                            "description": "Part of speech (always expected)",
                                        },
                                        "essential": {
                                            "type": "string",
                                            "description": "Arabic word stripped of common affixes (و, ف, ب, ك, ل, س, etc.) and common suffixes (object pronouns و, ه, ك, ي, نا, etc.), excluding case/mood endings. Provide just the core letters, ideally with basic diacritics if standard (e.g., base verb form like فَعَلَ). Aim for the simplest recognizable form for flashcards.",
                                        },
                                        "essential_translation_options": {
                                            "type": "array",
                                            "description": "Top 3 likely one-word English lexical meanings (most likely first)",
                                            "items": {"type": "string"},
                                        },
                                        "notes": {
                                            "type": "string",
                                            "description": "Grammar notes or context (always expected)",
                                        },
                                        "uncertainties": {
                                            "type": "array",
                                            "description": "List of uncertain parts for this word",
                                            "items": {"type": "object"},
                                        },
                                    },
                                    "required": [
                                        "arabic",
                                        "english_options",
                                        "pos",
                                        "essential",
                                        "essential_translation_options",
                                    ],
                                },
                            },
                        },
                        "required": ["word_translations"],
                    },
                },
            },
            "required": ["results"],
            "examples": [
                {
                    "results": [
                        {
                            "word_translations": [
                                {
                                    "arabic": "قَالَ",
                                    "english_options": [
                                        "he said",
                                        "he spoke",
                                        "he stated",
                                    ],
                                    "pos": PartOfSpeech.VERB.value,
                                    "essential": "قَالَ",
                                    "essential_translation_options": [
                                        "say",
                                        "speak",
                                        "utter",
                                    ],
                                    "notes": "Verb, perfect tense, 3rd person masculine singular.",
                                    "uncertainties": [],
                                },
                                {
                                    "arabic": "النَّبِيُّ",
                                    "english_options": ["the prophet", "the messenger"],
                                    "pos": PartOfSpeech.NOUN.value,
                                    "essential": "نَبِيّ",
                                    "essential_translation_options": [
                                        "prophet",
                                        "messenger",
                                    ],
                                    "notes": "Noun, masculine singular, definite.",
                                    "uncertainties": [],
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    },
}

# Tool for refining translations
REFINEMENT_TOOL = {
    "name": "refine_translations",
    "type": "function",
    "function": {
        "description": "Refine translations, selecting the best options based on full context",
        "parameters": {
            "type": "object",
            "properties": {
                "refinements": {
                    "type": "array",
                    "description": "Array of refined translation results",
                    "items": {
                        "type": "object",
                        "properties": {
                            "improved_tashkeel": {
                                "type": "string",
                                "description": "Corrected text with diacritics",
                            },
                            "improved_translation": {
                                "type": "string",
                                "description": "Refined full sentence translation",
                            },
                            "improved_word_translations": {
                                "type": "array",
                                "description": "Refined word-by-word translations with single best options chosen",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "arabic": {
                                            "type": "string",
                                            "description": "The original Arabic word",
                                        },
                                        "english": {
                                            "type": "string",
                                            "description": "The *single* best English translation in context",
                                        },
                                        "pos": {
                                            "type": "string",
                                            "description": "Refined Part of speech (always expected)",
                                        },
                                        "essential": {
                                            "type": "string",
                                            "description": "Refined essential letters",
                                        },
                                        "essential_translation": {
                                            "type": "string",
                                            "description": "The *single* best one-word English lexical meaning",
                                        },
                                        "notes": {
                                            "type": "string",
                                            "description": "Refined notes (always expected)",
                                        },
                                    },
                                    "required": [
                                        "arabic",
                                        "english",
                                        "pos",
                                        "essential",
                                        "essential_translation",
                                    ],
                                },
                            },
                            "resolved_uncertainties": {
                                "type": "array",
                                "description": "How uncertainties were resolved",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "step": {
                                            "type": "string",
                                            "description": "Step where uncertainty occurred (e.g., 'tashkeel', 'translation')",
                                        },
                                        "original_uncertainty": {
                                            "type": "object",
                                            "description": "The original uncertainty object",
                                        },
                                        "resolution": {
                                            "type": "string",
                                            "description": "Description of the resolution",
                                        },
                                        "explanation": {
                                            "type": "string",
                                            "description": "Reasoning for the resolution",
                                        },
                                    },
                                    "required": [
                                        "step",
                                        "original_uncertainty",
                                        "resolution",
                                        "explanation",
                                    ],
                                },
                            },
                            "remaining_uncertainties": {
                                "type": "array",
                                "description": "Uncertainties that couldn't be fully resolved",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "type": {
                                            "type": "string",
                                            "description": "Type of uncertainty (e.g., 'diacritic', 'word meaning')",
                                        },
                                        "description": {
                                            "type": "string",
                                            "description": "Description of the uncertainty",
                                        },
                                        "reason_unresolved": {
                                            "type": "string",
                                            "description": "Why it remains unresolved",
                                        },
                                    },
                                    "required": [
                                        "type",
                                        "description",
                                        "reason_unresolved",
                                    ],
                                },
                            },
                            "changes_made": {
                                "type": "array",
                                "description": "List of significant changes made during refinement",
                                "items": {"type": "string"},
                            },
                        },
                        "required": [
                            "improved_tashkeel",
                            "improved_translation",
                            "improved_word_translations",
                            "resolved_uncertainties",
                            "remaining_uncertainties",
                            "changes_made",
                        ],
                    },
                },
            },
            "required": ["refinements"],
        },
    },
}

# Tool for splitting text into sentences
SPLIT_TEXT_TOOL = {
    "name": "split_text_into_sentences",
    "type": "function",
    "function": {
        "description": "Split Islamic Arabic text into meaningful units for learning and analyze content",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Concise English title (3-7 words)",
                },
                "summary": {
                    "type": "string",
                    "description": "One-sentence summary of main content",
                },
                "difficulty_level": {
                    "type": "integer",
                    "enum": list(DIFFICULTY_LEVELS.keys()),
                    "description": "Difficulty rating (1-5)",
                },
                "units": {
                    "type": "array",
                    "description": "Array of text units",
                    "items": {"type": "string"},
                },
                "unit_types": {
                    "type": "array",
                    "description": "Type of each unit",
                    "items": {"type": "string"},
                },
            },
            "required": ["title", "summary", "difficulty_level", "units", "unit_types"],
        },
    },
}

# Legacy function schemas removed - use TOOL versions instead

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

Return results using the `SPLIT_TEXT_TOOL` schema as valid JSON.
Input text:
"""
)

SENTENCE_TRANSLATION_USER_PROMPT = """Translate Classical Arabic sentences from Islamic texts to English using the `TRANSLATE_SENTENCES_TOOL` schema. Return your response as valid JSON.

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
2. `notes` (string, optional):
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
- All original text formatting is preserved
- No fields are missing or null

Input sentences:
"""

TASHKEEL_USER_PROMPT = """Add complete diacritical marks (tashkīl) to EVERY word in the Islamic Arabic text using the `TASHKEEL_TOOL` schema. Return your response as valid JSON.

CRITICAL: You MUST provide ALL required fields. The `uncertainties` array must be present for every tashkeel result, even if empty.

For each input text segment, provide:
1. `tashkeel` (string):
   - The text with ALL necessary marks: fatḥa (َ), kasra (ِ), ḍamma (ُ), sukūn (ْ), shadda (ّ), and tanwīn (ً ٍ ٌ).
   - Ensure EVERY eligible letter has appropriate diacritics (full vocalization).
   - Use translation context and provided grammatical notes to resolve vowelization ambiguities.
   - Pay special attention to case endings based on grammatical roles noted.
   - Consider verb forms, tenses, and moods indicated in the notes.
   - Ensure grammatical accuracy (case endings, conjugations).
   - Preserve ALL original punctuation, formatting, and special characters.
2. `uncertainties` (array of objects, optional):
   - List specific words where diacritics are uncertain.
   - Each object should have `word` (the word), `reason` (why it's uncertain), and optionally `related_translation_uncertainty`.
   - Provide the primary interpretation based on context even if uncertain.

Example:
Without tashkeel: قال النبي صلى الله عليه وسلم
With tashkeel: قَالَ النَّبِيُّ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ
✓ `tashkeel`: "قَالَ النَّبِيُّ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ"
   `uncertainties`: []
   `notes`: "Grammatical structure: قَالَ (perfect tense verb) + النَّبِيُّ (subject in nominative case with definite article) + صَلَّى (perfect tense verb in invocation) + اللَّهُ (subject in nominative) + عَلَيْهِ (preposition with pronoun) + وَسَلَّمَ (coordinated perfect tense verb)"

Verification steps:
1. Check that EVERY word has complete vocalization.
2. Verify all case endings match grammatical roles from the notes.
3. Confirm shadda is applied where required.
4. Ensure all vowels are consistent with Islamic scholarly conventions.
5. Verify ALL original text formatting is preserved.
6. Cross-reference with grammatical notes for each word.

IMPORTANT:
- Partial vocalization is NOT acceptable.
- Do not modify any original punctuation or formatting.
- Use provided grammatical notes to inform diacritic choices.

Input texts:
"""

WORD_BY_WORD_USER_PROMPT = (
    "IMPORTANT: Return only a JSON object matching the `WORD_TRANSLATION_TOOL` schema.\\n"
    "ENSURE: The `essential` field must be populated for every word; never return null for this.\\n"
    "ENSURE: Provide the top 1-3 most likely options for `english_options` and `essential_translation_options`, ordered from most to least likely.\\n"
    "ENSURE: The `essential` field should contain the core letters, stripped of affixes/suffixes and case/mood endings. Basic standard diacritics (like on فَعَلَ) are acceptable, but avoid complex or preserved original diacritics unless part of the base form.\\n"
    "ENSURE: Preserve ALL original text formatting, punctuation, and special characters in the `arabic` field.\\n"
    """Analyze each word in the provided Islamic Arabic sentences and extract flashcard-friendly essential letters.

For each sentence, return a result object containing `word_translations`, an array where each element corresponds to one word in the original order. Each word object must have these keys:

- `arabic` (string): Original Arabic word with diacritics (exactly as provided, with all formatting preserved).
- `english_options` (array of strings): Top 1-3 likely English equivalents in the context of the sentence (most likely first). **Prioritize simpler, common English words suitable for learners when appropriate synonyms exist.**
- `pos` (string): Part of speech tag (must be one of: """
    + format_valid_pos()
    + """).
- `essential` (string): Arabic word stripped of common affixes (و, ف, ب, ك, ل, س, etc.) and common suffixes (object pronouns و, ه, ك, ي, نا, etc.), excluding case/mood endings. Provide just the core letters, ideally with basic diacritics if standard (e.g., base verb form like فَعَلَ). Aim for the simplest recognizable form for flashcards. Example: For 'وَقَالُوا', essential is 'قَالَ'. For 'الْمُسْلِمَ', essential is 'مُسْلِم'.
- `essential_translation_options` (array of strings): Top 1-3 likely one-word English lexical meanings (dictionary form) of the `essential` Arabic word, without grammar (most likely first). **Focus on the primary/most common meaning found in standard dictionaries like Hans Wehr.**
- `notes` (string, optional): Any additional grammatical or contextual details. **Include relevant details like verb form (e.g., Form II, perfect), grammatical case (e.g., accusative), particle function, or specific reasons for translation choices if non-obvious. Provide an empty string if no specific note is needed.**
- `uncertainties` (array, optional): List any uncertainties related to this specific word's analysis.

Output MUST be a JSON object containing a `results` array, where each item corresponds to an input sentence and contains the `word_translations` array as described.

Input sentences (with existing diacritics):
"""
)

FINAL_VERIFICATION_USER_PROMPT = """Review and refine the provided Islamic Arabic translation components using the `REFINEMENT_TOOL` schema. Resolve ambiguities and select the single best option for word translation. Return your response as valid JSON.

For each word, carefully consider:
1. The provided grammatical notes and context from previous steps
2. Any special notes about verb forms, case endings, or particle functions
3. Notes about why certain translation options were chosen or marked as uncertain
4. Individual retry notes that may indicate previous processing challenges

When selecting final translations:
1. Use the grammatical notes to verify the chosen options align with the word's role in the sentence
2. Cross-reference notes about case endings and verb forms with the tashkeel
3. Pay special attention to words where notes indicate uncertainty or special handling was needed
4. Consider retry notes that may indicate which options were more reliable

Based on the initial tashkeel, sentence translation, and word-by-word analysis (which includes *options* for `english_options` and `essential_translation_options`), provide a final, refined output (`refinements` array). Each item in the array must contain:

1.  `improved_tashkeel` (string): The definitive, fully corrected text with diacritics. **Meticulously review and correct based on standard Classical Arabic grammar (I'rāb) and the full sentence context**, resolving initial uncertainties. Preserve ALL original formatting.
2.  `improved_translation` (string): The final English sentence translation. **Ensure it is clear, natural-sounding, and uses simple, accessible English vocabulary** appropriate for the context and a learner audience. Refine the initial translation if necessary for better readability. Preserve original formatting cues.
3.  `improved_word_translations` (array of objects): The finalized word-by-word analysis. For each word, *select the single most appropriate option* from the initial `english_options` and `essential_translation_options` provided, following these criteria:
    - `arabic` (string): The original Arabic word (preserved).
    - `english` (string): The *single chosen* contextual English translation. **Select the option that best fits the sentence context while prioritizing simplicity and common usage.**
    - `pos` (string): The refined part of speech.
    - `essential` (string): The refined essential letters.
    - `essential_translation` (string): The *single chosen* lexical/dictionary English translation. **Select the most accurate and common dictionary meaning (like Hans Wehr primary sense)** from the options.
    - `notes` (string, optional): Refined notes. **Ensure notes are comprehensive, including grammatical details (verb form, case), context, or choice rationale where helpful for a learner. Consolidate or refine notes from previous steps.**
4.  `resolved_uncertainties` (array of objects): Explain how initial uncertainties (from tashkeel, translation, or word analysis) were resolved. Include `step`, `original_uncertainty` object, `resolution`, and `explanation`.
5.  `remaining_uncertainties` (array of objects): Document any uncertainties that could not be definitively resolved. Include `type`, `description`, and `reason_unresolved`.
6.  `changes_made` (array of strings): List significant changes made compared to the initial analysis steps, including the selection of specific word translation options and corrections to tashkeel/translation.

Quality Checks during refinement:
- Grammatical accuracy in both Arabic (diacritics) and English.
- Consistent use of Islamic terminology.
- Appropriate register (solemn, precise, etc.).
- Simple, accessible vocabulary in English.
- Verification that ALL original text formatting, punctuation, and special characters are meticulously preserved in `improved_tashkeel` and the `arabic` fields of `improved_word_translations`.
- Ensure the chosen `english` fits the sentence context and the chosen `essential_translation` is the most accurate dictionary meaning.

IMPORTANT: Do not modify, normalize, or clean any part of the original Arabic text structure or characters beyond correcting diacritics in `improved_tashkeel`. Preserve ALL original formatting elements.

Input components (Tashkeel, Translation, Word Analysis with options):
"""
