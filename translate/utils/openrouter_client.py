"""
OpenRouter API client for DeepSeek validation.

This module provides a simple HTTP client for OpenRouter API,
similar to responses_api.py but using direct HTTP requests instead of OpenAI SDK.
"""

import json
import logging
import os
from typing import Any

import requests

from data.config import DEEPSEEK_MODEL, OPENROUTER_BASE_URL
from utils.retry import retry_operation

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
                timeout=60,
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

    def correct_translations_batch(
        self, sentences_data: list[dict[str, Any]], retry_count: int = 0
    ) -> dict[str, Any]:
        """Correct a batch of sentence translations using DeepSeek.

        This method reviews OpenAI translations and provides corrected versions,
        focusing on morpheme-to-word alignment issues that OpenAI sometimes misses.

        Args:
            sentences_data: List of sentence dictionaries with full translation data
            retry_count: Current retry attempt (used for progressively clearer prompts)

        Returns:
            dict: Parsed correction results with corrected translations

        Raises:
            ValueError: If correction fails after retries
        """
        system_prompt = self._build_correction_system_prompt(retry_count)
        user_prompt = self._build_correction_user_prompt(sentences_data)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        # Calculate tokens: ~300 tokens per sentence for correction response
        estimated_tokens = int(len(sentences_data) * 300 * 1.2)
        max_tokens = max(8000, min(estimated_tokens, 32000))

        response = self.call_api(messages, max_tokens=max_tokens, temperature=0.1)
        return self.parse_json_response(response)

    def _build_correction_system_prompt(self, retry_count: int) -> str:
        """Build system prompt for translation correction task.

        Args:
            retry_count: Current retry attempt (0 = first attempt)

        Returns:
            str: System prompt
        """
        base_prompt = """You are an expert Arabic linguist reviewing and CORRECTING Arabic-to-English translations of classical Islamic texts.

Your task is to FIX translation errors, not just flag them. You will receive translations from another AI and must provide CORRECTED versions.

GOLDEN RULE: DO NO HARM
- Only change what is actually WRONG
- If the original translation is grammatically correct and conveys the meaning, KEEP IT
- Never make a "correction" that breaks natural English flow
- The corrected text MUST be valid, fluent English
- Bad correction example: "This is what I tell you" → "He is what I say to you" (WRONG - breaks grammar)

CONTEXT: ISLAMIC TEXTS
- These are classical Islamic scholarly texts (aqeedah, fiqh, tafsir, etc.)
- Maintain appropriate religious terminology (e.g., "slave" for عبد when referring to servant of Allah)
- Preserve the scholarly tone and precision of the original
- Common terms: Allah, Prophet, Messenger, scholars, predecessors (salaf), innovator, etc.

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

WHAT TO CORRECT:

1. FULL TRANSLATION (full_translation field):
   - Fix any condensed forms (therein → in it)
   - Ensure all morphemes are represented
   - MUST remain natural, fluent English - read it aloud to check
   - If your "fix" sounds awkward, keep the original

2. WORD-BY-WORD TRANSLATIONS (word_by_word.english field):
   - Each Arabic word's English MUST include ALL morphemes
   - Prefixes AND suffixes must be explicit
   - Example: فِيهِ (fiihi) english must be "in it" (2 words), not "therein"

3. TASHKEEL (only if clearly wrong):
   - Only fix obvious diacritic errors
   - Keep same Arabic letters

QUALITY CHECK BEFORE SUBMITTING:
- Read your corrected_full_translation aloud - does it sound like natural English?
- Is every sentence grammatically complete and correct?
- Did you preserve the original meaning?
- If unsure, keep the original - do not guess

RESPONSE FORMAT:
For each sentence, provide CORRECTED versions of all fields that need fixing.
If a field is already correct, return it unchanged.
Set was_corrected=true for any word that was changed.

IMPORTANT: You are CORRECTING, not just validating. But a bad correction is worse than no correction."""

        if retry_count > 0:
            base_prompt += f"""

⚠️ RETRY ATTEMPT {retry_count}: Your previous response had JSON parsing errors.
CRITICAL: Return ONLY valid JSON. NO markdown, NO code blocks, NO explanations outside JSON.
Start with {{ and end with }}. Nothing else."""

        return base_prompt

    def _build_correction_user_prompt(
        self, sentences_data: list[dict[str, Any]]
    ) -> str:
        """Build user prompt with sentences data for correction.

        Args:
            sentences_data: List of sentence dictionaries

        Returns:
            str: User prompt
        """
        sentences_json = json.dumps(sentences_data, ensure_ascii=False, indent=2)

        prompt = f"""Review and CORRECT these Arabic-to-English translations.

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
        {{
          "arabic": "<original Arabic word>",
          "corrected_english": "<fixed English - may be multi-word>",
          "corrected_essential": "<fixed root form>",
          "corrected_essential_translation": "<fixed root translation>",
          "was_corrected": <boolean>,
          "correction_reason": "<why it was fixed>" or null if unchanged
        }}
      ],
      "overall_quality": <float 0.0-1.0>,
      "issues_found": ["<list of issues that were corrected>"],
      "issues_unfixable": ["<list of issues that couldn't be auto-fixed>"]
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

SCORING GUIDE:
- 0.9-1.0: No corrections needed
- 0.7-0.89: Minor corrections (1-2 morpheme issues)
- 0.5-0.69: Moderate corrections (multiple issues)
- Below 0.5: Major corrections needed

Return ONLY the JSON object. No markdown, no code blocks, no extra text."""

        return prompt
