"""Context caching utility to avoid recalculating contexts multiple times."""

from translate.utils.text_utils import get_optimized_context


class ContextCache:
    """Cache for optimized contexts to avoid recalculation."""

    def __init__(self, all_sentences: list[str]):
        self.all_sentences = all_sentences
        self._cache: dict[tuple[int, bool], str] = {}

    def get_context(self, idx: int, for_tashkeel: bool = False) -> str:
        """Get cached context for a sentence index."""
        key = (idx, for_tashkeel)
        if key not in self._cache:
            context = get_optimized_context(
                self.all_sentences, idx, for_tashkeel=for_tashkeel
            )
            if context is None:
                context = ""
            self._cache[key] = context
        return self._cache[key]

    def get_contexts(self, indices: list[int], for_tashkeel: bool = False) -> list[str]:
        """Get cached contexts for multiple sentence indices."""
        return [self.get_context(idx, for_tashkeel) for idx in indices]
