"""
OpenRouter API client for DeepSeek validation.

This module provides a simple HTTP client for OpenRouter API,
similar to responses_api.py but using direct HTTP requests instead of OpenAI SDK.
"""

import json
import logging
import os
from typing import TYPE_CHECKING, Any

import requests

from data.config import DEEPSEEK_MODEL, OPENROUTER_BASE_URL
from utils.retry import retry_operation

if TYPE_CHECKING:
    from data.deepseek_correction_models import (
        ArticleContext,
        SentenceCorrectionInput,
    )

logger = logging.getLogger(__name__)


class OpenRouterClient:
    """Client for OpenRouter API using DeepSeek model."""

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        """Initialize OpenRouter client.

        Args:
            api_key: OpenRouter API key (defaults to environment variable)
            model: Model to use (defaults to DeepSeek from config)
        """
        # Read API key at runtime (config constant is evaluated at import time)
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY", "")
        self.base_url = OPENROUTER_BASE_URL
        self.model = model or DEEPSEEK_MODEL

        if not self.api_key:
            raise ValueError(
                "OpenRouter API key not found. Set OPENROUTER_API_KEY environment variable."
            )

    @retry_operation(max_attempts=3, delay=2, backoff=2)
    def call_api(
        self,
        messages: list[dict[str, str]],
        max_tokens: int = 4000,
        temperature: float = 0.1,
    ) -> dict[str, Any]:
        """Call OpenRouter API with given messages.

        Args:
            messages: List of message dicts with 'role' and 'content'
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature (lower = more deterministic)

        Returns:
            dict: API response with 'choices', 'usage', etc.

        Raises:
            requests.HTTPError: If API call fails
            ValueError: If response is invalid
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/openarabic/translate",
            "X-Title": "OpenArabic Translation Validator",
        }

        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=300,
            )
            response.raise_for_status()

            result: dict[str, Any] = response.json()
            return result

        except requests.exceptions.Timeout:
            logger.error("OpenRouter API request timed out")
            raise
        except requests.exceptions.HTTPError as e:
            logger.error(f"OpenRouter API HTTP error: {e}")
            logger.error(
                f"Response: {e.response.text if e.response else 'No response'}"
            )
            raise
        except Exception as e:
            logger.error(f"OpenRouter API call failed: {e}")
            raise

    def extract_content(self, response: dict[str, Any]) -> str:
        """Extract text content from API response.

        Args:
            response: API response dict

        Returns:
            str: Extracted text content

        Raises:
            ValueError: If response structure is invalid
        """
        try:
            content: str = response["choices"][0]["message"]["content"]
            return content
        except (KeyError, IndexError) as e:
            logger.error(f"Failed to extract content from response: {e}")
            logger.error(f"Response structure: {response}")
            raise ValueError(f"Invalid response structure: {e}") from e

    def parse_json_response(self, response: dict[str, Any]) -> dict[str, Any]:
        """Extract and parse JSON from API response.

        Args:
            response: API response dict

        Returns:
            dict: Parsed JSON data

        Raises:
            ValueError: If JSON parsing fails
        """
        content = self.extract_content(response)

        # Try to parse JSON from response
        try:
            # Handle markdown code blocks
            if "```json" in content:
                # Extract JSON from markdown code block
                start = content.find("```json") + 7
                end = content.find("```", start)
                content = content[start:end].strip()
            elif "```" in content:
                # Extract from generic code block
                start = content.find("```") + 3
                end = content.find("```", start)
                content = content[start:end].strip()

            result: dict[str, Any] = json.loads(content)
            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from response: {e}")
            logger.error(f"Content: {content}")
            raise ValueError(f"Invalid JSON in response: {e}") from e

    def validate_words_batch(
        self, words_data: list[dict[str, Any]], retry_count: int = 0
    ) -> dict[str, Any]:
        """Validate a batch of word translations for morphological accuracy.

        Checks that each English translation exposes the correct number of Arabic
        morphemes so the grammar color-coding system can highlight them.

        Args:
            words_data: List of word dicts (word_id, arabic_word, current_english, …)
            retry_count: Current retry attempt (affects prompt strictness)

        Returns:
            dict: Parsed validation results with suggested improvements
        """
        system_prompt = self._build_validation_system_prompt(retry_count)
        user_prompt = self._build_validation_user_prompt(words_data)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        estimated_tokens = int(len(words_data) * 100 * 1.2)
        max_tokens = max(8000, min(estimated_tokens, 32000))
        response = self.call_api(messages, max_tokens=max_tokens, temperature=0.1)
        return self.parse_json_response(response)

    @staticmethod
    def _build_validation_system_prompt(retry_count: int) -> str:  # noqa: ARG004
        """System prompt for word-translation morpheme validation."""
        return """You are an expert Arabic linguist validating Arabic-to-English word translations.

