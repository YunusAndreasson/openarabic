#!/bin/bash

# Full Pipeline Script for Arabic Translation Pipeline
# Runs complete pipeline: split -> translate -> insert -> word-audio
set -e

# Run the complete pipeline
uv run python main.py --full
