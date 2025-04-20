"""
This file contains all the schemas, prompts, and constants for the translation system.
"""

# Define valid parts of speech
VALID_POS = {
    "verb",
    "noun",
    "particle",
    "adjective",
    "pronoun",
    "adverb",
    "preposition",
    "conjunction",
    "interjection",
    "numeral",
}


# Define function schemas for API operations
# Function for translating sentences
TRANSLATE_SENTENCES_FUNCTION = {
    "name": "translate_sentences",
    "description": "Translate Islamic Arabic sentences to English, preserving word order where possible and noting uncertainties",
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
                            "description": "The English translation of the sentence",
                        },
                        "notes": {
                            "type": "string",
                            "description": "Notes about the translation",
                        },
                        "uncertainties": {
                            "type": "array",
                            "description": "List of specific parts with uncertain translation",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "text": {"type": "string"},
                                    "reason": {"type": "string"},
                                },
                            },
                        },
                    },
                    "required": ["translation", "notes"],
                },
            }
        },
        "required": ["translations"],
        "examples": [
            {
                "translations": [
                    {
                        "translation": "And the Prophet [Muhammad], peace be upon him, said",
                        "notes": "",
                        "uncertainties": [],
                    }
                ]
            }
        ],
    },
}

# Function for adding tashkeel (diacritical marks)
TASHKEEL_FUNCTION = {
    "name": "add_tashkeel",
    "description": "Add proper diacritical marks (tashkeel/harakat) to Arabic texts",
    "parameters": {
        "type": "object",
        "properties": {
            "tashkeels": {
                "type": "array",
                "description": "Array of texts with diacritical marks added",
                "items": {
                    "type": "object",
                    "properties": {
                        "tashkeel": {
                            "type": "string",
                            "description": "The text with diacritical marks",
                        },
                        "uncertainties": {
                            "type": "array",
                            "description": "List of specific diacritical marks that are uncertain",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "word": {"type": "string"},
                                    "reason": {"type": "string"},
                                    "related_translation_uncertainty": {
                                        "type": "string"
                                    },
                                },
                            },
                        },
                    },
                    "required": ["tashkeel"],
                },
            }
        },
        "required": ["tashkeels"],
        "examples": [{"tashkeels": [{"tashkeel": "قَالَ النَّبِيُّ", "uncertainties": []}]}],
    },
}

# Function for word-by-word translation
WORD_TRANSLATION_FUNCTION = {
    "name": "translate_words",
    "description": "Create word-by-word translations for Arabic sentences",
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
                                        "description": "The Arabic word",
                                    },
                                    "english": {
                                        "type": "string",
                                        "description": "The English translation",
                                    },
                                    "pos": {
                                        "type": "string",
                                        "enum": [
                                            "verb",
                                            "noun",
                                            "particle",
                                            "adjective",
                                            "pronoun",
                                            "adverb",
                                            "preposition",
                                            "conjunction",
                                            "interjection",
                                            "numeral",
                                        ],
                                        "description": "Part of speech (must match VALID_POS)",
                                    },
                                    "essential": {
                                        "type": "string",
                                        "description": "Flashcard essential letters: stripped of affixes (wa-/fa-/bi-/-hum/-tum etc.) and diacritized without case endings for flashcard memorization",
                                    },
                                    "essential_translation": {
                                        "type": "string",
                                        "description": "One-word English meaning of the essential letters for spaced-repetition flashcards",
                                    },
                                    "notes": {
                                        "type": "string",
                                        "description": "Additional grammar notes or context",
                                    },
                                    "uncertainties": {
                                        "type": "array",
                                        "items": {"type": "object"},
                                    },
                                },
                                "required": [
                                    "arabic",
                                    "english",
                                    "pos",
                                    "essential",
                                    "essential_translation",
                                    "notes",
                                ],
                            },
                        }
                    },
                    "required": ["word_translations"],
                },
            }
        },
        "required": ["results"],
        "examples": [
            {
                "results": [
                    {
                        "word_translations": [
                            {
                                "arabic": "قَالَ",
                                "english": "he said",
                                "pos": "verb",
                                "essential": "قَال",
                                "essential_translation": "he said",
                                "notes": "",
                            }
                        ]
                    }
                ]
            }
        ],
    },
}

