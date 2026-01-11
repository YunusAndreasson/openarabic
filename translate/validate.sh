#!/bin/bash
# Simple validation script for the translation pipeline

echo "🚀 Running validation checks..."

echo -e "\n🔍 Linting (ruff)..."
uv run ruff check --fix . --output-format=full
if [ $? -eq 0 ]; then
    echo "✅ Linting (ruff) passed"
else
    echo "❌ Linting (ruff) failed"
    exit 1
fi

echo -e "\n🔍 Code formatting..."
uv run ruff format --check .
if [ $? -eq 0 ]; then
    echo "✅ Code formatting passed"
else
    echo "❌ Code formatting failed"
    exit 1
fi

echo -e "\n🔍 Type checking (mypy)..."
uv run mypy . --ignore-missing-imports
if [ $? -eq 0 ]; then
    echo "✅ Type checking (mypy) passed"
else
    echo "❌ Type checking (mypy) failed"
    exit 1
fi

echo -e "\n🔍 Dead code detection (vulture)..."
# Scan source + tests (so test imports count as usage)
uv run vulture . tests/
if [ $? -eq 0 ]; then
    echo "✅ Dead code detection (vulture) passed"
else
    echo "❌ Dead code detection (vulture) failed"
    exit 1
fi

echo -e "\n🔍 Running tests..."
PYTHONPATH=. uv run pytest tests/ -v --tb=short
if [ $? -eq 0 ]; then
    echo "✅ Tests passed"
else
    echo "❌ Tests failed"
    exit 1
fi

echo -e "\n🎉 All validation checks and tests passed!"