CORE RULE: Every Arabic morpheme (prefix, root, suffix) must map to a separate English word.
Single-word English translations for multi-morpheme Arabic words BLOCK color-coding in the learning app.

PRIORITY FIXES (triggers color-coding for students):
- Missing subject pronouns in verbs: يَكْتُبُ → "he writes" not "writes"
- Missing conjunctions: وَقَالَ → "and he said" not "said"
- Missing prepositions: فِيهِ → "in it" not "therein"
- Condensed forms: "thereof" → "of it", "therein" → "in it", "thereof" → "of it"
- Missing future marker: سَيَكْتُبُ → "he will write" not "he writes"
- Missing negation word: لَمْ يَقُلْ → "he did not say" not "he said not"

CONSERVATIVE: Only flag clear morpheme-count mismatches. Do NOT change correct translations.
Return JSON: {"validations": [{"word_id": int, "is_correct": bool, "issues": [], "suggested_english": null_or_str, "reasoning": str}]}"""

    def _build_validation_user_prompt(self, words_data: list[dict[str, Any]]) -> str:
        """User prompt listing words to validate."""
        words_json = json.dumps(words_data, ensure_ascii=False, indent=2)
        return f"""Validate these Arabic word translations for morphological accuracy:

{words_json}

Return ONLY valid JSON matching: {{"validations": [{{"word_id": int, "is_correct": bool, "issues": [], "suggested_english": null, "reasoning": str}}]}}"""

    def correct_translations_batch(
        self,
        sentences_data: list["SentenceCorrectionInput"],
        retry_count: int = 0,
        article_context: "ArticleContext | None" = None,
    ) -> dict[str, Any]:
        """Correct a batch of sentence translations using DeepSeek.

        This method reviews OpenAI translations and provides corrected versions,
        focusing on morpheme-to-word alignment issues that OpenAI sometimes misses.

        Args:
            sentences_data: List of SentenceCorrectionInput models with full translation data
            retry_count: Current retry attempt (used for progressively clearer prompts)
            article_context: Optional ArticleContext with title/summary for context

        Returns:
            dict: Parsed correction results with corrected translations

        Raises:
            ValueError: If correction fails after retries
        """
        system_prompt = self._build_correction_system_prompt(retry_count)
        user_prompt = self._build_correction_user_prompt(
            sentences_data, article_context
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        # Calculate tokens: ~300 tokens per sentence for correction response
        estimated_tokens = int(len(sentences_data) * 300 * 1.2)
        max_tokens = max(8000, min(estimated_tokens, 32000))

        response = self.call_api(messages, max_tokens=max_tokens, temperature=0.1)
        return self.parse_json_response(response)

    @staticmethod
    def _build_correction_system_prompt(retry_count: int) -> str:
        """Build system prompt for translation correction task.

        Args:
            retry_count: Current retry attempt (0 = first attempt)

        Returns:
            str: System prompt
        """
        base_prompt = """You are an expert Arabic linguist reviewing Arabic-to-English translations of classical Islamic texts.

GOLDEN RULE: ONLY FIX CLEAR ERRORS

You must be CONSERVATIVE. Only make corrections when you find CLEAR, OBVIOUS issues.

TWO DIFFERENT STANDARDS:

FOR WORD-BY-WORD TRANSLATIONS (word_translations[].english):
✅ FIX:
- Condensed forms: "therein" → "in it", "thereof" → "of it"
- Missing morphemes: وَقَالَ as "said" → "and said"
- Each Arabic morpheme must map to separate English word(s)

FOR FULL SENTENCE TRANSLATIONS (full_translation):
✅ FIX only:
- Obvious mistranslations (wrong meaning)
- Broken grammar
- Remove any comments, footnotes, brackets, or translator notes from the text (e.g., "[i.e. ...]", "[lit. ...]", "[Translator's note: ...]", "(meaning ...)")
✓ KEEP as-is:
- Natural English phrasing (prioritize fluency for audio)
- Style choices, word order, synonyms

WHEN IN DOUBT, KEEP THE ORIGINAL.

A bad correction is WORSE than no correction. If the translation:
- Is grammatically correct English
- Conveys the Arabic meaning accurately
- Flows naturally when read aloud
→ Then KEEP IT UNCHANGED, even if you might phrase it differently.

