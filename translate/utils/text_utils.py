import re

CONTEXT_WINDOW_SIZE: int = 2


def get_sentence_context(sentences: list[str], index: int) -> str:
    """Get context from surrounding sentences for better translation quality"""
    context_parts: list[str] = []

    start_idx = max(0, index - CONTEXT_WINDOW_SIZE)
    if start_idx < index:
        preceding = sentences[start_idx:index]
        if preceding:
            if len(preceding) == 1:
                context_parts.append(f"Preceding sentence: {preceding[0]}")
            else:
                context_parts.append(
                    f"Preceding {len(preceding)} sentences: {' '.join(preceding)}",
                )

    end_idx = min(len(sentences), index + CONTEXT_WINDOW_SIZE + 1)
    if index + 1 < end_idx:
        following = sentences[index + 1 : end_idx]
        if following:
            if len(following) == 1:
                context_parts.append(f"Following sentence: {following[0]}")
            else:
                context_parts.append(
                    f"Following {len(following)} sentences: {' '.join(following)}",
                )

    if not context_parts:
        return "No surrounding context available."

    return " ".join(context_parts)


def get_optimized_context(
    sentences: list[str],
    index: int,
    for_tashkeel: bool = False,
) -> str | None:
    """Get optimized context based on task type with token efficiency in mind"""
    if index < 0 or index >= len(sentences):
        return None

    if for_tashkeel:
        context_parts: list[str] = []

        if index > 0:
            prev_sent = sentences[index - 1]
            ending_words = " ".join(prev_sent.split()[-3:]) if prev_sent else ""
            if ending_words:
                context_parts.append(f"Preceding ending: {ending_words}")

        if index < len(sentences) - 1:
            next_sent = sentences[index + 1]
            starting_words = " ".join(next_sent.split()[:3]) if next_sent else ""
            if starting_words:
                context_parts.append(f"Following beginning: {starting_words}")

        return " ".join(context_parts) if context_parts else None
    else:
        return get_sentence_context(sentences, index)


def is_arabic_word(word: str) -> bool:
    """
    Check if a word contains Arabic characters.
    Returns True if the word contains at least one Arabic character.
    """
    return bool(re.search(r"[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]", word))


def filter_arabic_words(text: str) -> list[str]:
    """
    Split text into words and return only those containing Arabic characters.
    Preserves the exact Arabic words while filtering out punctuation and non-Arabic text.
    """
    words = text.split()
    return [word for word in words if is_arabic_word(word)]
