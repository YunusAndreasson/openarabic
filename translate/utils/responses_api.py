"""
Response API manager for OpenAI's Response API integration.

This module provides a conversation-based approach to translation using OpenAI's
Response API, which maintains state across multiple interactions.
"""

import logging
import os
import threading
from typing import Any

from openai import OpenAI

from data.config import MODEL_OTHER
from utils.retry import retry_operation

logger = logging.getLogger(__name__)

_keys_loaded: bool = False


def load_api_keys() -> None:
    """Load API keys from set_keys.py if present, or use environment variables."""
    global _keys_loaded
    if _keys_loaded:
        return

    # Always try to load from set_keys.py first
    set_keys_path = os.path.join(os.path.dirname(__file__), "set_keys.py")
    if os.path.exists(set_keys_path):
        try:
            # Safely load the configuration file
            import importlib.util

            spec = importlib.util.spec_from_file_location("set_keys", set_keys_path)
            if spec and spec.loader:
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                logger.info("API keys loaded from set_keys.py")
        except Exception as e:
            logger.warning(f"Failed to load API keys from set_keys.py: {e}")
    else:
        logger.warning(f"API keys file not found: {set_keys_path}")

    # Verify that required API keys are set (not needed when using Claude CLI)
    from data.config import USE_CLAUDE_CLI

    if not USE_CLAUDE_CLI and not os.getenv("OPENAI_API_KEY"):
        raise ValueError(
            "OPENAI_API_KEY environment variable is not set. "
            "Please set it in set_keys.py or as an environment variable."
        )

    _keys_loaded = True


class TokenUsageTracker:
    """Track token usage and calculate costs for Response API"""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.prompt_tokens: int = 0
        self.completion_tokens: int = 0
        self.total_tokens: int = 0
        self.cached_prompt_tokens: int = 0
        self.total_cost: float = 0.0
        self.api_calls: int = 0
        self.successful_calls: int = 0
        self.failed_calls: int = 0
        self.retry_attempts: int = 0
        # Phase-specific tracking
        self.phase_calls: dict[str, int] = {}
        self.phase_totals: dict[str, dict[str, float | int]] = {}
        self.current_phase: str | None = None
        # Model-specific breakdowns
        self.model_totals: dict[str, dict[str, float | int]] = {}
        # Keep a tiny leaderboard of most expensive calls
        self.top_calls: list[
            dict[str, Any]
        ] = []  # each: {model, phase, cost, usage, response_id}

    def set_phase(self, phase: str) -> None:
        """Set the current phase for API call tracking"""
        self.current_phase = phase
        if phase not in self.phase_calls:
            self.phase_calls[phase] = 0
        if phase not in self.phase_totals:
            self.phase_totals[phase] = {
                "prompt": 0,
                "completion": 0,
                "cached_prompt": 0,
                "total": 0,
                "cost": 0.0,
            }

    def _ensure_model_bucket(self, model: str) -> None:
        if model not in self.model_totals:
            self.model_totals[model] = {
                "prompt": 0,
                "completion": 0,
                "cached_prompt": 0,
                "total": 0,
                "cost": 0.0,
                "calls": 0,
            }

    def update(
        self,
        usage_data: dict[str, Any],
        model: str | None = None,
        phase: str | None = None,
        response_id: str | None = None,
    ) -> float:
        """Update token counts from API response and return computed cost.

        Thread-safe: uses a lock to protect concurrent updates from parallel API calls.

        usage_data is expected to contain keys like: prompt_tokens, completion_tokens,
        total_tokens, and nested prompt_tokens_details.cached_tokens where available.
        """
        with self._lock:
            return self._update_unlocked(usage_data, model, phase, response_id)

    def _update_unlocked(
        self,
        usage_data: dict[str, Any],
        model: str | None = None,
        phase: str | None = None,
        response_id: str | None = None,
    ) -> float:
        prompt_tokens = int(usage_data.get("prompt_tokens", 0) or 0)
        completion_tokens = int(usage_data.get("completion_tokens", 0) or 0)
        total_tokens = int(
            usage_data.get("total_tokens", prompt_tokens + completion_tokens) or 0
        )
        details = usage_data.get("prompt_tokens_details", {}) or {}
        cached_tokens = int(details.get("cached_tokens", 0) or 0)

        self.prompt_tokens += prompt_tokens
        self.completion_tokens += completion_tokens
        self.total_tokens += total_tokens
        self.cached_prompt_tokens += cached_tokens
        self.api_calls += 1

        # Track phase-specific calls and token totals
        phase_key = phase or self.current_phase
        if phase_key:
            self.phase_calls[phase_key] = self.phase_calls.get(phase_key, 0) + 1
            bucket = self.phase_totals.setdefault(
                phase_key,
                {
                    "prompt": 0,
                    "completion": 0,
                    "cached_prompt": 0,
                    "total": 0,
                    "cost": 0.0,
                },
            )
            bucket["prompt"] = int(bucket["prompt"]) + prompt_tokens
            bucket["completion"] = int(bucket["completion"]) + completion_tokens
            bucket["cached_prompt"] = int(bucket["cached_prompt"]) + cached_tokens
            bucket["total"] = int(bucket["total"]) + total_tokens

        # Response API pricing (adjust as needed)
        prompt_cost = prompt_tokens * 0.01 / 1000
        completion_cost = completion_tokens * 0.03 / 1000
        call_cost = prompt_cost + completion_cost
        self.total_cost += call_cost

        # Model breakdown
        if model:
            self._ensure_model_bucket(model)
            mb = self.model_totals[model]
            mb["prompt"] = int(mb["prompt"]) + prompt_tokens
            mb["completion"] = int(mb["completion"]) + completion_tokens
            mb["cached_prompt"] = int(mb["cached_prompt"]) + cached_tokens
            mb["total"] = int(mb["total"]) + total_tokens
            mb["cost"] = float(mb["cost"]) + call_cost
            mb["calls"] = int(mb["calls"]) + 1

        # Phase cost accumulation
        if phase_key:
            self.phase_totals[phase_key]["cost"] = (
                float(self.phase_totals[phase_key]["cost"]) + call_cost
            )

        # Maintain small list of top costliest calls
        self._record_top_call(
            {
                "model": model,
                "phase": phase_key,
                "cost": call_cost,
                "usage": {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": total_tokens,
                    "cached_prompt_tokens": cached_tokens,
                },
                "response_id": response_id,
            }
        )

        return call_cost

    def _record_top_call(self, call_info: dict[str, Any]) -> None:
        self.top_calls.append(call_info)
        # Keep only top 10 by cost
        self.top_calls.sort(key=lambda x: x.get("cost", 0.0), reverse=True)
        if len(self.top_calls) > 10:
            self.top_calls = self.top_calls[:10]

    def get_success_rate(self) -> float:
        """Calculate success rate"""
        total = self.successful_calls + self.failed_calls
        return (self.successful_calls / total * 100) if total > 0 else 0.0

    def get_phase_summary(self) -> str:
        """Get a summary of API calls per phase"""
        if not self.phase_calls:
            return "No phase-specific API calls tracked"

        summary = "API Calls by Phase:\n"
        for phase, calls in self.phase_calls.items():
            summary += f"  {phase}: {calls:,} calls\n"
        return summary.rstrip()

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
            f"Cached Prompt Tokens: {self.cached_prompt_tokens:,}\n"
            f"Total Tokens: {self.total_tokens:,}\n"
            f"Estimated Cost: ${self.total_cost:.2f}\n"
            f"{self.get_phase_summary()}"
        )


