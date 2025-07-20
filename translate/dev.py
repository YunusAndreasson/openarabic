#!/usr/bin/env python3
"""Development helper script for the translate project."""

import subprocess
import sys
from pathlib import Path


def run_command(cmd: list[str], description: str) -> bool:
    """Run a command and return success status."""
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        if result.stdout:
            pass
        return True
    except subprocess.CalledProcessError:
        return False


def main():
    """Main development workflow."""
    if len(sys.argv) < 2:
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
        return 0

    elif command == "all":
        success = True
        success &= run_command(["ruff", "check", "--fix", "."], "Linting with auto-fix")
        success &= run_command(["ruff", "format", "."], "Formatting")
        success &= run_command([sys.executable, "-m", "pytest"], "Testing")
        return 0 if success else 1

    else:
        return 1


if __name__ == "__main__":
    sys.exit(main())
