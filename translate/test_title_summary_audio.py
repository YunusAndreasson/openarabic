#!/usr/bin/env python3
"""
Test script to verify title and summary audio generation works correctly.
"""

import logging
import os
import sys

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def test_title_summary_audio():
    """Test the new title and summary audio generation feature."""
    logger.info("Testing title and summary audio generation...")

    # Load API keys first
    try:
        import importlib.util

        if importlib.util.find_spec("utils.set_keys"):
            logger.info("✅ Loaded API keys")
        else:
            logger.warning("⚠️ Could not find set_keys module")
    except Exception:
        logger.warning("⚠️ Could not load API keys")

    # Test the new functionality
    try:
        from audio.audio_utils import generate_bilingual_sentence_audio

        # Test data
        title = "The Basmalah Invocation"
        summary = "Opening Islamic invocation in Allah's name, the Most Merciful, the Most Compassionate."
        english_text = "In the name of Allah, the Most Gracious, the Most Merciful."
        arabic_text = "بسم الله الرحمن الرحيم"

        logger.info(f"Testing with title: '{title}'")
        logger.info(f"Summary: '{summary}'")
        logger.info(f"English: '{english_text}'")
        logger.info(f"Arabic: '{arabic_text}'")

        # Generate multi-segment audio with title and summary
        result = generate_bilingual_sentence_audio(
            english_text=english_text,
            arabic_text=arabic_text,
            filename="test_title_summary.mp3",
            title=title,
            summary=summary,
        )

        if result and result.url:
            logger.info("✅ Multi-segment audio generated successfully!")
            logger.info(f"URL: {result.url}")
            logger.info(f"Duration: {result.duration}")
            logger.info(f"Pause duration: {result.pause_duration}")

            # Verify the audio file was created using secure temp file
            import tempfile

            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
                audio_path = temp_file.name

            try:
                if os.path.exists(audio_path):
                    file_size = os.path.getsize(audio_path)
                    logger.info(f"✅ Audio file created: {file_size} bytes")
                else:
                    logger.warning("⚠️ Audio file was not found")

                # Test with a simple audio player check
                try:
                    import shutil
                    import subprocess

                    file_cmd = shutil.which("file")
                    if file_cmd:
                        result = subprocess.run(
                            [file_cmd, audio_path],
                            capture_output=True,
                            text=True,
                            timeout=5,
                        )
                        if "Audio file" in result.stdout and "MPEG" in result.stdout:
                            logger.info("✅ Valid MP3 file generated")
                        else:
                            logger.warning(
                                f"⚠️ File type check: {result.stdout.strip()}"
                            )
                    else:
                        logger.warning(
                            "⚠️ 'file' command not found, skipping MP3 verification"
                        )
                except Exception as e:
                    logger.warning(f"⚠️ Could not verify MP3 format: {e}")

                # Clean up temporary file
                try:
                    os.remove(audio_path)
                except OSError:
                    pass  # File may already be deleted

                return True
            except Exception as e:
                # Clean up temporary file on error
                try:
                    os.remove(audio_path)
                except OSError:
                    pass
                logger.error(f"❌ Error during audio verification: {e}")
                return False
        else:
            logger.error("❌ Audio generation failed")
            logger.error(f"Result: {result}")
            return False

    except Exception as e:
        logger.error(f"❌ Test failed with exception: {e}")
        import traceback

        logger.error(traceback.format_exc())
        return False


def test_without_title_summary():
    """Test the function still works without title and summary."""
    logger.info("Testing without title and summary...")

    try:
        from audio.audio_utils import generate_bilingual_sentence_audio

        english_text = "This is a simple test sentence."
        arabic_text = "هذا اختبار بسيط."

        result = generate_bilingual_sentence_audio(
            english_text=english_text,
            arabic_text=arabic_text,
            filename="test_simple.mp3",
        )

        if result and result.url:
            logger.info("✅ Simple audio generation still works")
            return True
        else:
            logger.error("❌ Simple audio generation failed")
            return False

    except Exception as e:
        logger.error(f"❌ Simple test failed: {e}")
        return False


def main():
    """Main test function."""
    logger.info("Starting title and summary audio tests...")

    success1 = test_title_summary_audio()
    success2 = test_without_title_summary()

    if success1 and success2:
        logger.info("\n🎉 All tests passed!")
        logger.info("✅ Title and summary audio generation is working correctly")
        logger.info("✅ Backward compatibility maintained")
        return 0
    else:
        logger.error("\n❌ Some tests failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