token_tracker = TokenUsageTracker()


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

    @retry_operation(max_attempts=3, delay=2, backoff=2)
    def _call_parse(self, **kwargs: Any) -> Any:
        """Call responses.parse with retry."""
        return self.client.responses.parse(**kwargs)

    @retry_operation(max_attempts=3, delay=2, backoff=2)
    def _call_create(self, **kwargs: Any) -> Any:
        """Call responses.create with retry."""
        return self.client.responses.create(**kwargs)

    def _extract_usage(self, response: Any) -> dict[str, Any]:
        """Best-effort extraction of usage dict from Response API objects."""
        if not hasattr(response, "usage"):
            return {}
        usage_obj = response.usage
        try:
            if hasattr(usage_obj, "to_dict"):
                result: dict[str, Any] = usage_obj.to_dict()
                return result
            if hasattr(usage_obj, "model_dump"):
                result = usage_obj.model_dump()  # pydantic-style
                return result
            if isinstance(usage_obj, dict):
                return usage_obj
        except Exception:
            return {}
        # Fallback: try to read common attributes
        fallback_result: dict[str, Any] = {}
        for key in (
            "prompt_tokens",
            "completion_tokens",
            "total_tokens",
            "prompt_tokens_details",
            "completion_tokens_details",
        ):
            if hasattr(usage_obj, key):
                fallback_result[key] = getattr(usage_obj, key)
        return fallback_result

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
                response = self._call_parse(
                    model=self.model,
                    input=messages,
                    text_format=response_model,
                )

                # Store response ID and parse structured result
                self.current_response_id = response.id

                # Track usage if present
                usage_dict = self._extract_usage(response)
                if usage_dict:
                    token_tracker.update(
                        usage_data=usage_dict,
                        model=self.model,
                        phase=token_tracker.current_phase,
                        response_id=response.id,
                    )
                    token_tracker.successful_calls += 1

                return {
                    "response_id": response.id,
                    "data": response.output_parsed.model_dump()
                    if response.output_parsed
                    else {},
                    "success": True,
                }
            # Regular text response
            text_response = self._call_create(
                model=self.model,
                input=messages,
            )

            self.current_response_id = text_response.id

            # Track usage if present
            usage_dict = self._extract_usage(text_response)
            if usage_dict:
                token_tracker.update(
                    usage_data=usage_dict,
                    model=self.model,
                    phase=token_tracker.current_phase,
                    response_id=text_response.id,
                )
                token_tracker.successful_calls += 1

            return {
                "response_id": text_response.id,
                "text": text_response.output_text,
                "success": True,
            }

        except Exception as e:
            self.logger.error(f"Error in start_conversation: {e!s}")
            self.current_response_id = None
            token_tracker.failed_calls += 1
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
                response = self._call_parse(
                    input=message,
                    previous_response_id=response_id,
                    model=self.model,
                    text_format=response_model,
                )

                # Update response ID and parse structured result
                self.current_response_id = response.id

                # Track usage if present
                usage_dict = self._extract_usage(response)
                if usage_dict:
                    token_tracker.update(
                        usage_data=usage_dict,
                        model=self.model,
                        phase=token_tracker.current_phase,
                        response_id=response.id,
                    )
                    token_tracker.successful_calls += 1

                return {
                    "response_id": response.id,
                    "data": response.output_parsed.model_dump()
                    if response.output_parsed
                    else {},
                    "success": True,
                }
            # Regular text response
            text_response = self._call_create(
                input=message,
                previous_response_id=response_id,
                model=self.model,
            )

            self.current_response_id = text_response.id

            # Track usage if present
            usage_dict = self._extract_usage(text_response)
            if usage_dict:
                token_tracker.update(
                    usage_data=usage_dict,
                    model=self.model,
                    phase=token_tracker.current_phase,
                    response_id=text_response.id,
                )
                token_tracker.successful_calls += 1

            return {
                "response_id": text_response.id,
                "text": text_response.output_text,
                "success": True,
            }

        except Exception as e:
            self.logger.error(f"Error in continue_conversation: {e!s}")
            token_tracker.failed_calls += 1
            return {"response_id": response_id, "error": str(e), "success": False}

    def continue_conversation_parallel(
        self,
        response_id: str,
        message: str,
        response_model: Any = None,
    ) -> dict[str, Any]:
        """Thread-safe continuation that does NOT mutate current_response_id.

        Use this for parallel API calls where multiple sentences branch from
        the same parent response_id simultaneously.
        """
        try:
            if response_model:
                response = self._call_parse(
                    input=message,
                    previous_response_id=response_id,
                    model=self.model,
                    text_format=response_model,
                )

                usage_dict = self._extract_usage(response)
                if usage_dict:
                    token_tracker.update(
                        usage_data=usage_dict,
                        model=self.model,
                        phase=token_tracker.current_phase,
                        response_id=response.id,
                    )
                    with token_tracker._lock:
                        token_tracker.successful_calls += 1

                return {
                    "response_id": response.id,
                    "data": response.output_parsed.model_dump()
                    if response.output_parsed
                    else {},
                    "success": True,
                }

            text_response = self._call_create(
                input=message,
                previous_response_id=response_id,
                model=self.model,
            )

            usage_dict = self._extract_usage(text_response)
            if usage_dict:
                token_tracker.update(
                    usage_data=usage_dict,
                    model=self.model,
                    phase=token_tracker.current_phase,
                    response_id=text_response.id,
                )
                with token_tracker._lock:
                    token_tracker.successful_calls += 1

            return {
                "response_id": text_response.id,
                "text": text_response.output_text,
                "success": True,
            }

        except Exception as e:
            self.logger.error(f"Error in continue_conversation_parallel: {e!s}")
            with token_tracker._lock:
                token_tracker.failed_calls += 1
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
                # Ensure current_response_id is set
                self.current_response_id = response.get("response_id")
                return self.current_response_id
            self.logger.warning(
                f"Document conversation error: {response.get('error', 'Unknown error')}"
            )
            # Don't return response_id on error - let it be None
            return None

        except Exception as e:
            self.logger.error(f"Error starting document conversation: {e!s}")
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


def call_response_api(
    messages: list[dict[str, str]],
    model: str = MODEL_OTHER,
    response_model: Any = None,
) -> dict[str, Any]:
    """Call the Response API with the given messages and response model.

    When USE_CLAUDE_CLI is enabled in config, delegates to Claude CLI
    instead of OpenAI. Stage 5 (DeepSeek correction) is unaffected as
    it uses OpenRouterClient separately.
    """
    from data.config import USE_CLAUDE_CLI

    if USE_CLAUDE_CLI:
        from utils.claude_cli import call_claude_cli

        return call_claude_cli(
            messages=messages,
            response_model=response_model,
        )

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


__all__ = ["ResponsesAPIManager", "call_response_api", "load_api_keys", "token_tracker"]
