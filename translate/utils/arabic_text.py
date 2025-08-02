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
    Clean and normalize a word for better timing matching.
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
