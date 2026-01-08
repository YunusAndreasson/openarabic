"""Audio combining and mixing utilities."""

import io
import logging

logger = logging.getLogger(__name__)


def create_bilingual_audio(
    english_audio: bytes,
    arabic_audio: bytes,
    pause_duration_ms: int = 500,
) -> bytes:
    """
    Create bilingual audio by combining English and Arabic audio with a pause.

    Args:
        english_audio: English audio data
        arabic_audio: Arabic audio data
        pause_duration_ms: Pause duration in milliseconds

    Returns:
        Combined bilingual audio data
    """
    try:
        from pydub import AudioSegment

        # Load audio segments
        english_segment = AudioSegment.from_mp3(io.BytesIO(english_audio))
        arabic_segment = AudioSegment.from_mp3(io.BytesIO(arabic_audio))

        # Create pause segment
        pause_segment = AudioSegment.silent(duration=pause_duration_ms)

        # Combine: English + Pause + Arabic
        bilingual_audio = english_segment + pause_segment + arabic_segment

        # Export as MP3
        output = io.BytesIO()
        bilingual_audio.export(output, format="mp3")
        output.seek(0)

        return output.read()

    except ImportError:
        logger.error("pydub not available for audio concatenation")
        # Fallback: simple concatenation without pause
        return english_audio + arabic_audio
    except Exception as e:
        logger.error(f"Error creating bilingual audio: {e}")
        # Fallback: simple concatenation
        return english_audio + arabic_audio


def create_multi_audio_with_delays(
    audio_segments: list[bytes],
    delay_ms: int = 1000,  # 1 second delay
) -> bytes:
    """
    Create multi-segment audio with delays between each segment.

    Args:
        audio_segments: List of audio data segments
        delay_ms: Delay duration in milliseconds between segments

    Returns:
        Combined audio data with delays
    """
    try:
        from pydub import AudioSegment

        if not audio_segments:
            logger.error("No audio segments provided")
            return b""

        if len(audio_segments) == 1:
            return audio_segments[0]

        # Load all audio segments
        segments = []
        for i, audio_data in enumerate(audio_segments):
            if audio_data:
                try:
                    segment = AudioSegment.from_mp3(io.BytesIO(audio_data))
                    segments.append(segment)
                    # Segment loaded successfully
                except Exception as e:
                    logger.error(f"Failed to load segment {i + 1}: {e}")
                    # Skip this segment
                    continue
            else:
                logger.warning(f"Empty audio data for segment {i + 1}, skipping")

        if not segments:
            logger.error("No valid audio segments found")
            return b""

        # Create delay segment (500ms as per config)
        delay_segment = AudioSegment.silent(duration=delay_ms)

        # Combine all segments with delays between them
        combined = segments[0]
        for i in range(1, len(segments)):
            combined = combined + delay_segment + segments[i]

        # Export as MP3
        output = io.BytesIO()
        combined.export(output, format="mp3")
        output.seek(0)

        logger.info(
            f"Created multi-segment audio: {len(segments)} segments, {len(output.getvalue())} bytes"
        )
        return output.getvalue()

    except ImportError:
        logger.error("pydub not available for multi-segment audio creation")
        # Fallback: simple concatenation without delays
        return b"".join(audio_segments)
    except Exception as e:
        logger.error(f"Error creating multi-segment audio: {e}")
        # Fallback: simple concatenation
        return b"".join(audio_segments)


__all__ = ["create_bilingual_audio", "create_multi_audio_with_delays"]
