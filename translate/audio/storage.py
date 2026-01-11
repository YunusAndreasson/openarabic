"""Audio storage utilities for managing audio files."""

import uuid


def generate_audio_filename() -> str:
    """Generate a unique filename for audio files."""
    return f"{uuid.uuid4()}.mp3"
