#!/usr/bin/env python3
"""
Arabic Word Image Generator - Simplified Version

Generates beautiful social media images for all Arabic words with English translations.
1080x1080 square format optimized for Instagram and Twitter.
"""

import csv
import os

from PIL import Image, ImageDraw, ImageFont

# Configuration
IMAGE_SIZE = (1080, 1080)
BACKGROUND_COLOR = (36, 38, 27)  # #24261b - Dark greenish background
ARABIC_TEXT_COLOR = (156, 214, 104)  # #9cd668 - Light green
ENGLISH_TEXT_COLOR = (151, 216, 212)  # #97d8d4 - Light teal

ARABIC_FONT_SIZE = 260  # Larger Arabic for better prominence
ENGLISH_FONT_SIZE = 90  # Slightly larger English to maintain proportion

# Improved visual hierarchy positioning (gestalt principles)
ARABIC_Y_POSITION = 0.30  # Moved higher to accommodate larger Arabic text
ENGLISH_Y_POSITION = 0.70  # Moved lower to prevent clash with larger Arabic

OUTPUT_DIR = "output"
ARABIC_FONT_FILE = "Scheherazade.ttf"
ENGLISH_FONT_FILE = "Inter.ttf"
CSV_FILE = "arabic_words.csv"


def load_words_from_csv():
    """Load all words from CSV file"""
    words = []
    with open(CSV_FILE, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for row in reader:
            words.append(
                {"id": row["id"], "arabic": row["arabic"], "english": row["english"]}
            )
    return words


def get_text_size(text, font):
    """Get text dimensions"""
    bbox = font.getbbox(text)
    return (bbox[2] - bbox[0], bbox[3] - bbox[1])


def wrap_text(text, font, max_width):
    """Wrap text to fit within specified width"""
    words = text.split()
    lines = []
    current_line = []

    for word in words:
        test_line = " ".join(current_line + [word])
        text_width = get_text_size(test_line, font)[0]

        if text_width <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(" ".join(current_line))
                current_line = [word]
            else:
                lines.append(word)

    if current_line:
        lines.append(" ".join(current_line))

    return lines


def generate_word_image(arabic_text, english_text):
    """Generate a single word image"""
    # Create solid background
    image = Image.new("RGB", IMAGE_SIZE, BACKGROUND_COLOR)
    draw = ImageDraw.Draw(image)

    # Load fonts
    arabic_font = ImageFont.truetype(ARABIC_FONT_FILE, ARABIC_FONT_SIZE)
    english_font = ImageFont.truetype(ENGLISH_FONT_FILE, ENGLISH_FONT_SIZE)

    img_width, img_height = IMAGE_SIZE
    max_text_width = int(img_width * 0.8)

    # Handle Arabic text with improved spacing
    arabic_lines = wrap_text(arabic_text, arabic_font, max_text_width)
    arabic_line_spacing = ARABIC_FONT_SIZE + 25  # Proportional spacing for larger font
    arabic_total_height = len(arabic_lines) * arabic_line_spacing - 25
    arabic_y_start = int(img_height * ARABIC_Y_POSITION - arabic_total_height / 2)

    # Draw Arabic text with better spacing
    current_y = arabic_y_start
    for line in arabic_lines:
        text_width = get_text_size(line, arabic_font)[0]
        text_x = (img_width - text_width) // 2
        draw.text((text_x, current_y), line, font=arabic_font, fill=ARABIC_TEXT_COLOR)
        current_y += arabic_line_spacing

    # Handle English text with improved spacing
    english_lines = wrap_text(english_text, english_font, max_text_width)
    english_line_spacing = ENGLISH_FONT_SIZE + 18  # Proportional spacing for English
    english_total_height = len(english_lines) * english_line_spacing - 18
    english_y_start = int(img_height * ENGLISH_Y_POSITION - english_total_height / 2)

    # Draw English text with better spacing
    current_y = english_y_start
    for line in english_lines:
        text_width = get_text_size(line, english_font)[0]
        text_x = (img_width - text_width) // 2
        draw.text((text_x, current_y), line, font=english_font, fill=ENGLISH_TEXT_COLOR)
        current_y += english_line_spacing

    return image


def sanitize_filename(text):
    """Create safe filename from Arabic text"""
    safe_chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
    sanitized = "".join(c if c in safe_chars else "_" for c in text)
    sanitized = sanitized[:30]
    while "__" in sanitized:
        sanitized = sanitized.replace("__", "_")
    return sanitized.strip("_")


def main():
    """Generate all Arabic word images"""
    print("🎨 Arabic Word Image Generator")
    print("=" * 50)

    # Check required files
    if not os.path.exists(CSV_FILE):
        print(f"✗ {CSV_FILE} not found!")
        return

    if not os.path.exists(ARABIC_FONT_FILE):
        print(f"✗ {ARABIC_FONT_FILE} not found!")
        return

    if not os.path.exists(ENGLISH_FONT_FILE):
        print(f"✗ {ENGLISH_FONT_FILE} not found!")
        return

    # Load words
    words = load_words_from_csv()
    print(f"✓ Loaded {len(words)} words")

    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(f"📁 Output directory: {OUTPUT_DIR}")
    print(f"📏 Image size: {IMAGE_SIZE[0]}x{IMAGE_SIZE[1]} pixels")
    print(f"🎯 Arabic font: {ARABIC_FONT_FILE}")
    print(f"🎯 English font: {ENGLISH_FONT_FILE}\n")

    successful = 0
    failed = 0

    for i, word in enumerate(words, 1):
        try:
            # Generate image
            image = generate_word_image(word["arabic"], word["english"])

            # Create filename
            safe_arabic = sanitize_filename(word["arabic"])
            filename = f"word_{word['id']}_{safe_arabic}.png"
            output_path = os.path.join(OUTPUT_DIR, filename)

            # Save image
            image.save(output_path, "PNG", quality=95, dpi=(300, 300))
            print(f"✓ {i:3d}/{len(words)} - {word['arabic']} → {filename}")
            successful += 1

        except Exception as e:
            print(f"✗ {i:3d}/{len(words)} - Error: {word['arabic']} - {e}")
            failed += 1

    # Summary
    print(f"\n📊 Generation Complete!")
    print(f"✓ Successful: {successful}")
    print(f"✗ Failed: {failed}")
    print(f"📁 Images saved to: {os.path.abspath(OUTPUT_DIR)}")


if __name__ == "__main__":
    main()
