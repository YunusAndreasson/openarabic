#!/usr/bin/env python3
"""
Deduplicate images using MD5 (exact) + pHash (near-duplicate) detection.

Strategy:
  1. Group files by MD5 hash — these are byte-for-byte identical.
  2. Among remaining unique files, compute pHash and group those within
     a Hamming distance threshold (default: 8) — visually identical images
     that differ only in encoding, compression, or minor edits.
  3. Within each duplicate group, keep one file using a priority order:
       named .webp > short hash name > generated_image > random test filenames

Usage:
    # Dry run — show what would be removed, nothing deleted:
    python scripts/deduplicate_images.py --dry-run

    # Actually delete duplicates:
    python scripts/deduplicate_images.py --delete

    # Adjust near-duplicate sensitivity (default 8, lower = stricter):
    python scripts/deduplicate_images.py --dry-run --threshold 6
"""

import argparse
import hashlib
import os
import sys
from collections import defaultdict
from pathlib import Path

try:
    import imagehash
    from PIL import Image
except ImportError:
    print("Missing dependencies. Run: pip install imagehash Pillow")
    sys.exit(1)

IMAGE_DIR = Path(__file__).parent.parent / "data" / "images"
SUPPORTED = {".webp", ".jpg", ".jpeg", ".png"}


def md5(path: Path) -> str:
    h = hashlib.md5()
    h.update(path.read_bytes())
    return h.hexdigest()


def keep_priority(files: list[Path]) -> Path:
    """Pick the best filename to keep from a group of duplicates."""
    def score(p: Path) -> int:
        name = p.name
        # Prefer clean short hash names (8 hex chars)
        if p.suffix == ".webp" and len(p.stem) == 8 and all(c in "0123456789abcdef" for c in p.stem):
            return 0
        # Named webp (shutterstock, pexels, unsplash, etc.)
        if p.suffix == ".webp":
            return 1
        # Generated images
        if "generated_image" in name:
            return 2
        # Anything else
        return 3

    return sorted(files, key=score)[0]


def find_exact_duplicates(image_dir: Path) -> tuple[list[list[Path]], list[Path]]:
    """Group files by MD5. Returns (duplicate_groups, unique_files)."""
    print("Step 1: Finding exact duplicates (MD5)...")
    by_hash: dict[str, list[Path]] = defaultdict(list)

    files = [p for p in sorted(image_dir.iterdir()) if p.suffix.lower() in SUPPORTED]
    for i, path in enumerate(files, 1):
        if i % 100 == 0:
            print(f"  Hashed {i}/{len(files)}...", end="\r")
        by_hash[md5(path)].append(path)

    dup_groups = [group for group in by_hash.values() if len(group) > 1]
    unique = [group[0] for group in by_hash.values() if len(group) == 1]
    # Also include one representative from each dup group for pHash phase
    unique_representatives = [keep_priority(g) for g in dup_groups]

    print(f"  Found {len(dup_groups)} exact duplicate groups ({sum(len(g)-1 for g in dup_groups)} files to remove)")
    return dup_groups, unique + unique_representatives


def find_near_duplicates(files: list[Path], threshold: int) -> list[list[Path]]:
    """Group files by pHash within Hamming distance threshold."""
    print(f"\nStep 2: Finding near-duplicates (pHash, threshold={threshold})...")

    hashes: list[tuple[Path, imagehash.ImageHash]] = []
    for i, path in enumerate(files, 1):
        if i % 50 == 0:
            print(f"  Hashed {i}/{len(files)}...", end="\r")
        try:
            h = imagehash.phash(Image.open(path))
            hashes.append((path, h))
        except Exception as e:
            print(f"  Warning: could not hash {path.name}: {e}")

    print(f"  Computed pHash for {len(hashes)} images")

    # Group by similarity using union-find
    parent = {p: p for p, _ in hashes}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x, y):
        parent[find(x)] = find(y)

    for i, (p1, h1) in enumerate(hashes):
        for j, (p2, h2) in enumerate(hashes):
            if j <= i:
                continue
            if h1 - h2 <= threshold:
                union(p1, p2)

    groups_map: dict[Path, list[Path]] = defaultdict(list)
    for path, _ in hashes:
        groups_map[find(path)].append(path)

    dup_groups = [g for g in groups_map.values() if len(g) > 1]
    print(f"  Found {len(dup_groups)} near-duplicate groups ({sum(len(g)-1 for g in dup_groups)} files to remove)")
    return dup_groups


def main() -> None:
    parser = argparse.ArgumentParser(description="Deduplicate images by MD5 and pHash")
    parser.add_argument("--image-dir", type=Path, default=IMAGE_DIR)
    parser.add_argument("--threshold", type=int, default=8,
                        help="pHash Hamming distance threshold for near-duplicates (default: 8)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be removed without deleting anything")
    parser.add_argument("--delete", action="store_true",
                        help="Actually delete duplicate files")
    parser.add_argument("--exact-only", action="store_true",
                        help="Only remove exact (MD5) duplicates, skip pHash")
    args = parser.parse_args()

    if not args.dry_run and not args.delete:
        print("Specify --dry-run to preview, or --delete to actually remove files.")
        sys.exit(1)

    image_dir: Path = args.image_dir
    if not image_dir.exists():
        print(f"Directory not found: {image_dir}")
        sys.exit(1)

    total_before = sum(1 for p in image_dir.iterdir() if p.suffix.lower() in SUPPORTED)
    print(f"Images in directory: {total_before}\n")

    to_remove: list[Path] = []

    # Phase 1: exact duplicates
    exact_groups, unique_files = find_exact_duplicates(image_dir)
    for group in exact_groups:
        keep = keep_priority(group)
        remove = [p for p in group if p != keep]
        to_remove.extend(remove)
        print(f"  KEEP {keep.name}  |  remove: {[p.name for p in remove]}")

    # Phase 2: near-duplicates (pHash)
    if not args.exact_only:
        near_groups = find_near_duplicates(unique_files, args.threshold)
        for group in near_groups:
            keep = keep_priority(group)
            remove = [p for p in group if p != keep]
            to_remove.extend(remove)
            print(f"  KEEP {keep.name}  |  near-dup: {[p.name for p in remove]}")

    print(f"\n{'─' * 60}")
    print(f"Total files to remove: {len(to_remove)}")
    print(f"Files remaining after dedup: {total_before - len(to_remove)}")

    if args.dry_run:
        print("\nDry run — nothing deleted. Run with --delete to remove.")
    elif args.delete:
        for path in to_remove:
            path.unlink()
        print(f"\nDeleted {len(to_remove)} files.")
        remaining = sum(1 for p in image_dir.iterdir() if p.suffix.lower() in SUPPORTED)
        print(f"Remaining images: {remaining}")


if __name__ == "__main__":
    main()