Bad correction example: "This is what I tell you" → "He is what I say to you" (WRONG - broke grammar)

CONTEXT: ISLAMIC TEXTS FOR AUDIO
- Classical Islamic scholarly texts (aqeedah, fiqh, tafsir, etc.)
- All translations will be read aloud via text-to-speech
- Ensure translations sound natural when spoken
- NEVER leave comments, footnotes, brackets, or translator notes in English text (e.g., "[i.e. ...]", "[lit. ...]", "[Translator's note: ...]", "(meaning ...)"). Remove any such artifacts — the text must be clean for audio.
- Preserve religious terminology (e.g., "slave" for عبد when referring to servant of Allah)
- Maintain scholarly tone and precision
- Common terms: Allah, Prophet, Messenger, scholars, predecessors (salaf), etc.

CRITICAL FOCUS: MORPHEME-TO-WORD ALIGNMENT

The #1 issue you must fix: English translations that fail to break up Arabic morphemes into separate English words.

RULES FOR MORPHEME-TO-WORD ALIGNMENT:

1. PREFIXES MUST BE SEPARATE WORDS:
   - و (wa) = "and" → MUST be a separate word
     * وَقَالَ → "and said" (NOT "said")
     * وَلَهُمْ → "and for them" (NOT "for them")
   - ف (fa) = "so", "then" → MUST be a separate word
     * فَمَن → "so whoever" (NOT "whoever")
     * فَقَالَ → "so he said" (NOT "he said")
   - ب (bi) = "with", "by", "in" → MUST be a separate word
     * بِهِ → "by it" (NOT "therein", NOT "thereby")
     * بِمَا → "by what" (NOT "whereby")
   - ل (li) = "for", "to" → MUST be a separate word
     * لَهُ → "for him" (NOT "his", when it means "for him")
     * لَنَا → "for us" (NOT just "us")

2. SUFFIXES MUST BE SEPARATE WORDS:
   - ه/ـه (hu/hi) = "him", "it", "his" → MUST be a separate word
     * فِيهِ → "in it" (NOT "therein")
     * مِنْهُ → "from it" (NOT "therefrom")
     * عَلَيْهِ → "upon him" (NOT "thereupon")
   - هم/ـهم (hum) = "them", "their" → MUST be a separate word
     * مِنْهُمْ → "from them" (NOT "therefrom")
     * عَلَيْهِمْ → "upon them"
   - ها/ـها (ha) = "her", "it" → MUST be a separate word
     * فِيهَا → "in it" (NOT "therein")
   - نا/ـنا (na) = "us", "our", "we" → MUST be a separate word
     * لَنَا → "for us"
     * مِنَّا → "from us"

3. FORBIDDEN CONDENSED FORMS (ALWAYS EXPAND):
   ❌ "therein" → ✅ "in it"
   ❌ "thereof" → ✅ "of it"
   ❌ "therewith" → ✅ "with it"
   ❌ "therefrom" → ✅ "from it"
   ❌ "thereupon" → ✅ "upon it"
   ❌ "thereby" → ✅ "by it"
   ❌ "wherein" → ✅ "in which"
   ❌ "whereby" → ✅ "by which"
   ❌ "whereof" → ✅ "of which"
   ❌ "himself" → ✅ "his self" (when نَفْسِهِ)
   ❌ "themselves" → ✅ "their selves" (when أَنْفُسِهِمْ)

4. GRAMMATICAL CONCEPTS REQUIRING EXTRA WORDS:
   - Future marker سَ/سَوْفَ → MUST add "will"
     * سَيَكْتُبُ → "will write" (NOT "writes")
   - Past negation لَمْ → MUST use "did not"
     * لَمْ يَكْتُبْ → "did not write" (NOT "not write")
   - Dual number → MUST add "two" or "both"
     * كِتَابَانِ → "two books" (NOT "books")
   - Passive voice → MUST use "was/is" + past participle
     * كُتِبَ → "was written" (NOT "written")

PRIMARY FOCUS: SPLITTING SINGLE-WORD TRANSLATIONS

Your #1 job is finding English words that should be split into multiple words:

SINGLE WORD → MULTIPLE WORDS (always fix):
- "therein" → "in it"
- "thereof" → "of it"
- "thereby" → "by it"
- "therefrom" → "from it"
- "wherein" → "in which"
- "himself" → "his self" (when translating نَفْسِهِ)
- "themselves" → "their selves" (when translating أَنْفُسِهِمْ)

