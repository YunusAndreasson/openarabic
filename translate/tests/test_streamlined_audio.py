"""Test the streamlined audio concatenation functionality."""

from unittest.mock import Mock, patch

from audio.audio_utils import create_article_audio


class TestStreamlinedAudio:
    """Test the streamlined article audio creation."""

    @patch("audio.audio_utils.generate_speech")
    @patch("audio.audio_utils.create_multi_audio_with_delays")
    @patch("audio.audio_utils.get_supabase_client")
    @patch("audio.audio_utils.check_file_exists")
    @patch("audio.audio_utils.get_storage_url")
    def test_create_article_audio_success(
        self,
        mock_get_storage_url,
        mock_check_file_exists,
        mock_get_supabase_client,
        mock_create_multi_audio,
        mock_generate_speech,
    ):
        """Test successful article audio creation."""
        # Mock setup
        mock_client = Mock()
        mock_storage = Mock()
        mock_client.storage.from_.return_value = mock_storage
        mock_get_supabase_client.return_value = mock_client
        mock_check_file_exists.return_value = False
        mock_get_storage_url.side_effect = [
            "https://example.com/arabic.mp3",
            "https://example.com/bilingual.mp3",
        ]

        # Mock audio generation responses
        mock_generate_speech.return_value = {
            "audio": b"fake_audio_data",
            "duration": 1.5,
        }

        # Mock concatenation
        mock_create_multi_audio.return_value = b"combined_audio_data"

        # Test data
        sentences = [
            {
                "arabic_text": "بسم الله الرحمن الرحيم",
                "english_text": "In the name of Allah, the Most Gracious, the Most Merciful",
                "tashkeel": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
            },
            {
                "arabic_text": "الحمد لله رب العالمين",
                "english_text": "All praise is due to Allah, Lord of the worlds",
                "tashkeel": "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
            },
        ]

        article_title = "Test Article"
        article_summary = "A test article for audio generation"

        # Execute function
        result = create_article_audio(
            sentences=sentences,
            article_title=article_title,
            article_summary=article_summary,
        )

        # Verify result
        assert result is not None
        assert result["arabic_url"] == "https://example.com/arabic.mp3"
        assert result["bilingual_url"] == "https://example.com/bilingual.mp3"

        # Verify audio generation calls
        assert (
            mock_generate_speech.call_count == 6
        )  # title + summary + 2 sentences * 2 languages

        # Verify concatenation calls
        assert (
            mock_create_multi_audio.call_count == 2
        )  # once for Arabic, once for bilingual

        # Verify storage uploads
        assert mock_storage.upload.call_count == 2

    def test_create_article_audio_no_sentences(self):
        """Test handling of empty sentence list."""
        result = create_article_audio(sentences=[])
        assert result is None

    @patch("audio.audio_utils.generate_speech")
    def test_create_article_audio_generation_failure(self, mock_generate_speech):
        """Test handling of audio generation failure."""
        mock_generate_speech.return_value = None

        sentences = [
            {
                "arabic_text": "بسم الله",
                "english_text": "In the name of Allah",
                "tashkeel": "بِسْمِ اللَّهِ",
            }
        ]

        result = create_article_audio(sentences=sentences)
        assert result is None

    def test_create_article_audio_missing_text(self):
        """Test handling of sentences with missing text."""
        sentences = [
            {
                "arabic_text": "",  # Missing Arabic text
                "english_text": "In the name of Allah",
                "tashkeel": "بِسْمِ اللَّهِ",
            }
        ]

        result = create_article_audio(sentences=sentences)
        assert result is None