# Function for refining translations
REFINEMENT_FUNCTION = {
    "name": "refine_translations",
    "description": "Refine and improve translations based on review of all components",
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
                            "description": "Corrected text with diacritical marks",
                        },
                        "improved_translation": {
                            "type": "string",
                            "description": "Refined full translation",
                        },
                        "improved_word_translations": {
                            "type": "array",
                            "description": "Refined word-by-word translations",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "a": {
                                        "type": "string",
                                        "description": "The Arabic word",
                                    },
                                    "e": {
                                        "type": "string",
                                        "description": "The English translation",
                                    },
                                    "p": {
                                        "type": "string",
                                        "description": "Part of speech",
                                    },
                                    "essential": {
                                        "type": "string",
                                        "description": "Flashcard essential letters",
                                    },
                                    "essential_translation": {
                                        "type": "string",
                                        "description": "One-word English meaning of the essential letters",
                                    },
                                    "n": {
                                        "type": "string",
                                        "description": "Notes",
                                    },
                                },
                                "required": [
                                    "a",
                                    "e",
                                    "p",
                                    "essential",
                                    "essential_translation",
                                ],
                            },
                        },
                        "resolved_uncertainties": {
                            "type": "array",
                            "description": "Explanations of how uncertainties were resolved",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "step": {"type": "string"},
                                    "original_uncertainty": {"type": "object"},
                                    "resolution": {"type": "string"},
                                    "explanation": {"type": "string"},
                                },
                            },
                        },
                        "remaining_uncertainties": {
                            "type": "array",
                            "description": "Uncertainties that couldn't be fully resolved",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "type": {"type": "string"},
                                    "description": {"type": "string"},
                                    "reason_unresolved": {"type": "string"},
                                },
                            },
                        },
                        "changes_made": {
                            "type": "array",
                            "description": "Descriptions of changes made",
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
            }
        },
        "required": ["refinements"],
    },
}

# Function for splitting text into sentences
SPLIT_TEXT_FUNCTION = {
    "name": "split_text_into_sentences",
    "description": "Split Islamic Arabic text into meaningful units for learning and analyze content",
    "parameters": {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "description": "Concise English title (3-7 words) capturing the main Islamic topic",
            },
            "summary": {
                "type": "string",
                "description": "One-sentence summary describing the main Islamic content without filler or weasel words",
            },
            "difficulty_level": {
                "type": "integer",
                "enum": [1, 2, 3, 4, 5],
                "description": "Difficulty rating (1=easiest to 5=hardest) based on vocabulary, grammar, and Islamic concepts",
            },
            "sentences": {
                "type": "array",
                "description": "Array of moderate-sized text units preserving complete thoughts",
                "items": {"type": "string"},
            },
            "unit_types": {
                "type": "array",
                "description": "Type of each unit (simple_clause, phrase, verse, etc.)",
                "items": {"type": "string"},
            },
        },
        "required": ["title", "summary", "difficulty_level", "sentences", "unit_types"],
    },
}

# Prompt instructions
GENERAL_SYSTEM_PROMPT = """Expert translator specializing in Classical Arabic Islamic texts.

Priorities:
1. Accuracy: Preserve authentic Islamic meaning
2. Context: Consider historical-religious context
3. Terminology: Handle Islamic terminology, honorifics, narrators accurately
4. Text Preservation: Maintain ALL original text formatting, punctuation, and special characters
5. Ambiguity: Document uncertainties, resolve through context
6. Consistency: Maintain consistent translations for Islamic concepts
7. Accessibility: Use simple, clear English appropriate for Islamic context

Apply these principles to all translation tasks: splitting, diacritics, word analysis, and verification."""

CONTENT_ANALYSIS_PROMPT = """Analyze this Islamic text to provide:

1. Title (3-7 words):
   - Clear, simple English
   - Captures main Islamic topic
   - Uses appropriate Islamic terminology

2. Summary (one sentence):
   - Concise description of main Islamic content
   - Includes key Islamic themes
   - Uses clear, accessible language
   - NO filler/weasel words (this, that, it, possibly, seems, might, could)
   - Direct, precise statements only

3. Difficulty Level (1-5):
   Level 1: Basic - Simple structures, common Islamic terms
   Level 2: Elementary - Short compounds, standard Islamic vocabulary
   Level 3: Intermediate - Complex structures, technical Islamic terms
   Level 4: Advanced - Specialized Islamic terminology, abstract concepts
   Level 5: Expert - Technical Islamic language, complex rhetorical devices

IMPORTANT: Preserve ALL original text formatting, punctuation, and special characters throughout the analysis.

Proceed to text splitting after analysis.
"""

SENTENCE_SPLITTING_USER_PROMPT = (
    CONTENT_ANALYSIS_PROMPT
    + """

Split the Islamic text into learner-friendly units:

Rules:
1. Create short learner-friendly units
2. Split at:
   - Complete thoughts
   - Distinct complete clauses
   - Natural stops such as punctation
   - Learning firendly units
3. Special handling:
   - Keep Quran verses intact
   - Break long narrator chains
   - Keep brief prayers whole
   - Keep related phrases conveying single concepts together
   - Preserve ALL original punctuation and formatting
4. Mark unit types: simple, compound, condition, quote, verse, phrase
5. Example length: "ولا شك أن ما يصيب المسلم في هذه الدنيا من آفات ومحن ما هو إلا محض ابتلاء من الله، فمن صبر واحتسب فله الأجر العظيم من الله سبحانه وتعالى."

IMPORTANT: 
- AVOID units that are too short (3-4 words)
- Preserve ALL original text formatting, punctuation, and special characters in each unit

Input text: 
"""
)

