#!/bin/bash
# Configure git to use project hooks

git config core.hooksPath .githooks
echo "✅ Git hooks configured. Pre-commit validation is now enabled."
