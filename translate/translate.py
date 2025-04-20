import os
import json
import time
import logging
from typing import List, Dict, Any, Optional
import sys
import re

from openai import OpenAI
from pydantic import BaseModel
from tqdm import tqdm

# Import schemas and prompt templates
from schemas import (
    VALID_POS,
    TRANSLATE_SENTENCES_FUNCTION,
    TASHKEEL_FUNCTION,
    WORD_TRANSLATION_FUNCTION,
    REFINEMENT_FUNCTION,
    SPLIT_TEXT_FUNCTION,
    GENERAL_SYSTEM_PROMPT,
    SENTENCE_SPLITTING_USER_PROMPT,
    SENTENCE_TRANSLATION_USER_PROMPT,
    TASHKEEL_USER_PROMPT,
    WORD_BY_WORD_USER_PROMPT,
    FINAL_VERIFICATION_USER_PROMPT,
)

# Execute set_keys.py to set environment variables
exec(open("set_keys.py").read())

# Configure logging to show only errors and final output
logging.basicConfig(
    level=logging.ERROR, format="%(asctime)s - %(levelname)s - %(message)s"
)


def is_valid_pos(pos: str) -> bool:
    """
    Validate if a part of speech is valid according to our word type mapping system.
    """
    if not pos:
        return False

    pos = pos.lower().strip()

    # Check if it's one of our exact valid POS categories
    if pos in VALID_POS:
        return True

    # If there are parentheses, the model might have included additional information
    # Strip this out to check the base POS (e.g., "verb (past)" -> "verb")
    if "(" in pos:
        base_pos = pos.split("(")[0].strip()
        if base_pos in VALID_POS:
            return False  # We explicitly don't want modifiers in parentheses

    return False


# Configure logging to show only errors and final output
logging.basicConfig(
    level=logging.ERROR, format="%(asctime)s - %(levelname)s - %(message)s"
)


# Models for structured data
class WordTranslation(BaseModel):
    """Word-level translation with grammatical details"""

    arabic: str
    english: str  # Final chosen English translation
    pos: Optional[str] = None  # Part of speech
    essential: Optional[str] = None  # Essential letters for flashcards
    essential_translation: Optional[str] = None  # Final chosen one-word English meaning
    notes: Optional[str] = None  # Any special notes about the translation


# Intermediate model to hold options before refinement
class WordTranslationOptions(BaseModel):
    arabic: str
    english_options: List[str] = []
    pos: Optional[str] = None
    essential: Optional[str] = None
    essential_translation_options: List[str] = []
    notes: Optional[str] = None
    uncertainties: List[
        Dict[str, Any]
    ] = []  # Keep uncertainties tied to the options step


class SentenceTranslation(BaseModel):
    """Complete sentence translation with all components"""

    index: int
    original: str
    tashkeel: str  # Original with diacritical marks
    word_by_word: List[WordTranslation]  # Stores final chosen words
    full_translation: str
    notes: Optional[str] = None
    verification_status: Optional[str] = None
    verification_issues: Optional[List[str]] = None


class TextMetadata(BaseModel):
    """Metadata about the entire text"""

    title: str
    summary: str
    difficulty_level: int
    total_units: int


class TranslationResult(BaseModel):
    """Complete translation result including metadata and all sentences"""

    metadata: TextMetadata
    translations: List[SentenceTranslation]


class BatchRequest(BaseModel):
    """Batch translation request format"""

    sentences: List[str]
    contexts: List[Optional[str]]


class TranslationValidationError(Exception):
    """Custom exception for translation validation errors"""

    pass


def validate_translation_results(
    original_sentences: List[str],
    results: List[Dict[str, Any]],
    step_name: str,
    check_word_translations: bool = False,
    check_word_options: bool = False,  # New flag for options stage
) -> None:
    """
    Validate translation results for common errors and data integrity.

    Args:
        original_sentences: List of original Arabic sentences
        results: List of translation results to validate
        step_name: Name of the translation step (for error messages)
        check_word_translations: Whether to perform final word translation specific checks
        check_word_options: Whether to perform word option specific checks

    Raises:
        TranslationValidationError: If validation fails
    """
    # Check for matching length
    if len(results) != len(original_sentences):
        raise TranslationValidationError(
            f"{step_name}: Result count mismatch. Expected {len(original_sentences)}, got {len(results)}"
        )

    errors = []
    for i, (original, result) in enumerate(zip(original_sentences, results)):
        # Check for error markers in translations
        if isinstance(result, dict):
            translation = (
                result.get("translation", "")
                if "translation" in result
                else result.get("t", "")
            )
            if any(
                err in translation
                for err in [
                    "[Translation Error]",
                    "[Format Error]",
                    "[BATCH PROCESSING ERROR]",
                ]
            ):
                errors.append(f"Sentence {i}: Contains error marker in translation")

            # Check for empty or extremely short translations (potential errors)
            if translation and len(translation.strip()) < 3:
                errors.append(f"Sentence {i}: Suspiciously short translation")

            # Check word translation OPTIONS stage
            if check_word_options and "word_translations" in result:
                word_trans = result["word_translations"]
                if isinstance(word_trans, list):
                    for j, word in enumerate(word_trans):
                        if isinstance(word, dict):
                            arabic = word.get("arabic", "")
                            eng_options = word.get("english_options", [])
                            ess_opts = word.get("essential_translation_options", [])
                            if not arabic:
                                errors.append(
                                    f"Sentence {i}, Word {j}: Missing Arabic text"
                                )
                            if not eng_options:
                                errors.append(
                                    f"Sentence {i}, Word {j}: Missing English options"
                                )
                            if not word.get("essential"):
                                errors.append(
                                    f"Sentence {i}, Word {j}: Missing essential letters"
                                )
                            if not ess_opts:
                                errors.append(
                                    f"Sentence {i}, Word {j}: Missing essential translation options"
                                )

            # Check FINAL word translations
            if (
                check_word_translations and "word_by_word" in result
            ):  # Check final field name
                word_trans = result["word_by_word"]  # Check final field name
                if isinstance(word_trans, list):
                    for j, word in enumerate(word_trans):
                        if isinstance(word, dict):
                            arabic = word.get("arabic", "")
                            english = word.get("english", "")  # Check final field name
                            essential = word.get("essential", "")
                            essential_translation = word.get(
                                "essential_translation", ""
                            )
                            if not arabic:
                                errors.append(
                                    f"Sentence {i}, Word {j}: Missing final Arabic text"
                                )
                            if not english:
                                errors.append(
                                    f"Sentence {i}, Word {j}: Missing final English text"
                                )
                            if not essential:
                                errors.append(
                                    f"Sentence {i}, Word {j}: Missing final essential letters"
                                )
                            if not essential_translation:
                                errors.append(
                                    f"Sentence {i}, Word {j}: Missing final essential translation"
                                )

            # Check for tashkeel validity (if present)
            if "tashkeel" in result:
                tashkeel = result["tashkeel"]
                # Ensure tashkeel isn't identical to input if input has no diacritics
                if tashkeel == original and not any(c in original for c in "ًٌٍَُِّْ"):
                    errors.append(
                        f"Sentence {i}: Tashkeel appears to be missing (identical to input)"
                    )

    if errors:
        raise TranslationValidationError(
            f"{step_name} validation failed:\n" + "\n".join(errors)
        )


