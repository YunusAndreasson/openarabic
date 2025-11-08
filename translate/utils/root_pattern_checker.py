#!/usr/bin/env python3
"""
Rule-based pattern checker for identifying derived forms in roots.
This provides fast pre-filtering before expensive AI validation.
"""

import re
from typing import Literal


def check_root_pattern(arabic_word: str) -> tuple[Literal["definite_derived", "likely_derived", "uncertain", "likely_correct"], str]:
    """Check if an Arabic word is likely a derived form or a proper root.

    Args:
        arabic_word: Arabic word with tashkeel

    Returns:
        tuple: (classification, reason)
            - "definite_derived": Definitely a derived form (e.g., has ة)
            - "likely_derived": Probably derived (known patterns)
            - "uncertain": Needs AI review
            - "likely_correct": Probably a correct root form
    """
    # Remove tashkeel for pattern matching (keep structure)
    base_word = re.sub(r'[ًٌٍَُِّْ]', '', arabic_word)

    # DEFINITE DERIVED: Ends with ة (taa marbuta)
    if base_word.endswith('ة'):
        return ("definite_derived", f"Ends with ة (taa marbuta): {arabic_word}")

    # DEFINITE DERIVED: Starts with Form patterns
    # Form II-X verbal nouns: تَفْعِيلٌ, مُفَاعَلَةٌ, إِفْعَالٌ, etc.
    form_patterns = [
        (r'^ت.{2,3}ي[لن]', "Form II تَفْعِيلٌ pattern"),
        (r'^م.{2,3}[ةه]', "Form III مُفَاعَلَةٌ pattern"),
        (r'^إ.{2,3}[لن]', "Form IV إِفْعَالٌ pattern"),
        (r'^ت.{2,3}[لن]', "Form V تَفَعُّلٌ pattern"),
        (r'^م.{2,3}ة', "Derived noun with م prefix"),
    ]

    for pattern, desc in form_patterns:
        if re.search(pattern, base_word):
            return ("definite_derived", f"{desc}: {arabic_word}")

    # LIKELY DERIVED: Verbal noun patterns (فَعَالٌ, فُعُولٌ, فَعَالَةٌ)
    # These have long vowels in middle indicating noun pattern
    noun_patterns = [
        (r'^.َ.َا.', "فَعَالٌ pattern (verbal noun)"),
        (r'^.ُ.ُو.', "فُعُولٌ pattern (verbal noun)"),
        (r'^.َ.َا.', "فَعَال pattern (masdar)"),
        (r'^.َ.ْ.َا.', "فَعْلَاء pattern"),
    ]

    for pattern, desc in noun_patterns:
        if re.search(pattern, arabic_word):
            return ("likely_derived", f"{desc}: {arabic_word}")

    # LIKELY CORRECT: Simple trilateral verb patterns (فَعَلَ, فَعِلَ, فَعُلَ)
    # Past tense Form I verbs - the standard root form
    verb_patterns = [
        r'^.َ.َ.$',  # فَعَلَ
        r'^.َ.ِ.$',  # فَعِلَ
        r'^.َ.ُ.$',  # فَعُلَ
    ]

    for pattern in verb_patterns:
        if re.search(pattern, arabic_word):
            return ("likely_correct", f"Form I verb pattern: {arabic_word}")

    # LIKELY CORRECT: Simple nouns without obvious derived markers
    # Words like قَلْبٌ (heart), رَأْيٌ (opinion) - basic nominal roots
    if len(base_word) <= 4 and 'ا' not in base_word[1:] and 'و' not in base_word[1:]:
        return ("likely_correct", f"Simple noun pattern: {arabic_word}")

    # UNCERTAIN: Needs AI review
    return ("uncertain", f"Ambiguous pattern, needs AI review: {arabic_word}")


def batch_check_roots(roots_data: list[dict]) -> dict[str, list[dict]]:
    """Classify a batch of roots using pattern matching.

    Args:
        roots_data: List of root dictionaries with 'root_id', 'current_letters', 'current_meaning'

    Returns:
        dict: Categorized roots by classification
    """
    categorized = {
        "definite_derived": [],
        "likely_derived": [],
        "uncertain": [],
        "likely_correct": [],
    }

    for root in roots_data:
        classification, reason = check_root_pattern(root['current_letters'])
        root_info = {
            **root,
            "classification": classification,
            "reason": reason,
        }
        categorized[classification].append(root_info)

    return categorized


if __name__ == "__main__":
    # Test cases
    test_cases = [
        ("قَلَّ", "Form I verb - correct root"),
        ("قِلَّةٌ", "Derived with ة - should flag"),
        ("فَسَادٌ", "فَعَالٌ pattern - should flag"),
        ("تَوْفِيقٌ", "Form II verbal noun - should flag"),
        ("رَأْيٌ", "Simple noun - probably OK"),
        ("قَلْبٌ", "Simple noun - probably OK"),
        ("نَفْرَةٌ", "Has ة - should flag"),
        ("إِضَاعَةٌ", "Form IV + ة - should definitely flag"),
    ]

    print("Pattern Checker Test Results:\n")
    for word, expected in test_cases:
        classification, reason = check_root_pattern(word)
        print(f"{word:15} → {classification:20} | {reason}")
        print(f"   Expected: {expected}\n")
