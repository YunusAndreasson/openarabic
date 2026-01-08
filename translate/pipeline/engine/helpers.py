"""Helper functions for translation engine data processing."""

import logging
import unicodedata
from typing import Any

from data.enums import PartOfSpeech
from data.models import Uncertainty, WordTranslation

logger = logging.getLogger(__name__)


def _handle_arabic_processing_error(
    text: str, operation: str, error: Exception
) -> None:
    """Handle Arabic text processing errors with proper logging and context."""
    # Normalize text for logging
    normalized_text = unicodedata.normalize(
        "NFC", text[:50]
    )  # First 50 chars for context

    error_msg = f"Arabic {operation} failed for text: '{normalized_text}'"
    if len(text) > 50:
        error_msg += "..."

    # Log specific error details for Arabic text issues
    if "Unicode" in str(error) or "encoding" in str(error).lower():
        logger.error(f"{error_msg} - Unicode/encoding issue: {error}")
    elif "JSON" in str(error) or "parsing" in str(error).lower():
        logger.error(
            f"{error_msg} - JSON parsing failed (possible Arabic formatting issue): {error}"
        )


def _extract_response_data(response: dict[str, Any]) -> dict[str, Any] | None:
    """Extract data from Response API response with proper error handling."""
    if not response.get("success"):
        return None
    return response.get("data")


def _extract_tashkeel_data(response: dict[str, Any]) -> dict[str, Any] | None:
    """Extract tashkeel data from various response formats."""
    if isinstance(response, dict):
        # Response API format: response["data"]["tashkeel"]
        if "data" in response and "tashkeel" in response["data"]:
            return {
                "tashkeel": response["data"]["tashkeel"],
                "uncertainties": response["data"].get("uncertainties", []),
            }
        # Direct format: response["tashkeel"]
        elif "tashkeel" in response:
            return {
                "tashkeel": response["tashkeel"],
                "uncertainties": response.get("uncertainties", []),
            }
    return None


def _validate_word_data(word_data: dict[str, Any]) -> dict[str, Any]:
    """Validate and clean word data from API response."""
    if not isinstance(word_data, dict):
        return {}

    # Handle both 'english' (string) and 'english_options' (list) formats
    eng_opts = word_data.get("english_options", [])
    if not eng_opts:
        # Try 'english' field if 'english_options' is not present
        english_str = word_data.get("english", "")
        if english_str:
            eng_opts = [english_str] if isinstance(english_str, str) else []

    if not isinstance(eng_opts, list) or not all(isinstance(s, str) for s in eng_opts):
        eng_opts = []

    # Handle both 'essential_translation' (string) and 'essential_translation_options' (list) formats
    ess_opts = word_data.get("essential_translation_options", [])
    if not ess_opts:
        # Try 'essential_translation' field if 'essential_translation_options' is not present
        essential_str = word_data.get("essential_translation", "")
        if essential_str:
            ess_opts = [essential_str] if isinstance(essential_str, str) else []

    if not isinstance(ess_opts, list) or not all(isinstance(s, str) for s in ess_opts):
        ess_opts = []

    # Validate essential field
    if not word_data.get("essential"):
        raise ValueError(
            f"Missing 'essential' field for word '{word_data.get('arabic', '')}'. "
            f"The AI must provide a stripped root form without complex affixes/case endings. "
            f"Expected: root form (e.g., 'كَتَبَ' from 'يَكْتُبُ'), "
            f"Got: missing field"
        )

    if word_data.get("essential") == word_data.get("arabic"):
        # Check if this is a word type where identical fields are allowed
        pos = word_data.get("pos", "").lower()
        if pos in [
            "preposition",
            "particle",
            "conjunction",
            "pronoun",
            "demonstrative_pronoun",
            "relative_pronoun",
            "interjection",
            "numeral",
            "proper_noun",
        ]:
            # For these word types, identical fields are correct
            # - Pronouns (هُوَ, هِيَ) don't have root forms
            # - Interjections (مَرْحَباً) are already in base form
            # - Numerals (أَحَد, اِثْنَان) are already in base form
            # - Proper nouns (تَعَالَى, الله) are already in base form
            pass  # Allow this case
        elif pos in ["noun", "adjective"]:
            # For nouns/adjectives, check if they're already in root form
            # Words like "مُتَضَمَّنٌ" (contained) are already root forms
            pass  # Allow this case
        elif pos == "verb":
            # For verbs, identical fields might be correct (e.g., past tense like بَاعَ)
            # No warning needed - this is acceptable
            pass
        else:
            # For other parts of speech, allow identical fields without warning
            pass

    return {
        "arabic": word_data.get("arabic", ""),
        "english_options": eng_opts,
        "pos": word_data.get("pos") or "unknown",
        "essential": word_data.get("essential"),
        "essential_translation_options": ess_opts,
        "notes": word_data.get("notes"),
        "uncertainties": word_data.get("uncertainties", []),
    }


