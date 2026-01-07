#!/usr/bin/env python3
"""Check recent root validation improvements."""

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

from utils.storage_utils import get_supabase_client

client = get_supabase_client()

# Fetch the most recent 10 improvements
response = (
    client.table("root_translation_improvements")
    .select(
        "root_id, suggested_english, suggested_tashkeel, reviewer_notes, roots!inner(letters, meaning)"
    )
    .order("created_at", desc=True)
    .limit(10)
    .execute()
)

if response.data:
    print("\n" + "=" * 80)
    print("RECENT ROOT VALIDATION RESULTS (Last 10 Improvements)")
    print("=" * 80 + "\n")

    for item in response.data:
        root = item.get("roots", {})
        root_id = item.get("root_id")
        original_letters = root.get("letters", "N/A")
        original_meaning = root.get("meaning", "N/A")
        suggested_letters = item.get("suggested_tashkeel", "N/A")
        suggested_meaning = item.get("suggested_english", "N/A")
        notes = item.get("reviewer_notes", "")

        print(f"Root ID {root_id}:")
        print(f'  Original: {original_letters} = "{original_meaning}"')
        print(f'  Suggested: {suggested_letters} = "{suggested_meaning}"')

        # Extract key reasoning from notes
        if notes:
            # Show first 250 chars of reasoning
            reasoning_preview = notes[:250] + "..." if len(notes) > 250 else notes
            print(f"  Reasoning: {reasoning_preview}")

        print()
else:
    print("No improvements found")
