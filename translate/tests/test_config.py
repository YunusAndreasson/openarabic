"""Tests for configuration and data models."""

import pytest

from data.config import (
    DEFAULT_INPUT_FILE,
    DEFAULT_OUTPUT_FILE,
    MODEL_TRANSLATION,
    MODEL_VERIFICATION,
)
from data.enums import DifficultyLevel, PartOfSpeech, UncertaintyType
from data.models import (
    SentenceTranslation,
    TextMetadata,
    Uncertainty,
    WordTranslation,
)


class TestConfig:
    """Test configuration constants."""

    def test_default_files(self):
        """Test that default file paths are strings."""
        assert isinstance(DEFAULT_INPUT_FILE, str)
        assert isinstance(DEFAULT_OUTPUT_FILE, str)
        assert DEFAULT_INPUT_FILE.endswith(".txt")
        assert DEFAULT_OUTPUT_FILE.endswith(".json")

    def test_model_names(self):
        """Test that model names are valid."""
        assert isinstance(MODEL_TRANSLATION, str)
        assert isinstance(MODEL_VERIFICATION, str)
        assert len(MODEL_TRANSLATION) > 0
        assert len(MODEL_VERIFICATION) > 0


class TestModels:
    """Test data models."""

    def test_text_metadata_creation(self):
        """Test TextMetadata model creation."""
        metadata = TextMetadata(
            title="Test Article",
            summary="A test article for translation",
            difficulty_level=DifficultyLevel.ELEMENTARY.value,  # intermediate level
            total_units=5,
        )
        assert metadata.title == "Test Article"
        assert metadata.summary == "A test article for translation"
        assert metadata.difficulty_level == DifficultyLevel.ELEMENTARY.value
        assert metadata.total_units == 5

    def test_sentence_translation_creation(self):
        """Test SentenceTranslation model creation."""
        translation = SentenceTranslation(
            index=0,
            original="مرحبا بالعالم",
            full_translation="Hello world",
            tashkeel="مَرْحَبًا بِالْعَالَمِ",
            notes="Simple greeting sentence",
            word_by_word=[
                WordTranslation(
                    arabic="مرحبا",
                    english="hello",
                    pos="interjection",
                    essential="مرحب",
                    essential_translation="hello",
                    notes="Greeting word",
                    uncertainties=[],
                )
            ],
            verification_status="pending",
            verification_issues=[],
        )
        assert translation.original == "مرحبا بالعالم"
        assert translation.full_translation == "Hello world"
        assert len(translation.word_by_word) == 1
        assert translation.index == 0

    def test_word_translation_options(self):
        """Test WordTranslation model creation with options."""
        options = WordTranslation(
            arabic="مرحبا",
            english=["hello", "hi"],  # Fixed: max 2 items allowed
            essential="مرحب",
            essential_translation=["hello", "hi"],  # Fixed: max 2 items allowed
            pos=PartOfSpeech.INTERJECTION.value,
            notes="Common greeting",
            uncertainties=[],
        )
        assert options.arabic == "مرحبا"
        assert len(options.english) == 2  # Fixed: expect 2 items
        assert options.pos == PartOfSpeech.INTERJECTION.value


