#!/usr/bin/env python3
"""Clear old incorrect improvements from the recent test run."""

import sys
import os

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

# Delete all recent improvements from the test run (root IDs 5199-5248 from limit 20)
print("\nDeleting old improvements from test run...")

# Get all improvements
response = client.table('root_translation_improvements') \
    .select('id, root_id') \
    .order('created_at', desc=True) \
    .limit(50) \
    .execute()

if response.data:
    ids_to_delete = [item['id'] for item in response.data]
    print(f"Found {len(ids_to_delete)} improvements to delete")

    # Delete them
    delete_response = client.table('root_translation_improvements') \
        .delete() \
        .in_('id', ids_to_delete) \
        .execute()

    print(f"Deleted {len(delete_response.data) if delete_response.data else 0} improvements")
else:
    print("No improvements found")

print("Done!\n")
