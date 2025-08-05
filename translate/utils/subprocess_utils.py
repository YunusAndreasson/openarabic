"""Subprocess utilities for the translation pipeline."""

import logging
import os
import subprocess
import sys

logger = logging.getLogger(__name__)


def run_pipeline_step(
    script_path: str,
    description: str,
    cwd: str | None = None,
    env: dict[str, str] | None = None,
) -> None:
    """
    Run a pipeline step script with consistent error handling.

    Args:
        script_path: Path to the script to run
        description: Description of the step for error messages
        cwd: Working directory for the subprocess
        env: Environment variables to pass to the subprocess

    Raises:
        RuntimeError: If the script fails to execute successfully
    """
    if cwd is None:
        cwd = os.path.dirname(os.path.abspath(__file__))

    if env is None:
        env = os.environ.copy()

    logger.info(f"🚀 Running {description}...")

    result = subprocess.run(
        [sys.executable, script_path],
        capture_output=True,
        text=True,
        cwd=cwd,
        env=env,
    )

    if result.returncode != 0:
        logger.error(f"❌ {description} failed.")
        if result.stdout:
            logger.error(f"stdout: {result.stdout}")
        if result.stderr:
            logger.error(f"stderr: {result.stderr}")
        raise RuntimeError(f"{description} failed.")

    logger.info(f"✅ {description} completed successfully.")
