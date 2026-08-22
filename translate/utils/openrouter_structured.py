"""Schema-constrained completions through OpenRouter, as a drop-in for claude_cli.

Same call signature and same return shape as `utils.claude_cli.call_claude_cli`,
so a caller swaps providers by swapping the function rather than by branching.

Why this exists: `claude --print` is not an API call. It boots a Claude Code
harness per invocation — measured at 45,838 tokens of cached prefix and ~6,258
output tokens against a ~500-token record, because the harness runs the request
as a multi-turn agent loop. For a one-shot structured completion that overhead is
pure waste, and it is charged against a Max subscription rather than metered
credit. A plain HTTPS POST sends the prompt and nothing else.

`utils/openrouter_client.py` is deliberately left alone — the translation
pipeline depends on it and it has no structured-output path.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import requests

from data.config import DEEPSEEK_MODEL, OPENROUTER_BASE_URL

logger = logging.getLogger(__name__)

TIMEOUT_S = 300


def _schema_payload(response_model: Any) -> dict[str, Any]:
    """OpenRouter's json_schema block for a Pydantic model.

    `strict` constrains decoding to the grammar, so the shape cannot come back
    wrong and a required field cannot be silently dropped. It demands every
    property appear in `required`, which is why `Sense.note` is modelled as
    required-but-nullable rather than optional — the model still gets to say
    "nothing to add", it just has to say it.
    """
    return {
        "type": "json_schema",
        "json_schema": {
            "name": getattr(response_model, "__name__", "response"),
            "strict": True,
            "schema": response_model.model_json_schema(),
        },
    }


def _usage_of(body: dict[str, Any]) -> dict[str, Any]:
    """Normalised to the same keys claude_cli reports, so one summariser fits both."""
    u = body.get("usage") or {}
    return {
        "input": u.get("prompt_tokens", 0),
        "cache_creation": 0,
        "cache_read": 0,
        "output": u.get("completion_tokens", 0),
        "cost_usd": float(u.get("cost") or 0.0),
    }


def call_openrouter(
    messages: list[dict[str, str]],
    response_model: Any = None,
    model: str | None = None,
    temperature: float = 0.1,
    max_tokens: int = 16000,
    reasoning_effort: str | None = None,
) -> dict[str, Any]:
    """One structured completion. Returns {"data", "success", "usage"}."""
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    if not api_key:
        return {"data": {}, "success": False, "error": "OPENROUTER_API_KEY not set"}

    payload: dict[str, Any] = {
        "model": model or DEEPSEEK_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        # Ask OpenRouter to price the call. Without this the response carries token
        # counts but no cost, and an unpriced run is exactly the gap that made the
        # Claude-side spend invisible until it had already happened.
        "usage": {"include": True},
    }
    if response_model is not None:
        payload["response_format"] = _schema_payload(response_model)
    if reasoning_effort:
        # This task distils a supplied excerpt into fixed fields; it is not a
        # reasoning problem. The trace is billed as output either way, so leaving
        # it unbounded pays a premium for deliberation the prompt does not need.
        #
        # "none" disables it outright rather than requesting the cheapest tier --
        # a distinct setting, because omitting this block entirely leaves the
        # PROVIDER's default in force, which for a reasoning model means on. The
        # cost probe needs to compare against genuinely-off, not against default.
        payload["reasoning"] = ({"enabled": False} if reasoning_effort == "none"
                                else {"effort": reasoning_effort})

    try:
        resp = requests.post(
            f"{OPENROUTER_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/openarabic/translate",
                "X-Title": "OpenArabic Word Enrichment",
            },
            json=payload,
            timeout=TIMEOUT_S,
        )
        resp.raise_for_status()
        body = resp.json()
    except Exception as exc:  # noqa: BLE001 — the caller records and moves on
        logger.error(f"OpenRouter call failed: {exc}")
        return {"data": {}, "success": False, "error": str(exc)}

    usage = _usage_of(body)
    if body.get("error"):
        return {"data": {}, "success": False, "error": str(body["error"]), "usage": usage}

    try:
        choice = body["choices"][0]
        content = choice["message"].get("content")
    except (KeyError, IndexError) as exc:
        return {"data": {}, "success": False, "error": f"bad response shape: {exc}", "usage": usage}

    # A reasoning model spends `max_tokens` on its reasoning trace FIRST, so a
    # ceiling that comfortably fits the record still truncates before any content
    # is emitted — `content` comes back null and `finish_reason` says "length".
    # Half of a 20-word trial failed this way at max_tokens=4000 against a
    # ~500-token record. Report it as what it is rather than letting a null reach
    # the JSON parser as "expected str, got NoneType".
    if not content:
        why = choice.get("native_finish_reason") or choice.get("finish_reason") or "unknown"
        reasoned = len(choice["message"].get("reasoning") or "")
        return {
            "data": {}, "success": False, "usage": usage,
            "error": f"empty content (finish_reason={why}, reasoning={reasoned} chars) "
                     f"— raise max_tokens or lower reasoning effort",
        }

    if response_model is None:
        return {"data": {"text": content}, "success": True, "usage": usage}

    # Some models still fence the object even under response_format; reuse the
    # tolerant extractor rather than duplicating it.
    from utils.claude_cli import _extract_json

    try:
        parsed = _extract_json(content)
        validated = response_model.model_validate(parsed)
    except Exception as exc:  # noqa: BLE001 — a malformed record is a failed call
        logger.error(f"OpenRouter structured output did not validate: {exc}")
        return {"data": {}, "success": False, "error": f"schema: {exc}", "usage": usage}

    return {"data": validated.model_dump(), "success": True, "usage": usage}
