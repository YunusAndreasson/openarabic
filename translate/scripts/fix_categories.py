"""One-time script to fix article categories that defaulted to aqeedah."""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.responses_api import load_api_keys

load_api_keys()

from utils.storage import get_supabase_client, get_category_id

client = get_supabase_client()

seerah_id = get_category_id("seerah")
hadith_id = get_category_id("hadith")

print(f"seerah_id={seerah_id}, hadith_id={hadith_id}")

updates = {
    seerah_id: [521, 524, 526, 529, 530, 531, 532, 533, 534, 536, 538, 541, 543],
    hadith_id: [522, 523, 528, 540, 542, 544, 545],
}

for cat_id, article_ids in updates.items():
    for aid in article_ids:
        result = (
            client.table("articles")
            .update({"category_id": cat_id})
            .eq("id", aid)
            .execute()
        )
        if result.data:
            print(f"  Updated article {aid} -> category_id={cat_id}")
        else:
            print(f"  FAILED article {aid}")

print("\nDone! Verifying...")

cats = {
    c["id"]: c["name"]
    for c in client.table("categories").select("id, name").execute().data
}
result = (
    client.table("articles")
    .select("id, title, category_id")
    .order("id", desc=True)
    .limit(25)
    .execute()
)
for a in result.data:
    print(f"  ID={a['id']} | {cats[a['category_id']]:8s} | {a['title']}")
