#!/usr/bin/env python3
"""
SocialPilot CSV Generator for Arabic Word Images

Generates a CSV file compatible with SocialPilot's bulk upload feature.
Uploads images to Supabase public bucket and validates local images.

Requirements:
    pip install requests

Usage:
    python generate_socialpilot_csv.py [options]
"""

import csv
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests

# Configuration
SUPABASE_PROJECT_ID = "kkmnzbeugdoajtzfjkxg"
SUPABASE_URL = f"https://{SUPABASE_PROJECT_ID}.supabase.co"
BUCKET_NAME = "batch_scheduled"
FOLDER_NAME = "arabic-words"  # Organize images in a folder

# SocialPilot CSV Configuration
DEFAULT_FIRST_COMMENT = ""  # Leave empty or add default comment
HASHTAGS = "#learnarabic #arabiclanguage #arabicwords #arabicvocabulary #studyarabic #arabicgrammar #ClassicalArabic #fusha #quranicarabic #arabicphrases #arabicquotes #islamic #muslim #arabiconline #learnarabicdaily #bahasaarab"


def get_supabase_anon_key():
    """Get the anonymous key for Supabase"""
    return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbW56YmV1Z2RvYWp0emZqa3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU3ODk1NDQsImV4cCI6MjA0MTM2NTU0NH0.AjF-MzqjnUuERhgtYMwJKpDtNKBFKXjEmSMqUPeM1Os"


def validate_local_images():
    """Check which images exist locally in the output directory"""
    output_dir = Path("output")
    if not output_dir.exists():
        print("❌ Output directory not found!")
        return []

    image_files = list(output_dir.glob("word_*.png"))
    print(f"📁 Found {len(image_files)} local images")

    return sorted(image_files)


def upload_image_to_supabase(image_path, supabase_anon_key):
    """Upload a single image to Supabase storage or return URL if exists"""
    try:
        # Generate the storage path
        filename = image_path.name
        storage_path = f"{FOLDER_NAME}/{filename}"

        # First, check if file exists by trying to get its info
        check_url = (
            f"{SUPABASE_URL}/storage/v1/object/info/{BUCKET_NAME}/{storage_path}"
        )
        headers = {"Authorization": f"Bearer {supabase_anon_key}"}

        check_response = requests.get(check_url, headers=headers)

        if check_response.status_code == 200:
            # File exists, return the public URL
            public_url = (
                f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{storage_path}"
            )
            print(f"✅ {filename} already exists, using existing URL")
            return public_url

        # File doesn't exist, try to upload
        with open(image_path, "rb") as file:
            image_data = file.read()

        # Upload to Supabase storage
        upload_headers = {
            "Authorization": f"Bearer {supabase_anon_key}",
            "Content-Type": "image/png",
        }

        upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{storage_path}"
        response = requests.post(upload_url, headers=upload_headers, data=image_data)

        if response.status_code in [200, 201]:
            # Upload successful
            public_url = (
                f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{storage_path}"
            )
            print(f"✅ {filename} uploaded successfully")
            return public_url
        elif response.status_code == 409:
            # File already exists - return the public URL anyway
            public_url = (
                f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{storage_path}"
            )
            print(f"✅ {filename} already exists, using existing URL")
            return public_url
        else:
            print(
                f"❌ Upload failed for {filename}: {response.status_code} - {response.text}"
            )
            return None

    except Exception as e:
        print(f"❌ Error uploading {image_path.name}: {e}")
        return None


