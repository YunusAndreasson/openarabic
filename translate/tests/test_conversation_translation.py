"""
Tests for conversation-based translation engine.

This module tests the conversation-aware translation functionality
using the Response API.
"""

import os
import sys
from unittest.mock import Mock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline.conversation_translation_engine import ConversationAwareTranslationEngine


class TestConversationAwareTranslationEngine:
    """Test the conversation-aware translation engine."""

    def setup_method(self):
        """Set up test fixtures."""
        self.engine = ConversationAwareTranslationEngine()
        self.test_sentences = ["مرحبا بالعالم", "كيف حالك؟"]
        self.test_contexts = ["Greeting context", "Question context"]

    def test_translate_article_conversational_success(self):
        """Test successful article translation using conversation."""
        # Mock the conversation engine directly on the instance
        with patch.object(self.engine, "conversation_engine") as mock_engine:
            # Mock successful responses for each step
            mock_engine.start_article_translation.return_value = {
                "success": True,
                "translations": ["Hello world", "How are you?"],
                "tashkeel_results": ["مَرْحَباً بِالْعَالَمِ", "كَيْفَ حَالُكَ؟"],
                "word_translations": [
                    {"مرحبا": "hello", "بالعالم": "world"},
                    {"كيف": "how", "حالك": "are you"},
                ],
                "conversation_summary": {
                    "total_steps": 5,
                    "current_response_id": "test_id",
                },
            }
            mock_engine.add_tashkeel_to_conversation.return_value = {
                "tashkeel_results": ["مَرْحَباً بِالْعَالَمِ", "كَيْفَ حَالُكَ؟"]
            }
            mock_engine.add_word_translations_to_conversation.return_value = {
                "word_translations": [
                    {"مرحبا": "hello", "بالعالم": "world"},
                    {"كيف": "how", "حالك": "are you"},
                ]
            }
            mock_engine.refine_conversation.return_value = {
                "refined_translations": ["Hello world", "How are you?"]
            }
            mock_engine.get_conversation_summary.return_value = {
                "total_steps": 5,
                "current_response_id": "test_id",
            }

            # Test the method
            result = self.engine.translate_article_conversational(
                sentences=self.test_sentences,
                contexts=self.test_contexts,
                article_title="Test Article",
            )

            # Verify the result
            assert result["success"] is True
            assert result["translations"] == ["Hello world", "How are you?"]
            assert result["tashkeel_results"] == ["مَرْحَباً بِالْعَالَمِ", "كَيْفَ حَالُكَ؟"]
            assert result["word_translations"] == [
                {"مرحبا": "hello", "بالعالم": "world"},
                {"كيف": "how", "حالك": "are you"},
            ]

    @patch("pipeline.conversation_translation_engine.ResponseAPIManager")
    @patch("pipeline.conversation_translation_engine.ConversationTranslationEngine")
    def test_translate_article_conversational_failure(
        self, mock_conversation_engine, mock_response_api
    ):
        """Test article translation failure handling."""
        # Mock Response API manager
        mock_api = Mock()
        mock_response_api.return_value = mock_api

        # Mock conversation engine failure
        mock_engine = Mock()
        mock_conversation_engine.return_value = mock_engine
        mock_engine.start_article_translation.return_value = {
            "error": "Empty response from API"
        }

        # Test the method
        result = self.engine.translate_article_conversational(
            sentences=self.test_sentences, contexts=self.test_contexts
        )

        # Verify error handling
        assert "error" in result
        assert result["error"] == "Empty response from API"

    @patch("pipeline.conversation_translation_engine.ResponseAPIManager")
    @patch("pipeline.conversation_translation_engine.ConversationTranslationEngine")
    @patch("pipeline.translation_engine.batch_translate_full_sentences")
    def test_batch_translate_full_sentences_conversational(
        self, mock_batch_translate, mock_conversation_engine, mock_response_api
    ):
        """Test conversation-based sentence translation."""
        # Mock Response API manager
        mock_api = Mock()
        mock_response_api.return_value = mock_api

        # Mock conversation engine failure (which triggers fallback)
        mock_engine = Mock()
        mock_conversation_engine.return_value = mock_engine
        mock_engine.start_article_translation.return_value = {
            "error": "Empty response from API"
        }

        # Mock fallback translation
        mock_batch_translate.return_value = [
            {
                "sentence": "مرحبا بالعالم",
                "translation": "Hello world",
                "context": "Greeting context",
            },
            {
                "sentence": "كيف حالك؟",
                "translation": "How are you?",
                "context": "Question context",
            },
        ]

        # Test the method
        result = self.engine.batch_translate_full_sentences_conversational(
            sentences=self.test_sentences, contexts=self.test_contexts
        )

        # Verify the result
        assert len(result) == 2
        # Check that result contains dictionaries with the expected structure
        assert isinstance(result[0], dict)
        assert result[0]["sentence"] == "مرحبا بالعالم"
        assert result[0]["translation"] == "Hello world"
        assert result[0]["context"] == "Greeting context"

    @patch("pipeline.conversation_translation_engine.ResponseAPIManager")
    @patch("pipeline.conversation_translation_engine.ConversationTranslationEngine")
    @patch("pipeline.translation_engine.batch_add_tashkeel")
    def test_batch_add_tashkeel_conversational(
        self, mock_batch_tashkeel, mock_conversation_engine, mock_response_api
    ):
        """Test conversation-based tashkeel addition."""
        # Mock Response API manager
        mock_api = Mock()
        mock_response_api.return_value = mock_api

        # Mock conversation engine failure (which triggers fallback)
        mock_engine = Mock()
        mock_conversation_engine.return_value = mock_engine
        mock_engine.add_tashkeel_to_conversation.return_value = {
            "error": "No active conversation to continue"
        }

        # Mock fallback tashkeel
        mock_batch_tashkeel.return_value = [
            {
                "sentence": "مرحبا بالعالم",
                "tashkeel": "مَرْحَباً بِالْعَالَمِ",
                "translation": "Hello world",
            },
            {
                "sentence": "كيف حالك؟",
                "tashkeel": "كَيْفَ حَالُكَ؟",
                "translation": "How are you?",
            },
        ]

        # Create test translation results as dictionaries
        translation_results = [
            {
                "sentence": "مرحبا بالعالم",
                "translation": "Hello world",
                "context": "Greeting context",
            },
            {
                "sentence": "كيف حالك؟",
                "translation": "How are you?",
                "context": "Question context",
            },
        ]

        # Test the method
        result = self.engine.batch_add_tashkeel_conversational(
            sentences=self.test_sentences, translation_results=translation_results
        )

        # Verify the result
        assert len(result) == 2
        # Check that result contains dictionaries with the expected structure
        assert isinstance(result[0], dict)
        assert result[0]["sentence"] == "مرحبا بالعالم"
        assert result[0]["tashkeel"] == "مَرْحَباً بِالْعَالَمِ"
        assert result[0]["translation"] == "Hello world"

    @patch("pipeline.conversation_translation_engine.ResponseAPIManager")
    @patch("pipeline.conversation_translation_engine.ConversationTranslationEngine")
    @patch("pipeline.translation_engine.batch_translate_words")
    def test_batch_translate_words_conversational(
        self, mock_batch_words, mock_conversation_engine, mock_response_api
    ):
        """Test conversation-based word translation."""
        # Mock Response API manager
        mock_api = Mock()
        mock_response_api.return_value = mock_api

        # Mock conversation engine failure (which triggers fallback)
        mock_engine = Mock()
        mock_conversation_engine.return_value = mock_engine
        mock_engine.add_word_translations_to_conversation.return_value = {
            "error": "No active conversation to continue"
        }

        # Mock fallback word translation
        mock_batch_words.return_value = [
            {
                "sentence": "مرحبا بالعالم",
                "word_translations": [{"مرحبا": "hello", "بالعالم": "world"}],
                "tashkeel": "مَرْحَباً بِالْعَالَمِ",
                "translation": "Hello world",
            },
            {
                "sentence": "كيف حالك؟",
                "word_translations": [{"كيف": "how", "حالك": "are you"}],
                "tashkeel": "كَيْفَ حَالُكَ؟",
                "translation": "How are you?",
            },
        ]

        # Create test data as dictionaries
        tashkeel_results = [
            {
                "sentence": "مرحبا بالعالم",
                "tashkeel": "مَرْحَباً بِالْعَالَمِ",
                "translation": "Hello world",
            },
            {
                "sentence": "كيف حالك؟",
                "tashkeel": "كَيْفَ حَالُكَ؟",
                "translation": "How are you?",
            },
        ]
        translation_results = [
            {
                "sentence": "مرحبا بالعالم",
                "translation": "Hello world",
                "context": "Greeting context",
            },
            {
                "sentence": "كيف حالك؟",
                "translation": "How are you?",
                "context": "Question context",
            },
        ]

        # Test the method
        result = self.engine.batch_translate_words_conversational(
            sentences=self.test_sentences,
            tashkeel_results=tashkeel_results,
            translations=translation_results,
        )

        # Verify the result
        assert len(result) == 2
        # Check that result contains dictionaries with the expected structure
        assert isinstance(result[0], dict)
        assert result[0]["sentence"] == "مرحبا بالعالم"
        assert result[0]["word_translations"] == [
            {"مرحبا": "hello", "بالعالم": "world"}
        ]

    @patch("pipeline.conversation_translation_engine.ResponseAPIManager")
    @patch("pipeline.conversation_translation_engine.ConversationTranslationEngine")
    @patch("pipeline.translation_engine.batch_refine_translations")
    def test_batch_refine_translations_conversational(
        self, mock_batch_refine, mock_conversation_engine, mock_response_api
    ):
        """Test conversation-based translation refinement."""
        # Mock Response API manager
        mock_api = Mock()
        mock_response_api.return_value = mock_api

        # Mock conversation engine failure (which triggers fallback)
        mock_engine = Mock()
        mock_conversation_engine.return_value = mock_engine
        mock_engine.refine_conversation.return_value = {
            "error": "No active conversation to continue"
        }

        # Mock fallback refinement
        mock_batch_refine.return_value = [
            {
                "sentence": "مرحبا بالعالم",
                "refined_translation": "Hello world",
                "original_translation": "Hello world",
                "tashkeel": "مَرْحَباً بِالْعَالَمِ",
                "word_translations": [{"مرحبا": "hello", "بالعالم": "world"}],
            },
            {
                "sentence": "كيف حالك؟",
                "refined_translation": "How are you?",
                "original_translation": "How are you?",
                "tashkeel": "كَيْفَ حَالُكَ؟",
                "word_translations": [{"كيف": "how", "حالك": "are you"}],
            },
        ]

        # Create test refinement input as dictionaries
        refinement_input = [
            {
                "sentence": "مرحبا بالعالم",
                "translation": "Hello world",
                "tashkeel": "مَرْحَباً بِالْعَالَمِ",
                "word_translations": {"مرحبا": "hello", "بالعالم": "world"},
            },
            {
                "sentence": "كيف حالك؟",
                "translation": "How are you?",
                "tashkeel": "كَيْفَ حَالُكَ؟",
                "word_translations": {"كيف": "how", "حالك": "are you"},
            },
        ]

        # Test the method
        result = self.engine.batch_refine_translations_conversational(refinement_input)

        # Verify the result
        assert len(result) == 2
        # Check that result contains dictionaries with the expected structure
        assert isinstance(result[0], dict)
        assert result[0]["sentence"] == "مرحبا بالعالم"
        assert result[0]["refined_translation"] == "Hello world"

    def test_fallback_translation(self):
        """Test fallback to regular translation when conversation fails."""
        # Test with empty sentences
        result = self.engine._fallback_translation([], [])
        assert result == []

    def test_get_conversation_summary(self):
        """Test getting conversation summary."""
        # Mock conversation engine
        with patch.object(
            self.engine.conversation_engine, "get_conversation_summary"
        ) as mock_summary:
            mock_summary.return_value = {
                "total_steps": 3,
                "current_response_id": "test_id",
            }

            result = self.engine.get_conversation_summary()
            assert result["total_steps"] == 3
            assert result["current_response_id"] == "test_id"

    def test_reset_conversation(self):
        """Test resetting conversation state."""
        # Mock conversation engine
        with patch.object(
            self.engine.conversation_engine, "reset_conversation"
        ) as mock_reset:
            self.engine.reset_conversation()
            mock_reset.assert_called_once()
            assert self.engine.current_article_id is None
