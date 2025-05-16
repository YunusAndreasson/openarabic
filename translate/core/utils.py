import os
import json
import time
import logging
import sys
from typing import List, Dict, Any, Optional

from openai import OpenAI

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

# Configuration constants
MODEL_ANALYSIS = "gpt-4.1"  # For text splitting and analysis
MODEL_TRANSLATION = "gpt-4.1"  # For English translation and word translation
MODEL_OTHER = "gpt-4o"  # For tashkeel and support tasks
MODEL_VERIFICATION = "o4-mini"  # For final verification/refinement


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
def init_openai_client():
    """Initialize the OpenAI client with API key"""
    # Find and exec set_keys.py robustly
    set_keys_path = os.path.join(os.path.dirname(__file__), "set_keys.py")
    exec(open(set_keys_path).read())

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable is not set.")
        print("Please set your API key using: export OPENAI_API_KEY='your-api-key'")
        sys.exit(1)

    return OpenAI(api_key=api_key)


# Create client instance
client = init_openai_client()


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
