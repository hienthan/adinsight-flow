import json

file_path = "scripts/lib/exclude_keywords.json"

with open(file_path, 'r') as f:
    data = json.load(f)

# List of dangerous single words to remove
dangerous_words = ["pahlawan", "manfaat"]

removed_count = 0
for category, words_list in data.items():
    new_words = [w for w in words_list if w not in dangerous_words]
    removed_count += len(words_list) - len(new_words)
    data[category] = new_words

with open(file_path, 'w') as f:
    json.dump(data, f, indent=4)

print(f"Removed {removed_count} dangerous single-word keywords.")
