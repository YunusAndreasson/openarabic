#!/bin/bash

# Translate and Insert Phase Script for Arabic Translation Pipeline
set -e


# Run translate phase
uv run python main.py --insert