def _get_translation_data(obj: Any) -> tuple[str, list[Any]]:
    """Extract translation and uncertainties from TranslationResult object or dict."""
    if hasattr(obj, "translation"):
        return obj.translation, obj.uncertainties
    else:
        return obj.get("translation", ""), obj.get("uncertainties", [])


def _get_tashkeel_data(obj: Any) -> tuple[str, list[Any]]:
    """Extract tashkeel and uncertainties from TashkeelResult object or dict."""
    if hasattr(obj, "tashkeel"):
        return obj.tashkeel, obj.uncertainties
    else:
        return obj.get("tashkeel", ""), obj.get("uncertainties", [])


def _validate_uncertainties(uncertainties: list[Any]) -> list[Uncertainty]:
    """Validate and convert uncertainties to proper format."""
    validated = []
    for item in uncertainties:
        if isinstance(item, dict):
            # Handle various dictionary formats
            if "text" in item and "reason" in item:
                # Standard format
                validated.append(
                    Uncertainty(
                        text=item["text"],
                        reason=item["reason"],
                        word=item.get("word", "unknown"),
                        type=item.get("type", "unknown"),
                        step=item.get("step", "unknown"),
                        resolution=item.get("resolution", "unknown"),
                        explanation=item.get("explanation", "unknown"),
                        related_translation_uncertainty=item.get(
                            "related_translation_uncertainty", "unknown"
                        ),
                        original_uncertainty=item.get(
                            "original_uncertainty", "unknown"
                        ),
                        reason_unresolved=item.get("reason_unresolved", "unknown"),
                    )
                )
            elif "word" in item and "reason" in item:
                # Tashkeel uncertainty format
                validated.append(
                    Uncertainty(
                        text="unknown",
                        reason=item["reason"],
                        word=item["word"],
                        type=item.get("type", "unknown"),
                        step=item.get("step", "unknown"),
                        resolution=item.get("resolution", "unknown"),
                        explanation=item.get("explanation", "unknown"),
                        related_translation_uncertainty=item.get(
                            "related_translation_uncertainty", "unknown"
                        ),
                        original_uncertainty=item.get(
                            "original_uncertainty", "unknown"
                        ),
                        reason_unresolved=item.get("reason_unresolved", "unknown"),
                    )
                )
            elif "reason" in item:
                # Minimal format with just reason
                validated.append(
                    Uncertainty(
                        text=item.get("text", "unknown"),
                        reason=item["reason"],
                        word=item.get("word", "unknown"),
                        type=item.get("type", "unknown"),
                        step=item.get("step", "unknown"),
                        resolution=item.get("resolution", "unknown"),
                        explanation=item.get("explanation", "unknown"),
                        related_translation_uncertainty=item.get(
                            "related_translation_uncertainty", "unknown"
                        ),
                        original_uncertainty=item.get(
                            "original_uncertainty", "unknown"
                        ),
                        reason_unresolved=item.get("reason_unresolved", "unknown"),
                    )
                )
        elif isinstance(item, str):
            # Convert string to proper format
            validated.append(
                Uncertainty(
                    text="unknown",
                    reason=item,
                    word="unknown",
                    type="unknown",
                    step="unknown",
                    resolution="unknown",
                    explanation="unknown",
                    related_translation_uncertainty="unknown",
                    original_uncertainty="unknown",
                    reason_unresolved="unknown",
                )
            )
        elif isinstance(item, Uncertainty):
            validated.append(item)
        else:
            # Skip invalid uncertainty items silently
            continue
    return validated