def validate_final_translation(translation: SentenceTranslation) -> List[str]:
    """
    Validate a final translation result and return any issues found.
    """
    issues = []

    # Check for basic completeness
    if not translation.full_translation:
        issues.append("Missing full translation")
    if not translation.tashkeel:
        issues.append("Missing tashkeel")

    # Check for error markers
    if any(
        err in translation.full_translation
        for err in ["[Translation Error]", "[Format Error]", "[BATCH PROCESSING ERROR]"]
    ):
        issues.append("Translation contains error marker")

    # Validate word-by-word translations (final chosen ones)
    if translation.word_by_word:
        # Count words in original (approximate)
        orig_word_count = len(
            [w for w in translation.original.split() if len(w.strip()) > 0]
        )
        if (
            len(translation.word_by_word) < orig_word_count * 0.5
        ):  # Allow some flexibility
            issues.append(
                f"Word translation count mismatch: got {len(translation.word_by_word)}, expected ~{orig_word_count}"
            )

        # Check individual final word translations
        for i, word in enumerate(translation.word_by_word):
            if not word.arabic:
                issues.append(f"Final Word {i + 1}: Missing Arabic text")
            if not word.english:  # Check final single field
                issues.append(f"Final Word {i + 1}: Missing chosen English text")
            if not word.essential:
                issues.append(f"Final Word {i + 1}: Missing essential letters")
            if not word.essential_translation:  # Check final single field
                issues.append(
                    f"Final Word {i + 1}: Missing chosen essential translation"
                )

    else:
        issues.append("Missing word-by-word translations")

    return issues


# Configuration constants
MODEL_ANALYSIS = "gpt-4o"  # For text splitting and analysis
MODEL_TRANSLATION = "gpt-4o"  # For English translation and word translation (options)
MODEL_OTHER = "gpt-4o"  # For tashkeel and support tasks
MODEL_VERIFICATION = (
    "o4-mini"  # For final verification/refinement step (selecting options)
)
CHECKPOINT_FILE = "translation_checkpoint.json"
MAX_SENTENCE_LENGTH = 500  # characters
MAX_BATCH_SIZE = 5  # Maximum number of sentences to process in one batch
CONTEXT_WINDOW_SIZE = 2  # Number of sentences before and after to include as context


class TokenUsageTracker:
    """Track token usage and calculate costs"""

    def __init__(self):
        self.prompt_tokens = 0
        self.completion_tokens = 0
        self.total_tokens = 0
        self.total_cost = 0
        self.api_calls = 0

    def update(self, usage_data: Dict[str, int]):
        """Update token counts from API response"""
        self.prompt_tokens += usage_data.get("prompt_tokens", 0)
        self.completion_tokens += usage_data.get("completion_tokens", 0)
        self.total_tokens += usage_data.get("total_tokens", 0)
        self.api_calls += 1

        # GPT-4o pricing (as of March 2025)
        prompt_cost = (
            usage_data.get("prompt_tokens", 0) * 0.01 / 1000
        )  # $0.01 per 1K tokens
        completion_cost = (
            usage_data.get("completion_tokens", 0) * 0.03 / 1000
        )  # $0.03 per 1K tokens
        self.total_cost += prompt_cost + completion_cost

    def __str__(self) -> str:
        return (
            f"\nToken Usage Statistics:\n"
            f"Total API Calls: {self.api_calls:,}\n"
            f"Prompt Tokens: {self.prompt_tokens:,}\n"
            f"Completion Tokens: {self.completion_tokens:,}\n"
            f"Total Tokens: {self.total_tokens:,}\n"
            f"Estimated Cost: ${self.total_cost:.2f}"
        )


# Initialize token tracker
token_tracker = TokenUsageTracker()

# Initialize OpenAI client
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("Error: OPENAI_API_KEY environment variable is not set.")
    print("Please set your API key using: export OPENAI_API_KEY='your-api-key'")
    if __name__ == "__main__":
        sys.exit(1)

client = OpenAI(api_key=api_key)


def call_openai_api(
    messages: List[Dict[str, str]],
    function_schema: Optional[Dict[str, Any]] = None,
    function_name: Optional[str] = None,
    temperature: float = 0.3,
    max_retries: int = 3,
    model: str = MODEL_OTHER,  # Default to MODEL_OTHER
) -> Dict[str, Any]:
    """Make OpenAI API call with function calling, retry logic and error handling"""
    retry_count = 0
    backoff_time = 1

    while retry_count < max_retries:
        try:
            # Configure API call based on whether we're using function calling
            if function_schema:
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    functions=[function_schema],
                    function_call={"name": function_name} if function_name else "auto",
                )
            else:
                # Fall back to regular JSON response if no function schema provided
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    response_format={"type": "json_object"},
                )

            if hasattr(response, "usage") and response.usage:
                token_tracker.update(response.usage.model_dump())

            # Handle function calling response
            if function_schema and hasattr(
                response.choices[0].message, "function_call"
            ):
                function_call = response.choices[0].message.function_call
                if function_call and function_call.arguments:
                    try:
                        return json.loads(function_call.arguments)
                    except json.JSONDecodeError:
                        return {
                            "error": f"Failed to parse function arguments: {function_call.arguments[:100]}..."
                        }
                else:
                    return {"error": "Function call response was empty"}

            # Handle regular content response
            content = response.choices[0].message.content
            if not content:
                return {"error": "Empty response from API"}

            # Parse JSON response
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                return {"error": f"Failed to parse JSON: {content[:100]}..."}

        except Exception as e:
            logging.error(
                f"API call failed (attempt {retry_count + 1}/{max_retries}): {str(e)}"
            )
            retry_count += 1
            if retry_count >= max_retries:
                return {
                    "error": f"API call failed after {max_retries} attempts. Error: {str(e)}"
                }

            # Exponential backoff
            time.sleep(backoff_time)
            backoff_time *= 2

    return {"error": "Maximum retries exceeded"}


