#!/usr/bin/env python3
"""Quick script to check validation improvements in the database."""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load API keys
try:
    import importlib.util

    set_keys_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "utils",
        "set_keys.py",
    )
    if os.path.exists(set_keys_path):
        spec = importlib.util.spec_from_file_location("set_keys", set_keys_path)
        if spec and spec.loader:
            set_keys_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(set_keys_module)
except Exception as e:
    print(f"Warning: Failed to load set_keys.py: {e}")

from utils.storage import get_supabase_client

client = get_supabase_client()

# Get latest validation improvements
response = (
    client.table("translation_improvements")
    .select(
        "id, sentence_word_id, suggested_english, suggested_grammar_note, reviewer_notes, status, created_at"
    )
    .order("created_at", desc=True)
    .limit(10)
    .execute()
)

print("\n📊 Latest Validation Improvements (showing first 10):\n")
for i, row in enumerate(response.data, 1):
    print(f"{i}. Word ID: {row['sentence_word_id']} | Status: {row['status']}")
    eng = row.get("suggested_english", "N/A")
    print(f"   English: {eng[:80]}")
    note = row.get("suggested_grammar_note")
    if note:
        print(
            f"   Grammar: {note[:100]}..." if len(note) > 100 else f"   Grammar: {note}"
        )
    reason = row.get("reviewer_notes")
    if reason:
        print(f"   AI Reasoning: {reason[:120]}...")
    print()

print(f"Total improvements in database: {len(response.data)}")

# Get word details for context
print("\n🔍 Fetching original word details for comparison...\n")

word_ids = [row["sentence_word_id"] for row in response.data[:3]]
words_response = (
    client.table("sentence_words")
    .select("id, word_form, english, grammar_note")
    .in_("id", word_ids)
    .execute()
)

word_map = {w["id"]: w for w in words_response.data}

for i, row in enumerate(response.data[:3], 1):
    word_id = row["sentence_word_id"]
    original = word_map.get(word_id, {})

    print(f"{i}. Arabic: {original.get('word_form', 'N/A')}")
    print(f"   Original English: {original.get('english', 'N/A')}")
    print(f"   Suggested English: {row.get('suggested_english', 'N/A')}")
    print(f"   Original Grammar: {original.get('grammar_note', 'N/A')}")
    print(f"   Suggested Grammar: {row.get('suggested_grammar_note', 'N/A')[:100]}...")
    if row.get("reviewer_notes"):
        print(f"   DeepSeek Reasoning: {row['reviewer_notes'][:150]}...")
    print()
