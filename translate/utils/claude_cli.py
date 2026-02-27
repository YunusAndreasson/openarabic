"""Claude CLI wrapper for translation pipeline.

Uses `claude --print` (powered by Claude Max subscription) as an alternative
to the OpenAI Responses API, avoiding per-API-call costs.
"""

import json
import logging
import os
import subprocess
from typing import Any

from data.config import CLAUDE_CLI_MODEL

logger = logging.getLogger(__name__)


def call_claude_cli(
    messages: list[dict[str, str]],
    response_model: Any = None,
    model: str | None = None,
) -> dict[str, Any]:
    """Call Claude via the CLI subprocess.

    Builds a `claude --print` command with structured output support.
    Returns the same format as `call_response_api()`: {"data": dict, "success": bool}.

    Args:
        messages: List of message dicts with "role" and "content" keys.
        response_model: Optional Pydantic model for structured JSON output.
        model: Claude model alias ("sonnet", "opus", "haiku"). Defaults to config.

    Returns:
        Dict with "data" (parsed dict), "success" (bool), and optionally "error".
    """
    model = model or CLAUDE_CLI_MODEL

    # Extract system prompt and user content from messages
    system_prompt = None
    user_content_parts: list[str] = []
    for msg in messages:
        if msg["role"] == "system":
            system_prompt = msg["content"]
        else:
            user_content_parts.append(msg["content"])

    user_content = "\n\n".join(user_content_parts)

    # Build command
    cmd = [
        "claude",
        "--print",
        "--output-format", "json",
        "--model", model,
        "--tools", "",
        "--no-session-persistence",
    ]

    if system_prompt:
        cmd.extend(["--system-prompt", system_prompt])

    # Add JSON schema constraint if a Pydantic model is provided
    if response_model is not None:
        schema = response_model.model_json_schema()
        cmd.extend(["--json-schema", json.dumps(schema)])

    # Unset CLAUDECODE to avoid nested session detection
    env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}

    logger.info(f"Calling Claude CLI (model={model}, structured={response_model is not None})")

    try:
        result = subprocess.run(
            cmd,
            input=user_content,
            capture_output=True,
            text=True,
            timeout=900,  # 15 minute timeout
            env=env,
        )

        if result.returncode != 0:
            error_msg = result.stderr.strip() or f"claude CLI exited with code {result.returncode}"
            logger.error(f"Claude CLI error: {error_msg}")
            return {"data": {}, "success": False, "error": error_msg}

        # Parse the outer JSON envelope from --output-format json
        envelope = json.loads(result.stdout)

        if envelope.get("is_error"):
            error_msg = envelope.get("result", "Unknown Claude CLI error")
            logger.error(f"Claude CLI returned error: {error_msg}")
            return {"data": {}, "success": False, "error": error_msg}

        raw_result = envelope.get("result", "")

        # Parse structured output
        if response_model is not None:
            parsed = json.loads(raw_result)
            # Validate with Pydantic model
            validated = response_model.model_validate(parsed)
            return {"data": validated.model_dump(), "success": True}

        # Plain text response
        return {"data": {"text": raw_result}, "success": True}

    except subprocess.TimeoutExpired:
        logger.error("Claude CLI timed out after 900s")
        return {"data": {}, "success": False, "error": "Claude CLI timed out"}
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Claude CLI output as JSON: {e}")
        return {"data": {}, "success": False, "error": f"JSON parse error: {e}"}
    except Exception as e:
        logger.error(f"Claude CLI call failed: {e}")
        return {"data": {}, "success": False, "error": str(e)}
