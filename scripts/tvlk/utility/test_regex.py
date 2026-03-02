import re

kws = ["valentine", "jadwal", "kata-kata"]
patterns = []
for kw in kws:
    base = kw.replace('-', r'[\s\-]')
    patterns.append(re.compile(r'\b' + base + r'(?:s|' + r'\'s' + r'|es)?\b', re.IGNORECASE))

tests = [
    "why-wait-for-valentines-day-create-your",
    "why wait for valentine's day",
    "jadwal-arsenal-ta",
    "kumpulan-kata-kata-bijak",
    "smart-tv"
]

for t in tests:
    print(f"Testing '{t}':")
    for p, kw in zip(patterns, kws):
        if p.search(t):
            print(f"  Matched {kw}")
