# Unknown URL Processing Workflow

## Tổng Quan
Hệ thống xử lý Unknown URLs qua 3 bước:
1. **Geopy Auto-Enrichment**: Tự động xử lý bằng geopy
2. **Manual Processing**: Xử lý thủ công qua ChatGPT
3. **Import & Update**: Import kết quả vào hệ thống

---

## Bước 1: Export Unknown URLs

```bash
# Export ra CSV để xử lý với ChatGPT
python3 -c "
import json, csv
data = json.load(open('data/klook_experiences-activity_preview.json'))
unknowns = [d for d in data if d['country'] == 'Unknown']
with open('data/unknown_urls_for_chatgpt.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['slug', 'url', 'suggested_country', 'suggested_city', 'notes'])
    for item in unknowns:
        writer.writerow([item['slug'], item['url'], '', '', ''])
print(f'Exported {len(unknowns)} URLs')
"
```

**Output**: `data/unknown_urls_for_chatgpt.csv`

---

## Bước 2: Geopy Auto-Enrichment (Optional)

```bash
# Chạy geopy để tự động xử lý 500 URLs đầu tiên (~8-10 phút)
python3 scripts/04_geopy_enrich.py

# Kết quả được lưu vào:
# - data/klook_experiences-activity_geopy_enriched.json
# - data/geopy_enrichment_log.txt
```

**Lưu ý**: 
- Rate limit: 1 request/giây
- Xử lý 500 URLs mất ~8-10 phút
- Có thể tăng `max_urls` trong script nếu cần

---

## Bước 3: Manual Processing với ChatGPT

### 3.1. Chuẩn bị file cho ChatGPT

File `data/unknown_urls_for_chatgpt.csv` có format:
```csv
slug,url,suggested_country,suggested_city,notes
swiss-travel-rail-pass,https://...,,,
park-cafe-hotel,https://...,,,
```

### 3.2. Prompt cho ChatGPT

```
Tôi có một file CSV chứa các URL du lịch. Hãy phân tích từng slug và điền vào cột "suggested_country" và "suggested_city" dựa trên thông tin trong slug.

Quy tắc:
1. Nếu slug chứa tên địa danh rõ ràng -> điền country và city
2. Nếu không xác định được -> để trống
3. Country phải là tên chuẩn (ví dụ: "United States", "Viet Nam", "United Kingdom")
4. City có thể là tên thành phố hoặc vùng

Ví dụ:
- swiss-travel-rail-pass -> Switzerland, Unknown
- paris-eiffel-tower -> France, Paris
- tokyo-disneyland -> Japan, Tokyo

[Paste nội dung CSV vào đây]
```

### 3.3. Lưu kết quả

Lưu output từ ChatGPT vào file:
- `data/unknown_urls_chatgpt_processed.csv`

---

## Bước 4: Import Manual Mappings

```bash
# Import kết quả từ ChatGPT vào hệ thống
python3 scripts/05_import_manual_mappings.py data/unknown_urls_chatgpt_processed.csv

# Kết quả được lưu vào:
# data/klook_experiences-activity_manual_enriched.json
```

---

## Bước 5: Import vào Database

```bash
# Import dữ liệu đã enrich vào PocketBase
python3 scripts/02_import_to_pb.py data/klook_experiences-activity_manual_enriched.json klook
```

---

## Workflow Tổng Hợp

```bash
# 1. Export Unknown URLs
python3 -c "..." # (xem Bước 1)

# 2. (Optional) Geopy auto-enrichment
python3 scripts/04_geopy_enrich.py

# 3. Process với ChatGPT
# - Upload data/unknown_urls_for_chatgpt.csv
# - Nhận kết quả và lưu vào data/unknown_urls_chatgpt_processed.csv

# 4. Import manual mappings
python3 scripts/05_import_manual_mappings.py data/unknown_urls_chatgpt_processed.csv

# 5. Import vào database
python3 scripts/02_import_to_pb.py data/klook_experiences-activity_manual_enriched.json klook
```

---

## Files Quan Trọng

| File | Mô tả |
|------|-------|
| `data/unknown_urls_for_chatgpt.csv` | Export để xử lý với ChatGPT |
| `data/unknown_slugs_list.txt` | Danh sách slugs (text only) |
| `data/geopy_enrichment_log.txt` | Log của geopy enrichment |
| `scripts/04_geopy_enrich.py` | Script geopy auto-enrichment |
| `scripts/05_import_manual_mappings.py` | Script import manual mappings |

---

## Tips

### Tăng số lượng URLs cho Geopy
Sửa file `scripts/04_geopy_enrich.py`:
```python
# Dòng cuối cùng
enrich_with_geopy(input_file, output_file, max_urls=1000)  # Tăng từ 500 lên 1000
```

### Xử lý batch với ChatGPT
Chia file CSV thành nhiều phần nhỏ (500-1000 URLs/file) để ChatGPT xử lý dễ hơn:
```bash
# Split CSV into chunks of 500 lines
split -l 500 data/unknown_urls_for_chatgpt.csv data/chunk_
```

### Merge kết quả từ nhiều sources
Nếu có kết quả từ cả geopy và ChatGPT, ưu tiên ChatGPT (manual) hơn:
```bash
# 1. Import geopy results first
python3 scripts/02_import_to_pb.py data/klook_experiences-activity_geopy_enriched.json klook

# 2. Then import ChatGPT results (will override)
python3 scripts/05_import_manual_mappings.py data/unknown_urls_chatgpt_processed.csv
python3 scripts/02_import_to_pb.py data/klook_experiences-activity_manual_enriched.json klook
```

---

## Lưu Trữ Mapping cho Tương Lai

Tất cả mappings (từ geopy và ChatGPT) sẽ được lưu vào:
- `scripts/lib/geo_knowledge.json` (auto-updated)
- `data/*_enriched.json` (versioned results)

Khi có dữ liệu mới từ platforms khác, hệ thống sẽ tự động sử dụng mappings đã có.
