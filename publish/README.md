# Arabic Word Image Generator - Simplified

Generate beautiful social media images for all 306 Arabic words with English translations, optimized for Instagram and Twitter.

## Features

- **1080x1080 square format** - Perfect for Instagram and Twitter
- **Custom color scheme** - Dark greenish background (#24261b) with light green Arabic (#9cd668) and teal English (#97d8d4)
- **Dual font system** - Scheherazade for Arabic text, Inter for English
- **Golden ratio layout** - Professional text positioning
- **Generates all 306 words** - No configuration needed
- **Extra large, readable text** - Arabic 260px, English 90px for maximum social media visibility
- **High quality output** - 300 DPI PNG images

## Quick Start

1. **Install Python dependency:**

   ```bash
   pip install -r requirements.txt
   ```

2. **Run the script:**
   ```bash
   python generate_arabic_word_images.py
   ```

That's it! The script will generate all 306 images automatically.

## Files Required

Make sure these files are in the same directory:

- `generate_arabic_word_images.py` - Main script
- `arabic_words.csv` - Word data (306 words)
- `Scheherazade.ttf` - Arabic font
- `Inter.ttf` - English font
- `requirements.txt` - Dependencies

## Design Specifications

- **Background**: Dark greenish-brown (#24261b)
- **Arabic text**: Light green (#9cd668) - Scheherazade font 260px
- **English text**: Light teal (#97d8d4) - Inter font 90px
- **Layout**: Golden ratio positioning for optimal visual hierarchy
- **Typography**: Dual font system for optimal readability

## Output

- **Format**: PNG with high quality (300 DPI)
- **Naming**: `word_{id}_{sanitized_arabic}.png`
- **Location**: `output/` directory (auto-created)
- **Size**: 1080x1080 pixels (perfect for social media)

## Sample Output Structure

```
output/
├── word_2626_قال.png
├── word_2627_ابن.png
├── word_2628_جوزي.png
└── ... (306 total images)
```

## Technical Notes

- Automatically wraps long English translations
- Handles Arabic RTL text properly
- Creates safe filenames from Arabic text
- Processes all 306 words in sequence
- No internet connection required
- Simple, focused implementation

## Troubleshooting

**Missing font error:**

- Ensure `Scheherazade.ttf` is in the same directory as the script

**Missing CSV error:**

- Ensure `arabic_words.csv` is in the same directory

**Permission errors:**

- Make sure you have write permissions in the current directory