class TestUncertaintyTypeNormalization:
    """Test Uncertainty type field normalization."""

    def test_grammar_aliases(self):
        """Test grammar type aliases."""
        for alias in ["grammar", "grammatical", "GRAMMAR"]:
            u = Uncertainty(
                text="test",
                word="test",
                type=alias,
                reason="test",
                step="test",
                resolution="test",
                explanation="test",
                related_translation_uncertainty="test",
                original_uncertainty="test",
                reason_unresolved="test",
            )
            assert u.type == UncertaintyType.GRAMMAR.value

    def test_vocabulary_aliases(self):
        """Test vocabulary type aliases."""
        for alias in ["vocabulary", "vocab"]:
            u = Uncertainty(
                text="test",
                word="test",
                type=alias,
                reason="test",
                step="test",
                resolution="test",
                explanation="test",
                related_translation_uncertainty="test",
                original_uncertainty="test",
                reason_unresolved="test",
            )
            assert u.type == UncertaintyType.VOCABULARY.value

    def test_context_aliases(self):
        """Test context type aliases."""
        for alias in ["context", "contextual"]:
            u = Uncertainty(
                text="test",
                word="test",
                type=alias,
                reason="test",
                step="test",
                resolution="test",
                explanation="test",
                related_translation_uncertainty="test",
                original_uncertainty="test",
                reason_unresolved="test",
            )
            assert u.type == UncertaintyType.CONTEXT.value

    def test_tashkeel_aliases(self):
        """Test tashkeel type aliases."""
        for alias in ["tashkeel", "diacritic", "diacritical"]:
            u = Uncertainty(
                text="test",
                word="test",
                type=alias,
                reason="test",
                step="test",
                resolution="test",
                explanation="test",
                related_translation_uncertainty="test",
                original_uncertainty="test",
                reason_unresolved="test",
            )
            assert u.type == UncertaintyType.TASHKEEL.value

    def test_cultural_aliases(self):
        """Test cultural type aliases."""
        for alias in ["cultural", "culture"]:
            u = Uncertainty(
                text="test",
                word="test",
                type=alias,
                reason="test",
                step="test",
                resolution="test",
                explanation="test",
                related_translation_uncertainty="test",
                original_uncertainty="test",
                reason_unresolved="test",
            )
            assert u.type == UncertaintyType.CULTURAL.value

    def test_technical_aliases(self):
        """Test technical type aliases."""
        for alias in ["technical", "tech"]:
            u = Uncertainty(
                text="test",
                word="test",
                type=alias,
                reason="test",
                step="test",
                resolution="test",
                explanation="test",
                related_translation_uncertainty="test",
                original_uncertainty="test",
                reason_unresolved="test",
            )
            assert u.type == UncertaintyType.TECHNICAL.value

    def test_ambiguity_aliases(self):
        """Test ambiguity type aliases."""
        for alias in ["ambiguity", "ambiguous"]:
            u = Uncertainty(
                text="test",
                word="test",
                type=alias,
                reason="test",
                step="test",
                resolution="test",
                explanation="test",
                related_translation_uncertainty="test",
                original_uncertainty="test",
                reason_unresolved="test",
            )
            assert u.type == UncertaintyType.AMBIGUITY.value

    def test_unknown_type_defaults_to_translation(self, caplog):
        """Test unknown type defaults to translation."""
        import logging

        with caplog.at_level(logging.WARNING):
            u = Uncertainty(
                text="test",
                word="test",
                type="unknown_type_xyz",
                reason="test",
                step="test",
                resolution="test",
                explanation="test",
                related_translation_uncertainty="test",
                original_uncertainty="test",
                reason_unresolved="test",
            )
        assert u.type == UncertaintyType.TRANSLATION.value
        assert "Unknown uncertainty type" in caplog.text


