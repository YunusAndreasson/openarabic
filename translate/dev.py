#!/usr/bin/env python3
"""Development helper script for the translate project."""

import subprocess
import sys
from pathlib import Path


def run_command(cmd: list[str], description: str) -> bool:
    """Run a command and return success status."""
    print(f"\n🔄 {description}...")
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(e.stderr)
        return False


def main():
    """Main development workflow."""
    if len(sys.argv) < 2:
        print("Usage: python dev.py <command>")
        print("\nAvailable commands:")
        print("  check     - Run Ruff linting with auto-fix")
        print("  format    - Run Ruff formatting")
        print("  fix       - Run Ruff auto-fix with unsafe fixes")
        print("  test      - Run tests")
        print("  clean     - Clean up cache files")
        print("  all       - Run check, format, and test")
        return 1

    command = sys.argv[1]

    if command == "check":
        return (
            0
            if run_command(["ruff", "check", "--fix", "."], "Linting with auto-fix")
            else 1
        )

    elif command == "format":
        return 0 if run_command(["ruff", "format", "."], "Formatting") else 1

    elif command == "fix":
        return (
            0
            if run_command(
                ["ruff", "check", "--fix", "--unsafe-fixes", "."],
                "Auto-fixing with unsafe fixes",
            )
            else 1
        )

    elif command == "test":
        return 0 if run_command([sys.executable, "-m", "pytest"], "Testing") else 1

    elif command == "clean":
        # Clean up common cache files
        cache_dirs = [".pytest_cache", "__pycache__", ".ruff_cache"]
        for cache_dir in cache_dirs:
            cache_path = Path(cache_dir)
            if cache_path.exists():
                if cache_path.is_dir():
                    import shutil

                    shutil.rmtree(cache_path)
                else:
                    cache_path.unlink()
                print(f"🧹 Removed {cache_dir}")
        print("✅ Cleanup completed")
        return 0

    elif command == "all":
        success = True
        success &= run_command(["ruff", "check", "--fix", "."], "Linting with auto-fix")
        success &= run_command(["ruff", "format", "."], "Formatting")
        success &= run_command([sys.executable, "-m", "pytest"], "Testing")
        return 0 if success else 1

    else:
        print(f"Unknown command: {command}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
