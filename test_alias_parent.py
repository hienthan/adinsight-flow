import sys, os, json
sys.path.insert(0, 'scripts/tvlk/url_classifier_v5')
from entity_detector import EntityDetector

det = EntityDetector('scripts/tvlk/geo_kb')

# Build a fast mapping for alias -> canonical key
alias_to_canonical = {}
for pat, key in det.patterns:
    if pat not in alias_to_canonical:
        alias_to_canonical[pat] = key

entities_to_check = ['likupang', 'belitung', 'bukittinggi', 'bintan', 'derawan', 'morotai', 'whoosh', 'mentawai', 'gangga', 'lake-toba', 'parapat', 'samosir', 'maratua', 'bromo', 'halmahera', 'mount-sibayak', 'berastagi']

print("Testing Alias Resolution Logic:")
for e in entities_to_check:
    if e in det.entities:
        ent = det.entities[e]
        print(f"\n{e}: type={ent.get('type')}, parent={ent.get('parent')}")
        parent_id = ent.get('parent')
        
        while parent_id:
            # 1. Try exact match in entities
            if parent_id in det.entities:
                canonical_parent = parent_id
            # 2. Try alias match
            elif parent_id in alias_to_canonical:
                canonical_parent = alias_to_canonical[parent_id]
                print(f"  [Alias Matched] {parent_id} -> {canonical_parent}")
            elif parent_id.replace('-', ' ') in alias_to_canonical:
                canonical_parent = alias_to_canonical[parent_id.replace('-', ' ')]
                print(f"  [Alias Matched (space)] {parent_id} -> {canonical_parent}")
            else:
                print(f"  [FAILED] {parent_id} completely missing! (not in keys, not in aliases)")
                break
                
            p_ent = det.entities[canonical_parent]
            print(f"  -> {canonical_parent}: type={p_ent.get('type')}, parent={p_ent.get('parent')}")
            parent_id = p_ent.get('parent')
