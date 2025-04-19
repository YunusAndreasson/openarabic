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


def clean_text(text: str) -> str:
    """
    Keeps only Arabic characters, numbers, and basic punctuation.
    Normalizes whitespace to single spaces.
    """
    if not text:
        return text

    # Arabic chars, numbers and punctuation only
    arabic_pattern = r"[^\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF.,!?؟:;0-9\s]"
    cleaned = re.sub(arabic_pattern, "", text)

    # Normalize whitespace
    cleaned = " ".join(cleaned.split())

    return cleaned


# Configure logging to show only errors and final output
logging.basicConfig(
    level=logging.ERROR, format="%(asctime)s - %(levelname)s - %(message)s"
)


# Models for structured data
class WordTranslation(BaseModel):
    """Word-level translation with grammatical details"""

    arabic: str
    english: str
    pos: Optional[str] = None  # Part of speech
    essential: Optional[str] = None  # Essential letters for flashcards
    essential_translation: Optional[str] = (
        None  # One-word English meaning of the essential letters
    )
    notes: Optional[str] = None  # Any special notes about the translation


class SentenceTranslation(BaseModel):
    """Complete sentence translation with all components"""

    index: int
    original: str
    tashkeel: str  # Original with diacritical marks
    word_by_word: List[WordTranslation]
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
) -> None:
    """
    Validate translation results for common errors and data integrity.

    Args:
        original_sentences: List of original Arabic sentences
        results: List of translation results to validate
        step_name: Name of the translation step (for error messages)
        check_word_translations: Whether to perform word translation specific checks

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

            # Check for missing Arabic text in word translations
            if check_word_translations and "word_translations" in result:
                word_trans = result["word_translations"]
                if isinstance(word_trans, list):
                    for j, word in enumerate(word_trans):
                        if isinstance(word, dict):
                            arabic = word.get("arabic", "") or word.get("a", "")
                            english = word.get("english", "") or word.get("e", "")
                            if not arabic or not english:
                                errors.append(
                                    f"Sentence {i}, Word {j}: Missing {'Arabic' if not arabic else 'English'} text"
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

    # Validate word-by-word translations
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

        # Check individual word translations
        for i, word in enumerate(translation.word_by_word):
            if not word.arabic or not word.english:
                issues.append(
                    f"Word {i + 1}: Missing {'Arabic' if not word.arabic else 'English'} text"
                )
            # Skipping part-of-speech validation to allow the model to use any POS tag freely

    else:
        issues.append("Missing word-by-word translations")

    return issues


# Configuration constants
MODEL_ANALYSIS = "gpt-4o"  # For text splitting and analysis
MODEL_TRANSLATION = "gpt-4o"  # For English translation and word translation
MODEL_OTHER = "gpt-4o"  # For tashkeel and support tasks
MODEL_VERIFICATION = "o4-mini"  # For final verification/refinement step
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

    if "sentences" in response and isinstance(response["sentences"], list):
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

        return response["sentences"]
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

        formatted_inputs.append(
            f"Set {i + 1}:\n"
            f"Arabic: {sentence}{grammar_context}\n"
            f"Translation: {translation}{uncertainty_notes}"
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


def batch_translate_words(
    sentences: List[str],
    tashkeel_results: List[Dict[str, Any]],
    translations: List[Dict[str, Any]],
    all_sentences: List[str] = None,
    indices: List[int] = None,
) -> List[Dict[str, Any]]:
    """Create word-by-word translations for multiple sentences in a batch"""
    formatted_inputs = []
    for i, (sentence, tashkeel_data, translation_data) in enumerate(
        zip(sentences, tashkeel_results, translations)
    ):
        # Add semantic context for word-level analysis if available
        semantic_context = ""
        if all_sentences and indices and i < len(indices):
            orig_index = indices[i]

            # Extract key terms from nearby sentences for semantic context
            key_terms = set()

            # Words from the current sentence to look for in context
            important_words = [w for w in sentence.split() if len(w) > 3]

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
        tashkeel = tashkeel_data.get("tashkeel", "")
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
            f"Arabic (with tashkeel): {tashkeel}\n"
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
        # Simplified mapping: always include essential letters and translations
        processed_results = []
        for i, result in enumerate(response["results"]):
            if i >= len(sentences):
                break
            word_translations = []
            for word in result.get("word_translations", []):
                # Normalize both old and new field names for arabic and english
                arabic_text = word.get("arabic") or word.get("a", "")
                english_text = word.get("english") or word.get("e", "")
                pos_tag = word.get("pos") or word.get("p", "")
                notes_text = word.get("notes") or word.get("n", "")
                # Always include essential letters; fallback to arabic if missing
                essential_letters = (
                    word.get("essential") or word.get("r") or arabic_text
                )
                essential_translation = word.get("essential_translation") or word.get(
                    "root_translation", ""
                )
                word_translations.append(
                    {
                        "arabic": arabic_text,
                        "english": english_text,
                        "pos": pos_tag,
                        "essential": essential_letters,
                        "essential_translation": essential_translation,
                        "notes": notes_text,
                        "uncertainties": word.get("uncertainties", []),
                    }
                )
            processed_results.append({"word_translations": word_translations})
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
    """Refine all translation components for improved accuracy"""
    formatted_inputs = []

    for i, data in enumerate(refinement_input):
        # Extract all components
        original = data["original"]
        translation_data = data["translation"]
        tashkeel_data = data["tashkeel"]
        word_translations = data["word_translations"]
        previous_uncertainties = data["previous_uncertainties"]

        # Format word translations
        word_trans_formatted = []
        for word in word_translations:
            entry = f"{word.get('arabic', '')}: {word.get('english', '')}"
            if word.get("pos"):
                entry += f" ({word.get('pos')})"
            if word.get("essential"):
                entry += f" [essential: {word.get('essential')}]"
            word_trans_formatted.append(entry)

        # Format all uncertainties for resolution
        all_uncertainties = []

        if previous_uncertainties["translation"]:
            all_uncertainties.extend(
                f"Translation: {u.get('text', '')}"
                for u in previous_uncertainties["translation"]
            )

        if previous_uncertainties["tashkeel"]:
            all_uncertainties.extend(
                f"Diacritics: {u.get('word', '')}"
                for u in previous_uncertainties["tashkeel"]
            )

        for word_u in previous_uncertainties["word"]:
            if word_u:
                all_uncertainties.extend(
                    f"Word: {u.get('description', '')}" for u in word_u
                )

        formatted_inputs.append(
            f"Set {i + 1}:\n"
            f"Original: {original}\n"
            f"Translation: {translation_data.get('translation', '')}\n"
            f"With tashkeel: {tashkeel_data.get('tashkeel', '')}\n"
            f"Word translations:\n"
            + "\n".join(f"• {w}" for w in word_trans_formatted)
            + "\n"
            + (
                "\nUncertainties to resolve:\n"
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

    response = call_openai_api(
        messages,
        function_schema=REFINEMENT_FUNCTION,
        function_name="refine_translations",
        model=MODEL_VERIFICATION,  # Use the mini model for final verification
        temperature=1.0,  # Must use default temperature for this model
    )

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

        # Step 3: Batch word-by-word translation with full context - use original text
        word_results = batch_translate_words(
            batch_sentences,
            tashkeel_results,
            translation_results,
            all_sentences,
            batch_indices,
        )
        # Validate word translation results
        validate_translation_results(
            batch_sentences,
            word_results,
            "Word Translation",
            check_word_translations=True,
        )

        # Step 4: Final verification with all previous results and uncertainties - use original text
        refinement_input = []
        for i in range(batch_size):
            refinement_input.append(
                {
                    "original": batch_sentences[i],  # Keep original text
                    "translation": translation_results[i],
                    "tashkeel": tashkeel_results[i],
                    "word_translations": word_results[i].get("word_translations", []),
                    "previous_uncertainties": {
                        "translation": translation_results[i].get("uncertainties", []),
                        "tashkeel": tashkeel_results[i].get("uncertainties", []),
                        "word": [
                            w.get("uncertainties", [])
                            for w in word_results[i].get("word_translations", [])
                        ],
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
                notes.append(translation_results[i]["notes"])
            if refinement.get("changes_made"):
                notes.extend(refinement["changes_made"])

            # Process resolved and remaining uncertainties
            resolved = refinement.get("resolved_uncertainties", [])
            remaining = refinement.get("remaining_uncertainties", [])

            if resolved or remaining:
                notes.append("Uncertainty Resolution:")
                if resolved:
                    notes.append("- Resolved:")
                    for r in resolved:
                        notes.append(
                            f"  * {r.get('explanation', 'Uncertainty resolved but explanation missing')}"
                        )
                if remaining:
                    notes.append("- Remaining:")
                    for r in remaining:
                        notes.append(
                            f"  * {r.get('description', 'Unknown issue')} ({r.get('reason_unresolved', 'No reason provided')})"
                        )

            # Process refined word translations - keep original text
            word_translations = []
            refined_words = refinement.get("improved_word_translations", [])
            if refined_words:
                for word_data in refined_words:
                    word_translations.append(
                        WordTranslation(
                            arabic=word_data.get("a", ""),  # Original text preserved
                            english=word_data.get("e", ""),
                            pos=word_data.get("p"),
                            essential=word_data.get("essential")
                            or word_data.get("r", ""),
                            essential_translation=(
                                word_data.get("essential_translation")
                                or word_data.get("root_translation", "")
                            ),
                            notes=word_data.get("n"),
                        )
                    )
            else:
                # Use original word translations if no refinements
                for word_data in word_results[i].get("word_translations", []):
                    word_translations.append(
                        WordTranslation(
                            arabic=word_data.get(
                                "arabic", ""
                            )  # Original text preserved
                            or word_data.get("a", ""),
                            english=word_data.get("english", "")
                            or word_data.get("e", ""),
                            pos=word_data.get("pos") or word_data.get("p"),
                            essential=word_data.get("essential") or word_data.get("r"),
                            essential_translation=(
                                word_data.get("essential_translation")
                                or word_data.get("root_translation", "")
                            ),
                            notes=word_data.get("notes") or word_data.get("n"),
                        )
                    )

            # Create sentence translation object with original text
            sentence_translation = SentenceTranslation(
                index=index,
                original=batch_sentences[i],  # Original text preserved
                tashkeel=refined_tashkeel,  # Original tashkeel preserved
                word_by_word=word_translations,  # Original word text preserved
                full_translation=refined_translation,
                notes="\n".join(notes) if notes else None,
                verification_status="Refined"
                if refinement.get("changes_made")
                else "Verified",
                verification_issues=[
                    u.get("description", "Unspecified issue") for u in remaining
                ]
                if remaining
                else None,
            )

            # Validate final translation
            validation_issues = validate_final_translation(sentence_translation)
            if validation_issues:
                sentence_translation.verification_status = "Issues Found"
                sentence_translation.verification_issues = validation_issues
                logging.warning(
                    f"Validation issues in sentence {index}:\n"
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
                original=sentence,  # Original text preserved for error cases
                tashkeel=sentence,
                word_by_word=[],
                full_translation="[VALIDATION ERROR]",
                notes=str(e),
                verification_status="Failed",
                verification_issues=["Validation failed"],
            )
            for i, sentence in enumerate(batch_sentences)
        ]
    except Exception as e:
        logging.error(f"Error processing batch at index {start_index}: {str(e)}")
        # Create error results for the batch
        return [
            SentenceTranslation(
                index=start_index + i,
                original=sentence,  # Original text preserved for error cases
                tashkeel=sentence,
                word_by_word=[],
                full_translation="[BATCH PROCESSING ERROR]",
                notes=str(e),
                verification_status="Failed",
                verification_issues=["Processing failed"],
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
                # Handle word_by_word as list of dictionaries
                word_by_word = []
                for word in item.get("word_by_word", []):
                    # Remap old root fields for backward compatibility
                    if "root" in word:
                        word["essential"] = word.pop("root")
                    if "root_translation" in word:
                        word["essential_translation"] = word.pop("root_translation")
                    word_by_word.append(WordTranslation(**word))

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
            return results
    except Exception as e:
        logging.error(f"Failed to load checkpoint: {e}")
        return []


def create_batches(
    sentences: List[str], start_index: int, batch_size: int
) -> List[Dict[str, Any]]:
    """Create batches of sentences with their contexts"""
    batches = []

    for i in range(0, len(sentences), batch_size):
        batch_sentences = sentences[i : i + batch_size]
        batch_indices = [start_index + i + j for j in range(len(batch_sentences))]
        batch_contexts = [
            get_optimized_context(sentences, start_index + i + j)
            for j in range(len(batch_sentences))
        ]

        batches.append(
            {
                "sentences": batch_sentences,
                "contexts": batch_contexts,
                "start_index": start_index + i,
                "indices": batch_indices,  # Track the specific index of each sentence
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
        start_index = len(results)

        # Split text into sentences if not already processed - use original text
        print("Analyzing text and splitting into sentences...")
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
        metadata = TextMetadata(
            title=response.get("title", "Untitled Text"),
            summary=response.get("summary", "No summary available"),
            difficulty_level=response.get("difficulty_level", 3),
            total_units=len(response.get("sentences", [])),
        )

        # Print analysis results
        print("\nText Analysis:")
        print(f"Title: {metadata.title}")
        print(f"Summary: {metadata.summary}")
        print(f"Difficulty Level: {metadata.difficulty_level}/5")
        print(f"Total Units: {metadata.total_units}")
        print("-" * 80)

        # Keep original sentences for AI processing
        all_sentences = response.get("sentences", [])
        if not all_sentences:
            raise ValueError("No sentences found to translate in the input file")

        # Skip already processed sentences
        remaining_sentences = all_sentences[start_index:]
        if not remaining_sentences:
            print("All sentences already processed. No work to do.")

            # Write final output with metadata
            with open(output_file, "w", encoding="utf-8") as f:
                final_result = TranslationResult(
                    metadata=metadata, translations=results
                )
                json.dump(final_result.model_dump(), f, ensure_ascii=False, indent=2)

            print(f"Output saved to {output_file}")
            return final_result

        # Create batches with improved context window
        batches = create_batches(all_sentences, start_index, batch_size)

        # Process each batch with progress bar
        batch_count = len(batches)
        remaining_batches = batches[start_index // batch_size :]

        with tqdm(total=len(remaining_sentences), desc="Translating") as pbar:
            for batch in remaining_batches:
                try:
                    # Process batch with original text
                    batch_results = process_batch(
                        batch["sentences"],
                        batch["start_index"],
                        batch["contexts"],
                        all_sentences,
                        batch["indices"],
                    )

                    # Clean text only when storing in results
                    for result in batch_results:
                        # Store cleaned version of original text
                        result.original = clean_text(result.original)
                        # Clean tashkeel text if present
                        if result.tashkeel:
                            result.tashkeel = clean_text(result.tashkeel)
                        # Clean word-by-word translations
                        if result.word_by_word:
                            for word in result.word_by_word:
                                if word.arabic:
                                    word.arabic = clean_text(word.arabic)

                    # Add batch results
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
                        results.append(
                            SentenceTranslation(
                                index=batch["start_index"] + i,
                                original=clean_text(
                                    sentence
                                ),  # Clean only when storing
                                tashkeel=clean_text(
                                    sentence
                                ),  # Clean only when storing
                                word_by_word=[],
                                full_translation="[BATCH PROCESSING ERROR]",
                                notes=f"Error: {str(e)}",
                                verification_status=None,
                                verification_issues=None,
                            )
                        )
                    pbar.update(len(batch["sentences"]))

        # Write final output with metadata
        with open(output_file, "w", encoding="utf-8") as f:
            final_result = TranslationResult(metadata=metadata, translations=results)
            json.dump(final_result.model_dump(), f, ensure_ascii=False, indent=2)

        # Clean up checkpoint file
        if os.path.exists(CHECKPOINT_FILE):
            os.remove(CHECKPOINT_FILE)

        # Calculate and print statistics
        end_time = time.time()
        total_time = end_time - start_time
        sentences_processed = len(results)

        print("\nTranslation Summary:")
        print(f"Time Elapsed: {total_time:.2f} seconds")
        print(f"Total Units: {len(all_sentences)}")
        print(f"Units Successfully Processed: {sentences_processed}")
        if sentences_processed > 0:
            print(
                f"Average Time per Unit: {total_time / sentences_processed:.2f} seconds"
            )
        print(str(token_tracker))

        return final_result

    except Exception as e:
        logging.error(f"Translation failed: {str(e)}")
        # Save progress to checkpoint if we have any results
        if "results" in locals() and results:
            save_checkpoint(results)
            print(f"Progress saved to {CHECKPOINT_FILE}")
        raise


def _remove_final_haraka(word: str) -> str:
    """
    Remove the last short vowel (haraka) or tanween
    from an Arabic word, if present.

    """
    # Set of diacritics we want to remove from the end
    final_diacritics = {"َ", "ُ", "ِ", "ْ", "ً", "ٌ", "ٍ"}

    # Convert to a list of characters for easy popping
    chars = list(word)

    # Remove diacritics while the last character is in our set
    while chars and chars[-1] in final_diacritics:
        chars.pop()

    # Reconstruct the word after stripping final diacritics
    return "".join(chars)


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
    try:
        results = translate_file(input_file, output_file, batch_size)

        # Check for any failed translations
        for result in results.translations:
            if result.verification_status == "Failed":
                error_count += 1
                print(f"\nError in sentence {result.index}:")
                print(f"Original: {result.original}")
                print(f"Error: {result.notes}")
                if result.verification_issues:
                    print("Issues:", "\n".join(result.verification_issues))
                print("-" * 80)

        if error_count > 0:
            print(f"\n⚠️ Translation completed with {error_count} errors.")
            print(f"Output saved to {output_file}")
            sys.exit(1)
        else:
            print("\n✅ Translation completed successfully.")
            print(f"Output saved to {output_file}")
            sys.exit(0)

    except KeyboardInterrupt:
        print("\n⚠️ Translation interrupted by user.")
        print("Progress saved to checkpoint. Run the script again to resume.")
        sys.exit(130)  # Standard exit code for SIGINT
    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}")
        # If we have a checkpoint, mention it
        if os.path.exists(CHECKPOINT_FILE):
            print("Progress saved to checkpoint. Run the script again to resume.")
        sys.exit(1)


if __name__ == "__main__":
    main()