WHAT TO CORRECT:

1. WORD-BY-WORD (word_translations[].english):
   - Split condensed forms into multiple words
   - Each Arabic morpheme = separate English word
   - Example: فِيهِ → "in it" (2 words), not "therein"
   - Purpose: vocabulary learning requires explicit morpheme mapping

2. FULL TRANSLATION (full_translation):
   - Fix only: wrong meaning, broken grammar
   - Keep: natural English phrasing suitable for audio
   - Purpose: fluent listening experience

3. TASHKEEL:
   - Fix only obviously wrong diacritics
   - When uncertain, keep original

QUALITY CHECK:
- Word-by-word: Are condensed forms split into separate words?
- Full translation: Correct meaning? Correct grammar? Sounds natural when read aloud?

RESPONSE FORMAT:
- word_corrections: ONLY include words you actually changed. Omit unchanged words entirely.
- High overall_quality (0.9+) if only minor word-splitting needed

OUTPUT RULES:
- Return ONLY the corrected JSON. No comments, no explanations, no notes about what you changed or why.
- Do NOT add any text before or after the JSON object.

REMEMBER: Only fix what is CLEARLY wrong. When uncertain, keep original."""

        if retry_count > 0:
            base_prompt += f"""

⚠️ RETRY ATTEMPT {retry_count}: Your previous response had JSON parsing errors.
CRITICAL: Return ONLY valid JSON. NO markdown, NO code blocks, NO explanations outside JSON.
Start with {{ and end with }}. Nothing else."""

        return base_prompt

    @staticmethod
    def _build_correction_user_prompt(
        sentences_data: list["SentenceCorrectionInput"],
        article_context: "ArticleContext | None" = None,
    ) -> str:
        """Build user prompt with sentences data for correction.

        Args:
            sentences_data: List of SentenceCorrectionInput models
            article_context: Optional ArticleContext model

        Returns:
            str: User prompt with serialized JSON data
        """
        # Serialize Pydantic models to JSON (model_dump for Pydantic v2)
        sentences_dicts = [s.model_dump(exclude_none=True) for s in sentences_data]
        sentences_json = json.dumps(sentences_dicts, ensure_ascii=False)

        # Build article context section if available and non-empty
        context_section = ""
        if article_context and not article_context.is_empty():
            context_section = f"""
ARTICLE CONTEXT:
- Title: {article_context.title}
- Summary: {article_context.summary}

Use this context to ensure translations are consistent with the article's topic and terminology.

"""

        prompt = f"""Review and CORRECT these Arabic-to-English translations.
{context_section}
SURROUNDING CONTEXT: Each sentence includes 'previous_sentence' and 'next_sentence'.
Use these to ensure your corrections maintain flow and consistency with surrounding text.
This is especially important for pronouns, references, and maintaining scholarly tone.

INPUT SENTENCES:
{sentences_json}

REQUIRED OUTPUT FORMAT (valid JSON only):
{{
  "corrections": [
    {{
      "sentence_index": <int>,
      "corrected_full_translation": "<fixed English translation>",
      "corrected_tashkeel": "<fixed Arabic with diacritics>" or null if unchanged,
      "word_corrections": [
        // ONLY include words that were actually corrected. Omit unchanged words. Empty array if no word corrections.
        {{
          "arabic": "<original Arabic word>",
          "corrected_english": "<fixed English - may be multi-word>",
          "corrected_essential": "<fixed root form>",
          "corrected_essential_translation": "<fixed root translation>",
          "correction_reason": "<why it was fixed>"
        }}
      ],
      "issues_unfixable": ["<issues that couldn't be auto-fixed>"]
    }}
  ]
}}

CRITICAL CORRECTIONS TO MAKE:

1. EXPAND CONDENSED FORMS in both full_translation AND word_by_word.english:
   - "therein" → "in it"
   - "thereof" → "of it"
   - "thereby" → "by it"
   - "therefrom" → "from it"
   - "himself" → "his self" (when from نَفْسِهِ)

2. ADD MISSING MORPHEMES:
   - Missing prefix و (wa) → add "and"
   - Missing prefix ف (fa) → add "so" or "then"
   - Missing suffix ه (hu) → add "him" or "it"
   - Missing suffix هم (hum) → add "them"

3. ADD MISSING GRAMMATICAL MARKERS:
   - Future سَ → add "will"
   - Past negation لَمْ → use "did not"
   - Dual number → add "two"

Return ONLY the JSON object. No markdown, no code blocks, no extra text."""

        return prompt
