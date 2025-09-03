"""Camel-tools service for Arabic morphological analysis and tashkeel generation."""

import logging

from camel_tools.morphology import database, reinflector

logger = logging.getLogger(__name__)


class CamelToolsService:
    """Service for Arabic morphological analysis using camel-tools."""

    def __init__(self) -> None:
        """Initialize the camel-tools service with default MSA database."""
        # Use the default Calima MSA database (calima-msa-r13) with reinflection support
        self.db = database.MorphologyDB.builtin_db(flags="r")
        self.reinflector = reinflector.Reinflector(self.db)

    def is_available(self) -> bool:
        """Check if camel-tools service is available."""
        return True

    def generate_tashkeel_suggestion(self, word: str, pos: str = "noun") -> str:
        """
        Generate tashkeel suggestion for a single Arabic word.

        Args:
            word: Arabic word without diacritics
            pos: Part of speech (noun, verb, adj, etc.)

        Returns:
            Word with suggested diacritics, or original word if generation fails
        """
        if not self.is_available():
            logger.warning("Camel-tools service not available")
            return word

        if not self._is_arabic_word(word):
            return word

        try:
            # Basic features for reinflection
            feats = {"pos": pos}

            # Try to reinflect the word
            results = self.reinflector.reinflect(word, feats)

            if results and len(results) > 0:
                # Get the first result with diacritics
                for result in results:
                    if "diac" in result and result["diac"]:
                        suggested_tashkeel = result["diac"]
                        # Tashkeel generated successfully
                        return suggested_tashkeel

                # If no diacritics found, try with different POS
                if pos != "verb":
                    return self.generate_tashkeel_suggestion(word, "verb")

            # No tashkeel suggestion found
            return word

        except Exception as e:
            # Suppress noisy warnings from reinflector (e.g. invalid feature values)
            # and fall back to returning the original word without diacritics.
            # Tashkeel generation skipped due to error
            return word

    def generate_tashkeel_suggestions_batch(self, words: list[str]) -> dict[str, str]:
        """
        Generate tashkeel suggestions for a batch of words.

        Args:
            words: List of Arabic words without diacritics

        Returns:
            Dictionary mapping original words to their tashkeel suggestions
        """
        if not self.is_available():
            logger.warning("Camel-tools service not available")
            return {word: word for word in words}

        suggestions = {}

        for word in words:
            if self._is_arabic_word(word):
                suggestion = self.generate_tashkeel_suggestion(word)
                suggestions[word] = suggestion
            else:
                suggestions[word] = word

        return suggestions

    def _is_arabic_word(self, word: str) -> bool:
        """Check if a word contains Arabic characters."""
        if not word or not word.strip():
            return False

        # Arabic Unicode ranges
        arabic_ranges = [
            (0x0600, 0x06FF),  # Arabic
            (0x0750, 0x077F),  # Arabic Supplement
            (0x08A0, 0x08FF),  # Arabic Extended-A
            (0xFB50, 0xFDFF),  # Arabic Presentation Forms-A
            (0xFE70, 0xFEFF),  # Arabic Presentation Forms-B
        ]

        for char in word:
            char_code = ord(char)
            is_arabic = any(start <= char_code <= end for start, end in arabic_ranges)
            if is_arabic:
                return True

        return False


# Global instance for reuse
_camel_tools_service: CamelToolsService | None = None


def get_camel_tools_service() -> CamelToolsService:
    """Get or create the global camel-tools service instance."""
    global _camel_tools_service
    if _camel_tools_service is None:
        _camel_tools_service = CamelToolsService()
    return _camel_tools_service


## Removed unused helper generate_tashkeel_suggestions (kept context-aware variant only)


def generate_tashkeel_suggestions_with_context(
    sentence: str,
    context: str | None = None,
    sentence_index: int | None = None,
) -> dict[str, str]:
    """
    Generate tashkeel suggestions for Arabic words in a sentence with context.

    Args:
        sentence: Arabic sentence without diacritics
        context: Context from surrounding sentences
        sentence_index: Index of the sentence in the document
        all_sentences: All sentences in the document for additional context

    Returns:
        Dictionary mapping original words to their tashkeel suggestions
    """
    service = get_camel_tools_service()

    if not service.is_available():
        logger.warning("Camel-tools not available, returning original sentence")
        return {}

    # Split sentence into words (simple space-based splitting)
    words = sentence.split()

    # Generate suggestions for Arabic words only
    suggestions = service.generate_tashkeel_suggestions_batch(words)

    # If context is available, enhance suggestions with contextual information
    if context and context.strip():
        # Enhancing tashkeel suggestions with context
        # Context can be used to improve suggestions, but camel-tools doesn't directly support it
        # The context will be provided to OpenAI for final refinement

    return suggestions


## Removed unused formatter format_tashkeel_suggestions


__all__ = [
    "CamelToolsService",
    "get_camel_tools_service",
    "generate_tashkeel_suggestions_with_context",
]
