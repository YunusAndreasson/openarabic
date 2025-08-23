import functools
import re


@functools.cache
def clean_arabic_text(text: str) -> str:
    """Clean Arabic text by removing all non-Arabic characters."""
    if not text:
        return text

    text = re.sub(r"<[^>]+>", "", text)

    arabic_pattern = r"[^\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF\u064B-\u065F\s]+"
    text = re.sub(arabic_pattern, "", text)

    text = re.sub(r"\s+", " ", text)

    return text.strip()


def preprocess_text_for_tts(text: str) -> str:
    """Preprocess text before sending to ElevenLabs TTS."""
    return clean_arabic_text(text)


def wrap_in_arabic_ssml(text: str) -> str:
    """
    Return plain Arabic text without SSML wrapping.
    ElevenLabs multilingual model handles Arabic text directly without SSML.
    """
    return text


@functools.cache
def clean_word_for_matching(word: str) -> str:
    """
    Clean and normalize a word for better matching.
    Removes invisible characters, normalizes whitespace, and standardizes Arabic characters.
    """
    if not word:
        return word

    invisible_chars = {
        "\u200b": "",
        "\u200c": "",
        "\u200d": "",
        "\ufeff": "",
        "\u2028": " ",
        "\u2029": " ",
    }
    for char, replacement in invisible_chars.items():
        word = word.replace(char, replacement)

    word = " ".join(word.split())
    word = word.strip()

    punctuation = ".,;:!?\"'()[]{}،؟''»«"
    for p in punctuation:
        word = word.replace(p, "")

    return word


def has_arabic_diacritics(text: str) -> bool:
    """
    Check if Arabic text contains basic diacritics (kesra, fetha, damma).
    This is used to validate that essential words have proper diacritics.

    Args:
        text: Arabic text to check

    Returns:
        True if text contains Arabic diacritics, False otherwise
    """
    if not text:
        return False

    # Basic Arabic diacritics: fetha (َ), damma (ُ), kesra (ِ)
    diacritics = {"\u064e", "\u064f", "\u0650"}  # اَ , ُ , ِ

    return any(char in diacritics for char in text)


def validate_essential_has_diacritics(
    arabic_word: str, essential_word: str
) -> tuple[bool, str]:
    """
    Validate that an essential word has appropriate diacritics.

    Args:
        arabic_word: Original Arabic word with full tashkeel
        essential_word: Essential form (should have basic diacritics)

    Returns:
        Tuple of (is_valid, reason)
    """
    if not essential_word:
        return False, "Essential word is empty"

    if not has_arabic_diacritics(essential_word):
        # Check if the original word had diacritics that should be preserved
        if has_arabic_diacritics(arabic_word):
            return (
                False,
                f"Essential word '{essential_word}' missing diacritics (original: '{arabic_word}')",
            )

    return True, "Valid essential word with diacritics"
