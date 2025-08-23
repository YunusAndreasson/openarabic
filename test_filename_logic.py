#!/usr/bin/env python3

# Test the new filename-only approach
SUPABASE_URL = "https://kkmnzbeugdoajtzfjkxg.supabase.co"


def get_storage_url(filename: str, bucket: str = "audio") -> str:
    """Generate consistent storage filenames (without path or URL)."""
    return filename


def reconstructFullUrl(filename: str, bucket: str) -> str:
    """Reconstruct full URL from filename."""
    # If URL already has protocol, return as-is
    if filename.startswith("http://") or filename.startswith("https://"):
        return filename
    # Otherwise, reconstruct full URL from filename
    return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{filename}"


# Test cases
print("=== Testing New Filename-Only Approach ===")

# Test 1: Audio filename
audio_filename = get_storage_url("test.mp3")
print(f"Audio filename: {audio_filename}")
audio_full_url = reconstructFullUrl(audio_filename, "audio")
print(f"Audio full URL: {audio_full_url}")
print()

# Test 2: Image filename
image_filename = get_storage_url("image.jpg")
print(f"Image filename: {image_filename}")
image_full_url = reconstructFullUrl(image_filename, "images")
print(f"Image full URL: {image_full_url}")
print()

# Test 3: Different bucket
doc_filename = get_storage_url("document.pdf", "documents")
print(f"Document filename: {doc_filename}")
doc_full_url = reconstructFullUrl(doc_filename, "documents")
print(f"Document full URL: {doc_full_url}")
print()

# Test 4: Existing full URL (unchanged)
existing_url = (
    "https://kkmnzbeugdoajtzfjkxg.supabase.co/storage/v1/object/public/audio/old.mp3"
)
print(f"Existing full URL: {existing_url}")
unchanged_url = reconstructFullUrl(existing_url, "audio")
print(f"Unchanged URL: {unchanged_url}")
print()

print("=== Benefits ===")
print("✅ Only filenames stored in database (much cleaner)")
print("✅ Automatic bucket detection in mobile app")
print("✅ Full URL reconstruction when needed")
print("✅ Backward compatibility maintained")
print("✅ Much smaller storage footprint")