SENTENCE_TRANSLATION_USER_PROMPT = """Translate Islamic Arabic to English:

1. Use accessible English, preserving Arabic word order as much as possible
2. Use simple vocabulary appropriate for Islamic content (no obscure terms)
3. Add bracketed words [like this] for words needed to complete the sentence but that is not present in the original text
4. Document uncertainties only (do not list alternatives)
5. Match register: solemn for supplications, precise for hadith
6. Preserve ALL original punctuation, formatting, and special characters exactly as they appear
7. Use appropriate Islamic terminology

Example:
Arabic: وقال النبي صلى الله عليه وسلم
✓ "And the Prophet [Muhammad], peace be upon him, said"
✗ "And spoke the Prophet prayers and peace upon him"

IMPORTANT: Do not modify, normalize, or clean any part of the original Arabic text.

Return for each sentence:
- Arabic text (exactly as provided, with all original formatting)
- English translation with necessary bracketed words
- Term/uncertainty notes
"""

TASHKEEL_USER_PROMPT = """Add complete diacritical marks (tashkīl) to EVERY word in the Islamic Arabic text:

1. Add ALL necessary marks: fatḥa (َ), kasra (ِ), ḍamma (ُ), sukūn (ْ), shadda (ّ), and tanwīn (ً ٍ ٌ)
2. Ensure EVERY eligible letter has appropriate diacritics - full vocalization is required
3. Use translation context to resolve vowelization ambiguities
4. Ensure grammatical accuracy (case endings, conjugations)
5. For ambiguities:
   - Provide primary interpretation based on Islamic context
   - List alternatives
   - Link to translation uncertainties
6. Preserve ALL original punctuation, formatting, and special characters

Example:
Without tashkeel: قال النبي صلى الله عليه وسلم
With tashkeel: قَالَ النَّبِيُّ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ

Verification steps:
1. Check that EVERY word has complete vocalization
2. Verify all case endings match grammatical roles
3. Confirm shadda is applied where required for doubled consonants
4. Ensure all vowels are consistent with Islamic scholarly conventions
5. Verify ALL original text formatting is preserved

IMPORTANT: 
- Partial vocalization is NOT acceptable - every eligible consonant must receive appropriate diacritics
- Do not modify any original punctuation or formatting"""

WORD_BY_WORD_USER_PROMPT = (
    "IMPORTANT: Return only a JSON object matching the function schema.\n"
    "ENSURE: The `essential` and `essential_translation` fields must be populated for every word; never return null for these.\n"
    "ENSURE: The `essential` field must retain all original diacritical marks (tashkeel) exactly as in the Arabic word.\n"
    "ENSURE: Preserve ALL original text formatting, punctuation, and special characters in the arabic field.\n"
    """Analyze each word in Islamic Arabic and extract flashcard-friendly essential letters:

Rules for the `essential` field:
- Strip common Arabic prefixes attached (و, ف, ب, ك, ل, س, etc.).
- Strip common suffixes (object pronouns و, ه, ك, ي, نا, etc.).
- Preserve the core internal letters in their original order.
- Provide the fully diacritized form of the essential letters using a simple pattern (e.g., فَعَل) without case endings for flashcard memorization tailored for learning Arabic.

For each word provide a JSON object with these keys:
- `arabic`: Arabic text with diacritics (exactly as in original, with all formatting preserved)
- `english`: Simple English equivalent in context to the sentence
- `pos`: Part of speech tag (must be one of the VALID_POS enum)
- `essential`: Flashcard letters, stripped of affixes and diacritized without case endings
- `essential_translation`: One-word English meaning of the essential Arabic word close to lexical meaning but not in context of the sentence
- `notes`: Any additional grammatical or contextual details (optional)

Output MUST be a JSON array where each element corresponds to one word in original order, with fields exactly matching the schema."""
)

FINAL_VERIFICATION_USER_PROMPT = """Review and resolve Islamic Arabic translation components:

1. Component Resolution:
   - Resolve diacritical ambiguities using Islamic context
   - Resolve word-level uncertainties
   - Select definitive interpretations
   - Standardize Islamic terminology consistently
   - Verify ALL original text formatting is preserved

2. Output Requirements:
   - Definitive diacritical text (with all original formatting preserved)
   - Final translation with:
     * Simple, accessible vocabulary
     * Required bracketed words for clarity
     * Appropriate Islamic terminology
   - Finalized word-by-word analysis (with original text formatting preserved)

3. Quality Checks:
   - Grammatical accuracy in both languages
   - Islamic terminology consistency
   - Appropriate register for text type
   - No unnecessarily complex vocabulary
   - Verification that ALL original text formatting is maintained

IMPORTANT: Do not modify, normalize, or clean any part of the original Arabic text. Preserve ALL formatting exactly as provided."""
