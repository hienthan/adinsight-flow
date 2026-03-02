import json

file_path = "scripts/lib/exclude_keywords.json"
with open(file_path, "r") as f:
    ex = json.load(f)

# The previous script might not have removed them properly if the condition was wrong.
beauty_remove = ["facial", "brow", "lash", "make-up", "makeup", "rambut"]

if "beauty_and_crafts_info" in ex:
    new_beauty = [w for w in ex["beauty_and_crafts_info"] if w not in beauty_remove]
    ex["beauty_and_crafts_info"] = new_beauty

with open(file_path, "w") as f:
    json.dump(ex, f, indent=4)