def load_arabic_words():
    """Load Arabic words from CSV"""
    words = []
    try:
        with open("arabic_words.csv", "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)
            for row in reader:
                words.append(
                    {
                        "id": row["id"],
                        "arabic": row["arabic"],
                        "english": row["english"],
                    }
                )
        print(f"📊 Loaded {len(words)} words from CSV")
        return words
    except Exception as e:
        print(f"❌ Error loading words: {e}")
        return []


def generate_caption(arabic_word, english_word):
    """Generate social media caption for the word"""
    return HASHTAGS


def generate_socialpilot_csv(words, uploaded_urls):
    """Generate the SocialPilot-compatible CSV file"""
    csv_filename = (
        f"socialpilot_arabic_words_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"
    )

    with open(csv_filename, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)

        # No header row needed for SocialPilot
        processed_count = 0

        for i, word in enumerate(words):
            word_id = word["id"]

            # Check if we have an uploaded URL for this word
            if word_id not in uploaded_urls:
                print(f"⚠️  Skipping word {word_id} - no uploaded image")
                continue

            # Generate caption
            caption = generate_caption(word["arabic"], word["english"])

            # Get image URL
            image_url = uploaded_urls[word_id]

            # Create the row according to SocialPilot format:
            # [Caption, Image_URL, Date_Time, First_Comment, Tags]
            row = [
                caption,  # Column 1: Caption
                image_url,  # Column 2: Image URL
                "",  # Column 3: Schedule DateTime (let SocialPilot handle)
                DEFAULT_FIRST_COMMENT,  # Column 4: First Comment
                "",  # Column 5: Tags (already in caption)
            ]

            writer.writerow(row)
            processed_count += 1

            # Limit to 500 posts (SocialPilot limit)
            if processed_count >= 500:
                print(f"⚠️  Reached SocialPilot limit of 500 posts")
                break

    print(f"✅ Generated {csv_filename} with {processed_count} posts")
    return csv_filename, processed_count


def main():
    """Main function to orchestrate the process"""
    print("🚀 SocialPilot CSV Generator for Arabic Words")
    print("=" * 50)

    # Step 1: Validate local images
    print("\\n📁 Step 1: Validating local images...")
    image_files = validate_local_images()

    if not image_files:
        print("❌ No images found! Please generate images first.")
        return

    # Step 2: Load Arabic words
    print("\\n📊 Step 2: Loading Arabic words...")
    words = load_arabic_words()

    if not words:
        print("❌ No words loaded! Please check arabic_words.csv")
        return

    # Step 3: Upload images to Supabase
    print("\\n☁️  Step 3: Uploading images to Supabase...")
    supabase_anon_key = get_supabase_anon_key()

    # Supabase key is already configured

    uploaded_urls = {}
    upload_success = 0
    upload_failed = 0

    for image_file in image_files:
        # Extract word ID from filename (word_2626_قَالَ.png -> 2626)
        try:
            word_id = image_file.name.split("_")[1]
        except:
            print(f"⚠️  Skipping {image_file.name} - invalid filename format")
            continue

        print(f"📤 Uploading {image_file.name}...")
        public_url = upload_image_to_supabase(image_file, supabase_anon_key)

        if public_url:
            uploaded_urls[word_id] = public_url
            upload_success += 1
            print(f"   ✅ {public_url}")
        else:
            upload_failed += 1

        # Small delay to avoid rate limiting
        time.sleep(0.1)

    print(f"\\n📊 Upload Results: {upload_success} success, {upload_failed} failed")

    if not uploaded_urls:
        print("❌ No images uploaded successfully!")
        return

    # Step 4: Generate SocialPilot CSV
    print("\\n📝 Step 4: Generating SocialPilot CSV...")
    csv_filename, post_count = generate_socialpilot_csv(words, uploaded_urls)

    # Step 5: Instructions
    print("\\n🎉 Process Complete!")
    print("=" * 50)
    print(f"✅ CSV file: {csv_filename}")
    print(f"✅ Posts created: {post_count}")
    print(f"✅ Images uploaded: {upload_success}")
    print()
    print("📋 Next Steps:")
    print("1. Upload the CSV file to SocialPilot: Posts > Bulk Import")
    print("2. Select your Instagram/Facebook accounts during upload")
    print("3. Review and schedule your posts!")
    print()
    print(f"📅 Posts ready: {post_count} posts (SocialPilot will handle scheduling)")
    print("🕐 Configure your posting schedule in SocialPilot settings")


if __name__ == "__main__":
    main()
