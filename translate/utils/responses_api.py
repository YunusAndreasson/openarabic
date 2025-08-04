"""
Response API manager for OpenAI's Response API integration.

This module provides a conversation-based approach to translation using OpenAI's
Response API, which maintains state across multiple interactions.
"""

import json
import logging
import os
from typing import Any

from openai import OpenAI

from data.config import MODEL_OTHER

logger = logging.getLogger(__name__)

_keys_loaded: bool = False


def load_api_keys() -> None:
    """Load API keys from set_keys.py if present, or use environment variables."""
    global _keys_loaded
    if _keys_loaded:
        return

    # Check if environment variables are already set
    if os.getenv("OPENAI_API_KEY"):
        logger.info("Using API keys from environment variables")
        _keys_loaded = True
        return

    set_keys_path = os.path.join(os.path.dirname(__file__), "set_keys.py")
    if not os.path.exists(set_keys_path):
        logger.warning(f"API keys file not found: {set_keys_path}")
        logger.info(
            "Please set OPENAI_API_KEY environment variable or create set_keys.py"
        )
        raise FileNotFoundError(
            f"API keys file not found: {set_keys_path}. "
            "Please set OPENAI_API_KEY environment variable or create set_keys.py"
        )

    # Safely load the configuration file
    import importlib.util

    spec = importlib.util.spec_from_file_location("set_keys", set_keys_path)
    if spec and spec.loader:
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

    _keys_loaded = True


def _calculate_backoff_delay(
    attempt: int, base_delay: float = 1.0, max_delay: float = 60.0
) -> float:
    """Calculate exponential backoff delay with jitter."""
    delay = min(base_delay * (2**attempt), max_delay)
    # Simple jitter using modulo to avoid cryptographic concerns
    jitter = (delay * 0.1) * (attempt % 10) / 10  # 0-10% jitter
    return delay + jitter


def _is_retryable_error(error: Exception) -> bool:
    """Determine if an error is retryable."""
    error_str = str(error).lower()

    # Retryable errors
    retryable_patterns = [
        "rate limit",
        "429",
        "timeout",
        "server error",
        "500",
        "502",
        "503",
        "504",
        "connection",
        "network",
    ]

    # Non-retryable errors
    non_retryable_patterns = [
        "invalid api key",
        "authentication",
        "401",
        "403",
        "invalid request",
        "400",
    ]

    for pattern in non_retryable_patterns:
        if pattern in error_str:
            return False

    for pattern in retryable_patterns:
        if pattern in error_str:
            return True

    # Default to retryable for unknown errors
    return True


