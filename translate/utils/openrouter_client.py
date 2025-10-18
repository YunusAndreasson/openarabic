"""
OpenRouter API client for DeepSeek validation.

This module provides a simple HTTP client for OpenRouter API,
similar to responses_api.py but using direct HTTP requests instead of OpenAI SDK.
"""

import json
import logging
from typing import Any

import requests

from data.config import DEEPSEEK_MODEL, OPENROUTER_API_KEY, OPENROUTER_BASE_URL

logger = logging.getLogger(__name__)


class OpenRouterClient:
    """Client for OpenRouter API using DeepSeek model."""

    def __init__(
        self, api_key: str | None = None, model: str | None = None
    ) -> None:
        """Initialize OpenRouter client.

        Args:
            api_key: OpenRouter API key (defaults to config)
            model: Model to use (defaults to DeepSeek from config)
        """
        self.api_key = api_key or OPENROUTER_API_KEY
        self.base_url = OPENROUTER_BASE_URL
        self.model = model or DEEPSEEK_MODEL

        if not self.api_key:
            raise ValueError(
                "OpenRouter API key not found. Set OPENROUTER_API_KEY environment variable."
            )

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

            return response.json()

        except requests.exceptions.Timeout:
            logger.error("OpenRouter API request timed out")
            raise
        except requests.exceptions.HTTPError as e:
            logger.error(f"OpenRouter API HTTP error: {e}")
            logger.error(f"Response: {e.response.text if e.response else 'No response'}")
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
            return response["choices"][0]["message"]["content"]
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

            return json.loads(content)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from response: {e}")
            logger.error(f"Content: {content}")
            raise ValueError(f"Invalid JSON in response: {e}") from e

    def validate_words_batch(
        self, words_data: list[dict[str, Any]], retry_count: int = 0
    ) -> dict[str, Any]:
        """Validate a batch of word translations.

        Args:
            words_data: List of word dictionaries with validation data
            retry_count: Current retry attempt (used for progressively clearer prompts)

        Returns:
            dict: Parsed validation results

        Raises:
            ValueError: If validation fails after retries
        """
        # Construct system prompt
        system_prompt = self._build_system_prompt(retry_count)

        # Construct user prompt with words data
        user_prompt = self._build_user_prompt(words_data)

        # Call API
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        # Calculate required tokens: ~100 tokens per word for validation response
        # Add 20% buffer for safety
        estimated_tokens = int(len(words_data) * 100 * 1.2)
        max_tokens = max(8000, min(estimated_tokens, 32000))  # Cap at 32k tokens

        response = self.call_api(messages, max_tokens=max_tokens, temperature=0.1)

        # Parse JSON response
        return self.parse_json_response(response)

    def _build_system_prompt(self, retry_count: int) -> str:
        """Build system prompt for validation task.

        Args:
            retry_count: Current retry attempt (0 = first attempt)

        Returns:
            str: System prompt
        """
        base_prompt = """You are an expert Arabic linguist and Islamic scholar specializing in Classical Arabic (fusha) and Quranic Arabic.

Your task is to validate Arabic-to-English word translations for accuracy, morphological completeness, and theological soundness according to strict orthodox Sunni Islam.

CRITICAL VALIDATION RULES:

1. MORPHOLOGICAL ACCURACY:
   - Count Arabic morphemes: prefixes (wa/fa/bi/li/al) + root + suffixes (pronouns/case)
   - English translation MUST have equivalent word count
   - Example: فَمَن = "fa" (so) + "man" (whoever) = "so whoever" (2 words, not "whoever")
   - Example: وَلَهُمْ = "wa" (and) + "li" (for) + "hum" (them) = "and for them" (3 words)

2. PREFIX RENDERING (MUST be explicit in English):
   - و (wa) = "and"
   - ف (fa) = "so", "then", "thus"
   - ب (bi) = "with", "by", "in"
   - ل (li) = "for", "to"
   - ال (al) = "the"

3. SUFFIX RENDERING (MUST be explicit in English):
   - ه/ـه (hu/hi) = "him", "it", "his"
   - هم/ـهم (hum) = "them", "their"
   - ها/ـها (ha) = "her", "its"
   - ك/ـك (ka/ki) = "you", "your"
   - نا/ـنا (na) = "us", "our"

4. THEOLOGICAL VALIDATION (Strict Orthodox Sunni Standards):
   - NO shirk (associating partners with Allah)
   - NO bidah (religious innovation)
   - NO anthropomorphism (attributing human qualities to Allah improperly)
   - NO problematic theological statements
   - Proper use of Islamic honorifics
   - If grammar notes contain ANY theological issue, flag it

5. RESPONSE FORMAT:
   - Return ONLY valid JSON
   - Match the exact structure provided
   - Include reasoning for EVERY word (even if correct)
   - If word is CORRECT: set is_correct=true, issues=[], suggested_english=null, suggested_grammar_note=null
   - If word has ISSUES: set is_correct=false, list issues, provide specific suggestions
   - CRITICAL: Use null (not the current value) when accepting current translation as correct
"""

        if retry_count > 0:
            base_prompt += f"""

⚠️ RETRY ATTEMPT {retry_count}: Your previous response had JSON parsing errors.
CRITICAL: Return ONLY valid JSON. NO markdown, NO code blocks, NO explanations outside JSON.
Start with {{ and end with }}. Nothing else."""

        return base_prompt

    def _build_user_prompt(self, words_data: list[dict[str, Any]]) -> str:
        """Build user prompt with words data.

        Args:
            words_data: List of word dictionaries

        Returns:
            str: User prompt
        """
        # Convert words data to JSON for the prompt
        words_json = json.dumps(words_data, ensure_ascii=False, indent=2)

        prompt = f"""Validate these Arabic word translations:

INPUT WORDS:
{words_json}

REQUIRED OUTPUT FORMAT (valid JSON only):
{{
  "validations": [
    {{
      "word_id": <int>,
      "is_correct": <boolean>,
      "issues": [],  // Empty array if word is correct
      "suggested_english": null,  // null if current translation is correct, or "<new translation>" if issues found
      "suggested_grammar_note": null,  // null if current note is correct, or "<new note>" if issues found
      "reasoning": "<detailed explanation of validation>"
    }}
  ]
}}

EXAMPLES:
- Correct word: {{"word_id": 123, "is_correct": true, "issues": [], "suggested_english": null, "suggested_grammar_note": null, "reasoning": "Translation is accurate..."}}
- Word with issue: {{"word_id": 456, "is_correct": false, "issues": ["Missing prefix 'fa'"], "suggested_english": "so whoever", "suggested_grammar_note": "...", "reasoning": "Current lacks fa..."}}

VALIDATION CHECKLIST for EACH word:
1. Count Arabic morphemes (prefixes + root + suffixes)
2. Count English words in translation
3. Verify counts match
4. Check all prefixes (wa/fa/bi/li/al) are rendered
5. Check all suffixes (pronouns) are rendered
6. Review grammar note for theological issues
7. Provide specific, actionable suggestions if issues found

Return ONLY the JSON object. No markdown, no code blocks, no extra text."""

        return prompt


def create_validation_client() -> OpenRouterClient:
    """Create a configured OpenRouter client for validation.

    Returns:
        OpenRouterClient: Configured client
    """
    return OpenRouterClient()
