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
                        "t": {
                            "type": "string",
                            "description": "The English translation of the sentence",
                        },
                        "n": {
                            "type": ["string", "null"],
                            "description": "Notes about the translation or null if none",
                        },
                        "uncertainties": {
                            "type": ["array", "null"],
                            "description": "List of specific parts with uncertain translation or null if none",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "text": {"type": "string"},
                                    "reason": {"type": "string"},
                                    "alternatives": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                    },
                                },
                            },
                        },
                    },
                    "required": ["t"],
                },
            }
        },
        "required": ["translations"],
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
                        "t": {
                            "type": "string",
                            "description": "The text with diacritical marks",
                        },
                        "uncertainties": {
                            "type": ["array", "null"],
                            "description": "List of specific diacritical marks that are uncertain",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "word": {"type": "string"},
                                    "reason": {"type": "string"},
                                    "alternatives": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                    },
                                    "related_translation_uncertainty": {
                                        "type": ["string", "null"]
                                    },
                                },
                            },
                        },
                    },
                    "required": ["t"],
                },
            }
        },
        "required": ["tashkeels"],
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
                                        "enum": list(VALID_POS),
                                        "description": "Part of speech - MUST be one of the valid parts of speech defined in the enums",
                                    },
                                    "r": {
                                        "type": ["string", "null"],
                                        "description": "Root word (only for verbs and derived nouns)",
                                    },
                                    "n": {
                                        "type": ["string", "null"],
                                        "description": "Notes about this word",
                                    },
                                    "uncertainties": {
                                        "type": ["array", "null"],
                                        "description": "List of uncertainties for this word",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "type": {"type": "string"},
                                                "description": {"type": "string"},
                                                "alternatives": {
                                                    "type": "array",
                                                    "items": {"type": "string"},
                                                },
                                                "related_uncertainties": {
                                                    "type": ["array", "null"],
                                                    "items": {
                                                        "type": "object",
                                                        "properties": {
                                                            "step": {"type": "string"},
                                                            "uncertainty_id": {
                                                                "type": "string"
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                                "required": ["a", "e", "p"],
                            },
                        }
                    },
                    "required": ["word_translations"],
                },
            }
        },
        "required": ["results"],
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
                                        "type": ["string", "null"],
                                        "description": "Part of speech",
                                    },
                                    "r": {
                                        "type": ["string", "null"],
                                        "description": "Root word",
                                    },
                                    "n": {
                                        "type": ["string", "null"],
                                        "description": "Notes",
                                    },
                                },
                                "required": ["a", "e"],
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
                            "type": ["array", "null"],
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
                            "type": ["array", "null"],
                            "description": "Descriptions of changes made",
                            "items": {"type": "string"},
                        },
                    },
                    "required": [
                        "improved_tashkeel",
                        "improved_translation",
                        "improved_word_translations",
                        "resolved_uncertainties",
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
4. Ambiguity: Document uncertainties, resolve through context
5. Consistency: Maintain consistent translations for Islamic concepts
6. Accessibility: Use simple, clear English appropriate for Islamic context

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

Proceed to text splitting after analysis.
"""

SENTENCE_SPLITTING_USER_PROMPT = (
    CONTENT_ANALYSIS_PROMPT
    + """

Split the Islamic text into learner-friendly units:

Rules:
1. Create moderate units preserving complete meaning
2. Split at:
   - Complete Islamic thoughts
   - Distinct complete clauses
   - Significant punctuation
3. Special handling:
   - Keep Quran verses intact
   - Break long narrator chains
   - Keep brief prayers whole
   - Keep related phrases conveying single concepts together
4. Mark unit types: simple, compound, condition, quote, verse, phrase

AVOID units that are too short (3-4 words) - prioritize complete concepts.

Input text: 
"""
)

SENTENCE_TRANSLATION_USER_PROMPT = """Translate Islamic Arabic to English:

1. Use formal but accessible English, preserving Arabic word order where possible
2. Use simple vocabulary appropriate for Islamic content (no obscure terms)
3. ALWAYS add bracketed words [like this] for grammatical completion
4. Document alternative interpretations with Islamic context
5. Match register: solemn for supplications, precise for hadith
6. Preserve original punctuation and structure
7. Use appropriate Islamic terminology

Example:
Arabic: وقال النبي صلى الله عليه وسلم
✓ "And the Prophet [Muhammad], peace be upon him, said"
✗ "And spoke the Prophet prayers and peace upon him"

Return for each sentence:
- Arabic text
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

Example:
Without tashkeel: قال النبي صلى الله عليه وسلم
With tashkeel: قَالَ النَّبِيُّ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ

Verification steps:
1. Check that EVERY word has complete vocalization
2. Verify all case endings match grammatical roles
3. Confirm shadda is applied where required for doubled consonants
4. Ensure all vowels are consistent with Islamic scholarly conventions

IMPORTANT: Partial vocalization is NOT acceptable - every eligible consonant must receive appropriate diacritics."""

WORD_BY_WORD_USER_PROMPT = (
    """Analyze each word in Islamic Arabic:

1. For attached conjunctions: DO NOT separate "و" (wa/and) when attached (e.g., "وشيخ" remains one word)
2. Only treat "و" as separate when standalone with spaces

For each word provide:
- Arabic with diacritics
- Simple English equivalent (avoid complex vocabulary)
- Part of speech - ONLY use these categories:
"""
    + "".join(f"  - {pos}\n" for pos in sorted(VALID_POS))
    + """- Root (for verbs and derived nouns only)
- Notes: Include grammatical information and Islamic context

Note: Put grammatical function in notes field, NOT in part of speech field.

Example:
For "فيها":
{
  "a": "فيها",
  "e": "in it",
  "p": "particle",
  "n": "Preposition في with attached pronoun ها"
}
"""
)

FINAL_VERIFICATION_USER_PROMPT = """Review and resolve Islamic Arabic translation components:

1. Component Resolution:
   - Resolve diacritical ambiguities using Islamic context
   - Resolve word-level uncertainties
   - Select definitive interpretations
   - Standardize Islamic terminology consistently

2. Output Requirements:
   - Definitive diacritical text
   - Final translation with:
     * Simple, accessible vocabulary
     * Required bracketed words for clarity
     * Appropriate Islamic terminology
   - Finalized word-by-word analysis

3. Quality Checks:
   - Grammatical accuracy in both languages
   - Islamic terminology consistency
   - Appropriate register for text type
   - No unnecessarily complex vocabulary

Return only the final diacritical text, translation with necessary brackets, and word analysis.
"""