def split_text_into_sentences(text: str) -> List[str]:
    """Use GPT-4.1 to intelligently split text into learner-friendly units and analyze content"""
    if not text or len(text.strip()) == 0:
        return []

    messages = [
        {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (SENTENCE_SPLITTING_USER_PROMPT + text),
        },
    ]

    response = call_openai_api(
        messages,
        function_schema=SPLIT_TEXT_FUNCTION,
        function_name="split_text_into_sentences",
        model=MODEL_ANALYSIS,  # Use the analysis model
    )

    if "units" in response and isinstance(
        response["units"], list
    ):  # Changed from "sentences" to "units"
        # Log the metadata for reference
        if (
            "title" in response
            and "summary" in response
            and "difficulty_level" in response
        ):
            logging.info("Content Analysis:")
            logging.info(f"Title: {response['title']}")
            logging.info(f"Summary: {response['summary']}")
            logging.info(f"Difficulty Level: {response['difficulty_level']}/5")

        return response["units"]  # Changed from "sentences" to "units"
    elif "error" in response:
        logging.error(f"Error splitting text: {response['error']}")
        return []
    else:
        logging.error("Unexpected response format when splitting text")
        return []


def get_sentence_context(sentences: List[str], index: int) -> str:
    """Get context from surrounding sentences for better translation quality"""
    context_parts = []

    # Get preceding sentences as context
    start_idx = max(0, index - CONTEXT_WINDOW_SIZE)
    if start_idx < index:
        preceding = sentences[start_idx:index]
        if preceding:
            if len(preceding) == 1:
                context_parts.append(f"Preceding sentence: {preceding[0]}")
            else:
                context_parts.append(
                    f"Preceding {len(preceding)} sentences: {' '.join(preceding)}"
                )

    # Get following sentences as context
    end_idx = min(len(sentences), index + CONTEXT_WINDOW_SIZE + 1)
    if index + 1 < end_idx:
        following = sentences[index + 1 : end_idx]
        if following:
            if len(following) == 1:
                context_parts.append(f"Following sentence: {following[0]}")
            else:
                context_parts.append(
                    f"Following {len(following)} sentences: {' '.join(following)}"
                )

    if not context_parts:
        return "No surrounding context available."

    return " ".join(context_parts)


def get_optimized_context(
    sentences: List[str], index: int, for_tashkeel: bool = False
) -> Optional[str]:
    """Get optimized context based on task type with token efficiency in mind"""
    if index < 0 or index >= len(sentences):
        return None

    # For tashkeel, focus on grammatical continuity with minimal context
    if for_tashkeel:
        # Only include immediate adjacent sentences
        context_parts = []

        # Get ending of previous sentence (focus on conjunctions and particles)
        if index > 0:
            prev_sent = sentences[index - 1]
            # Extract just ending words that might affect grammar
            ending_words = " ".join(prev_sent.split()[-3:]) if prev_sent else ""
            if ending_words:
                context_parts.append(f"Preceding ending: {ending_words}")

        # Get beginning of next sentence (focus on grammatical connection)
        if index < len(sentences) - 1:
            next_sent = sentences[index + 1]
            # Extract just beginning words that might connect to this sentence
            starting_words = " ".join(next_sent.split()[:3]) if next_sent else ""
            if starting_words:
                context_parts.append(f"Following beginning: {starting_words}")

        return " ".join(context_parts) if context_parts else None
    else:
        # Use existing richer context for translation
        return get_sentence_context(sentences, index)


def batch_translate_full_sentences(
    sentences: List[str], contexts: List[Optional[str]]
) -> List[Dict[str, Any]]:
    """Translate multiple sentences in a single API call with retry logic"""

    def try_translation(
        sentences: List[str],
        contexts: List[Optional[str]],
        retry_without_context: bool = False,
    ) -> Dict[str, Any]:
        """Helper function to attempt translation with or without context"""
        formatted_inputs = []
        for i, (sentence, context) in enumerate(zip(sentences, contexts)):
            # On retry, skip context to reduce complexity
            context_str = (
                ""
                if retry_without_context
                else (f"\nContext: {context}" if context else "")
            )
            formatted_inputs.append(f"Sentence {i + 1}: {sentence}{context_str}")

        messages = [
            {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": SENTENCE_TRANSLATION_USER_PROMPT
                + "\n\n"
                + "\n\n".join(formatted_inputs),
            },
        ]
        return call_openai_api(
            messages,
            function_schema=TRANSLATE_SENTENCES_FUNCTION,
            function_name="translate_sentences",
            model=MODEL_TRANSLATION,  # Use the translation model
        )

    # First try with context
    response = try_translation(sentences, contexts)

    # If failed or got invalid response, retry without context
    if (
        "error" in response
        or not response.get("translations")
        or not isinstance(response.get("translations"), list)
        or len(response.get("translations", [])) < len(sentences)
    ):
        logging.warning(
            "Translation failed or incomplete with context, retrying without context..."
        )
        response = try_translation(sentences, contexts, retry_without_context=True)

    # Handle the response
    if "translations" in response and isinstance(response["translations"], list):
        # Convert compact format to full format if needed
        results = []
        for i, item in enumerate(response["translations"]):
            if i >= len(sentences):
                break
            if isinstance(item, dict) and "t" in item:  # Compact format
                results.append(
                    {
                        "translation": item["t"],
                        "notes": item.get("n"),
                        "uncertainties": item.get("uncertainties", []),
                    }
                )
            elif (
                isinstance(item, dict) and "translation" in item
            ):  # Already in full format
                results.append(item)
            else:  # Handle unexpected item format
                results.append(
                    {
                        "translation": f"[Format Error for: {sentences[i][:20]}...]",
                        "notes": "Response item has unexpected format",
                        "uncertainties": [],
                    }
                )

        # Make sure we have a result for each input sentence
        while len(results) < len(sentences):
            i = len(results)
            results.append(
                {
                    "translation": f"[Missing Translation for: {sentences[i][:20]}...]",
                    "notes": "Translation missing in API response",
                    "uncertainties": [],
                }
            )

        return results
    elif "error" in response:
        logging.error(f"Error in batch translation: {response['error']}")
        return [
            {
                "translation": "[Translation Error]",
                "notes": response["error"],
                "uncertainties": [],
            }
            for _ in sentences
        ]
    else:
        logging.error("Unexpected response format in batch translation")
        return [
            {
                "translation": "[Format Error]",
                "notes": "Response format error",
                "uncertainties": [],
            }
            for _ in sentences
        ]


