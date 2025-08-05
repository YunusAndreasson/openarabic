"""Tests for configuration and data models."""

from data.config import (
    DEFAULT_BATCH_SIZE,
    DEFAULT_INPUT_FILE,
    DEFAULT_OUTPUT_FILE,
    MODEL_TRANSLATION,
    MODEL_VERIFICATION,
)
from data.enums import DifficultyLevel, PartOfSpeech
from data.models import (
    SentenceTranslation,
    TextMetadata,
    WordTranslation,
)


class TestConfig:
    """Test configuration constants."""

    def test_default_batch_size(self):
        """Test that default batch size is reasonable."""
        assert 1 <= DEFAULT_BATCH_SIZE <= 15
        assert isinstance(DEFAULT_BATCH_SIZE, int)

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
                )
            ],
        )
        assert translation.original == "مرحبا بالعالم"
        assert translation.full_translation == "Hello world"
        assert len(translation.word_by_word) == 1
        assert translation.index == 0

    def test_word_translation_options(self):
        """Test WordTranslation model creation with options."""
        options = WordTranslation(
            arabic="مرحبا",
            english=["hello", "hi", "greetings"],
            essential="مرحب",
            essential_translation=["hello", "hi"],
            pos=PartOfSpeech.INTERJECTION.value,
            notes="Common greeting",
        )
        assert options.arabic == "مرحبا"
        assert len(options.english) == 3
        assert options.pos == PartOfSpeech.INTERJECTION.value