class TokenUsageTracker:
    """Track token usage and calculate costs for Response API"""

    def __init__(self) -> None:
        self.prompt_tokens: int = 0
        self.completion_tokens: int = 0
        self.total_tokens: int = 0
        self.total_cost: float = 0.0
        self.api_calls: int = 0
        self.successful_calls: int = 0
        self.failed_calls: int = 0
        self.retry_attempts: int = 0

    def update(self, usage_data: dict[str, int]) -> None:
        """Update token counts from API response"""
        self.prompt_tokens += usage_data.get("prompt_tokens", 0)
        self.completion_tokens += usage_data.get("completion_tokens", 0)
        self.total_tokens += usage_data.get("total_tokens", 0)
        self.api_calls += 1

        # Response API pricing (adjust as needed)
        prompt_cost = usage_data.get("prompt_tokens", 0) * 0.01 / 1000
        completion_cost = usage_data.get("completion_tokens", 0) * 0.03 / 1000
        self.total_cost += prompt_cost + completion_cost

    def record_success(self) -> None:
        """Record a successful API call"""
        self.successful_calls += 1

    def record_failure(self) -> None:
        """Record a failed API call"""
        self.failed_calls += 1

    def record_retry(self) -> None:
        """Record a retry attempt"""
        self.retry_attempts += 1

    def get_success_rate(self) -> float:
        """Calculate success rate"""
        total = self.successful_calls + self.failed_calls
        return (self.successful_calls / total * 100) if total > 0 else 0.0

    def __str__(self) -> str:
        success_rate = self.get_success_rate()
        return (
            f"\nToken Usage Statistics:\n"
            f"Total API Calls: {self.api_calls:,}\n"
            f"Successful Calls: {self.successful_calls:,}\n"
            f"Failed Calls: {self.failed_calls:,}\n"
            f"Retry Attempts: {self.retry_attempts:,}\n"
            f"Success Rate: {success_rate:.1f}%\n"
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
        raise OSError("OPENAI_API_KEY environment variable is not set.")

    return OpenAI(api_key=api_key)


# Lazy initialization - only create client when first needed
_client: OpenAI | None = None


def get_openai_client() -> OpenAI:
    """Get OpenAI client with lazy initialization."""
    global _client
    if _client is None:
        _client = init_openai_client()
    return _client


class ResponsesAPIManager:
    def __init__(self, model: str = MODEL_OTHER):
        """
        Initialize the Responses API manager with Structured Outputs support.

        Args:
            model: The model to use for responses (must support structured outputs)
        """
        load_api_keys()
        self.client = OpenAI()
        self.model = model
        self.current_response_id: str | None = None
        self.logger = logging.getLogger(__name__)

    def start_conversation(
        self,
        messages: list[dict[str, Any]],
        use_structured_output: bool = True,
        response_model: Any = None,
    ) -> dict[str, Any]:
        """
        Start a conversation using Response API with Structured Outputs.

        Args:
            messages: List of message dictionaries
            use_structured_output: Whether to use structured JSON output
            response_model: Pydantic model for structured output (imported from pipeline_types.py)

        Returns:
            Dictionary containing response data and metadata
        """
        try:
            if use_structured_output and response_model:
                # Use Response API with Pydantic model structured parsing
                response = self.client.responses.parse(
                    model=self.model,
                    input=messages,
                    text_format=response_model,
                )

                # Store response ID and parse structured result
                self.current_response_id = response.id

                return {
                    "response_id": response.id,
                    "data": response.output_parsed.model_dump(),
                    "success": True,
                }
            else:
                # Regular text response
                response = self.client.responses.create(
                    model=self.model,
                    input=messages,
                )

                self.current_response_id = response.id

                return {
                    "response_id": response.id,
                    "text": response.output_text,
                    "success": True,
                }

        except Exception as e:
            self.logger.error(f"Error in start_conversation: {str(e)}")
            return {"response_id": None, "error": str(e), "success": False}

    def continue_conversation(
        self,
        response_id: str,
        message: str,
        use_structured_output: bool = True,
        response_model: Any = None,
    ) -> dict[str, Any]:
        """
        Continue a conversation using the Response API with Structured Outputs.

        Args:
            response_id: Previous response ID
            message: Message to send
            use_structured_output: Whether to use structured JSON output
            response_model: Pydantic model for structured output (imported from pipeline_types.py)

        Returns:
            Dictionary containing response data and metadata
        """
        try:
            if use_structured_output and response_model:
                # Use Response API with Pydantic model structured parsing
                response = self.client.responses.parse(
                    input=message,
                    previous_response_id=response_id,
                    model=self.model,
                    text_format=response_model,
                )

                # Update response ID and parse structured result
                self.current_response_id = response.id

                return {
                    "response_id": response.id,
                    "data": response.output_parsed.model_dump(),
                    "success": True,
                }
            else:
                # Regular text response
                response = self.client.responses.create(
                    input=message,
                    previous_response_id=response_id,
                    model=self.model,
                )

                self.current_response_id = response.id

                return {
                    "response_id": response.id,
                    "text": response.output_text,
                    "success": True,
                }

        except Exception as e:
            self.logger.error(f"Error in continue_conversation: {str(e)}")
            return {"response_id": response_id, "error": str(e), "success": False}

    def start_document_conversation(
        self,
        sentences: list[str],
        context: str = "",
        response_model: Any = None,
    ) -> str | None:
        """
        Start a document-level conversation for translation with structured output.

        Args:
            sentences: List of sentences to translate
            context: Additional context
            response_model: Pydantic model for structured output (imported from pipeline_types.py)

        Returns:
            Response ID for the conversation
        """
        try:
            # Create a comprehensive translation prompt
            document_prompt = f"""You are an expert Arabic-to-English translator specializing in Islamic texts.

CONTEXT: {context}

TASK: Translate the following {len(sentences)} Arabic sentences to English with detailed analysis.

SENTENCES TO TRANSLATE:
"""
            for i, sentence in enumerate(sentences):
                document_prompt += f"{i + 1}. {sentence}\n"

            document_prompt += """
REQUIREMENTS:
- Provide accurate English translations
- Include word-by-word breakdown with parts of speech (pos)
- Extract essential Arabic forms for each word (essential)
- Provide essential translations (essential_translation)
- Add translation notes explaining context and choices
- Mark any uncertainties or ambiguities
- Return results as structured data with a "translations" array

IMPORTANT: Each translation should have:
- "translation": the English translation
- "notes": translation notes and context
- "word_by_word": array of word analysis with arabic, english, pos, essential, essential_translation, notes
- "uncertainties": array of any uncertain elements with text and reason

Please translate all sentences now."""

            # Start conversation with structured output using proper message format
            messages = [
                {
                    "role": "system",
                    "content": "You are an expert Arabic-to-English translator specializing in Islamic texts. Provide structured translation data.",
                },
                {"role": "user", "content": document_prompt},
            ]

            response = self.start_conversation(
                messages, use_structured_output=True, response_model=response_model
            )

            if response.get("success"):
                self.logger.info("Document conversation started successfully")
                return response.get("response_id")
            else:
                self.logger.warning(
                    f"Document conversation error: {response.get('error', 'Unknown error')}"
                )
                return response.get("response_id")

        except Exception as e:
            self.logger.error(f"Error starting document conversation: {str(e)}")
            return None

    def continue_with_stage(
        self,
        stage_message: str,
        response_model: Any = None,
    ) -> dict[str, Any]:
        """
        Continue conversation with a stage-specific message.

        Args:
            stage_message: Message for this translation stage
            tools: Legacy parameter - ignored (we use Pydantic models now)
            response_model: Pydantic model for structured output (imported from pipeline_types.py)

        Returns:
            Response data dictionary
        """
        if not self.current_response_id:
            self.logger.error("No active conversation to continue")
            return {"error": "No active conversation", "success": False}

        # Note: tools parameter is ignored as we now use Pydantic models with text_format
        return self.continue_conversation(
            self.current_response_id,
            stage_message,
            use_structured_output=True,
            response_model=response_model,
        )

    def _parse_response(self, response: Any) -> dict[str, Any]:
        """Parse Response API response into standard format"""
        if hasattr(response, "output_parsed") and response.output_parsed:
            # Already parsed by responses.parse()
            return response.output_parsed.model_dump()
        elif hasattr(response, "output_text") and response.output_text:
            # Try to parse as JSON for backward compatibility
            try:
                return json.loads(response.output_text)
            except json.JSONDecodeError:
                return {"text": response.output_text}
        else:
            return {"error": "No parseable content found in response"}


def call_response_api(
    messages: list[dict[str, str]],
    model: str = MODEL_OTHER,
    response_model: Any = None,
) -> dict[str, Any]:
    """Call the Response API with the given messages and response model"""
    manager = ResponsesAPIManager(model=model)

    try:
        result = manager.start_conversation(
            messages=messages,
            response_model=response_model,
        )
        return result
    except Exception as e:
        return {
            "response_id": None,
            "error": str(e),
            "success": False,
        }


__all__ = ["token_tracker", "call_response_api", "ResponsesAPIManager", "load_api_keys"]