def _sanitize_refinement_data(item: dict[str, Any]) -> dict[str, Any]:
    """Sanitize and validate refinement data before creating RefinementResult objects."""
    sanitized = {}

    # Sanitize basic fields
    sanitized["improved_tashkeel"] = (
        item.get("improved_tashkeel", "").strip()
        if item.get("improved_tashkeel")
        else ""
    )
    sanitized["improved_translation"] = (
        item.get("improved_translation", "").strip()
        if item.get("improved_translation")
        else ""
    )

    # Sanitize word translations
    word_translations = item.get("improved_word_translations", [])
    sanitized_word_translations = []

    if isinstance(word_translations, list):
        for wt_data in word_translations:
            try:
                if isinstance(wt_data, dict):
                    # Sanitize word translation data
                    sanitized_wt = _sanitize_word_translation_data(wt_data)
                    sanitized_word_translations.append(sanitized_wt)
                elif isinstance(wt_data, WordTranslation):
                    sanitized_word_translations.append(wt_data)
            except Exception as e:
                # Skip invalid word translations
                logger.warning(f"Skipping invalid word translation: {e}")
                continue

    sanitized["improved_word_translations"] = sanitized_word_translations

    # Sanitize uncertainties
    sanitized["resolved_uncertainties"] = _validate_uncertainties(
        item.get("resolved_uncertainties", [])
    )
    sanitized["remaining_uncertainties"] = _validate_uncertainties(
        item.get("remaining_uncertainties", [])
    )

    # Sanitize changes made
    changes_made = item.get("changes_made", [])
    if isinstance(changes_made, list):
        sanitized["changes_made"] = [
            str(change).strip() for change in changes_made if change
        ]
    else:
        sanitized["changes_made"] = []

    return sanitized


def _sanitize_word_translation_data(wt_data: dict[str, Any]) -> WordTranslation:
    """Sanitize individual word translation data."""
    # Sanitize basic fields
    arabic = wt_data.get("arabic", "").strip()
    english = wt_data.get("english", "")
    pos_value = wt_data.get("pos", "noun")
    essential = wt_data.get("essential", "").strip()
    essential_translation = wt_data.get("essential_translation", "")
    notes = wt_data.get("notes", "").strip() if wt_data.get("notes") else None

    # Ensure english and essential_translation are single strings (not lists)
    if isinstance(english, list):
        english = english[0] if english else ""
    if isinstance(essential_translation, list):
        essential_translation = (
            essential_translation[0] if essential_translation else ""
        )

    # Validate and sanitize essential field
    if not essential and arabic:
        # If essential is missing but arabic exists, try to create a basic essential form
        # This is a fallback for corrupted data
        essential = arabic.strip()

    # Ensure pos is valid
    try:
        pos = PartOfSpeech(pos_value)
    except ValueError:
        pos = PartOfSpeech.NOUN

    # Sanitize uncertainties
    uncertainties = _validate_uncertainties(wt_data.get("uncertainties", []))

    # Create WordTranslation object
    return WordTranslation(
        arabic=arabic,
        english=str(english).strip() if english else "",
        pos=pos,
        essential=essential,
        essential_translation=str(essential_translation).strip()
        if essential_translation
        else "",
        notes=notes,
        uncertainties=uncertainties,
    )


__all__ = [
    "_handle_arabic_processing_error",
    "_extract_response_data",
    "_extract_tashkeel_data",
    "_validate_word_data",
    "_get_translation_data",
    "_get_tashkeel_data",
    "_validate_uncertainties",
    "_sanitize_refinement_data",
    "_sanitize_word_translation_data",
]
