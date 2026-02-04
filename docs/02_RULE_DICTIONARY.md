# 02_RULE_DICTIONARY - Classification & Translation

## I. Intent Keywords (Tiers)
*Definitions from 04_TIER_DEFINITION.md*
- **Tier 1 (Purchase)**: `ticket`, `admission`, `entry`, `pass`, `hotel`, `stay`, `shuttle`, `transfer`, `express`. -> **AUTO-INCLUDE FOR DSA**
- **Tier 2 (Activities)**: `spa`, `massage`, `cruise`, `ski`, `snowboard`, `diving`, `padi`. -> **AUTO-INCLUDE FOR DSA**
- **Tier 3 (General)**: `tour`, `day`, `trip`, [etc.] -> **PENDING REVIEW**
- **Tier 5 (Exclude)**: `guide`, `itinerary`, `best-things`, [etc.] -> **AUTO-EXCLUDE FROM DSA**

## II. Entity Extraction
- **Private Detection**: If slug contains `private`.
- **Duration Detection**: If slug contains `day`, `hour`, `night` (with digit prefix).

## III. VI Translation Mapper (Samples)
- `luxury` -> "Sang trọng"
- `packages` -> "Gói dịch vụ"
- `admission` -> "Vé vào cổng"
- `day tour` -> "Tour trong ngày"
- `private` -> "Riêng (Private)"
- `experience` -> "Trải nghiệm"
