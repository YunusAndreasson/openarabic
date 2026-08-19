"""Tests for Arabic text utilities."""

from utils.arabic_text import (
    clean_arabic_text,
    clean_word_for_matching,
    preprocess_text_for_tts,
    wrap_in_arabic_ssml,
)


class TestCleanArabicText:
    """Test Arabic text cleaning functionality."""

    def test_clean_arabic_text_basic(self):
        """Test basic Arabic text cleaning."""
        text = "مرحبا بالعالم! Hello world 123"
        result = clean_arabic_text(text)
        assert result == "مرحبا بالعالم"
        assert "Hello" not in result
        assert "world" not in result
        assert "123" not in result
        assert "!" not in result

    def test_clean_arabic_text_with_html(self):
        """Test cleaning text with HTML tags."""
        text = "<p>مرحبا <strong>بالعالم</strong></p>"
        result = clean_arabic_text(text)
        assert result == "مرحبا بالعالم"
        assert "<p>" not in result
        assert "<strong>" not in result
        assert "</strong>" not in result
        assert "</p>" not in result

    def test_clean_arabic_text_with_diacritics(self):
        """Test cleaning text with Arabic diacritics."""
        text = "مَرْحَباً بِالْعَالَمِ"
        result = clean_arabic_text(text)
        assert result == "مَرْحَباً بِالْعَالَمِ"
        # Diacritics should be preserved

    def test_clean_arabic_text_empty(self):
        """Test cleaning empty text."""
        assert clean_arabic_text("") == ""
        assert clean_arabic_text(None) is None

    def test_clean_arabic_text_whitespace(self):
        """Test cleaning text with excessive whitespace."""
        text = "  مرحبا   بالعالم  "
        result = clean_arabic_text(text)
        assert result == "مرحبا بالعالم"

    def test_clean_arabic_text_mixed_script(self):
        """Test cleaning text with mixed Arabic and other scripts."""
        text = "مرحبا بالعالم - Hello World - مرحبا"
        result = clean_arabic_text(text)
        assert result == "مرحبا بالعالم مرحبا"
        assert "-" not in result


class TestPreprocessTextForTTS:
    """Test text preprocessing for TTS."""

    def test_preprocess_text_for_tts(self):
        """Test text preprocessing for TTS preserves visible content."""
        text = "مرحبا بالعالم! Hello world"
        result = preprocess_text_for_tts(text)
        # Function preserves all visible content (Arabic, English, punctuation)
        assert result == "[slowly] مرحبا بالعالم! Hello world"


class TestWrapInArabicSSML:
    """Test SSML wrapping functionality."""

    def test_wrap_in_arabic_ssml(self):
        """Test wrapping text in Arabic SSML tags."""
        text = "مرحبا بالعالم"
        result = wrap_in_arabic_ssml(text)
        expected = "مرحبا بالعالم"  # Now returns plain text
        assert result == expected

    def test_wrap_in_arabic_ssml_empty(self):
        """Test wrapping empty text in SSML."""
        result = wrap_in_arabic_ssml("")
        expected = ""  # Now returns plain text
        assert result == expected


class TestCleanWordForMatching:
    """Test word cleaning for matching."""

    def test_clean_word_for_matching_basic(self):
        """Test basic word cleaning for matching."""
        word = "مرحبا،"
        result = clean_word_for_matching(word)
        assert result == "مرحبا"
        assert "،" not in result

    def test_clean_word_for_matching_invisible_chars(self):
        """Test cleaning invisible characters."""
        word = "مرحبا\u200b\u200c\u200d"
        result = clean_word_for_matching(word)
        assert result == "مرحبا"
        assert "\u200b" not in result
        assert "\u200c" not in result
        assert "\u200d" not in result

    def test_clean_word_for_matching_whitespace(self):
        """Test cleaning excessive whitespace."""
        word = "  مرحبا  بالعالم  "
        result = clean_word_for_matching(word)
        assert result == "مرحبا بالعالم"

    def test_clean_word_for_matching_punctuation(self):
        """Test cleaning punctuation."""
        word = "مرحبا، بالعالم؟"
        result = clean_word_for_matching(word)
        assert result == "مرحبا بالعالم"
        assert "،" not in result
        assert "؟" not in result

    def test_clean_word_for_matching_empty(self):
        """Test cleaning empty word."""
        assert clean_word_for_matching("") == ""
        assert clean_word_for_matching(None) is None

    def test_clean_word_for_matching_line_breaks(self):
        """Test cleaning line break characters."""
        word = "مرحبا\u2028بالعالم\u2029"
        result = clean_word_for_matching(word)
        assert result == "مرحبا بالعالم"
        assert "\u2028" not in result
        assert "\u2029" not in result

    def test_clean_word_for_matching_arabic_punctuation(self):
        """Test cleaning Arabic punctuation."""
        word = "مرحبا''»«"
        result = clean_word_for_matching(word)
        assert result == "مرحبا"
        assert "''" not in result
        assert "»" not in result
        assert "«" not in result
