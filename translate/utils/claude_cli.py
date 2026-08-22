"""Claude CLI wrapper for translation pipeline.

Uses `claude --print` (powered by Claude Max subscription) as an alternative
to the OpenAI Responses API, avoiding per-API-call costs.
"""

import json
import logging
import os
import subprocess
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    pass

from data.config import CLAUDE_CLI_MODEL

logger = logging.getLogger(__name__)


def _extract_json(text: str) -> Any:
    """Extract JSON from text that may contain markdown or other wrapping.

    Tries direct parse first, then looks for ```json fenced blocks,
    then scans for the first { ... } or [ ... ] structure.
    """
    # Try direct parse
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        pass

    # Try extracting from ```json ... ``` fenced code block
    import re

    fenced = re.search(r"```(?:json)?\s*\n(.*?)\n```", text, re.DOTALL)
    if fenced:
        try:
            return json.loads(fenced.group(1))
        except (json.JSONDecodeError, ValueError):
            pass

    # Try finding first JSON object or array
    for start_char, end_char in [("{", "}"), ("[", "]")]:
        start = text.find(start_char)
        if start == -1:
            continue
        # Find matching closing bracket by counting depth
        depth = 0
        for i in range(start, len(text)):
            if text[i] == start_char:
                depth += 1
            elif text[i] == end_char:
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start : i + 1])
                    except (json.JSONDecodeError, ValueError):
                        break

    raise json.JSONDecodeError("No valid JSON found in response", text, 0)


def _usage_of(envelope: dict) -> dict[str, Any]:
    """The token counts and price for one `claude --print` invocation.

    `cache_creation` is the expensive one: a cold harness costs about 20x a warm
    one ($0.275 vs $0.014 measured on an empty prompt), and every parallel worker
    starts its own. A batch whose cache_creation count is a large fraction of its
    calls is paying that repeatedly and wants fewer workers, not more.
    """
    u = envelope.get("usage") or {}
    return {
        "input": u.get("input_tokens", 0),
        "cache_creation": u.get("cache_creation_input_tokens", 0),
        "cache_read": u.get("cache_read_input_tokens", 0),
        "output": u.get("output_tokens", 0),
        "cost_usd": envelope.get("total_cost_usd") or 0.0,
    }


def summarise_usage(records: list[dict[str, Any]]) -> str:
    """One line totalling a batch, for a run to print when it finishes."""
    if not records:
        return "no usage recorded"
    tot = {k: sum(r.get(k, 0) for r in records) for k in
           ("input", "cache_creation", "cache_read", "output", "cost_usd")}
    cold = sum(1 for r in records if r.get("cache_creation", 0) > 1000)
    billed = tot["input"] + tot["cache_creation"] + tot["cache_read"] + tot["output"]
    return (
        f"{len(records)} call(s), {cold} with a cold cache\n"
        f"  input {tot['input']:,}  cache_write {tot['cache_creation']:,}  "
        f"cache_read {tot['cache_read']:,}  output {tot['output']:,}\n"
        f"  {billed:,} tokens total, ${tot['cost_usd']:.2f}  "
        f"(${tot['cost_usd'] / len(records):.3f}/call)"
    )


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
        "--no-session-persistence",
        # This pipeline uses neither skills nor MCP servers, and loading them is
        # pure startup cost on a call that only wants one structured completion.
        # Measured on a trivial prompt: 6115ms -> 3838ms per invocation.
        "--disable-slash-commands",
        "--strict-mcp-config",
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
            timeout=600,  # 10 minute timeout
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

        # `claude --print` is not an API call — it boots a Claude Code harness per
        # invocation, measured at 45,838 cached prefix tokens against ~3,500 tokens
        # of actual content. The envelope reports exactly what that cost and this
        # wrapper used to drop it on the floor, so no batch this pipeline has ever
        # run has a recorded price; the only figures available were estimates.
        # Hand it back so callers can total it.
        usage = _usage_of(envelope)

        # Parse structured output — check structured_output field first,
        # then fall back to result field
        if response_model is not None:
            structured = envelope.get("structured_output")
            if structured and isinstance(structured, dict):
                parsed = structured
            else:
                raw_result = envelope.get("result", "")
                parsed = _extract_json(raw_result)
            # Validate with Pydantic model
            validated = response_model.model_validate(parsed)
            return {"data": validated.model_dump(), "success": True, "usage": usage}

        # Plain text response. `raw_result` is only bound inside the structured
        # branch above, so reading it here raised UnboundLocalError on every
        # response_model=None call; read the envelope directly instead.
        return {"data": {"text": envelope.get("result", "")}, "success": True, "usage": usage}

    except subprocess.TimeoutExpired:
        logger.error("Claude CLI timed out after 600s")
        return {"data": {}, "success": False, "error": "Claude CLI timed out"}
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Claude CLI output as JSON: {e}")
        return {"data": {}, "success": False, "error": f"JSON parse error: {e}"}
    except Exception as e:
        logger.error(f"Claude CLI call failed: {e}")
        return {"data": {}, "success": False, "error": str(e)}


