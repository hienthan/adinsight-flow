# Trip Transport Non-Core Rules

Spec nay chot rule tam thoi cho nhom URL transport-related nhung khong nam trong:

- `guide/transport`

Muc tieu:

- khong bo sot demand transport co gia tri
- khong lam classifier core bi loang
- uu tien search demand va transport intent ro rang

## 1. Principle

`pattern` khong phai gate cung.

Neu URL:

- co transport intent ro
- co volume/traffic thuc te
- khong qua utility/tofu/noise

thi van co the duoc giu trong nhom:

- `transport_related_non_core`

## 2. Non-Core Source Patterns

Nhung pattern non-core co the duoc xem xet:

- `transport/station`
- `transport/station-poi`
- `transport/<route-slug>`
- `things-to-do/transport`
- `blog`

Nhung pattern thuong nen exclude:

- `things-to-do/experiences`
- `moments/theme`
- `travel-guide/attraction`
- `flights/*`
- `hotels/*`

## 3. Buckets

### A. `keep_strong`

Dung cho URL non-core nhung co transport intent ro va xung dang review/import cung core transport.

Dieu kien uu tien:

- `traffic > 0`
- path/title ro route intent:
  - `to`
  - `airport`
  - `station`
  - `transfer`
  - `jr pass`
- khong match noise topics

Vi du:

- `transport/taipei-to-hualien`
- `transport/tokyo-station-to-narita-airport`
- `transport/narita-airport-to-yokohama`
- `things-to-do/transport/jr-pass`

### B. `keep_review`

Dung cho URL co kha nang dung duoc, nhung can review ky hon.

Thuong la:

- `blog` transport volumes kha
- `transport/station` volumes thap/trung binh
- airport/station guide khong qua ro conversion value

### C. `exclude_non_core`

Loai ra khoi shortlist transport non-core.

Thuong la:

- flights/hotels pages
- experiences generic
- moments/theme pages
- attraction-led pages
- transport + food/hotel/night-market content
- traffic = 0

## 4. Noise Topics

Neu title/path co cac keyword sau thi uu tien downrank/exclude:

- `food`
- `restaurant`
- `hotel`
- `attraction`
- `museum`
- `shopping`
- `night market`
- `stay`

## 5. Operational Rule

`guide/transport` van la core bucket.

`transport_related_non_core` chi la sidecar bucket de:

1. khong bo sot demand co gia tri
2. review rieng
3. chi import/activate neu xung dang

## 6. Current Recommendation

Flow dung cho non-core transport:

1. classify full batch
2. tach non-core transport shortlist
3. chia thanh:
   - `keep_strong`
   - `keep_review`
   - `exclude_non_core`
4. review shortlist truoc
5. chi khi on moi merge vao main operational set