def batch_add_tashkeel(
    sentences: List[str],
    translation_results: List[Dict[str, Any]],
    all_sentences: List[str] = None,
    indices: List[int] = None,
) -> List[Dict[str, str]]:
    """Add diacritical marks to multiple sentences in a batch"""
    formatted_inputs = []
    for i, (sentence, translation_data) in enumerate(
        zip(sentences, translation_results)
    ):
        # Add grammatical context if available
        grammar_context = ""
        if all_sentences and indices and i < len(indices):
            context = get_optimized_context(
                all_sentences, indices[i], for_tashkeel=True
            )
            if context:
                grammar_context = f"\nGrammatical context: {context}"

        # Extract translation and uncertainties
        translation = translation_data.get("translation", "")
        uncertainties = translation_data.get("uncertainties", [])
        uncertainty_notes = ""
        if uncertainties:
            uncertainty_notes = "\nTranslation uncertainties:\n" + "\n".join(
                f"- {u.get('text', '')}: {u.get('reason', '')}" for u in uncertainties
            )

        # Extract word-level grammatical notes if available
        grammar_notes = []
        if "word_by_word" in translation_data:
            for word in translation_data["word_by_word"]:
                if word.get("notes") and word.get("arabic"):
                    grammar_notes.append(f"{word['arabic']}: {word['notes']}")
        grammar_notes_str = ""
        if grammar_notes:
            grammar_notes_str = "\nGrammatical notes:\n" + "\n".join(
                f"- {note}" for note in grammar_notes
            )

        formatted_inputs.append(
            f"Set {i + 1}:\n"
            f"Arabic: {sentence}{grammar_context}\n"
            f"Translation: {translation}{uncertainty_notes}{grammar_notes_str}"
        )

    messages = [
        {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": TASHKEEL_USER_PROMPT + "\n\n" + "\n\n".join(formatted_inputs),
        },
    ]

    response = call_openai_api(
        messages,
        function_schema=TASHKEEL_FUNCTION,
        function_name="add_tashkeel",
        model=MODEL_OTHER,  # Use MODEL_OTHER for tashkeel
    )

    if "tashkeels" in response and isinstance(response["tashkeels"], list):
        results = []
        for i, item in enumerate(response["tashkeels"]):
            if i >= len(sentences):
                break
            if isinstance(item, dict):
                if "t" in item:  # Compact format
                    results.append(
                        {
                            "tashkeel": item["t"],
                            "uncertainties": item.get("uncertainties", []),
                        }
                    )
                elif "tashkeel" in item:  # Full format
                    results.append(item)
                else:
                    results.append({"tashkeel": sentences[i], "uncertainties": []})
            else:
                results.append({"tashkeel": sentences[i], "uncertainties": []})

        # Make sure we have a result for each input sentence
        while len(results) < len(sentences):
            i = len(results)
            results.append({"tashkeel": sentences[i], "uncertainties": []})

        return results
    elif "error" in response:
        logging.error(f"Error adding tashkeel: {response['error']}")
        return [{"tashkeel": sentence, "uncertainties": []} for sentence in sentences]
    else:
        logging.error("Unexpected response format when adding tashkeel")
        return [{"tashkeel": sentence, "uncertainties": []} for sentence in sentences]


def is_arabic_word(word: str) -> bool:
    """
    Check if a word contains Arabic characters.
    Returns True if the word contains at least one Arabic character.
    """
    # Arabic Unicode ranges
    # Basic Arabic: \u0600-\u06FF
    # Arabic Supplement: \uFB50-\uFDFF
    # Arabic Extended: \uFE70-\uFEFF
    return bool(re.search(r"[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]", word))


def filter_arabic_words(text: str) -> List[str]:
    """
    Split text into words and return only those containing Arabic characters.
    Preserves the exact Arabic words while filtering out punctuation and non-Arabic text.
    """
    # Split by whitespace while preserving the original words
    words = text.split()
    # Keep only words that contain Arabic characters
    return [word for word in words if is_arabic_word(word)]


