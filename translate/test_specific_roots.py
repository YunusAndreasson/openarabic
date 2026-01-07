#!/usr/bin/env python3
"""Test specific roots to verify CAMeL analysis and AI suggestions."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load API keys
try:
    import importlib.util

    set_keys_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "utils",
        "set_keys.py",
    )
    if os.path.exists(set_keys_path):
        spec = importlib.util.spec_from_file_location("set_keys", set_keys_path)
        if spec and spec.loader:
            set_keys_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(set_keys_module)
except Exception:
    pass

from data.validation_models import RootValidationBatchResponse
from utils.camel_analyzer import CamelRootAnalyzer
from utils.openrouter_client import OpenRouterClient
from utils.validation_db import fetch_roots_for_validation

# Test specific problematic roots
test_root_ids = [
    5219,  # قَسْوَةٌ = "hardness"
    5221,  # بَرَكَةٌ = "blessings"
    5248,  # مَعْصِيَةٌ = "sin"
    5200,  # تَوْفِيقٌ = "success" (our fixed example)
]

print("\n" + "=" * 80)
print("TESTING SPECIFIC ROOTS")
print("=" * 80 + "\n")

# Fetch roots
roots_data = fetch_roots_for_validation(test_root_ids)

# Run CAMeL analysis
analyzer = CamelRootAnalyzer()
for root in roots_data:
    arabic_word = root.get("current_letters", "")
    analysis = analyzer.analyze_root(arabic_word)
    root["camel_analysis"] = analysis

# Display CAMeL analysis
print("CAMeL Tools Analysis:")
print("-" * 80)
for root in roots_data:
    root_id = root["root_id"]
    letters = root["current_letters"]
    meaning = root["current_meaning"]
    analysis = root.get("camel_analysis")

    print(f"\nRoot ID {root_id}: {letters} = '{meaning}'")

    if analysis:
        print(f"  CAMeL Root: {analysis['root']}")
        print(f"  Pattern: {analysis['pattern']}")
        print(f"  POS: {analysis['pos']}")
        print(f"  Is Derived: {analysis['is_derived']}")
        print(f"  Suggested Base Verb: {analysis['suggested_base_verb']}")
    else:
        print("  No CAMeL analysis available")

# Run AI validation
print("\n" + "=" * 80)
print("AI VALIDATION RESULTS")
print("=" * 80 + "\n")

client = OpenRouterClient()
response = client.validate_roots_batch(roots_data, retry_count=0)
validated_batch = RootValidationBatchResponse(**response)

for validation in validated_batch.validations:
    root = next(r for r in roots_data if r["root_id"] == validation.root_id)

    print(f"\nRoot ID {validation.root_id}: {root['current_letters']}")
    print(f"  Original meaning: '{root['current_meaning']}' (noun)")
    print(f"  Is correct: {validation.is_correct}")

    if not validation.is_correct:
        print(f"  Suggested tashkeel: {validation.suggested_tashkeel}")
        print(f"  Suggested English: '{validation.suggested_english}'")
        print(f"  Issues: {validation.issues}")

        # Check if it's a verb or noun translation
        suggested_eng = validation.suggested_english.lower()
        if suggested_eng.startswith("to "):
            print("  ✅ VERB translation (correct)")
        else:
            print("  ❌ NOUN translation (should be verb!)")
