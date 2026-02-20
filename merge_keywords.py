import json

file1 = "scripts/lib/exclude_keywords.json"
file2 = "scripts/tvlk/lib/exclude_keywords.json"

with open(file1, 'r') as f:
    data1 = json.load(f)

try:
    with open(file2, 'r') as f:
        data2 = json.load(f)
except Exception:
    data2 = {}

merged = {}
all_keys = set(data1.keys()).union(set(data2.keys()))

for k in all_keys:
    l1 = data1.get(k, [])
    l2 = data2.get(k, [])
    merged[k] = sorted(list(set(l1 + l2)))

# Add new keywords from user feedback
new_academic = ["arti", "artinya", "meaning", "painting", "lukisan", "makna"]
new_entertainment = ["valentine", "hobby", "hobi", "christmas", "natal", "big-bad-wolf"]
new_health = ["pampering", "stress", "healthy", "refreshing", "kegiatan-bermanfaat"]
new_tech = ["kamera", "mirrorless", "dslr"]

merged["academic_and_admin"] = sorted(list(set(merged.get("academic_and_admin", []) + new_academic)))
merged["entertainment_and_music"] = sorted(list(set(merged.get("entertainment_and_music", []) + new_entertainment)))
merged["health_and_wellness"] = sorted(list(set(merged.get("health_and_wellness", []) + new_health)))
merged["automotive_and_tech_info"] = sorted(list(set(merged.get("automotive_and_tech_info", []) + new_tech)))

with open(file1, 'w') as f:
    json.dump(merged, f, indent=4)
print("Merged successfully!")