def batch_translate_words(
    sentences: List[str],
    tashkeel_results: List[Dict[str, Any]],
    translations: List[Dict[str, Any]],
    all_sentences: List[str] = None,
    indices: List[int] = None,
) -> List[Dict[str, Any]]:  # Returns results with options
    """Create word-by-word translations for multiple sentences in a batch, returning options"""
    formatted_inputs = []
    for i, (sentence, tashkeel_data, translation_data) in enumerate(
        zip(sentences, tashkeel_results, translations)
    ):
        # Filter to get only Arabic words for word-by-word translation
        tashkeel = tashkeel_data.get("tashkeel", "")
        arabic_words = filter_arabic_words(tashkeel)

        # Add semantic context for word-level analysis if available
        semantic_context = ""
        if all_sentences and indices and i < len(indices):
            orig_index = indices[i]

            # Extract key terms from nearby sentences for semantic context
            key_terms = set()

            # Words from the current sentence to look for in context
            important_words = [w for w in arabic_words if len(w) > 3]

            # Check previous and next sentences for related terms
            for j in range(
                max(0, orig_index - 1), min(len(all_sentences), orig_index + 2)
            ):
                if j != orig_index:  # Skip current sentence
                    for word in important_words:
                        if word in all_sentences[j]:
                            key_terms.add(word)

            if key_terms:
                semantic_context = f"\nRelated terms in context: {', '.join(key_terms)}"

        # Extract tashkeel and its uncertainties
        tashkeel_uncertainties = tashkeel_data.get("uncertainties", [])
        tashkeel_notes = ""
        if tashkeel_uncertainties:
            tashkeel_notes = "\nTashkeel uncertainties:\n" + "\n".join(
                f"- {u.get('word', '')}: {u.get('reason', '')}"
                for u in tashkeel_uncertainties
            )

        # Extract translation and its uncertainties
        translation = translation_data.get("translation", "")
        translation_uncertainties = translation_data.get("uncertainties", [])
        translation_notes = ""
        if translation_uncertainties:
            translation_notes = "\nTranslation uncertainties:\n" + "\n".join(
                f"- {u.get('text', '')}: {u.get('reason', '')}"
                for u in translation_uncertainties
            )

        formatted_inputs.append(
            f"Set {i + 1}:\n"
            f"Arabic words to translate:\n{' '.join(arabic_words)}\n"
            f"Full context (with tashkeel): {tashkeel}\n"
            f"Translation: {translation}"
            f"{semantic_context}"
            f"{tashkeel_notes}"
            f"{translation_notes}"
        )

    messages = [
        {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": WORD_BY_WORD_USER_PROMPT
            + "\n\n"
            + "\n\n".join(formatted_inputs),
        },
    ]

    response = call_openai_api(
        messages,
        function_schema=WORD_TRANSLATION_FUNCTION,
        function_name="translate_words",
        model=MODEL_TRANSLATION,  # Use the translation model for word translations
    )

    if "results" in response and isinstance(response["results"], list):
        processed_results = []
        for i, result in enumerate(response["results"]):
            if i >= len(sentences):
                break
            word_translations_options = []  # List to hold WordTranslationOptions
            raw_word_translations = result.get("word_translations", [])
            if not isinstance(raw_word_translations, list):
                raw_word_translations = []  # Ensure it's a list

            for word_data in raw_word_translations:
                if not isinstance(word_data, dict):
                    continue  # Skip invalid entries

                # Get options, ensuring they are lists of strings
                eng_opts = word_data.get("english_options", [])
                if not isinstance(eng_opts, list) or not all(
                    isinstance(s, str) for s in eng_opts
                ):
                    eng_opts = []  # Default to empty list if format is wrong

                ess_opts = word_data.get("essential_translation_options", [])
                if not isinstance(ess_opts, list) or not all(
                    isinstance(s, str) for s in ess_opts
                ):
                    ess_opts = []  # Default to empty list

                # Get other fields
                arabic_text = word_data.get("arabic", "")
                essential_letters = (
                    word_data.get("essential") or arabic_text
                )  # Fallback

                word_translations_options.append(
                    WordTranslationOptions(
                        arabic=arabic_text,
                        english_options=eng_opts,
                        pos=word_data.get("pos"),
                        essential=essential_letters,
                        essential_translation_options=ess_opts,
                        notes=word_data.get("notes"),
                        uncertainties=word_data.get("uncertainties", []),
                    ).model_dump()  # Store as dict for refinement input
                )
            processed_results.append({"word_translations": word_translations_options})

        # Ensure alignment: one list per sentence
        while len(processed_results) < len(sentences):
            processed_results.append({"word_translations": []})
        return processed_results
    elif "error" in response:
        logging.error(f"Error in word translation: {response['error']}")
        return [{"word_translations": []} for _ in sentences]
    else:
        logging.error("Error or unexpected format in batch word translation")
        return [{"word_translations": []} for _ in sentences]


def batch_refine_translations(
    refinement_input: List[Dict[str, Any]],
) -> Dict[str, List]:
    """Refine all translation components, selecting best options"""
    formatted_inputs = []

    for i, data in enumerate(refinement_input):
        # Extract all components, including word options
        original = data["original"]
        translation_data = data["translation"]
        tashkeel_data = data["tashkeel"]
        word_translations_options = data[
            "word_translations_options"
        ]  # Input now has options
        previous_uncertainties = data["previous_uncertainties"]

        # Format word translations options for the prompt
        word_trans_formatted = []
        for word_opts in word_translations_options:  # Iterate through option objects
            entry = f"{word_opts.get('arabic', '')}:"
            eng_opts_str = ", ".join(word_opts.get("english_options", ["N/A"]))
            ess_opts_str = ", ".join(
                word_opts.get("essential_translation_options", ["N/A"])
            )
            entry += f"\n  - English Options: [{eng_opts_str}]"
            entry += f"\n  - Essential: {word_opts.get('essential', 'N/A')}"
            entry += f"\n  - Essential Options: [{ess_opts_str}]"
            if word_opts.get("pos"):
                entry += f"\n  - POS: {word_opts.get('pos')}"
            if word_opts.get("notes"):
                entry += f"\n  - Notes: {word_opts.get('notes')}"
            word_trans_formatted.append(entry)

        # Format all uncertainties for resolution (combine from all steps)
        all_uncertainties = []
        if previous_uncertainties.get("translation"):
            all_uncertainties.extend(
                f"Translation: {u.get('text', '')} ({u.get('reason', 'No reason')})"
                for u in previous_uncertainties["translation"]
                if isinstance(u, dict)
            )
        if previous_uncertainties.get("tashkeel"):
            all_uncertainties.extend(
                f"Diacritics: {u.get('word', '')} ({u.get('reason', 'No reason')})"
                for u in previous_uncertainties["tashkeel"]
                if isinstance(u, dict)
            )
        # Include uncertainties from the word options step
        for word_opts in word_translations_options:
            word_uncertainties = word_opts.get("uncertainties", [])
            if isinstance(word_uncertainties, list):
                for u in word_uncertainties:
                    if isinstance(u, dict):
                        all_uncertainties.append(
                            f"Word ({word_opts.get('arabic', '')}): {u.get('text', '')} ({u.get('reason', 'No reason')})"
                        )

        formatted_inputs.append(
            f"Set {i + 1}:\n"
            f"Original: {original}\n"
            f"Initial Translation: {translation_data.get('translation', '')}\n"
            f"Initial Tashkeel: {tashkeel_data.get('tashkeel', '')}\n"
            f"Word Translation Options:\n"
            + "\n".join(f"• {w}" for w in word_trans_formatted)
            + "\n"
            + (
                "\nInitial Uncertainties:\n"
                + "\n".join(f"- {u}" for u in all_uncertainties)
                if all_uncertainties
                else ""
            )
        )

    messages = [
        {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": FINAL_VERIFICATION_USER_PROMPT
            + "\n\n"
            + "\n\n".join(formatted_inputs),
        },
    ]

    # Set temperature based on the verification model
    temp_to_use = 1.0 if MODEL_VERIFICATION == "o4-mini" else 0.3

    api_kwargs = {
        "messages": messages,
        "function_schema": REFINEMENT_FUNCTION,
        "function_name": "refine_translations",
        "model": MODEL_VERIFICATION,
        "temperature": temp_to_use,  # Explicitly set the correct temperature
    }

    response = call_openai_api(**api_kwargs)

    if "refinements" in response and isinstance(response["refinements"], list):
        return {"refinements": response["refinements"]}
    elif "error" in response:
        logging.error(f"Error in refinement: {response['error']}")
        return {"refinements": []}
    else:
        logging.error("Unexpected response format in refinement")
        return {"refinements": []}


