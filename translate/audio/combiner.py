"""Audio combining and mixing utilities."""

import io
import logging

from utils.exceptions import AudioGenerationError

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

        # Load audio segments, fading each out to remove end-of-segment clicks
        english_segment = AudioSegment.from_mp3(io.BytesIO(english_audio)).fade_out(60)
        arabic_segment = AudioSegment.from_mp3(io.BytesIO(arabic_audio)).fade_out(60)

        # Create pause matching the audio properties to avoid sample rate mismatch
        pause_segment = AudioSegment.silent(
            duration=pause_duration_ms,
            frame_rate=english_segment.frame_rate,
        ).set_channels(english_segment.channels).set_sample_width(english_segment.sample_width)

        # Combine: English + Pause + Arabic
        bilingual_audio = english_segment + pause_segment + arabic_segment
        bilingual_audio = bilingual_audio.fade_out(150)

        # Export as MP3 at 128kbps to match ElevenLabs output quality
        output = io.BytesIO()
        bilingual_audio.export(output, format="mp3", bitrate="128k")
        output.seek(0)

        return output.read()

    except ImportError as e:
        raise AudioGenerationError(
            "pydub required for audio combining - install with: pip install pydub"
        ) from e
    except Exception as e:
        logger.error(f"Error creating bilingual audio: {e}")
        raise AudioGenerationError(f"Audio combining failed: {e}") from e


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

        # Load all audio segments, fading each one out to remove end-of-segment clicks
        segments = []
        for i, audio_data in enumerate(audio_segments):
            if audio_data:
                try:
                    segment = AudioSegment.from_mp3(io.BytesIO(audio_data))
                    segment = segment.fade_out(60)
                    segments.append(segment)
                except Exception as e:
                    logger.error(f"Failed to load segment {i + 1}: {e}")
                    continue
            else:
                logger.warning(f"Empty audio data for segment {i + 1}, skipping")

        if not segments:
            logger.error("No valid audio segments found")
            return b""

        # Create delay matching the audio properties to avoid sample rate mismatch
        ref = segments[0]
        delay_segment = AudioSegment.silent(
            duration=delay_ms,
            frame_rate=ref.frame_rate,
        ).set_channels(ref.channels).set_sample_width(ref.sample_width)

        # Combine all segments with delays between them
        combined = segments[0]
        for i in range(1, len(segments)):
            combined = combined + delay_segment + segments[i]
        combined = combined.fade_out(150)

        # Export as MP3 at 128kbps to match ElevenLabs output quality
        output = io.BytesIO()
        combined.export(output, format="mp3", bitrate="128k")
        output.seek(0)

        logger.info(
            f"Created multi-segment audio: {len(segments)} segments, {len(output.getvalue())} bytes"
        )
        return output.getvalue()

    except ImportError as e:
        raise AudioGenerationError(
            "pydub required for audio combining - install with: pip install pydub"
        ) from e
    except Exception as e:
        logger.error(f"Error creating multi-segment audio: {e}")
        raise AudioGenerationError(f"Multi-segment audio creation failed: {e}") from e


__all__ = ["create_bilingual_audio", "create_multi_audio_with_delays"]
