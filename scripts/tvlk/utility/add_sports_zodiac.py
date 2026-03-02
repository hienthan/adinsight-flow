import json

file_path = "scripts/lib/exclude_keywords.json"

with open(file_path, "r") as f:
    ex = json.load(f)

# 1. Sports & Schedules (To Entertainment)
sports = [
    "world-cup", "worldcup", "piala-dunia", "sea-games", "aff-cup", "motogp",
    "arsenal-schedule", "jadwal-arsenal", "manchester-united-schedule", "jadwal-mu", "klasemen"
]
for cat in ["entertainment_and_music"]:
    if cat not in ex: ex[cat] = []
    ex[cat].extend([w for w in sports if w not in ex[cat]])
    ex[cat].sort()

# 2. Dates & Generalizations (To Academic)
dates_gen = [
    "what-day-is", "hari-apa", "tanggal-berapa", "in-the-world", "di-dunia", "terbesar-di-dunia", "biggest-in-the"
]
for cat in ["academic_and_admin"]:
    if cat not in ex: ex[cat] = []
    ex[cat].extend([w for w in dates_gen if w not in ex[cat]])
    ex[cat].sort()

# 3. Horoscopes & Personality (Create new category or add to health)
horoscopes = [
    "zodiac", "zodiak", "ramalan", "horoskop", "shio", "feng-shui",
    "mbti", "istj", "intp", "infp", "enfp", "entj", "entp", "isfp", "isfj",
    "estj", "estp", "esfj", "esfp", "enfj", "infj", "intj", "personality-type", "kepribadian"
]
if "horoscopes_and_personality" not in ex:
    ex["horoscopes_and_personality"] = []
ex["horoscopes_and_personality"].extend([w for w in horoscopes if w not in ex["horoscopes_and_personality"]])
ex["horoscopes_and_personality"].sort()

# 4. Personal Growth & Games (To Health & Entertainment)
growth = ["balance-in-life", "learn-new-skills", "singlish"]
games_gen = ["online-games", "game-online", "iq-test", "exercise", "olahraga"]

for cat in ["health_and_wellness"]: # Balance in life etc fits well here
    if cat not in ex: ex[cat] = []
    ex[cat].extend([w for w in growth if w not in ex[cat]])
    ex[cat].sort()

for cat in ["entertainment_and_music"]: # Games fit well here
    if cat not in ex: ex[cat] = []
    ex[cat].extend([w for w in games_gen if w not in ex[cat]])
    ex[cat].sort()
    
# Clean up facial, brow, lash, make-up, salon from beauty_and_crafts_info
beauty_remove = ["facial", "brow", "lash", "make-up", "makeup", "rambut"]
if "beauty_and_crafts_info" in ex:
    new_beauty = [w for w in ex["beauty_and_crafts_info"] if w not in beauty_remove]
    ex["beauty_and_crafts_info"] = new_beauty

with open(file_path, "w") as f:
    json.dump(ex, f, indent=4)
