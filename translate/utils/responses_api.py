"""
Response API manager for OpenAI's Response API integration.

This module provides a conversation-based approach to translation using OpenAI's
Response API, which maintains state across multiple interactions.

Note: Currently using Chat Completions API with tool format as a fallback
until Response API becomes available in the OpenAI client.
"""

import json
import logging
import os
import time
from typing import Any

from openai import OpenAI

from data.config import MODEL_OTHER

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


class TokenUsageTracker:
    """Track token usage and calculate costs for Response API"""

    def __init__(self) -> None:
        self.prompt_tokens: int = 0
        self.completion_tokens: int = 0
        self.total_tokens: int = 0
        self.total_cost: float = 0.0
        self.api_calls: int = 0

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
        raise OSError("OPENAI_API_KEY environment variable is not set.")

    return OpenAI(api_key=api_key)


client = init_openai_client()


class ResponseAPIManager:
    """Manages conversations using OpenAI's Response API (fallback to Chat Completions)"""

    def __init__(self, model: str = MODEL_OTHER) -> None:
        self.model = model
        self.client = client
        self.conversation_state: dict[str, Any] = {}
        self.current_response_id: str | None = None

    def start_conversation(
        self,
        messages: list[dict[str, str]],
        tools: list[dict[str, Any]] | None = None,
        temperature: float = 0.3,
        max_retries: int = 2,
    ) -> dict[str, Any]:
        """Start a new conversation with the Response API"""
        retry_count = 0

        while retry_count < max_retries:
            try:
                # Convert messages to input format for Response API
                input_text = self._messages_to_input(messages)

                # Create response using the actual Response API
                response = self.client.responses.create(
                    model=self.model,
                    instructions=self._get_instructions_for_tools(tools),
                    input=input_text,
                    tools=tools or [],
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

                return result

            except Exception as e:
                logging.error(
                    f"Response API call failed (attempt {retry_count + 1}/{max_retries}): {str(e)}",
                )
                retry_count += 1
                if retry_count >= max_retries:
                    return {
                        "error": f"Response API call failed after {max_retries} attempts. Error: {str(e)}",
                    }

                # Exponential backoff: 1s, 2s
                time.sleep(2**retry_count)

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
        """Parse the response from the Response API"""
        if not response.output:
            return {"error": "Empty response from API"}

        # Check for tool calls in Response API format
        if hasattr(response.output, "tool_calls") and response.output.tool_calls:
            tool_call = response.output.tool_calls[0]
            if tool_call and tool_call.function and tool_call.function.arguments:
                try:
                    return json.loads(tool_call.function.arguments)
                except json.JSONDecodeError:
                    return {
                        "error": f"Failed to parse function arguments: {tool_call.function.arguments[:100]}...",
                    }
            return {"error": "Function call response was empty"}

        # Parse regular content from Response API
        content = response.output_text or ""
        if not content:
            return {"error": "Empty response from API"}

        # Try to parse as JSON directly
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code blocks
            import re

            json_match = re.search(r"```(?:json)?\s*\n(.*?)\n```", content, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group(1).strip())
                except json.JSONDecodeError:
                    pass

            # Try to find JSON-like content without markdown
            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group(0))
                except json.JSONDecodeError:
                    pass

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

        # Create instructions that explain the available tools
        instructions = (
            base_instructions + "\n\nYou have access to the following tools:\n"
        )
        for tool in tools:
            if tool.get("type") == "function" and tool.get("function"):
                func = tool["function"]
                instructions += f"- {func.get('name', 'unknown')}: {func.get('description', 'No description')}\n"

        instructions += (
            "\nUse the appropriate tool when needed and respond with the tool's output. "
            "Maintain context and consistency throughout the conversation."
        )
        return instructions

    def get_conversation_state(self) -> dict[str, Any]:
        """Get the current conversation state"""
        return {
            "current_response_id": self.current_response_id,
            "conversation_state": self.conversation_state,
        }

    def set_conversation_state(self, state: dict[str, Any]) -> None:
        """Set the conversation state"""
        self.conversation_state = state.get("conversation_state", {})
        self.current_response_id = state.get("current_response_id")

    def reset_conversation(self) -> None:
        """Reset the conversation state"""
        self.conversation_state = {}
        self.current_response_id = None


# Convenience function for backward compatibility
def call_response_api(
    messages: list[dict[str, str]],
    tools: list[dict[str, Any]] | None = None,
    function_schema: dict[str, Any] | None = None,
    function_name: str | None = None,
    tool_schema: dict[str, Any] | None = None,
    tool_name: str | None = None,
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