_VALIDATION_SYSTEM_PROMPT = """You are an expert Arabic linguist validating Arabic-to-English word translations.

CORE RULE: Every Arabic morpheme (prefix, root, suffix) must map to a separate English word.
Single-word English translations for multi-morpheme Arabic words BLOCK color-coding in the learning app.

PRIORITY FIXES (triggers color-coding for students):
- Missing subject pronouns in verbs: يَكْتُبُ → "he writes" not "writes"
- Missing conjunctions: وَقَالَ → "and he said" not "said"
- Missing prepositions: فِيهِ → "in it" not "therein"
- Condensed forms: "thereof" → "of it", "therein" → "in it"
- Missing future marker: سَيَكْتُبُ → "he will write" not "he writes"
- Missing negation word: لَمْ يَقُلْ → "he did not say" not "he said not"

CONSERVATIVE: Only flag clear morpheme-count mismatches. Do NOT change correct translations."""


_VALIDATION_BATCH_SIZE = 50  # Max words per CLI call to avoid timeouts
_MAX_PARALLEL_BATCHES = 2  # Concurrent CLI processes (limited to avoid rate contention)


def _compact_words_prompt(words_data: list[dict[str, Any]]) -> str:
    """Build a compact prompt that groups words by sentence to avoid repeating context."""
    # Group words by sentence
    by_sentence: dict[str, list[dict[str, Any]]] = defaultdict(list)
    sentence_english: dict[str, str] = {}
    for w in words_data:
        key = w["sentence_arabic"]
        by_sentence[key].append(w)
        sentence_english[key] = w["sentence_english"]

    parts: list[str] = []
    for arabic, words in by_sentence.items():
        english = sentence_english[arabic]
        words_list = json.dumps(
            [
                {
                    "word_id": w["word_id"],
                    "arabic_word": w["arabic_word"],
                    "current_english": w["current_english"],
                    "current_grammar_note": w["current_grammar_note"],
                }
                for w in words
            ],
            ensure_ascii=False,
        )
        parts.append(
            f'Sentence: "{arabic}"\n'
            f'Translation: "{english}"\n'
            f"Words: {words_list}"
        )

    return "\n\n".join(parts)


