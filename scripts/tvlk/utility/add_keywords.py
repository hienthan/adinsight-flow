import json

file_path = "scripts/lib/exclude_keywords.json"

with open(file_path, 'r') as f:
    data = json.load(f)

new_keys = {
    "entertainment_and_music": [
        "movie", "drama", "review-film", "kamera-mirrorless", "kamera-dslr", "kamera-digital", "photography-tips"
    ],
    "health_and_wellness": [
        "health", "new-normal", "covid-19", "coronavirus", "pandemic", "home-workout", "at-home-workout",
        "yoga-at-home", "weight-loss", "lose-weight", "healthy-lifestyle", "healthy-diet", "relieve-stress",
        "stress-relief", "mental-health", "skincare-routine"
    ],
    "finance_and_business": [
        "managing-your-money", "financial-tips", "how-to-invest", "personal-finance", "manage-finances"
    ],
    "automotive_and_tech_info": [
        "cleaning-car", "car-wash", "cuci-mobil"
    ],
    "food_and_beverage_info": [
        "home-cooking", "easy-recipe", "how-to-cook", "cooking-at-home", "delicious-recipe", "healthy-recipe"
    ],
    "academic_and_admin": [
        "sejarah", "fakta", "kisah", "bedanya", "manfaat",
        "difference-between", "differences-between", "what-is", "what-is-the", "meaning-of",
        "history-of", "facts-about", "benefits-of", "side-effects",
        "how-to-make", "how-to-create", "how-to-build", "step-by-step", "tips-for", "how-to-overcome", "guide-to-buying"
    ],
    "beauty_and_crafts_info": [
        "painting-by", "how-to-draw", "diy-craft", "home-decor", "makeup-tutorial"
    ]
}

added_count = 0
for category, words_list in new_keys.items():
    if category not in data:
        data[category] = []
    
    for word in words_list:
        if word not in data[category]:
            data[category].append(word)
            added_count += 1
            
    data[category].sort()

with open(file_path, 'w') as f:
    json.dump(data, f, indent=4)

print(f"Added {added_count} new multi-word and single-word keywords.")