def process_batch(
    batch_sentences: List[str],
    start_index: int,
    batch_contexts: List[Optional[str]],
    all_sentences: List[str] = None,
    batch_indices: List[int] = None,
) -> List[SentenceTranslation]:
    """Process a batch of sentences through all translation steps"""
    batch_size = len(batch_sentences)
    if batch_size == 0:
        return []

    try:
        # Step 1: Batch full translation with uncertainty tracking - use original text
        translation_results = batch_translate_full_sentences(
            batch_sentences, batch_contexts
        )
        # Validate translation results
        validate_translation_results(
            batch_sentences, translation_results, "Full Translation"
        )

        # Step 2: Batch add tashkeel with translation context and uncertainties - use original text
        tashkeel_results = batch_add_tashkeel(
            batch_sentences,
            translation_results,
            all_sentences,
            batch_indices,
        )
        # Validate tashkeel results
        validate_translation_results(
            batch_sentences, tashkeel_results, "Tashkeel Addition"
        )

        # Step 3: Batch word-by-word translation (getting options) - use original text
        word_options_results = batch_translate_words(
            batch_sentences,
            tashkeel_results,
            translation_results,
            all_sentences,
            batch_indices,
        )
        # Validate word translation options
        validate_translation_results(
            batch_sentences,
            word_options_results,
            "Word Translation Options",
            check_word_options=True,  # Validate options structure
        )

        # Step 4: Final verification (selecting options) - use original text
        refinement_input = []
        all_word_options_uncertainties = []  # Collect uncertainties from word options step
        for i in range(batch_size):
            word_opts_list = word_options_results[i].get("word_translations", [])
            all_word_options_uncertainties.append(
                [
                    u
                    for word_opts in word_opts_list
                    for u in word_opts.get("uncertainties", [])
                ]
            )
            refinement_input.append(
                {
                    "original": batch_sentences[i],
                    "translation": translation_results[i],
                    "tashkeel": tashkeel_results[i],
                    "word_translations_options": word_opts_list,  # Pass the list of option dicts
                    "previous_uncertainties": {
                        "translation": translation_results[i].get("uncertainties", []),
                        "tashkeel": tashkeel_results[i].get("uncertainties", []),
                        "word": all_word_options_uncertainties[
                            i
                        ],  # Include uncertainties from word options
                    },
                }
            )

        refinement_results = batch_refine_translations(refinement_input)

        # Create structured output for each sentence
        results = []
        for i in range(batch_size):
            index = start_index + i
            refinement = (
                refinement_results["refinements"][i]
                if i < len(refinement_results.get("refinements", []))
                else {}
            )

            # Get the refined components - keep original text until final storage
            refined_tashkeel = refinement.get(
                "improved_tashkeel", tashkeel_results[i].get("tashkeel", "")
            )
            refined_translation = refinement.get(
                "improved_translation", translation_results[i].get("translation", "")
            )

            # Combine notes from all steps
            notes = []
            if translation_results[i].get("notes"):
                notes.append(
                    f"Initial Translation Notes: {translation_results[i]['notes']}"
                )
            if refinement.get("changes_made"):
                notes.append("Refinement Changes:")
                notes.extend([f"- {change}" for change in refinement["changes_made"]])

            # Process resolved and remaining uncertainties
            resolved = refinement.get("resolved_uncertainties", [])
            remaining = refinement.get("remaining_uncertainties", [])

            if resolved or remaining:
                notes.append("\nUncertainty Resolution:")
                if resolved:
                    notes.append("- Resolved:")
                    for r in resolved:
                        notes.append(
                            f"  * Step: {r.get('step', 'N/A')}, "
                            f"Explanation: {r.get('explanation', 'No explanation')}"
                        )
                if remaining:
                    notes.append("- Remaining:")
                    for r in remaining:
                        notes.append(
                            f"  * Type: {r.get('type', 'N/A')}, "
                            f"Desc: {r.get('description', 'Unknown issue')} "
                            f"({r.get('reason_unresolved', 'No reason provided')})"
                        )

            # Process refined word translations (extracting the chosen single values)
            final_word_translations = []
            refined_words_data = refinement.get("improved_word_translations", [])
            if refined_words_data and isinstance(refined_words_data, list):
                for word_data in refined_words_data:
                    if not isinstance(word_data, dict):
                        continue  # Skip invalid data

                    # Extract the single chosen values
                    final_word_translations.append(
                        WordTranslation(
                            arabic=word_data.get("arabic", ""),
                            english=word_data.get("english", ""),  # Chosen value
                            pos=word_data.get("pos"),
                            essential=word_data.get("essential"),
                            essential_translation=word_data.get(
                                "essential_translation", ""
                            ),  # Chosen value
                            notes=word_data.get("notes"),
                        )
                    )
            else:
                # Fallback: if refinement failed, try to take the first option from the previous step
                logging.warning(
                    f"Refinement failed for word translations in sentence {index}. Using first option as fallback."
                )
                word_opts_list = word_options_results[i].get("word_translations", [])
                for word_opts in word_opts_list:
                    final_word_translations.append(
                        WordTranslation(
                            arabic=word_opts.get("arabic", ""),
                            english=word_opts.get(
                                "english_options", ["[Fallback Error]"]
                            )[0],
                            pos=word_opts.get("pos"),
                            essential=word_opts.get("essential"),
                            essential_translation=word_opts.get(
                                "essential_translation_options", ["[Fallback Error]"]
                            )[0],
                            notes=word_opts.get("notes", "") + " (Refinement fallback)",
                        )
                    )

            # Create sentence translation object with original text and final chosen words
            sentence_translation = SentenceTranslation(
                index=index,
                original=batch_sentences[i],
                tashkeel=refined_tashkeel,
                word_by_word=final_word_translations,  # Use the final list of WordTranslation objects
                full_translation=refined_translation,
                notes="\n".join(notes) if notes else None,
                verification_status="Refined"
                if refinement.get("changes_made")
                else "Verified",
                verification_issues=[
                    f"{u.get('type', 'N/A')}: {u.get('description', 'Unspecified issue')}"
                    for u in remaining
                ]
                if remaining
                else None,
            )

            # Validate final translation structure
            validation_issues = validate_final_translation(sentence_translation)
            if validation_issues:
                sentence_translation.verification_status = "Issues Found"
                # Append validation issues to existing ones if any
                if sentence_translation.verification_issues:
                    sentence_translation.verification_issues.extend(validation_issues)
                else:
                    sentence_translation.verification_issues = validation_issues
                logging.warning(
                    f"Final validation issues in sentence {index}:\n"
                    + "\n".join(validation_issues)
                )

            results.append(sentence_translation)

        return results

    except TranslationValidationError as e:
        logging.error(
            f"Validation error in batch starting at index {start_index}: {str(e)}"
        )
        # Create error results for the batch
        return [
            SentenceTranslation(
                index=start_index + i,
                original=sentence,
                tashkeel=sentence,
                word_by_word=[],
                full_translation="[VALIDATION ERROR]",
                notes=str(e),
                verification_status="Failed",
                verification_issues=["Validation failed during processing"],
            )
            for i, sentence in enumerate(batch_sentences)
        ]
    except Exception as e:
        logging.error(f"Error processing batch at index {start_index}: {str(e)}")
        # Create error results for the batch
        return [
            SentenceTranslation(
                index=start_index + i,
                original=sentence,
                tashkeel=sentence,
                word_by_word=[],
                full_translation="[BATCH PROCESSING ERROR]",
                notes=str(e),
                verification_status="Failed",
                verification_issues=["General processing failed"],
            )
            for i, sentence in enumerate(batch_sentences)
        ]


