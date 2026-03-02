import json

file_path = "scripts/lib/exclude_keywords.json"
with open(file_path, "r") as f:
    ex = json.load(f)

# Add TOFU words to academic_and_admin
tofus = ["guide", "panduan", "recommendation", "rekomendasi"]
if "academic_and_admin" not in ex:
    ex["academic_and_admin"] = []
ex["academic_and_admin"].extend([w for w in tofus if w not in ex["academic_and_admin"]])
ex["academic_and_admin"].sort()

with open(file_path, "w") as f:
    json.dump(ex, f, indent=4)