class TestPartOfSpeechNormalization:
    """Test WordTranslation POS field normalization."""

    def test_noun_aliases(self):
        """Test noun POS aliases."""
        for alias in ["noun", "n", "NOUN"]:
            wt = WordTranslation(
                arabic="كتاب",
                english="book",
                pos=alias,
                essential="كتب",
                essential_translation="book",
            )
            assert wt.pos == PartOfSpeech.NOUN.value

    def test_verb_aliases(self):
        """Test verb POS aliases."""
        for alias in ["verb", "v"]:
            wt = WordTranslation(
                arabic="كتب",
                english="wrote",
                pos=alias,
                essential="كتب",
                essential_translation="write",
            )
            assert wt.pos == PartOfSpeech.VERB.value

    def test_adjective_aliases(self):
        """Test adjective POS aliases."""
        for alias in ["adjective", "adj", "adj."]:
            wt = WordTranslation(
                arabic="جميل",
                english="beautiful",
                pos=alias,
                essential="جمل",
                essential_translation="beauty",
            )
            assert wt.pos == PartOfSpeech.ADJECTIVE.value

    def test_adverb_aliases(self):
        """Test adverb POS aliases."""
        for alias in ["adverb", "adv", "adv."]:
            wt = WordTranslation(
                arabic="سريعا",
                english="quickly",
                pos=alias,
                essential="سرع",
                essential_translation="quick",
            )
            assert wt.pos == PartOfSpeech.ADVERB.value

    def test_pronoun_aliases(self):
        """Test pronoun POS aliases."""
        for alias in ["pronoun", "pron", "pro"]:
            wt = WordTranslation(
                arabic="هو",
                english="he",
                pos=alias,
                essential="هو",
                essential_translation="he",
            )
            assert wt.pos == PartOfSpeech.PRONOUN.value

    def test_preposition_aliases(self):
        """Test preposition POS aliases."""
        for alias in ["preposition", "prep", "pre"]:
            wt = WordTranslation(
                arabic="في",
                english="in",
                pos=alias,
                essential="في",
                essential_translation="in",
            )
            assert wt.pos == PartOfSpeech.PREPOSITION.value

    def test_conjunction_aliases(self):
        """Test conjunction POS aliases."""
        for alias in ["conjunction", "conj", "con"]:
            wt = WordTranslation(
                arabic="و",
                english="and",
                pos=alias,
                essential="و",
                essential_translation="and",
            )
            assert wt.pos == PartOfSpeech.CONJUNCTION.value

    def test_interjection_aliases(self):
        """Test interjection POS aliases."""
        for alias in ["interjection", "interj", "int"]:
            wt = WordTranslation(
                arabic="آه",
                english="ah",
                pos=alias,
                essential="آه",
                essential_translation="ah",
            )
            assert wt.pos == PartOfSpeech.INTERJECTION.value

    def test_particle_aliases(self):
        """Test particle POS aliases."""
        for alias in ["particle", "part", "pt"]:
            wt = WordTranslation(
                arabic="قد",
                english="indeed",
                pos=alias,
                essential="قد",
                essential_translation="indeed",
            )
            assert wt.pos == PartOfSpeech.PARTICLE.value

    def test_numeral_aliases(self):
        """Test numeral POS aliases."""
        for alias in ["numeral", "num", "number"]:
            wt = WordTranslation(
                arabic="واحد",
                english="one",
                pos=alias,
                essential="واحد",
                essential_translation="one",
            )
            assert wt.pos == PartOfSpeech.NUMERAL.value

    def test_proper_noun_aliases(self):
        """Test proper noun POS aliases."""
        for alias in ["proper_noun", "proper noun", "propernoun"]:
            wt = WordTranslation(
                arabic="محمد",
                english="Muhammad",
                pos=alias,
                essential="محمد",
                essential_translation="Muhammad",
            )
            assert wt.pos == PartOfSpeech.PROPER_NOUN.value

    def test_demonstrative_pronoun_aliases(self):
        """Test demonstrative pronoun POS aliases."""
        for alias in ["demonstrative_pronoun", "demonstrative pronoun"]:
            wt = WordTranslation(
                arabic="هذا",
                english="this",
                pos=alias,
                essential="هذا",
                essential_translation="this",
            )
            assert wt.pos == PartOfSpeech.DEMONSTRATIVE_PRONOUN.value

    def test_relative_pronoun_aliases(self):
        """Test relative pronoun POS aliases."""
        for alias in ["relative_pronoun", "relative pronoun"]:
            wt = WordTranslation(
                arabic="الذي",
                english="which",
                pos=alias,
                essential="الذي",
                essential_translation="which",
            )
            assert wt.pos == PartOfSpeech.RELATIVE_PRONOUN.value

    def test_unknown_pos_defaults_to_noun(self, caplog):
        """Test unknown POS defaults to noun."""
        import logging

        with caplog.at_level(logging.WARNING):
            wt = WordTranslation(
                arabic="كلمة",
                english="word",
                pos="unknown_pos_xyz",
                essential="كلم",
                essential_translation="word",
            )
        assert wt.pos == PartOfSpeech.NOUN.value
        assert "Unknown part of speech" in caplog.text


