"""
Conversation-based translation engine using Response API.

This module provides conversation-aware versions of the existing translation
functions, maintaining context across multiple translation steps.
"""

import logging
from typing import Any

from data.config import MODEL_TRANSLATION
from data.pipeline_types import (
    RefinementInputs,
    RefinementResults,
    TashkeelResults,
    TranslationResults,
    WordTranslationResults,
)
from utils.context_cache import ContextCache
from utils.responses_api import ResponseAPIManager

from .conversation_manager import ConversationTranslationEngine

logger = logging.getLogger(__name__)


class ConversationAwareTranslationEngine:
    """Conversation-aware translation engine using Response API"""

    def __init__(self, model: str = MODEL_TRANSLATION) -> None:
        self.model = model
        self.api_manager = ResponseAPIManager(model=model)
        self.conversation_engine = ConversationTranslationEngine(model=model)
        self.current_article_id: str | None = None

    def translate_article_conversational(
        self,
        sentences: list[str],
        contexts: list[str | None],
        article_title: str | None = None,
        article_id: str | None = None,
    ) -> dict[str, Any]:
        """Translate an entire article using conversation-based approach"""
        self.current_article_id = article_id

        # Start article translation conversation
        result = self.conversation_engine.start_article_translation(
            sentences=sentences,
            contexts=contexts,
            article_title=article_title,
        )

        if "error" in result:
            logger.error(f"Failed to start article translation: {result['error']}")
            return result

        # Process the translation results
        if "translations" in result:
            translations = result["translations"]

            # Add tashkeel to conversation
            tashkeel_result = self.conversation_engine.add_tashkeel_to_conversation(
                sentences=sentences,
                translations=translations,
            )

            if "error" not in tashkeel_result and "tashkeel_results" in tashkeel_result:
                tashkeel_results = tashkeel_result["tashkeel_results"]

                # Add word translations to conversation
                word_result = (
                    self.conversation_engine.add_word_translations_to_conversation(
                        sentences=sentences,
                        tashkeel_results=tashkeel_results,
                        translations=translations,
                    )
                )

                if "error" not in word_result and "word_translations" in word_result:
                    word_translations = word_result["word_translations"]

                    # Perform final refinement
                    refinement_result = self.conversation_engine.refine_conversation(
                        {
                            "sentences": sentences,
                            "translations": translations,
                            "tashkeel_results": tashkeel_results,
                            "word_translations": word_translations,
                        }
                    )

                    if (
                        "error" not in refinement_result
                        and "refined_translations" in refinement_result
                    ):
                        refined_translations = refinement_result["refined_translations"]

                        # Final verification
                        verification_result = (
                            self.conversation_engine.final_verification(
                                final_translations=refined_translations,
                                original_sentences=sentences,
                            )
                        )

                        return {
                            "success": True,
                            "translations": refined_translations,
                            "tashkeel_results": tashkeel_results,
                            "word_translations": word_translations,
                            "conversation_summary": self.conversation_engine.get_conversation_summary(),
                        }

        return result

    def batch_translate_full_sentences_conversational(
        self,
        sentences: list[str],
        contexts: list[str | None],
    ) -> TranslationResults:
        """Translate sentences using conversation-based approach"""
        if not sentences:
            return []

        # Use conversation engine for translation
        result = self.conversation_engine.start_article_translation(
            sentences=sentences,
            contexts=contexts,
        )

        if "error" in result:
            logger.error(f"Conversation translation failed: {result['error']}")
            # Fallback to regular translation
            return self._fallback_translation(sentences, contexts)

        # Extract translations from conversation result
        if "translations" in result:
            translations = result["translations"]
            return [
                {
                    "sentence": sentence,
                    "translation": translation,
                    "context": context,
                }
                for sentence, translation, context in zip(
                    sentences, translations, contexts, strict=False
                )
            ]

        return self._fallback_translation(sentences, contexts)

    def batch_add_tashkeel_conversational(
        self,
        sentences: list[str],
        translation_results: TranslationResults,
        all_sentences: list[str] | None = None,
        indices: list[int] | None = None,
        context_cache: ContextCache | None = None,
    ) -> TashkeelResults:
        """Add tashkeel using conversation-based approach"""
        if not sentences or not translation_results:
            return []

        # Extract translations (handle both TypedDict and dict)
        translations = []
        for result in translation_results:
            if hasattr(result, "translation"):
                translations.append(result.translation)
            elif isinstance(result, dict) and "translation" in result:
                translations.append(result["translation"])
            else:
                translations.append("")

        # Use conversation engine for tashkeel
        result = self.conversation_engine.add_tashkeel_to_conversation(
            sentences=sentences,
            translations=translations,
            all_sentences=all_sentences,
            indices=indices,
        )

        if "error" in result:
            logger.error(f"Conversation tashkeel failed: {result['error']}")
            # Fallback to regular tashkeel
            return self._fallback_tashkeel(
                sentences, translation_results, all_sentences, indices, context_cache
            )

        # Extract tashkeel results from conversation result
        if "tashkeel_results" in result:
            tashkeel_results = result["tashkeel_results"]
            return [
                {
                    "sentence": sentence,
                    "tashkeel": tashkeel,
                    "translation": translation,
                }
                for sentence, tashkeel, translation in zip(
                    sentences, tashkeel_results, translations, strict=False
                )
            ]

        return self._fallback_tashkeel(
            sentences, translation_results, all_sentences, indices, context_cache
        )

    def batch_translate_words_conversational(
        self,
        sentences: list[str],
        tashkeel_results: TashkeelResults,
        translations: TranslationResults,
        all_sentences: list[str] | None = None,
        indices: list[int] | None = None,
        context_cache: ContextCache | None = None,
    ) -> WordTranslationResults:
        """Translate words using conversation-based approach"""
        if not sentences or not tashkeel_results or not translations:
            return []

        # Extract data (handle both TypedDict and dict)
        tashkeel_texts = []
        for result in tashkeel_results:
            if hasattr(result, "tashkeel"):
                tashkeel_texts.append(result.tashkeel)
            elif isinstance(result, dict) and "tashkeel" in result:
                tashkeel_texts.append(result["tashkeel"])
            else:
                tashkeel_texts.append("")

        translation_texts = []
        for result in translations:
            if hasattr(result, "translation"):
                translation_texts.append(result.translation)
            elif isinstance(result, dict) and "translation" in result:
                translation_texts.append(result["translation"])
            else:
                translation_texts.append("")

        # Use conversation engine for word translations
        result = self.conversation_engine.add_word_translations_to_conversation(
            sentences=sentences,
            tashkeel_results=tashkeel_texts,
            translations=translation_texts,
            all_sentences=all_sentences,
            indices=indices,
        )

        if "error" in result:
            logger.error(f"Conversation word translation failed: {result['error']}")
            # Fallback to regular word translation
            return self._fallback_word_translation(
                sentences,
                tashkeel_results,
                translations,
                all_sentences,
                indices,
                context_cache,
            )

        # Extract word translation results from conversation result
        if "word_translations" in result:
            word_translations = result["word_translations"]
            return [
                {
                    "sentence": sentence,
                    "word_translations": word_translation,
                    "tashkeel": tashkeel,
                    "translation": translation,
                }
                for sentence, word_translation, tashkeel, translation in zip(
                    sentences,
                    word_translations,
                    tashkeel_texts,
                    translation_texts,
                    strict=False,
                )
            ]

        return self._fallback_word_translation(
            sentences,
            tashkeel_results,
            translations,
            all_sentences,
            indices,
            context_cache,
        )

    def batch_refine_translations_conversational(
        self,
        refinement_input: RefinementInputs,
    ) -> RefinementResults:
        """Refine translations using conversation-based approach"""
        if not refinement_input:
            return []

        # Use conversation engine for refinement
        result = self.conversation_engine.refine_conversation(refinement_input)

        if "error" in result:
            logger.error(f"Conversation refinement failed: {result['error']}")
            # Fallback to regular refinement
            return self._fallback_refinement(refinement_input)

        # Extract refinement results from conversation result
        if "refined_translations" in result:
            refined_translations = result["refined_translations"]
            return [
                {
                    "sentence": input_item["sentence"]
                    if isinstance(input_item, dict)
                    else input_item.sentence,
                    "refined_translation": refined_translation,
                    "original_translation": input_item["translation"]
                    if isinstance(input_item, dict)
                    else input_item.translation,
                    "tashkeel": input_item["tashkeel"]
                    if isinstance(input_item, dict)
                    else input_item.tashkeel,
                    "word_translations": input_item["word_translations"]
                    if isinstance(input_item, dict)
                    else input_item.word_translations,
                }
                for input_item, refined_translation in zip(
                    refinement_input, refined_translations, strict=False
                )
            ]

        return self._fallback_refinement(refinement_input)

    def _fallback_translation(
        self,
        sentences: list[str],
        contexts: list[str | None],
    ) -> TranslationResults:
        """Fallback to regular translation when conversation fails"""
        from .translation_engine import batch_translate_full_sentences

        return batch_translate_full_sentences(sentences, contexts)

    def _fallback_tashkeel(
        self,
        sentences: list[str],
        translation_results: TranslationResults,
        all_sentences: list[str] | None = None,
        indices: list[int] | None = None,
        context_cache: ContextCache | None = None,
    ) -> TashkeelResults:
        """Fallback to regular tashkeel when conversation fails"""
        from .translation_engine import batch_add_tashkeel

        return batch_add_tashkeel(
            sentences, translation_results, all_sentences, indices, context_cache
        )

    def _fallback_word_translation(
        self,
        sentences: list[str],
        tashkeel_results: TashkeelResults,
        translations: TranslationResults,
        all_sentences: list[str] | None = None,
        indices: list[int] | None = None,
        context_cache: ContextCache | None = None,
    ) -> WordTranslationResults:
        """Fallback to regular word translation when conversation fails"""
        from .translation_engine import batch_translate_words

        return batch_translate_words(
            sentences,
            tashkeel_results,
            translations,
            all_sentences,
            indices,
            context_cache,
        )

    def _fallback_refinement(
        self,
        refinement_input: RefinementInputs,
    ) -> RefinementResults:
        """Fallback to regular refinement when conversation fails"""
        from .translation_engine import batch_refine_translations

        return batch_refine_translations(refinement_input)

    def get_conversation_summary(self) -> dict[str, Any]:
        """Get summary of the current conversation"""
        return self.conversation_engine.get_conversation_summary()

    def reset_conversation(self) -> None:
        """Reset the conversation state"""
        self.conversation_engine.reset_conversation()
        self.current_article_id = None
