"""
Response API manager for OpenAI's Response API integration.

This module provides a conversation-based approach to translation using OpenAI's
Response API, which maintains state across multiple interactions.
"""

import json
import logging
import os
import time
from typing import Any

from openai import OpenAI

from data.config import MODEL_OTHER
from data.schemas import GENERAL_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

_keys_loaded: bool = False


def load_api_keys() -> None:
    """Load API keys from set_keys.py if present."""
    global _keys_loaded
    if _keys_loaded:
        return
    set_keys_path = os.path.join(os.path.dirname(__file__), "set_keys.py")
    if not os.path.exists(set_keys_path):
        raise FileNotFoundError(f"API keys file not found: {set_keys_path}")

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


client = init_openai_client()


class ResponseAPIManager:
    """Manages conversations using OpenAI's Response API"""

    def __init__(self, model: str = MODEL_OTHER) -> None:
        self.model = model
        self.client = client
        self.conversation_state: dict[str, Any] = {}
        self.current_response_id: str | None = None

    def start_document_conversation(
        self, full_text: str, tools: list[dict[str, Any]] | None = None
    ) -> str:
        """Start a new conversation with the full document uploaded once"""
        messages = [
            {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Here is the complete Arabic text to translate:\n\n{full_text}\n\nI will ask you to process specific parts of this document in subsequent messages.",
            },
        ]

        response = self.start_conversation(messages, tools=tools)
        self.current_response_id = response.get("response_id")
        return self.current_response_id

    def continue_with_stage(
        self, stage_message: str, tools: list[dict[str, Any]] | None = None
    ) -> dict[str, Any]:
        """Continue existing conversation for a new pipeline stage"""
        if not self.current_response_id:
            raise ValueError(
                "No active conversation. Call start_document_conversation first."
            )

        return self.continue_conversation(self.current_response_id, stage_message)

    def start_conversation(
        self,
        messages: list[dict[str, str]],
        tools: list[dict[str, Any]] | None = None,
        temperature: float = 0.3,
        max_retries: int = 4,  # Increased from 2 to 4
    ) -> dict[str, Any]:
        """Start a new conversation with the Response API"""
        retry_count = 0

        while retry_count < max_retries:
            try:
                # Convert messages to input format for Response API
                input_text = self._messages_to_input(messages)

                # Convert tools to Response API format with proper schema validation
                response_tools = []
                if tools:
                    for tool in tools:
                        if tool.get("type") == "function" and tool.get("function"):
                            # Response API expects name at top level
                            response_tools.append(
                                {
                                    "name": tool.get("name", ""),
                                    "type": "function",
                                    "function": {
                                        "description": tool.get("function", {}).get(
                                            "description", ""
                                        ),
                                        "parameters": tool.get("function", {}).get(
                                            "parameters", {}
                                        ),
                                    },
                                }
                            )

                # Create response using the Response API with proper configuration
                response = self.client.responses.create(
                    model=self.model,
                    instructions=self._get_instructions_for_tools(tools),
                    input=input_text,
                    tools=response_tools or [],
                    tool_choice="required"
                    if tools
                    else "auto",  # Force tool usage when tools are provided
                )

                # Parse the response
                result = self._parse_response(response, tools)

                # Store response ID for conversation continuation
                if hasattr(response, "id"):
                    result["response_id"] = response.id
                    self.current_response_id = response.id
                    self.conversation_state["current_response_id"] = response.id

                # Update token usage if available
                if hasattr(response, "usage") and response.usage:
                    token_tracker.update(response.usage.model_dump())

                # Record successful call
                if "error" not in result:
                    token_tracker.record_success()
                else:
                    token_tracker.record_failure()

                return result

            except Exception as e:
                retry_count += 1
                token_tracker.record_retry()

                # Check if error is retryable
                if not _is_retryable_error(e):
                    logger.error(f"Non-retryable error in Response API call: {str(e)}")
                    token_tracker.record_failure()
                    return {"error": f"Non-retryable error: {str(e)}"}

                if retry_count >= max_retries:
                    logger.error(
                        f"Response API call failed after {max_retries} attempts: {str(e)}"
                    )
                    token_tracker.record_failure()
                    return {"error": f"Maximum retries exceeded: {str(e)}"}

                # Calculate backoff delay with jitter
                delay = _calculate_backoff_delay(retry_count - 1)
                logger.warning(
                    f"Response API call failed (attempt {retry_count}/{max_retries}), "
                    f"retrying in {delay:.2f}s: {str(e)}"
                )
                time.sleep(delay)

        token_tracker.record_failure()
        return {"error": "Maximum retries exceeded"}

    def continue_conversation(
        self,
        response_id: str,
        message: str,
        max_retries: int = 2,
    ) -> dict[str, Any]:
        """Continue an existing conversation with the Response API"""
        retry_count = 0

        while retry_count < max_retries:
            try:
                # Continue the conversation using the Response API
                response = self.client.responses.continue_(
                    response_id=response_id,
                    input=message,
                )

                # Parse the response
                result = self._parse_response(response)

                # Store response ID for conversation continuation
                if hasattr(response, "id"):
                    result["response_id"] = response.id
                    self.current_response_id = response.id
                    self.conversation_state["current_response_id"] = response.id

                # Update token usage if available
                if hasattr(response, "usage") and response.usage:
                    token_tracker.update(response.usage.model_dump())

                return result

            except Exception as e:
                logging.error(
                    f"Response API continue failed (attempt {retry_count + 1}/{max_retries}): {str(e)}",
                )
                retry_count += 1
                if retry_count >= max_retries:
                    return {
                        "error": f"Response API continue failed after {max_retries} attempts. Error: {str(e)}",
                    }

                # Exponential backoff: 1s, 2s
                time.sleep(2**retry_count)

        return {"error": "Maximum retries exceeded"}

    def _parse_response(
        self,
        response: Any,
        tools: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Parse the response from the Response API with enhanced validation"""
        # Check for tool calls in the output
        if hasattr(response, "output") and response.output:
            for output_item in response.output:
                if hasattr(output_item, "type") and output_item.type == "function_call":
                    if hasattr(output_item, "arguments") and output_item.arguments:
                        try:
                            result = json.loads(output_item.arguments)

                            # Enhanced validation: Check for empty or malformed results
                            if not result:
                                logger.warning("Function call returned empty result")
                                return {"error": "Function call returned empty result"}

                            if isinstance(result, dict):
                                # Check if all values are empty or None
                                if not any(result.values()):
                                    logger.warning(
                                        "Function call returned result with all empty values"
                                    )
                                    return {
                                        "error": "Function call returned result with all empty values"
                                    }

                                # Log successful function call for monitoring
                                logger.info(
                                    f"Successfully parsed function call: {output_item.name}"
                                )

                            return result
                        except json.JSONDecodeError as e:
                            logger.error(
                                f"Failed to parse function arguments: {output_item.arguments[:100]}... Error: {e}"
                            )
                            return {
                                "error": f"Failed to parse function arguments: {output_item.arguments[:100]}..."
                            }
                    else:
                        logger.warning("Function call response was empty")
                        return {"error": "Function call response was empty"}

        # Check for output_text which contains the main response
        if hasattr(response, "output_text") and response.output_text:
            content = response.output_text
        else:
            logger.warning("Empty response from API")
            return {"error": "Empty response from API"}

        if not content:
            logger.warning("Empty content in response")
            return {"error": "Empty response from API"}

        # Try to parse as JSON directly
        try:
            result = json.loads(content)
            logger.info("Successfully parsed JSON response")
            return result
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code blocks
            import re

            json_match = re.search(r"```(?:json)?\s*\n(.*?)\n```", content, re.DOTALL)
            if json_match:
                try:
                    result = json.loads(json_match.group(1).strip())
                    logger.info("Successfully parsed JSON from markdown code block")
                    return result
                except json.JSONDecodeError:
                    logger.warning("Failed to parse JSON from markdown code block")

            # Try to find JSON-like content without markdown
            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                try:
                    result = json.loads(json_match.group(0))
                    logger.info("Successfully parsed JSON from content")
                    return result
                except json.JSONDecodeError:
                    logger.warning("Failed to parse JSON from content")

            # Log the raw response for debugging
            logger.error(
                f"Failed to parse JSON response. Raw content: {content[:200]}..."
            )
            return {"error": f"Failed to parse JSON: {content[:100]}..."}

    def _messages_to_input(self, messages: list[dict[str, str]]) -> str:
        """Convert messages list to input text for Response API"""
        if not messages:
            return ""

        # Build conversation history for better context
        conversation_parts = []
        for message in messages:
            role = message.get("role", "")
            content = message.get("content", "")

            if role == "system":
                # System messages become part of the instructions
                continue
            elif role == "user":
                conversation_parts.append(f"User: {content}")
            elif role == "assistant":
                conversation_parts.append(f"Assistant: {content}")

        return "\n\n".join(conversation_parts)

    def _get_instructions_for_tools(self, tools: list[dict[str, Any]] | None) -> str:
        """Generate instructions for the Response API based on available tools"""
        base_instructions = "You are a helpful AI assistant specialized in Arabic to English translation."

        if not tools:
            return base_instructions

        # Create detailed instructions that explain the available tools and usage
        instructions = (
            base_instructions + "\n\nYou have access to the following tools:\n"
        )

        for tool in tools:
            if tool.get("type") == "function" and tool.get("function"):
                func = tool["function"]
                tool_name = tool.get("name", "unknown")
                description = func.get("description", "No description")
                parameters = func.get("parameters", {})

                instructions += f"- {tool_name}: {description}\n"

                # Add parameter details for better understanding
                if parameters.get("properties"):
                    instructions += "  Parameters:\n"
                    for param_name, param_details in parameters["properties"].items():
                        param_desc = param_details.get("description", "No description")
                        param_type = param_details.get("type", "unknown")
                        instructions += (
                            f"    - {param_name} ({param_type}): {param_desc}\n"
                        )

        instructions += (
            "\nCRITICAL INSTRUCTIONS FOR TOOL USAGE:\n"
            "1. You MUST use the appropriate tool when processing the input.\n"
            "2. Do not respond directly with text - always call the function.\n"
            "3. Provide ALL required parameters with valid values.\n"
            "4. Follow the exact parameter types and descriptions specified.\n"
            "5. Ensure your function arguments are complete and accurate.\n"
            "6. Use structured JSON format for all function calls.\n"
            "7. Maintain context and consistency throughout the conversation.\n"
            "8. If you're unsure about a parameter, provide your best estimate based on the context.\n"
            "\n"
            "EXAMPLE: When you need to refine translations, call the function with both "
            "improved_tashkeel and improved_translation parameters filled with appropriate values."
        )
        return instructions

    def get_conversation_state(self) -> dict[str, Any]:
        """Get the current conversation state"""
        return self.conversation_state.copy()

    def set_conversation_state(self, state: dict[str, Any]) -> None:
        """Set the conversation state"""
        self.conversation_state = state.copy()

    def reset_conversation(self) -> None:
        """Reset the conversation state"""
        self.conversation_state = {}
        self.current_response_id = None


# Convenience function for backward compatibility
def call_response_api(
    messages: list[dict[str, str]],
    tools: list[dict[str, Any]] | None = None,
    function_schema: dict[str, Any] | None = None,
    _function_name: str | None = None,
    tool_schema: dict[str, Any] | None = None,
    _tool_name: str | None = None,
    temperature: float = 0.3,
    max_retries: int = 2,
    model: str = MODEL_OTHER,
) -> dict[str, Any]:
    """Call the Response API with the given messages and tools"""
    # Handle both old and new parameter names for backward compatibility
    if function_schema:
        # Convert function schema to tool format if needed
        if function_schema.get("type") == "function":
            tools = [function_schema]
        else:
            tools = [{"type": "function", "function": function_schema}]
    elif tool_schema:
        tools = [tool_schema]

    manager = ResponseAPIManager(model=model)
    return manager.start_conversation(
        messages=messages,
        tools=tools,
        temperature=temperature,
        max_retries=max_retries,
    )


__all__ = ["token_tracker", "call_response_api", "ResponseAPIManager", "load_api_keys"]
