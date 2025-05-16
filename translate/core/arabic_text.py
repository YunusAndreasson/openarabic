import re
from typing import List


def clean_arabic_text(text: str) -> str:
    """Clean Arabic text by removing all non-Arabic characters."""
    if not text:
        return text

    # First remove any SSML tags if present
    text = re.sub(r"<[^>]+>", "", text)

    arabic_pattern = r"[^\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF\u064B-\u065F\s]+"
    text = re.sub(arabic_pattern, "", text)

    # Remove any double spaces that might have been created
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def preprocess_text_for_tts(text: str) -> str:
    """Preprocess text before sending to ElevenLabs TTS."""
    return clean_arabic_text(text)


def wrap_in_arabic_ssml(text: str) -> str:
    """
    Wrap text in Arabic SSML tags for proper language handling.
    This ensures the text is properly pronounced as Arabic.
    """
    return f'<speak><lang xml:lang="ar">{text}</lang></speak>'


def pre_tokenize_arabic(text: str) -> List[str]:
    """
    Pre-tokenize Arabic text in a consistent way that matches how ElevenLabs processes it.
    This ensures that word boundaries are handled similarly in both systems.

    Args:
        text: The Arabic text to tokenize

    Returns:
        List of tokens (words)
    """
    tokens = []

    # Split on whitespace and punctuation but keep them as separate tokens
    segments = re.split(r'([.,;:!?"\'()[\]{}،؟»«\s]+)', text)

    # Process each segment
    for segment in segments:
        # Skip empty segments
        if not segment.strip():
            continue

        # If it's punctuation or whitespace, add it as is (or skip)
        if all(c in " .,;:!?\"'()[]{}،؟»«" for c in segment):
            continue

        # Handle common Arabic prefixes that should stay attached
        # This matches ElevenLabs' tendency to keep و, ب, ل, etc. attached to words
        if segment.startswith("و") and len(segment) > 1:
            # Keep و attached to the following word
            tokens.append(segment)
        else:
            # Check if other prefixes should be handled
            tokens.append(segment)

    return tokens


def clean_word_for_matching(word: str) -> str:
    """
    Clean and normalize a word for better timing matching.
    Removes invisible characters, normalizes whitespace, and standardizes Arabic characters.
    """
    if not word:
        return word

    # Remove zero-width and invisible control characters
    invisible_chars = {
        "\u200b": "",  # zero-width space
        "\u200c": "",  # zero-width non-joiner
        "\u200d": "",  # zero-width joiner
        "\ufeff": "",  # zero-width no-break space (BOM)
        "\u2028": " ",  # line separator
        "\u2029": " ",  # paragraph separator
    }
    for char, replacement in invisible_chars.items():
        word = word.replace(char, replacement)

    # Standardize whitespace
    word = " ".join(word.split())

    # Trim any leading/trailing whitespace
    word = word.strip()

    # Remove common punctuation for matching purposes
    punctuation = ".,;:!?\"'()[]{}،؟''»«"
    for p in punctuation:
        word = word.replace(p, "")

    return word


def format_article_text_for_tts(translations: List[dict]) -> str:
    """
    Format article text for better listening experience.
    Uses the tashkeel (fully vowelized) version of the text for better pronunciation.
    Returns the formatted text without SSML tags - those should be added just before TTS.
    """
    sections = []

    total_sections = len(translations)

    for i, translation in enumerate(translations):
        # Use tashkeel text if available, fallback to original if not
        arabic_text = translation.get("tashkeel", translation["original"]).strip()

        # Add pause markers for sentence endings (will be converted to SSML later)
        arabic_text = arabic_text.replace(".", ".{pause:0.3}")
        arabic_text = arabic_text.replace("؟", "؟{pause:0.3}")
        arabic_text = arabic_text.replace("!", "!{pause:0.3}")
        # Add shorter pause for commas
        arabic_text = arabic_text.replace("،", "،{pause:0.2}")

        # Last section: mark for softer and slower speech
        if i == total_sections - 1:
            sections.append(f"{{prosody:soft}}{arabic_text}{{/prosody}}")
        # All other sections: normal
        else:
            sections.append(arabic_text)

        # Add pause between sections
        if i < total_sections - 1:
            # Longer pause if the next section starts with a new paragraph indicator
            next_text = translations[i + 1].get(
                "tashkeel", translations[i + 1]["original"]
            )
            if next_text.strip().startswith("*"):  # Assuming * marks new paragraphs
                sections.append("{pause:0.8}")
            else:
                sections.append("{pause:0.5}")

    return "".join(sections)
