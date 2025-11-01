"""
Convert all JPG and PNG images to WebP format in Supabase storage.

This script:
1. Lists all images from the 'images' bucket
2. Downloads each JPG/PNG image
3. Converts to WebP format (quality=80)
4. Uploads WebP version to Supabase
5. Updates article image_url references in database
6. Deletes original JPG/PNG files

Usage:
    python scripts/convert_images_to_webp.py --dry-run  # Preview changes
    python scripts/convert_images_to_webp.py --execute  # Actually convert
"""

import argparse
import logging
import os
import sys
import tempfile
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

import requests
from PIL import Image
from tqdm import tqdm

# Add parent directory to path to import utils
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.config_common import get_supabase_client
from utils.set_keys import *  # noqa: F403

# Configure logging
LOG_FILE = Path(__file__).parent.parent / "logs" / "webp_conversion.log"
LOG_FILE.parent.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


@dataclass
class ConversionStats:
    """Track conversion statistics."""

    total_images: int = 0
    converted: int = 0
    skipped: int = 0
    errors: int = 0
    original_size_bytes: int = 0
    webp_size_bytes: int = 0
    urls_cleaned: int = 0

    @property
    def space_saved_mb(self) -> float:
        """Calculate space saved in MB."""
        return (self.original_size_bytes - self.webp_size_bytes) / (1024 * 1024)

    @property
    def compression_ratio(self) -> float:
        """Calculate compression ratio as percentage."""
        if self.original_size_bytes == 0:
            return 0.0
        return (
            (1 - self.webp_size_bytes / self.original_size_bytes) * 100
            if self.original_size_bytes > 0
            else 0.0
        )


