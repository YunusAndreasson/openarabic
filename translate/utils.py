"""Shared utility functions for translation modules."""


def remove_final_haraka(word: str) -> str:
    """
    Remove the last short vowel (haraka) or tanween
    from an Arabic word, if present.
    """
    # Set of diacritics we want to remove from the end
    final_diacritics = {"َ", "ُ", "ِ", "ْ", "ً", "ٌ", "ٍ"}

    # Convert to a list of characters for easy popping
    chars = list(word)

    # Remove diacritics while the last character is in our set
    while chars and chars[-1] in final_diacritics:
        chars.pop()

    # Reconstruct the word after stripping final diacritics
    return "".join(chars)