def save_checkpoint(results: List[SentenceTranslation]):
    """Save current progress to checkpoint file"""
    try:
        with open(CHECKPOINT_FILE, "w", encoding="utf-8") as f:
            # Convert to dict for JSON serialization
            checkpoint_data = {
                "metadata": {
                    "title": "Work in Progress",
                    "summary": "Translation in progress - checkpoint save",
                    "difficulty_level": 0,
                    "total_units": len(results),
                },
                "translations": [result.model_dump() for result in results],
            }
            json.dump(checkpoint_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logging.error(f"Failed to save checkpoint: {e}")


def load_checkpoint() -> List[SentenceTranslation]:
    """Load progress from checkpoint file if it exists"""
    if not os.path.exists(CHECKPOINT_FILE):
        return []

    try:
        with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            results = []
            for item in data.get("translations", []):
                # Handle word_by_word as list of dictionaries (final format)
                word_by_word = []
                for word in item.get("word_by_word", []):
                    # Ensure essential fields exist before creating WordTranslation
                    if (
                        "arabic" in word
                        and "english" in word
                        and "essential" in word
                        and "essential_translation" in word
                    ):
                        word_by_word.append(WordTranslation(**word))
                    else:
                        logging.warning(
                            f"Skipping invalid word data in checkpoint for sentence {item.get('index')}"
                        )

                # Create SentenceTranslation object
                results.append(
                    SentenceTranslation(
                        index=item.get("index", 0),
                        original=item.get("original", ""),
                        tashkeel=item.get("tashkeel", ""),
                        word_by_word=word_by_word,
                        full_translation=item.get("full_translation", ""),
                        notes=item.get("notes"),
                        verification_status=item.get("verification_status"),
                        verification_issues=item.get("verification_issues"),
                    )
                )
            print(f"Loaded {len(results)} sentences from checkpoint.")
            return results
    except Exception as e:
        logging.error(f"Failed to load checkpoint: {e}")
        return []


def create_batches(
    sentences: List[str], start_index: int, batch_size: int
) -> List[Dict[str, Any]]:
    """Create batches of sentences with their contexts"""
    batches = []

    # Iterate through the sentences starting from the start_index
    num_remaining = len(sentences) - start_index
    for i in range(0, num_remaining, batch_size):
        current_batch_start_global_index = start_index + i
        batch_sentences = sentences[
            current_batch_start_global_index : current_batch_start_global_index
            + batch_size
        ]

        if not batch_sentences:  # Should not happen with correct logic, but safeguard
            continue

        batch_indices = list(
            range(
                current_batch_start_global_index,
                current_batch_start_global_index + len(batch_sentences),
            )
        )
        # Context uses global indices relative to the full 'sentences' list
        batch_contexts = [
            get_optimized_context(sentences, idx) for idx in batch_indices
        ]

        batches.append(
            {
                "sentences": batch_sentences,  # The actual text for this batch
                "contexts": batch_contexts,
                "start_index": current_batch_start_global_index,  # Global start index of this batch
                "indices": batch_indices,  # Global indices of sentences in this batch
            }
        )

    return batches


def translate_file(input_file: str, output_file: str, batch_size: int = MAX_BATCH_SIZE):
    """Translate an entire file"""
    global token_tracker
    start_time = time.time()

    try:
        # Read input file
        with open(input_file, encoding="utf-8") as f:
            full_text = f.read()

        # Load checkpoint if exists
        results = load_checkpoint()
        start_index = len(results)  # Index of the first sentence *to be processed*

        # Split text into units if not already processed - use original text
        print("Analyzing text and splitting into learner-friendly units...")
        response = call_openai_api(
            [
                {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
                {"role": "user", "content": SENTENCE_SPLITTING_USER_PROMPT + full_text},
            ],
            function_schema=SPLIT_TEXT_FUNCTION,
            function_name="split_text_into_sentences",
            model=MODEL_ANALYSIS,  # Use the analysis model for text splitting
        )

        if "error" in response:
            raise ValueError(f"Failed to analyze text: {response['error']}")

        # Create metadata
        all_units = response.get("units", [])  # Get all units from analysis
        metadata = TextMetadata(
            title=response.get("title", "Untitled Text"),
            summary=response.get("summary", "No summary available"),
            difficulty_level=response.get("difficulty_level", 3),
            total_units=len(all_units),
        )

        # Print analysis results
        print("\nText Analysis:")
        print(f"Title: {metadata.title}")
        print(f"Summary: {metadata.summary}")
        print(f"Difficulty Level: {metadata.difficulty_level}/5")
        print(f"Total Units: {metadata.total_units}")
        print("-" * 80)

        if not all_units:
            raise ValueError("No units found to translate in the input file")

        # Determine units to process
        if start_index >= len(all_units):
            print(
                "All units already processed based on checkpoint. Verifying output format."
            )
            # Ensure results are saved correctly even if nothing new processed
            with open(output_file, "w", encoding="utf-8") as f:
                final_result = TranslationResult(
                    metadata=metadata, translations=results
                )
                json.dump(final_result.model_dump(), f, ensure_ascii=False, indent=2)
            print(f"Output verified and saved to {output_file}")
            return final_result

        num_to_process = len(all_units) - start_index
        print(
            f"Starting processing from unit {start_index}. {num_to_process} units remaining."
        )

        # Create batches only for the remaining units
        batches_to_process = create_batches(all_units, start_index, batch_size)

        if not batches_to_process:
            print(
                "No batches created to process, finishing."
            )  # Should be caught above, but safeguard
            # Write final output with metadata
            with open(output_file, "w", encoding="utf-8") as f:
                final_result = TranslationResult(
                    metadata=metadata, translations=results
                )
                json.dump(final_result.model_dump(), f, ensure_ascii=False, indent=2)
            return final_result

        # Process each batch with progress bar
        with tqdm(total=num_to_process, desc="Translating", initial=0) as pbar:
            for batch in batches_to_process:
                try:
                    # Process batch - uses global indices from all_units
                    batch_results = process_batch(
                        batch["sentences"],
                        batch["start_index"],
                        batch["contexts"],
                        all_units,  # Pass the full list for context generation
                        batch["indices"],
                    )

                    # Add batch results to the main results list
                    results.extend(batch_results)

                    # Save checkpoint after each batch
                    save_checkpoint(results)

                    # Update progress bar
                    pbar.update(len(batch["sentences"]))

                except Exception as e:
                    logging.error(
                        f"Error processing batch at index {batch['start_index']}: {e}"
                    )
                    # Add error markers for this batch
                    for i, sentence in enumerate(batch["sentences"]):
                        error_index = batch["start_index"] + i
                        # Check if this index already exists due to a partial batch failure
                        if error_index >= len(results):
                            results.append(
                                SentenceTranslation(
                                    index=error_index,
                                    original=sentence,
                                    tashkeel=sentence,
                                    word_by_word=[],
                                    full_translation="[BATCH PROCESSING ERROR]",
                                    notes=f"Error: {str(e)}",
                                    verification_status="Failed",
                                    verification_issues=[
                                        "General batch processing failed"
                                    ],
                                )
                            )
                    pbar.update(
                        len(batch["sentences"])
                    )  # Update progress even on error

        # Write final output with metadata
        with open(output_file, "w", encoding="utf-8") as f:
            final_result = TranslationResult(metadata=metadata, translations=results)
            json.dump(final_result.model_dump(), f, ensure_ascii=False, indent=2)

        # Clean up checkpoint file
        if os.path.exists(CHECKPOINT_FILE):
            try:
                os.remove(CHECKPOINT_FILE)
                print("Checkpoint file removed.")
            except OSError as e:
                print(f"Error removing checkpoint file: {e}")

        # Calculate and print statistics
        end_time = time.time()
        total_time = end_time - start_time
        units_processed = len(results)  # Total in the final output

        print("\nTranslation Summary:")
        print(f"Time Elapsed: {total_time:.2f} seconds")
        print(f"Total Units Analyzed: {len(all_units)}")
        print(f"Units in Output File: {units_processed}")
        if units_processed > 0 and total_time > 0:
            # Calculate average time only for newly processed units if possible
            newly_processed_count = units_processed - start_index
            if newly_processed_count > 0:
                avg_time = total_time / newly_processed_count
                print(f"Average Time per Newly Processed Unit: {avg_time:.2f} seconds")
            else:
                print("Average Time per Unit: N/A (no new units processed)")

        print(str(token_tracker))

        return final_result

    except Exception as e:
        logging.error(f"Translation failed: {str(e)}")
        # Save progress to checkpoint if we have any results
        if "results" in locals() and results:
            save_checkpoint(results)
            print(f"Progress saved to {CHECKPOINT_FILE}")
        raise


def main():
    """Main entry point"""
    # Default files in article directory
    default_input = "article/input.txt"
    default_output = "article/output.json"

    # Use command line arguments if provided, otherwise use defaults
    input_file = sys.argv[1] if len(sys.argv) >= 2 else default_input
    output_file = sys.argv[2] if len(sys.argv) >= 3 else default_output

    # Optional batch size parameter
    batch_size = MAX_BATCH_SIZE  # Use the new default
    if len(sys.argv) >= 4:
        try:
            batch_size = int(sys.argv[3])
            if batch_size < 1:
                print(
                    f"Batch size must be at least 1, using default of {MAX_BATCH_SIZE}"
                )
                batch_size = MAX_BATCH_SIZE
            elif batch_size > 10:
                print("Batch size over 10 may cause API issues, limiting to 10")
                batch_size = 10
        except ValueError:
            print(f"Invalid batch size, using default of {MAX_BATCH_SIZE}")

    error_count = 0
    results = None  # Initialize results to None
    try:
        results = translate_file(input_file, output_file, batch_size)

        # Check for any failed translations or issues
        if (
            results and results.translations
        ):  # Check if results exist and have translations
            for result in results.translations:
                if result.verification_status in ["Failed", "Issues Found"]:
                    error_count += 1
                    print(
                        f"\n{'⚠️ Issue' if result.verification_status == 'Issues Found' else '❌ Error'} in sentence {result.index}:"
                    )
                    print(f"Original: {result.original}")
                    print(f"Status: {result.verification_status}")
                    if result.notes:
                        print(f"Notes: {result.notes}")
                    if result.verification_issues:
                        print(
                            "Issues Detected:",
                            "\n".join(
                                [f"- {iss}" for iss in result.verification_issues]
                            ),
                        )
                    print("-" * 80)
        elif not results:
            print("\n⚠️ Translation process did not produce results.")
            sys.exit(1)

        if error_count > 0:
            print(
                f"\n⚠️ Translation completed with {error_count} {'errors/issues' if error_count > 1 else 'error/issue'}."
            )
            print(f"Output saved to {output_file}")
            sys.exit(1)  # Exit with error code if issues found
        else:
            print("\n✅ Translation completed successfully.")
            print(f"Output saved to {output_file}")
            sys.exit(0)

    except KeyboardInterrupt:
        print("\n⚠️ Translation interrupted by user.")
        if os.path.exists(CHECKPOINT_FILE):
            print("Progress saved to checkpoint. Run the script again to resume.")
        sys.exit(130)  # Standard exit code for SIGINT
    except Exception as e:
        print(f"\n❌ Fatal error during translation: {str(e)}")
        # If we have a checkpoint, mention it
        if os.path.exists(CHECKPOINT_FILE):
            print(
                "Progress saved to checkpoint. Run the script again to resume if possible."
            )
        sys.exit(1)


if __name__ == "__main__":
    main()
