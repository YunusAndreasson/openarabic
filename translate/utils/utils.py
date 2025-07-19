import json
import logging
import os
import time
from typing import Any, Dict, List, Optional

from openai import OpenAI

from translate.data.config import (
    MODEL_ANALYSIS,
    MODEL_OTHER,
    MODEL_TRANSLATION,
    MODEL_VERIFICATION,
)

_keys_loaded: bool = False


def load_api_keys() -> None:
    """Load API keys from set_keys.py if present."""
    global _keys_loaded
    if _keys_loaded:
        return
    set_keys_path = os.path.join(os.path.dirname(__file__), "set_keys.py")
    if not os.path.exists(set_keys_path):
        raise FileNotFoundError(f"API keys file not found: {set_keys_path}")
    with open(set_keys_path) as f:
        exec(f.read(), globals())
    _keys_loaded = True


logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


class TokenUsageTracker:
    """Track token usage and calculate costs"""

    def __init__(self) -> None:
        self.prompt_tokens: int = 0
        self.completion_tokens: int = 0
        self.total_tokens: int = 0
        self.total_cost: float = 0.0
        self.api_calls: int = 0

    def update(self, usage_data: Dict[str, int]) -> None:
        """Update token counts from API response"""
        self.prompt_tokens += usage_data.get("prompt_tokens", 0)
        self.completion_tokens += usage_data.get("completion_tokens", 0)
        self.total_tokens += usage_data.get("total_tokens", 0)
        self.api_calls += 1

        prompt_cost = usage_data.get("prompt_tokens", 0) * 0.01 / 1000
        completion_cost = usage_data.get("completion_tokens", 0) * 0.03 / 1000
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


token_tracker = TokenUsageTracker()


def init_openai_client() -> OpenAI:
    """Initialize the OpenAI client with API key"""
    load_api_keys()

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise EnvironmentError("OPENAI_API_KEY environment variable is not set.")

    return OpenAI(api_key=api_key)


client = init_openai_client()


def _create_completion(
    messages: List[Dict[str, str]],
    temperature: float,
    model: str,
    function_schema: Optional[Dict[str, Any]] = None,
    function_name: Optional[str] = None,
) -> Any:
    """Helper to create the chat completion request."""
    if function_schema:
        return client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            functions=[function_schema],
            function_call={"name": function_name} if function_name else "auto",
        )
    return client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        response_format={"type": "json_object"},
    )


def _decode_response(
    response: Any, function_schema: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    """Extract JSON data from the OpenAI API response."""
    if function_schema and hasattr(response.choices[0].message, "function_call"):
        function_call = response.choices[0].message.function_call
        if function_call and function_call.arguments:
            try:
                return json.loads(function_call.arguments)
            except json.JSONDecodeError:
                return {
                    "error": f"Failed to parse function arguments: {function_call.arguments[:100]}..."
                }
        return {"error": "Function call response was empty"}

    content = response.choices[0].message.content
    if not content:
        return {"error": "Empty response from API"}
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {"error": f"Failed to parse JSON: {content[:100]}..."}


def call_openai_api(
    messages: List[Dict[str, str]],
    function_schema: Optional[Dict[str, Any]] = None,
    function_name: Optional[str] = None,
    temperature: float = 0.3,
    max_retries: int = 3,
    model: str = MODEL_OTHER,
) -> Dict[str, Any]:
    """Call the OpenAI API with retries and standardized decoding."""
    retry_count = 0
    backoff_time = 1

    while retry_count < max_retries:
        try:
            response = _create_completion(
                messages,
                temperature,
                model,
                function_schema=function_schema,
                function_name=function_name,
            )

            if hasattr(response, "usage") and response.usage:
                token_tracker.update(response.usage.model_dump())

            return _decode_response(response, function_schema)

        except Exception as e:
            logging.error(
                f"API call failed (attempt {retry_count + 1}/{max_retries}): {str(e)}"
            )
            retry_count += 1
            if retry_count >= max_retries:
                return {
                    "error": f"API call failed after {max_retries} attempts. Error: {str(e)}"
                }

            time.sleep(backoff_time)
            backoff_time *= 2

    return {"error": "Maximum retries exceeded"}


__all__ = ["token_tracker", "call_openai_api", "load_api_keys"]
