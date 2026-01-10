"""Tashkeel (diacritical marks) operations."""

import logging
import re

from data.config import MODEL_OTHER
from data.models import TashkeelResult
from data.pipeline_types import TashkeelResults, TranslationResults
from data.schemas import GENERAL_SYSTEM_PROMPT, TASHKEEL_USER_PROMPT
from utils.batch_context import get_batch_prefix
from utils.camel_tools_service import generate_tashkeel_suggestions_with_context
from utils.context_cache import ContextCache
from utils.responses_api import ResponsesAPIManager, call_response_api

from .helpers import _extract_tashkeel_data, _get_translation_data

logger = logging.getLogger(__name__)


def batch_add_tashkeel(
    sentences: list[str],
    translation_results: TranslationResults,
    all_sentences: list[str] | None = None,
    indices: list[int] | None = None,
    context_cache: ContextCache | None = None,
    conversation_manager: ResponsesAPIManager | None = None,
) -> TashkeelResults:
    """Add diacritical marks to Arabic text."""
    # Set phase for tashkeel generation tracking
    from utils.responses_api import token_tracker

    token_tracker.set_phase("Tashkeel Generation")
    logger.info(f"  → {get_batch_prefix()}Generating tashkeel...")
    results: TashkeelResults = []

    # Use conversation continuity if available
    if conversation_manager and conversation_manager.current_response_id:
        for i, sentence in enumerate(sentences):
            # Get context for this sentence
            context = None
            if context_cache and indices and i < len(indices):
                context = context_cache.get_context(indices[i], for_tashkeel=True)

            # Get camel-tools suggestions for this specific sentence
            suggestions = generate_tashkeel_suggestions_with_context(
                sentence,
                context=context,
                sentence_index=indices[i] if indices and i < len(indices) else i,
            )

            # Create enhanced sentence with camel-tools suggestions
            enhanced_sentence = sentence
            for original_word, suggested_tashkeel in suggestions.items():
                if suggested_tashkeel != original_word:
                    pattern = r"\b" + re.escape(original_word) + r"\b"
                    enhanced_sentence = re.sub(
                        pattern, suggested_tashkeel, enhanced_sentence
                    )

            # Build context info
            context_info = ""
            if context and context.strip():
                context_info = f"\nContext from surrounding sentences: {context}"

            # Process this specific sentence with conversation manager
            individual_message = f"{TASHKEEL_USER_PROMPT}\n\nInput text: {enhanced_sentence}{context_info}"
            individual_response = conversation_manager.continue_with_stage(
                individual_message, response_model=TashkeelResult
            )
            individual_data = _extract_tashkeel_data(individual_response)
            if individual_data is not None:
                results.append(TashkeelResult(**individual_data))
            else:
                raise RuntimeError(f"Failed to generate tashkeel for sentence {i}")
    else:
        # Use standard implementation when no conversation manager
        for i, (sentence, translation_result) in enumerate(
            zip(sentences, translation_results, strict=False)
        ):
            # Get context for this sentence
            context = None
            if context_cache and indices and i < len(indices):
                context = context_cache.get_context(indices[i], for_tashkeel=True)

            suggestions = generate_tashkeel_suggestions_with_context(
                sentence,
                context=context,
                sentence_index=indices[i] if indices and i < len(indices) else i,
            )

            # Handle both TranslationResult objects and dictionaries
            translation, uncertainties = _get_translation_data(translation_result)

            # Create a tashkeel-enhanced version of the sentence using camel_tools suggestions
            # Use token-aware replacement to avoid modifying substrings in other words
            enhanced_sentence = sentence
            for original_word, suggested_tashkeel in suggestions.items():
                if (
                    suggested_tashkeel != original_word
                ):  # Only replace if camel_tools provided a suggestion
                    # Use word boundary replacement to avoid substring issues
                    pattern = r"\b" + re.escape(original_word) + r"\b"
                    enhanced_sentence = re.sub(
                        pattern, suggested_tashkeel, enhanced_sentence
                    )

            # Get context for this sentence
            context_info = ""
            if context_cache and indices and i < len(indices):
                context = context_cache.get_context(indices[i], for_tashkeel=True)
                if context and context.strip():
                    context_info = f"\nContext from surrounding sentences: {context}"

            # Use the prompt from schemas.py
            individual_prompt = (
                f"{TASHKEEL_USER_PROMPT}\n\nInput text: {enhanced_sentence}"
            )

            individual_messages = [
                {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
                {"role": "user", "content": individual_prompt},
            ]

            response = call_response_api(
                individual_messages,
                response_model=TashkeelResult,
                model=MODEL_OTHER,
            )

            data = _extract_tashkeel_data(response)
            if data is not None:
                results.append(TashkeelResult(**data))
            else:
                raise RuntimeError(f"Failed to generate tashkeel for sentence {i}")

    # Basic validation - ensure we have results for all sentences
    if len(results) != len(sentences):
        raise RuntimeError(
            f"Tashkeel result count mismatch - got {len(results)} results for {len(sentences)} sentences"
        )

    return results


__all__ = ["batch_add_tashkeel"]
