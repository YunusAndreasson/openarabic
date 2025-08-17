#!/bin/bash

# Split Phase Script for Arabic Translation Pipeline
set -e

# Run the split phase
uv run python main.py --split
