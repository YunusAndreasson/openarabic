"""Tests for context cache utilities."""

from unittest.mock import patch

from translate.utils.context_cache import ContextCache


class TestContextCache:
    """Test context caching functionality."""

    def test_context_cache_initialization(self):
        """Test context cache initialization."""
        sentences = ["مرحبا", "بالعالم", "هذا نص تجريبي"]
        cache = ContextCache(sentences)

        assert cache.all_sentences == sentences
        assert cache._cache == {}

    def test_get_context_single_call(self):
        """Test getting context for a single sentence."""
        sentences = ["مرحبا", "بالعالم", "هذا نص تجريبي"]
        cache = ContextCache(sentences)

        with patch(
            "translate.utils.context_cache.get_optimized_context"
        ) as mock_get_context:
            mock_get_context.return_value = "Context for sentence 1"

            result = cache.get_context(1)

            assert result == "Context for sentence 1"
            mock_get_context.assert_called_once_with(sentences, 1, for_tashkeel=False)
            assert (1, False) in cache._cache

    def test_get_context_cached_result(self):
        """Test that cached results are returned without recalculation."""
        sentences = ["مرحبا", "بالعالم", "هذا نص تجريبي"]
        cache = ContextCache(sentences)

        with patch(
            "translate.utils.context_cache.get_optimized_context"
        ) as mock_get_context:
            mock_get_context.return_value = "Cached context"

            # First call
            result1 = cache.get_context(1)
            # Second call
            result2 = cache.get_context(1)

            assert result1 == result2 == "Cached context"
            # Should only be called once
            mock_get_context.assert_called_once()

    def test_get_context_for_tashkeel(self):
        """Test getting context for tashkeel processing."""
        sentences = ["مرحبا", "بالعالم", "هذا نص تجريبي"]
        cache = ContextCache(sentences)

        with patch(
            "translate.utils.context_cache.get_optimized_context"
        ) as mock_get_context:
            mock_get_context.return_value = "Tashkeel context"

            result = cache.get_context(1, for_tashkeel=True)

            assert result == "Tashkeel context"
            mock_get_context.assert_called_once_with(sentences, 1, for_tashkeel=True)
            assert (1, True) in cache._cache

    def test_get_context_different_keys(self):
        """Test that different keys are cached separately."""
        sentences = ["مرحبا", "بالعالم", "هذا نص تجريبي"]
        cache = ContextCache(sentences)

        with patch(
            "translate.utils.context_cache.get_optimized_context"
        ) as mock_get_context:
            mock_get_context.side_effect = [
                "Context 1",
                "Context 2",
                "Context 3",
                "Context 4",
            ]

            # Get contexts for different combinations
            cache.get_context(0, for_tashkeel=False)  # Key: (0, False)
            cache.get_context(0, for_tashkeel=True)  # Key: (0, True)
            cache.get_context(1, for_tashkeel=False)  # Key: (1, False)
            cache.get_context(1, for_tashkeel=True)  # Key: (1, True)

            assert len(cache._cache) == 4
            assert (0, False) in cache._cache
            assert (0, True) in cache._cache
            assert (1, False) in cache._cache
            assert (1, True) in cache._cache

    def test_get_context_none_result(self):
        """Test handling when get_optimized_context returns None."""
        sentences = ["مرحبا", "بالعالم", "هذا نص تجريبي"]
        cache = ContextCache(sentences)

        with patch(
            "translate.utils.context_cache.get_optimized_context"
        ) as mock_get_context:
            mock_get_context.return_value = None

            result = cache.get_context(1)

            assert result == ""
            assert (1, False) in cache._cache
            assert cache._cache[(1, False)] == ""

    def test_get_contexts_multiple_indices(self):
        """Test getting contexts for multiple indices."""
        sentences = ["مرحبا", "بالعالم", "هذا نص تجريبي"]
        cache = ContextCache(sentences)

        with patch(
            "translate.utils.context_cache.get_optimized_context"
        ) as mock_get_context:
            mock_get_context.side_effect = ["Context 0", "Context 2"]

            result = cache.get_contexts([0, 2])

            assert result == ["Context 0", "Context 2"]
            assert mock_get_context.call_count == 2
            mock_get_context.assert_any_call(sentences, 0, for_tashkeel=False)
            mock_get_context.assert_any_call(sentences, 2, for_tashkeel=False)

    def test_get_contexts_with_tashkeel(self):
        """Test getting contexts for multiple indices with tashkeel flag."""
        sentences = ["مرحبا", "بالعالم", "هذا نص تجريبي"]
        cache = ContextCache(sentences)

        with patch(
            "translate.utils.context_cache.get_optimized_context"
        ) as mock_get_context:
            mock_get_context.side_effect = ["Tashkeel Context 0", "Tashkeel Context 1"]

            result = cache.get_contexts([0, 1], for_tashkeel=True)

            assert result == ["Tashkeel Context 0", "Tashkeel Context 1"]
            assert mock_get_context.call_count == 2
            mock_get_context.assert_any_call(sentences, 0, for_tashkeel=True)
            mock_get_context.assert_any_call(sentences, 1, for_tashkeel=True)

    def test_get_contexts_empty_list(self):
        """Test getting contexts for empty list of indices."""
        sentences = ["مرحبا", "بالعالم", "هذا نص تجريبي"]
        cache = ContextCache(sentences)

        result = cache.get_contexts([])

        assert result == []

    def test_get_contexts_reuses_cache(self):
        """Test that get_contexts reuses cached results."""
        sentences = ["مرحبا", "بالعالم", "هذا نص تجريبي"]
        cache = ContextCache(sentences)

        with patch(
            "translate.utils.context_cache.get_optimized_context"
        ) as mock_get_context:
            mock_get_context.side_effect = ["Context 0", "Context 1"]

            # First call
            cache.get_contexts([0, 1])
            # Second call with same indices
            cache.get_contexts([0, 1])

            # Should only be called twice (once for each index)
            assert mock_get_context.call_count == 2

    def test_get_contexts_mixed_cached_and_uncached(self):
        """Test getting contexts with some cached and some uncached results."""
        sentences = ["مرحبا", "بالعالم", "هذا نص تجريبي"]
        cache = ContextCache(sentences)

        with patch(
            "translate.utils.context_cache.get_optimized_context"
        ) as mock_get_context:
            mock_get_context.side_effect = ["Context 0", "Context 1", "Context 2"]

            # Get contexts for indices 0, 1, 2
            result = cache.get_contexts([0, 1, 2])

            assert result == ["Context 0", "Context 1", "Context 2"]
            # Should be called three times (once for each index)
            assert mock_get_context.call_count == 3