class ImageConverter:
    """Handle image conversion from JPG/PNG to WebP with UUID filenames."""

    def __init__(
        self, dry_run: bool = True, quality: int = 80, uuid_length: int = 8
    ):
        """
        Initialize converter.

        Args:
            dry_run: If True, preview changes without modifications
            quality: WebP quality level (0-100)
            uuid_length: Length of UUID for new filenames (default: 8)
        """
        self.dry_run = dry_run
        self.quality = quality
        self.uuid_length = uuid_length
        self.client = get_supabase_client()
        self.bucket_name = "images"
        self.stats = ConversionStats()
        self.supabase_url = os.getenv("SUPABASE_URL")

    def get_public_url(self, filename: str) -> str:
        """Get public URL for a file in the images bucket."""
        return (
            f"{self.supabase_url}/storage/v1/object/public/{self.bucket_name}/{filename}"
        )

    def generate_unique_uuid_filename(self, existing_files: set[str]) -> str:
        """
        Generate a unique UUID filename that doesn't exist in the bucket.

        Args:
            existing_files: Set of existing filenames in the bucket

        Returns:
            Unique filename like "a3f9b2c1.webp"
        """
        max_attempts = 100
        for _ in range(max_attempts):
            new_uuid = uuid.uuid4().hex[: self.uuid_length]
            new_filename = f"{new_uuid}.webp"
            if new_filename not in existing_files:
                return new_filename

        # If we somehow get here, use full UUID to guarantee uniqueness
        logger.warning(
            f"Could not generate unique {self.uuid_length}-char UUID after {max_attempts} attempts, using full UUID"
        )
        return f"{uuid.uuid4().hex}.webp"

    def get_existing_filenames(self) -> set[str]:
        """Get set of all existing filenames in the bucket."""
        try:
            all_files = []
            offset = 0
            limit = 1000  # Max items per request

            while True:
                result = self.client.storage.from_(self.bucket_name).list(
                    options={"limit": limit, "offset": offset}
                )
                if not result:
                    break
                all_files.extend(result)
                if len(result) < limit:
                    # No more files to fetch
                    break
                offset += limit

            return {f["name"] for f in all_files if isinstance(f, dict)}
        except Exception as e:
            logger.error(f"Failed to get existing filenames: {e}")
            return set()

    def list_images(self) -> list[dict[str, Any]]:
        """List all JPG and PNG images from the bucket."""
        try:
            all_files = []
            offset = 0
            limit = 1000  # Max items per request

            while True:
                result = self.client.storage.from_(self.bucket_name).list(
                    options={"limit": limit, "offset": offset}
                )
                if not result:
                    break
                all_files.extend(result)
                if len(result) < limit:
                    # No more files to fetch
                    break
                offset += limit

            images = [
                f
                for f in all_files
                if isinstance(f, dict)
                and f.get("name", "").lower().endswith((".jpg", ".jpeg", ".png"))
            ]
            jpg_count = sum(
                1
                for f in images
                if f.get("name", "").lower().endswith((".jpg", ".jpeg"))
            )
            png_count = sum(
                1 for f in images if f.get("name", "").lower().endswith(".png")
            )
            logger.info(
                f"Found {len(images)} images in bucket ({jpg_count} JPG, {png_count} PNG)"
            )
            return images
        except Exception as e:
            logger.error(f"Failed to list images: {e}")
            raise

    def download_image(self, filename: str) -> bytes:
        """Download image from Supabase storage."""
        try:
            url = self.get_public_url(filename)
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            return response.content
        except Exception as e:
            logger.error(f"Failed to download {filename}: {e}")
            raise

    def convert_to_webp(self, image_data: bytes, original_filename: str) -> bytes:
        """Convert JPG/PNG bytes to WebP bytes."""
        try:
            # Determine file extension
            ext = ".png" if original_filename.lower().endswith(".png") else ".jpg"

            # Create temporary files
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as img_file:
                img_file.write(image_data)
                img_path = img_file.name

            webp_path = img_path.rsplit(".", 1)[0] + ".webp"

            try:
                # Convert using Pillow
                with Image.open(img_path) as img:
                    # For PNG with transparency or JPG with special modes
                    if img.mode in ("RGBA", "LA"):
                        # Keep transparency for PNG - WebP supports alpha channel
                        pass
                    elif img.mode == "P":
                        # Convert palette mode to RGBA to preserve transparency
                        img = img.convert("RGBA")
                    elif img.mode not in ("RGB", "RGBA"):
                        # Convert other modes to RGB
                        img = img.convert("RGB")

                    # Save as WebP
                    img.save(webp_path, "WEBP", quality=self.quality, method=6)

                # Read WebP data
                with open(webp_path, "rb") as f:
                    webp_data = f.read()

                return webp_data
            finally:
                # Clean up temp files
                if os.path.exists(img_path):
                    os.unlink(img_path)
                if os.path.exists(webp_path):
                    os.unlink(webp_path)

        except Exception as e:
            logger.error(f"Failed to convert image: {e}")
            raise

    def upload_webp(self, webp_filename: str, webp_data: bytes) -> None:
        """Upload WebP image to Supabase storage with new UUID filename."""
        try:
            if self.dry_run:
                logger.info(f"[DRY-RUN] Would upload {webp_filename}")
                return

            # Upload to Supabase
            self.client.storage.from_(self.bucket_name).upload(
                webp_filename,
                webp_data,
                {"content-type": "image/webp", "upsert": "true"},
            )
            logger.info(f"Uploaded {webp_filename}")
        except Exception as e:
            logger.error(f"Failed to upload {webp_filename}: {e}")
            raise

    def cleanup_database_urls(self) -> int:
        """
        Clean up database to use only short filenames (remove full HTTP URLs).

        Returns:
            Number of URLs cleaned
        """
        try:
            # Find all articles with full HTTP URLs
            result = (
                self.client.table("articles")
                .select("id, image_url")
                .like("image_url", f"{self.supabase_url}%")
                .execute()
            )

            articles_with_full_urls = result.data
            logger.info(
                f"Found {len(articles_with_full_urls)} articles with full HTTP URLs"
            )

            if self.dry_run:
                for article in articles_with_full_urls:
                    full_url = article["image_url"]
                    # Extract filename from URL
                    filename = full_url.split("/")[-1]
                    logger.info(
                        f"[DRY-RUN] Would clean article {article['id']}: {full_url} → {filename}"
                    )
                return len(articles_with_full_urls)

            # Update each article with just the filename
            cleaned_count = 0
            for article in articles_with_full_urls:
                try:
                    full_url = article["image_url"]
                    filename = full_url.split("/")[-1]

                    self.client.table("articles").update(
                        {"image_url": filename}
                    ).eq("id", article["id"]).execute()

                    logger.info(
                        f"Cleaned article {article['id']}: {full_url} → {filename}"
                    )
                    cleaned_count += 1
                except Exception as e:
                    logger.error(
                        f"Failed to clean URL for article {article['id']}: {e}"
                    )

            logger.info(f"Successfully cleaned {cleaned_count} article URLs")
            return cleaned_count

        except Exception as e:
            logger.error(f"Failed to cleanup database URLs: {e}")
            raise

    def update_article_urls(self, old_filename: str, new_filename: str) -> None:
        """Update article image_url references in database (stores only filename)."""
        try:
            # Build old URL patterns (handle both formats)
            old_url_full = self.get_public_url(old_filename)
            old_url_short = old_filename

            if self.dry_run:
                # Just count how many would be updated
                result = (
                    self.client.table("articles")
                    .select("id, image_url")
                    .or_(f"image_url.eq.{old_url_short},image_url.eq.{old_url_full}")
                    .execute()
                )
                count = len(result.data)
                logger.info(
                    f"[DRY-RUN] Would update {count} articles: {old_filename} → {new_filename}"
                )
                return

            # IMPORTANT: Always store ONLY the filename (no full URL)
            new_url_short = new_filename

            # Update articles that have full URLs
            result1 = (
                self.client.table("articles")
                .update({"image_url": new_url_short})
                .eq("image_url", old_url_full)
                .execute()
            )

            # Update articles that have short URLs
            result2 = (
                self.client.table("articles")
                .update({"image_url": new_url_short})
                .eq("image_url", old_url_short)
                .execute()
            )

            total_updated = len(result1.data) + len(result2.data)
            if total_updated > 0:
                logger.info(
                    f"Updated {total_updated} articles with new filename: {new_filename}"
                )
        except Exception as e:
            logger.error(f"Failed to update article URLs for {old_filename}: {e}")
            raise

    def delete_original(self, filename: str) -> None:
        """Delete original JPG file from storage."""
        try:
            if self.dry_run:
                logger.info(f"[DRY-RUN] Would delete {filename}")
                return

            self.client.storage.from_(self.bucket_name).remove([filename])
            logger.info(f"Deleted original {filename}")
        except Exception as e:
            logger.error(f"Failed to delete {filename}: {e}")
            raise

    def process_image(
        self, image_info: dict[str, Any], existing_files: set[str]
    ) -> bool:
        """
        Process a single image: download, convert, upload with UUID, update DB, delete original.

        Args:
            image_info: Image file information
            existing_files: Set of existing filenames to avoid collisions

        Returns:
            True if successful, False if error occurred
        """
        old_filename = image_info["name"]

        try:
            logger.info(f"Processing {old_filename}...")

            # Download original
            logger.info(f"  Downloading {old_filename}")
            image_data = self.download_image(old_filename)
            self.stats.original_size_bytes += len(image_data)

            # Convert to WebP
            logger.info(f"  Converting to WebP (quality={self.quality})")
            webp_data = self.convert_to_webp(image_data, old_filename)
            self.stats.webp_size_bytes += len(webp_data)

            # Generate unique UUID filename
            new_webp_filename = self.generate_unique_uuid_filename(existing_files)
            existing_files.add(new_webp_filename)  # Add to set to avoid duplicates

            size_reduction = (1 - len(webp_data) / len(image_data)) * 100
            logger.info(
                f"  Size: {len(image_data)/1024:.1f}KB → {len(webp_data)/1024:.1f}KB "
                f"({size_reduction:.1f}% reduction)"
            )
            logger.info(f"  New filename: {old_filename} → {new_webp_filename}")

            # Upload WebP with new UUID filename
            self.upload_webp(new_webp_filename, webp_data)

            # Update database with new UUID filename (short format only)
            self.update_article_urls(old_filename, new_webp_filename)

            # Delete original
            self.delete_original(old_filename)

            self.stats.converted += 1
            return True

        except Exception as e:
            logger.error(f"Error processing {old_filename}: {e}")
            self.stats.errors += 1
            return False

    def run(self, cleanup_only: bool = False) -> ConversionStats:
        """
        Run the conversion process.

        Args:
            cleanup_only: If True, only cleanup database URLs without converting images
        """
        logger.info("=" * 80)
        if cleanup_only:
            logger.info("Starting Database URL Cleanup")
        else:
            logger.info(f"Starting WebP conversion with UUID filenames (dry_run={self.dry_run})")
            logger.info(f"Quality: {self.quality}")
            logger.info(f"UUID length: {self.uuid_length} characters")
        logger.info(f"Time: {datetime.now().isoformat()}")
        logger.info("=" * 80)

        # If cleanup-only mode, just clean database URLs
        if cleanup_only:
            self.stats.urls_cleaned = self.cleanup_database_urls()
            self._print_summary(cleanup_only=True)
            return self.stats

        # Get existing filenames to avoid collisions
        logger.info("Getting existing filenames...")
        existing_files = self.get_existing_filenames()
        logger.info(f"Found {len(existing_files)} existing files in bucket")

        # List all images
        images = self.list_images()
        self.stats.total_images = len(images)

        if self.stats.total_images == 0:
            logger.info("No JPG/PNG images found to convert")
            return self.stats

        # Process each image with progress bar
        logger.info(f"\nProcessing {self.stats.total_images} images...\n")
        for image in tqdm(images, desc="Converting images"):
            self.process_image(image, existing_files)

        # Print summary
        self._print_summary()
        return self.stats

    def _print_summary(self, cleanup_only: bool = False) -> None:
        """Print conversion summary."""
        logger.info("\n" + "=" * 80)
        if cleanup_only:
            logger.info("DATABASE CLEANUP SUMMARY")
            logger.info("=" * 80)
            logger.info(f"URLs cleaned:     {self.stats.urls_cleaned}")
            logger.info("=" * 80)
        else:
            logger.info("CONVERSION SUMMARY")
            logger.info("=" * 80)
            logger.info(f"Total images:     {self.stats.total_images}")
            logger.info(f"Converted:        {self.stats.converted}")
            logger.info(f"Errors:           {self.stats.errors}")
            logger.info(f"Original size:    {self.stats.original_size_bytes / (1024*1024):.2f} MB")
            logger.info(f"WebP size:        {self.stats.webp_size_bytes / (1024*1024):.2f} MB")
            logger.info(f"Space saved:      {self.stats.space_saved_mb:.2f} MB")
            logger.info(f"Compression:      {self.stats.compression_ratio:.1f}%")
            logger.info("=" * 80)

        if self.dry_run:
            logger.info("\nThis was a DRY RUN - no actual changes were made")
            if cleanup_only:
                logger.info("Run with --cleanup-urls-only --execute to perform cleanup")
            else:
                logger.info("Run with --execute to perform the conversion")


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Convert article images from JPG/PNG to WebP with short UUID filenames"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=True,
        help="Preview changes without modifying anything (default)",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually perform conversions and updates",
    )
    parser.add_argument(
        "--cleanup-urls-only",
        action="store_true",
        help="Only cleanup database URLs (remove full HTTP, keep filenames only)",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=80,
        help="WebP quality level (0-100, default: 80)",
    )
    parser.add_argument(
        "--uuid-length",
        type=int,
        default=8,
        help="Length of UUID for new filenames (default: 8)",
    )

    args = parser.parse_args()

    # If --execute is specified, turn off dry-run
    dry_run = not args.execute

    try:
        converter = ImageConverter(
            dry_run=dry_run, quality=args.quality, uuid_length=args.uuid_length
        )
        stats = converter.run(cleanup_only=args.cleanup_urls_only)

        # Exit with error code if there were errors
        sys.exit(1 if stats.errors > 0 else 0)

    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
