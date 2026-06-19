# Testing Overview Dashboard Spec V1

Muc tieu cua page nay:

- cho user 1 strategic view thuc su de nhin nhanh tung `platform family` dang test o dau
- tra loi nhanh:
  - platform nao dang `live`, `testing`, `failed`, `watching`
  - source market nao dang active
  - topic nao dang khoe hoac dang fail
  - lane nao la `market_only`
  - dau la failure memory can tranh retest
- khong bat user phai doc lane-by-lane ngay tu dau

Recommended route:

- `/camp-tracking/testing-overview`

## 1. Product Positioning

Page nay khac:

- `Camp Test Tracking`
  - operator/detail page
  - dung de tao, sua, doc timeline cua 1 lane

- `Coverage Overview`
  - detailed analytical layer
  - dung khi can matrix `source_market -> destination_country`

`Testing Overview Dashboard` la:

- strategic executive layer
- uu tien scan nhanh, pattern recognition, gap detection

## 2. Core Decision

Overview nay phai group theo `platform family`, khong group theo `marketplace variant`.

Vi du:

- `Klook-MO`
- `Klook-ECO`

deu phai roll up ve:

- `Klook`

Neu khong, overview se bi nhieu block nho va lam user mat cai nhin tong quat.

## 3. Questions This Page Must Answer

Khi mo page, user phai biet rat nhanh:

- `Klook` hien dang test o market nao
- market nao dang live/on dinh, market nao dang fail
- topic nao dang duoc push
- topic nao da fail va can ghi nho
- lane `market_only` nao dang duoc test de do nhan biet brand/platform

## 4. Information Hierarchy

Page nen co 4 lop:

1. global summary row
2. high-level filters
3. platform family blocks
4. drill-down links sang `Camp Test Tracking` va `Coverage Overview`

## 5. Global Summary Row

Can co:

- `Platform Families`
- `Markets Active`
- `Live`
- `Testing`
- `Failed`
- `Watching`
- `Market-only`
- `Do Not Retest`

Muc tieu:

- chi can vao page la thay portfolio dang o trang thai nao

## 6. Filters

Filters cua page nay nen it hon `Coverage Overview`.

Chi can:

- `platform family`
- `source_market`
- `status`
- `pattern_topic`
- `search`

Khong nen default show qua nhieu filter detail nhu:

- `destination_city`
- `result`
- `cookie_state`

nhung van co the bo sung o drawer/detail sau nay.

## 7. Main UI Blocks

### 7.1 Platform Snapshot Block

Moi `platform family` la 1 block lon.

Header block show:

- platform family name
- live/testing/failed/watching counts
- `market_only` count
- `do_not_retest` count

Subheader show:

- source markets dang active
- so destination countries dang cover
- so topics dang active

### 7.2 Market Snapshot

Trong moi platform block, can co 1 section:

- `By Market`

Moi row market show:

- market code
- tong so lanes
- live/testing/failed mix
- top destinations
- top topics

User can nhin nhanh:

- `Klook` dang test manh nhat o `HK`, `TW`, hay `MY`

### 7.3 Topic Health

Section:

- `Topic Health`

Moi topic show:

- live count
- testing count
- failed count
- markets dang chay topic do

User can nhin nhanh:

- topic nao dang on
- topic nao dang fail lap lai

### 7.4 Failure Memory

Section:

- `Failure Memory`

Chi show:

- lanes `failed`
- lanes `do_not_retest`
- negative learnings gan nhat

Phan nay rat quan trong vi overview khong chi de xem cai dang chay, ma con de tranh lap lai test sai.

### 7.5 Market-Only Lanes

Section rieng:

- `Market-Only`

Dung cho:

- brand/platform awareness
- utility topics trong source market ma khong target destination nao

Khong duoc tron `market_only` vao destination coverage matrix.

## 8. Recommended Interaction Model

Click vao market row:

- mo `Camp Test Tracking` voi filter prefilled

Click vao topic row:

- mo `Camp Test Tracking` voi `platform + topic` da loc

Click vao failure memory item:

- mo thang lane detail o `Camp Test Tracking`

Neu can matrix chi tiet:

- user moi sang `Coverage Overview`

## 9. Visual System

Best practice:

- moi platform family block dung `platform.color` lam accent
- su dung cung shared theme voi `Camp Test Tracking`
- khong de moi lane card giong het nhau
- section lon phai co panel surface ro
- section nho ben trong phai co border/background hierarchy ro

## 10. Why This Page Exists Separately

Neu tiep tuc nhiet huyet nhoi overview vao `Coverage Overview`, page do se bi nua detail, nua strategy.

Tac hai:

- user moi vao se thay qua nhieu chi tiet
- kho scan nhanh
- kho maintain

Tach page rieng se ro hon:

- `Testing Overview Dashboard` = strategic layer
- `Coverage Overview` = detailed analysis layer
- `Camp Test Tracking` = operational lane editor
