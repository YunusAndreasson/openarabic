"""
Conversation manager for article-level translation using Response API.

This module provides conversation-based translation that maintains context
across multiple translation steps for better quality and efficiency.
"""

import logging
from typing import Any

from data.config import MODEL_TRANSLATION
from data.schemas import (
    FINAL_VERIFICATION_USER_PROMPT,
    GENERAL_SYSTEM_PROMPT,
    SENTENCE_TRANSLATION_USER_PROMPT,
    TASHKEEL_USER_PROMPT,
    TRANSLATE_SENTENCES_TOOL,
    WORD_BY_WORD_USER_PROMPT,
)
from utils.responses_api import ResponseAPIManager

logger = logging.getLogger(__name__)


class ConversationTranslationEngine:
    """Manages article-level translation conversations using Response API"""

    def __init__(self, model: str = MODEL_TRANSLATION) -> None:
        self.model = model
        self.api_manager = ResponseAPIManager(model=model)
        self.current_response_id: str | None = None
        self.conversation_history: list[dict[str, Any]] = []

    def start_article_translation(
        self,
        sentences: list[str],
        contexts: list[str | None],
        article_title: str | None = None,
    ) -> dict[str, Any]:
        """Start a new article translation conversation"""
        # Build initial context for the article
        article_context = self._build_article_context(
            sentences, contexts, article_title
        )

        # Create initial messages for translation
        messages = [
            {"role": "system", "content": GENERAL_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": SENTENCE_TRANSLATION_USER_PROMPT + "\n\n" + article_context,
            },
        ]

        # Start conversation with translation tool
        result = self.api_manager.start_conversation(
            messages=messages,
            tools=[TRANSLATE_SENTENCES_TOOL],
            temperature=0.3,
        )

        if "error" in result:
            logger.error(f"Failed to start translation conversation: {result['error']}")
            return result

        # Store response ID for continuation
        if "response_id" in result:
            self.current_response_id = result["response_id"]
            self.conversation_history.append(
                {
                    "step": "translation",
                    "response_id": self.current_response_id,
                    "result": result,
                }
            )

        return result

    def add_tashkeel_to_conversation(
        self,
        sentences: list[str],
        translations: list[str],
        all_sentences: list[str] | None = None,
        indices: list[int] | None = None,
    ) -> dict[str, Any]:
        """Add tashkeel (diacritics) to the current conversation"""
        if not self.current_response_id:
            return {"error": "No active conversation to continue"}

        # Build tashkeel prompt
        tashkeel_prompt = self._build_tashkeel_prompt(
            sentences, translations, all_sentences, indices
        )

        # Continue conversation with tashkeel tool
        result = self.api_manager.continue_conversation(
            response_id=self.current_response_id,
            message=tashkeel_prompt,
        )

        if "error" in result:
            logger.error(f"Failed to add tashkeel to conversation: {result['error']}")
            return result

        # Update response ID for next step
        if "response_id" in result:
            self.current_response_id = result["response_id"]
            self.conversation_history.append(
                {
                    "step": "tashkeel",
                    "response_id": self.current_response_id,
                    "result": result,
                }
            )

        return result

    def add_word_translations_to_conversation(
        self,
        sentences: list[str],
        tashkeel_results: list[str],
        translations: list[str],
        all_sentences: list[str] | None = None,
        indices: list[int] | None = None,
    ) -> dict[str, Any]:
        """Add word-by-word translations to the current conversation"""
        if not self.current_response_id:
            return {"error": "No active conversation to continue"}

        # Build word translation prompt
        word_prompt = self._build_word_translation_prompt(
            sentences, tashkeel_results, translations, all_sentences, indices
        )

        # Continue conversation with word translation tool
        result = self.api_manager.continue_conversation(
            response_id=self.current_response_id,
            message=word_prompt,
        )

        if "error" in result:
            logger.error(
                f"Failed to add word translations to conversation: {result['error']}"
            )
            return result

        # Update response ID for next step
        if "response_id" in result:
            self.current_response_id = result["response_id"]
            self.conversation_history.append(
                {
                    "step": "word_translations",
                    "response_id": self.current_response_id,
                    "result": result,
                }
            )

        return result

    def refine_conversation(
        self,
        refinement_input: dict[str, Any],
    ) -> dict[str, Any]:
        """Refine translations in the current conversation"""
        if not self.current_response_id:
            return {"error": "No active conversation to continue"}

        # Build refinement prompt
        refinement_prompt = self._build_refinement_prompt(refinement_input)

        # Continue conversation with refinement tool
        result = self.api_manager.continue_conversation(
            response_id=self.current_response_id,
            message=refinement_prompt,
        )

        if "error" in result:
            logger.error(f"Failed to refine conversation: {result['error']}")
            return result

        # Update response ID for next step
        if "response_id" in result:
            self.current_response_id = result["response_id"]
            self.conversation_history.append(
                {
                    "step": "refinement",
                    "response_id": self.current_response_id,
                    "result": result,
                }
            )

        return result

    def final_verification(
        self,
        final_translations: list[str],
        original_sentences: list[str],
    ) -> dict[str, Any]:
        """Perform final verification of translations"""
        if not self.current_response_id:
            return {"error": "No active conversation to continue"}

        # Build verification prompt
        verification_prompt = self._build_verification_prompt(
            final_translations, original_sentences
        )

        # Continue conversation with verification
        result = self.api_manager.continue_conversation(
            response_id=self.current_response_id,
            message=verification_prompt,
        )

        if "error" in result:
            logger.error(f"Failed to verify conversation: {result['error']}")
            return result

        # Update response ID for next step
        if "response_id" in result:
            self.current_response_id = result["response_id"]
            self.conversation_history.append(
                {
                    "step": "verification",
                    "response_id": self.current_response_id,
                    "result": result,
                }
            )

        return result

    def _build_article_context(
        self,
        sentences: list[str],
        contexts: list[str | None],
        article_title: str | None = None,
    ) -> str:
        """Build context for article-level translation"""
        context_parts = []

        if article_title:
            context_parts.append(f"Article Title: {article_title}")

        context_parts.append("Sentences to translate:")
        for i, (sentence, context) in enumerate(zip(sentences, contexts, strict=False)):
            context_str = f"\nContext: {context}" if context else ""
            context_parts.append(f"Sentence {i + 1}: {sentence}{context_str}")

        return "\n\n".join(context_parts)

    def _build_tashkeel_prompt(
        self,
        sentences: list[str],
        translations: list[str],
        all_sentences: list[str] | None = None,
        indices: list[int] | None = None,
    ) -> str:
        """Build prompt for adding tashkeel"""
        prompt_parts = [TASHKEEL_USER_PROMPT]

        for i, (sentence, translation) in enumerate(
            zip(sentences, translations, strict=False)
        ):
            context_info = ""
            if all_sentences and indices:
                context_info = f"\nContext: {' '.join(all_sentences[max(0, indices[i] - 2) : indices[i] + 3])}"

            prompt_parts.append(
                f"Set {i + 1}:\n"
                f"Arabic sentence: {sentence}\n"
                f"Translation: {translation}{context_info}"
            )

        return "\n\n".join(prompt_parts)

    def _build_word_translation_prompt(
        self,
        sentences: list[str],
        tashkeel_results: list[str],
        translations: list[str],
        all_sentences: list[str] | None = None,
        indices: list[int] | None = None,
    ) -> str:
        """Build prompt for word-by-word translations"""
        prompt_parts = [WORD_BY_WORD_USER_PROMPT]

        for i, (_sentence, tashkeel, translation) in enumerate(
            zip(sentences, tashkeel_results, translations, strict=False)
        ):
            context_info = ""
            if all_sentences and indices:
                context_info = f"\nContext: {' '.join(all_sentences[max(0, indices[i] - 2) : indices[i] + 3])}"

            prompt_parts.append(
                f"Set {i + 1}:\n"
                f"Arabic sentence (with tashkeel): {tashkeel}\n"
                f"Translation: {translation}{context_info}"
            )

        return "\n\n".join(prompt_parts)

    def _build_refinement_prompt(self, refinement_input: dict[str, Any]) -> str:
        """Build prompt for translation refinement"""
        # This would be customized based on the refinement input structure
        return FINAL_VERIFICATION_USER_PROMPT

    def _build_verification_prompt(
        self,
        final_translations: list[str],
        original_sentences: list[str],
    ) -> str:
        """Build prompt for final verification"""
        prompt_parts = [FINAL_VERIFICATION_USER_PROMPT]

        for i, (original, translation) in enumerate(
            zip(original_sentences, final_translations, strict=False)
        ):
            prompt_parts.append(
                f"Sentence {i + 1}:\nOriginal: {original}\nTranslation: {translation}"
            )

        return "\n\n".join(prompt_parts)

    def get_conversation_summary(self) -> dict[str, Any]:
        """Get summary of the current conversation"""
        return {
            "current_response_id": self.current_response_id,
            "conversation_history": self.conversation_history,
            "total_steps": len(self.conversation_history),
        }

    def reset_conversation(self) -> None:
        """Reset the conversation state"""
        self.current_response_id = None
        self.conversation_history = []
