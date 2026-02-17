# Traveloka Content Type Taxonomy

Documenting the rules for `content_type`, `funnel_stage`, and `sub_tag` based on URL suffixes and keywords.

## 1. Suffix Mapping
Used as the primary signal for classification.

| Suffix | Content Type | Default Funnel | Sub Tag |
| :--- | :--- | :--- | :--- |
| **-ta** | `activity_attraction` | `awareness` | `attraction` |
| **-trp** | `transport_tour` | `planning` | `tour` |
| **-acc** | `accommodation` | `planning` | `accommodation` |

## 2. Keyword Mapping (Secondary Priority)
Overrides or refines the suffix mapping if specific keywords are present in the slug.

| Keyword | Content Type | Funnel Stage | Sub Tag |
| :--- | :--- | :--- | :--- |
| `itinerary` | `travel_guide` | `planning` | `itinerary` |
| `visa`, `paspor` | `travel_document` | `planning` | `visa` |
| `bus`, `mrt`, `lrt`, `train`, `shinkansen` | `transport_guide` | `readiness` | `transport` |
| `playground`, `museum`, `taman` | `activity_attraction` | `awareness` | `attraction` |
| `tiket-masuk`, `harga-tiket` | `activity_booking` | `readiness` | `booking` |
| `kuliner`, `makanan`, `cafe` | `food_lifestyle` | `awareness` | `food` |

## 3. Funnel Stage Logic
- **Awareness**: Generic keywords (e.g., "Tempat wisata di...", "Trend model rambut").
- **Planning**: Specific destinations + "itu", "ini", "itinerary".
- **Readiness**: Strong intent keywords like "harga", "tiket", "cara pesan", "jadwal".

## 4. Tier Classification Rules
Categorizes URLs based on purchase intent (High to Low).

| Tier | Intent | Keywords (EN + ID) |
| :--- | :--- | :--- |
| **Tier 1** | **Highest** | `ticket`, `pass`, `admission`, `entrance`, `tiket`, `kartu-akses` |
| **Tier 2** | **High** | `tour`, `cruise`, `expedition`, `wisata`, `tur`, `pengalaman`, `jalan-jalan` |
| **Tier 3** | **Medium** | `spa`, `pijat`, `massage`, `rental`, `sewa`, `transfer`, `shuttle`, `layanan` |
| **Tier 4** | **Low-Med** | `package`, `combo`, `unlimited`, `paket`, `rombongan` |
| **Tier 5** | **Lowest** | `guide`, `itinerary`, `tips`, `points-of-interest`, `panduan`, `rekomendasi`, `daftar`, `apa-saja` |

## 5. Default Fallback
- **Content Type**: `activity_attraction`
- **Funnel Stage**: `awareness`
- **Sub Tag**: `others`
- **Tier**: `3`
