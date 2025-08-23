#!/usr/bin/env python3

# Test the URL construction logic
SUPABASE_URL = "https://kkmnzbeugdoajtzfjkxg.supabase.co"


def get_storage_url(filename: str, bucket: str = "audio") -> str:
    """Generate consistent storage paths (without base URL)."""
    return f"storage/v1/object/public/{bucket}/{filename}"


def get_full_url(url: str) -> str:
    """Convert storage path to full URL."""
    # If URL already has protocol, return as-is
    if url.startswith("http://") or url.startswith("https://"):
        return url
    # Otherwise, prepend Supabase URL
    return f"{SUPABASE_URL}/{url}"


# Test cases
print("=== Testing URL Construction Logic ===")

# Test 1: New format (path only)
path_only = get_storage_url("test.mp3")
print(f"Path only: {path_only}")
full_url = get_full_url(path_only)
print(f"Full URL: {full_url}")
print()

# Test 2: New format with different bucket
path_docs = get_storage_url("document.pdf", "documents")
print(f"Path only (docs): {path_docs}")
full_url_docs = get_full_url(path_docs)
print(f"Full URL (docs): {full_url_docs}")
print()

# Test 3: Already full URL (backward compatibility)
existing_url = (
    "https://kkmnzbeugdoajtzfjkxg.supabase.co/storage/v1/object/public/audio/old.mp3"
)
print(f"Existing full URL: {existing_url}")
unchanged_url = get_full_url(existing_url)
print(f"Unchanged URL: {unchanged_url}")
print()

print("=== Expected Results ===")
print("Path only should become: storage/v1/object/public/audio/test.mp3")
print(
    "Full URL should become: https://kkmnzbeugdoajtzfjkxg.supabase.co/storage/v1/object/public/audio/test.mp3"
)
print("Existing URLs should remain unchanged")