def _validate_single_batch(words_data: list[dict[str, Any]]) -> dict[str, Any]:
    """Validate a single batch of words via Claude CLI."""
    from data.validation_models import ValidationBatchResponse

    words_prompt = _compact_words_prompt(words_data)
    example = json.dumps(
        {
            "validations": [
                {
                    "word_id": 99999,
                    "is_correct": False,
                    "issues": ["Missing subject pronoun for ي prefix"],
                    "suggested_english": "he writes",
                    "reasoning": "يَكْتُبُ has ي prefix = he, must include subject",
                },
                {
                    "word_id": 99998,
                    "is_correct": True,
                    "issues": [],
                    "suggested_english": None,
                    "reasoning": "Correct",
                },
            ]
        },
        ensure_ascii=False,
        indent=2,
    )
    user_prompt = f"""Validate these Arabic word translations. Respond with ONLY raw JSON.

Example output:
{example}

{words_prompt}"""

    messages = [
        {"role": "system", "content": _VALIDATION_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    result = call_claude_cli(messages, response_model=ValidationBatchResponse)

    if not result["success"]:
        raise ValueError(
            f"Claude CLI validation failed: {result.get('error', 'Unknown error')}"
        )

    return result["data"]


def validate_words_batch(
    words_data: list[dict[str, Any]], retry_count: int = 0  # noqa: ARG001
) -> dict[str, Any]:
    """Validate word translations for morpheme-to-English alignment using Claude CLI.

    Drop-in replacement for OpenRouterClient.validate_words_batch().
    Compatible with validate_with_retry(): takes (data, retry_count) → dict.

    Splits large word lists into batches and runs them in parallel to avoid
    CLI timeouts on large articles.

    Args:
        words_data: List of word dicts with word_id, arabic_word, current_english, etc.
        retry_count: Unused (kept for API compatibility with validate_with_retry).

    Returns:
        dict: {"validations": [...]} matching ValidationBatchResponse schema.

    Raises:
        ValueError: If Claude CLI call fails or returns an error.
    """
    if len(words_data) <= _VALIDATION_BATCH_SIZE:
        return _validate_single_batch(words_data)

    # Split into batches
    batches: list[list[dict[str, Any]]] = []
    for i in range(0, len(words_data), _VALIDATION_BATCH_SIZE):
        batches.append(words_data[i : i + _VALIDATION_BATCH_SIZE])

    logger.info(
        f"Splitting {len(words_data)} words into {len(batches)} batches "
        f"(max {_MAX_PARALLEL_BATCHES} parallel)"
    )

    # Run batches in parallel
    results_by_index: dict[int, list[dict[str, Any]]] = {}
    with ThreadPoolExecutor(max_workers=_MAX_PARALLEL_BATCHES) as executor:
        future_to_idx = {
            executor.submit(_validate_single_batch, batch): idx
            for idx, batch in enumerate(batches)
        }
        for future in as_completed(future_to_idx):
            idx = future_to_idx[future]
            batch = batches[idx]
            result = future.result()  # raises on failure
            logger.info(f"Batch {idx + 1}/{len(batches)} done ({len(batch)} words)")
            results_by_index[idx] = result["validations"]

    # Merge in original order
    all_validations: list[dict[str, Any]] = []
    for idx in range(len(batches)):
        all_validations.extend(results_by_index[idx])

    return {"validations": all_validations}


# ---------------------------------------------------------------------------
# Improvement review — lightweight quality gate using Opus
# ---------------------------------------------------------------------------

_REVIEW_SYSTEM_PROMPT = """You are reviewing suggested English translation changes for an Arabic learning app.

Each change was suggested to improve morpheme-to-word alignment (so each Arabic prefix/root/suffix maps to a separate English word, enabling color-coded grammar display).

APPROVE changes that:
- Add a missing subject pronoun: "said" → "he said" ✓
- Add a missing conjunction: "as for" → "and as for" ✓
- Add a missing article: "sorcery" → "the sorcery" ✓
- Fix morpheme count without sounding unnatural

REJECT changes that:
- Produce ungrammatical English: "and I-set-aside" ✗
- Add "the" to proper nouns: "Islam" → "the Islam" ✗, "Paradise" → "the Paradise" ✗, "Ramadan" → "the Ramadan" ✗
- Change the core meaning: "Paradise" → "the Garden" ✗
- Make the translation LESS accurate
- Are unnecessary (original was already fine)

Be decisive. When in doubt, reject — the original translation is safer."""

_REVIEW_BATCH_SIZE = 100  # Reviews are tiny, can send more per call


def review_improvements_batch(
    improvements: list[dict[str, Any]],
    model: str = "opus",
) -> dict[str, Any]:
    """Review pending improvements for quality using Claude.

    Args:
        improvements: List of dicts with id, original_english, suggested_english,
                      arabic_word fields.
        model: Model to use for review (default opus for quality).

    Returns:
        dict: {"reviews": [{"id": int, "approve": bool, "reason": str}, ...]}
    """
    from data.validation_models import ImprovementReviewBatchResponse

    # Build compact review list
    items = []
    for imp in improvements:
        items.append({
            "id": imp["id"],
            "arabic": imp["arabic_word"],
            "original": imp["original_english"],
            "suggested": imp["suggested_english"],
        })

    items_json = json.dumps(items, ensure_ascii=False)

    user_prompt = f"""Review these suggested translation changes. For each, decide approve or reject.

Respond with ONLY raw JSON: {{"reviews": [{{"id": 123, "approve": true, "reason": "adds missing subject pronoun"}}, ...]}}

Changes to review:
{items_json}"""

    messages = [
        {"role": "system", "content": _REVIEW_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    result = call_claude_cli(
        messages, response_model=ImprovementReviewBatchResponse, model=model
    )

    if not result["success"]:
        raise ValueError(
            f"Claude CLI review failed: {result.get('error', 'Unknown error')}"
        )

    return result["data"]


def review_all_improvements(
    improvements: list[dict[str, Any]],
    model: str = "opus",
) -> list[dict[str, Any]]:
    """Review all pending improvements, batching and parallelizing as needed.

    Returns list of review dicts with id, approve, reason.
    """
    if len(improvements) <= _REVIEW_BATCH_SIZE:
        return review_improvements_batch(improvements, model=model)["reviews"]

    batches: list[list[dict[str, Any]]] = []
    for i in range(0, len(improvements), _REVIEW_BATCH_SIZE):
        batches.append(improvements[i : i + _REVIEW_BATCH_SIZE])

    logger.info(f"Reviewing {len(improvements)} improvements in {len(batches)} batches")

    all_reviews: list[dict[str, Any]] = []
    results_by_index: dict[int, list[dict[str, Any]]] = {}
    with ThreadPoolExecutor(max_workers=_MAX_PARALLEL_BATCHES) as executor:
        future_to_idx = {
            executor.submit(
                review_improvements_batch, batch, model
            ): idx
            for idx, batch in enumerate(batches)
        }
        for future in as_completed(future_to_idx):
            idx = future_to_idx[future]
            result = future.result()
            logger.info(f"Review batch {idx + 1}/{len(batches)} done")
            results_by_index[idx] = result["reviews"]

    for idx in range(len(batches)):
        all_reviews.extend(results_by_index[idx])

    return all_reviews
