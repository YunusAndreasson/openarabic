#!/usr/bin/env python3

# Test the simplified filename-only approach
SUPABASE_URL = "https://kkmnzbeugdoajtzfjkxg.supabase.co"


def get_storage_url(filename: str, bucket: str = "audio") -> str:
    """Return filename - we reconstruct full URLs in the mobile app."""
    return filename


def reconstructAudioUrl(filename: str) -> str:
    """Reconstruct audio URL from filename."""
    return f"{SUPABASE_URL}/storage/v1/object/public/audio/{filename}"


def reconstructImageUrl(filename: str) -> str:
    """Reconstruct image URL from filename."""
    return f"{SUPABASE_URL}/storage/v1/object/public/images/{filename}"


# Test the workflow
print("=== Simplified Filename-Only Approach ===")

# 1. Translate app stores only filename
audio_filename = get_storage_url("test.mp3")
image_filename = get_storage_url("image.jpg")
print(f"Stored in database: audio='{audio_filename}', image='{image_filename}'")

# 2. Mobile app reconstructs URLs
audio_url = reconstructAudioUrl(audio_filename)
image_url = reconstructImageUrl(image_filename)
print(f"Reconstructed URLs:")
print(f"  Audio: {audio_url}")
print(f"  Image: {image_url}")

print("\n=== Benefits ===")
print("✅ Database stores only: 'test.mp3', 'image.jpg'")
print("✅ Mobile app knows bucket context from usage")
print("✅ No complex fallback logic needed")
print("✅ Maximum storage efficiency")
print("✅ Clean, simple code")