class TestWordTranslationValidators:
    """Test WordTranslation field validators."""

    def test_empty_arabic_raises(self):
        """Test empty arabic raises validation error."""
        from pydantic import ValidationError

        with pytest.raises(ValidationError, match="arabic must be a non-empty string"):
            WordTranslation(
                arabic="",
                english="book",
                pos="noun",
                essential="كتب",
                essential_translation="book",
            )

    def test_arabic_whitespace_stripped(self):
        """Test arabic whitespace is stripped."""
        wt = WordTranslation(
            arabic="  كتاب  ",
            english="book",
            pos="noun",
            essential="كتب",
            essential_translation="book",
        )
        assert wt.arabic == "كتاب"

    def test_english_list_truncated_to_two(self):
        """Test english list with 3+ items is truncated to first 2."""
        wt = WordTranslation(
            arabic="كتاب",
            english=["book", "tome", "volume"],  # 3 items - truncated to 2
            pos="noun",
            essential="كتب",
            essential_translation="book",
        )
        assert wt.english == ["book", "tome"]

    def test_english_list_empty_raises(self):
        """Test empty english list raises."""
        from pydantic import ValidationError

        with pytest.raises(ValidationError, match="cannot be empty"):
            WordTranslation(
                arabic="كتاب",
                english=[],
                pos="noun",
                essential="كتب",
                essential_translation="book",
            )

    def test_english_list_strips_whitespace(self):
        """Test english list items are stripped."""
        wt = WordTranslation(
            arabic="كتاب",
            english=["  book  ", "  tome  "],
            pos="noun",
            essential="كتب",
            essential_translation=["book", "tome"],
        )
        assert wt.english == ["book", "tome"]

    def test_essential_whitespace_raises(self):
        """Test essential with whitespace raises."""
        from pydantic import ValidationError

        with pytest.raises(ValidationError, match="pattern"):
            WordTranslation(
                arabic="كتاب",
                english="book",
                pos="noun",
                essential="كتب كتاب",  # Has whitespace
                essential_translation="book",
            )

    def test_essential_translation_list_truncated_to_two(self):
        """Test essential_translation list with 3+ items is truncated to first 2."""
        wt = WordTranslation(
            arabic="كتاب",
            english="book",
            pos="noun",
            essential="كتب",
            essential_translation=["book", "tome", "volume"],
        )
        assert wt.essential_translation == ["book", "tome"]

    def test_notes_empty_string_becomes_none(self):
        """Test empty notes string becomes None."""
        wt = WordTranslation(
            arabic="كتاب",
            english="book",
            pos="noun",
            essential="كتب",
            essential_translation="book",
            notes="   ",  # Whitespace only
        )
        assert wt.notes is None

    def test_notes_stripped(self):
        """Test notes are stripped."""
        wt = WordTranslation(
            arabic="كتاب",
            english="book",
            pos="noun",
            essential="كتب",
            essential_translation="book",
            notes="  Some notes  ",
        )
        assert wt.notes == "Some notes"


class TestUncertaintyProperties:
    """Test Uncertainty model properties."""

    def test_is_resolved_true(self):
        """Test is_resolved when resolved."""
        u = Uncertainty(
            text="test",
            word="test",
            type="translation",
            reason="test",
            step="translation",
            resolution="resolved",
            explanation="test",
            related_translation_uncertainty="test",
            original_uncertainty="test",
            reason_unresolved="test",
        )
        assert u.is_resolved is True

    def test_is_resolved_false(self):
        """Test is_resolved when not resolved."""
        u = Uncertainty(
            text="test",
            word="test",
            type="translation",
            reason="test",
            step="",
            resolution="",
            explanation="test",
            related_translation_uncertainty="test",
            original_uncertainty="test",
            reason_unresolved="test",
        )
        assert u.is_resolved is False

    def test_is_tashkeel_uncertainty(self):
        """Test is_tashkeel_uncertainty property."""
        u = Uncertainty(
            text="",
            word="مرحبا",
            type="tashkeel",
            reason="test",
            step="test",
            resolution="test",
            explanation="test",
            related_translation_uncertainty="test",
            original_uncertainty="test",
            reason_unresolved="test",
        )
        assert u.is_tashkeel_uncertainty is True

    def test_is_word_uncertainty(self):
        """Test is_word_uncertainty property."""
        u = Uncertainty(
            text="some text",
            word="",
            type="translation",
            reason="test",
            step="test",
            resolution="test",
            explanation="test",
            related_translation_uncertainty="test",
            original_uncertainty="test",
            reason_unresolved="test",
        )
        assert u.is_word_uncertainty is True


class TestWordTranslationProperties:
    """Test WordTranslation model properties."""

    def test_is_final_with_strings(self):
        """Test is_final with string values."""
        wt = WordTranslation(
            arabic="كتاب",
            english="book",
            pos="noun",
            essential="كتب",
            essential_translation="book",
        )
        assert wt.is_final is True
        assert wt.has_options is False

    def test_has_options_with_lists(self):
        """Test has_options with list values."""
        wt = WordTranslation(
            arabic="كتاب",
            english=["book", "tome"],
            pos="noun",
            essential="كتب",
            essential_translation=["book", "tome"],
        )
        assert wt.is_final is False
        assert wt.has_options is True
