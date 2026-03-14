# OUTBOUND_MAP

## 1. Purpose

Outbound Map là feature giúp nhìn nhanh toàn bộ mạng lưới campaign outbound theo logic:

- source market nào đang chạy ads
- source market đó đang đẩy traffic sang destination nào
- mỗi route đang gắn với campaign nào trong `campaigns` collection

Mục tiêu chính không phải report Google Ads performance trực tiếp, mà là:

- coverage visibility
- operational planning
- route ownership
- gap detection
- campaign-to-route mapping

Feature này phục vụ tốt cho case:

- HK outbound -> JP / KR / TH / SG...
- TW outbound -> JP / KR / US...
- ID outbound -> AU / JP / MY...

Ví dụ:

- có camp từ `HK -> JP`
- GUI phải nhìn phát biết route này đang tồn tại
- click vào route sẽ thấy các `campaignName` liên quan

## 2. Product Positioning

Không nên làm mindmap thuần.

Mindmap đẹp để brainstorm, nhưng khi vận hành thực tế sẽ nhanh rối khi:

- số route tăng
- một route có nhiều campaigns
- cần lọc theo source / platform / status / season

Hướng chuyên nghiệp hơn:

- `Matrix View` là operator view chính
- `Route Graph View` là network view để nhìn nhanh luồng outbound
- `Geo Map View` là executive / visual support view

## 3. Core UX Principle

Một record route phải đại diện cho đúng một hướng outbound:

- `source_market`
- `destination_country`
- `destination_city` optional
- list campaign liên quan

Không dùng text note rời rạc để biểu diễn route.

Campaign vẫn là entity gốc ở `campaigns` collection hiện có. Outbound Map chỉ là layer tổ chức quan hệ route giữa source và destination.

## 4. Recommended Scope

### Phase 1

Mục tiêu:

- add route thủ công
- map route với nhiều campaign
- filter / scan / click detail
- xem coverage theo source -> destination

### Phase 2

Mở rộng:

- route health
- seasonal tags
- stale review detection
- owner / team assignment
- budget / ROAS / CPA overlay

### Phase 3

Mở rộng nâng cao:

- auto-suggest route gaps
- compare route coverage giữa platforms
- realtime collaboration
- map-based executive storytelling

## 5. Data Model Decision

Với nhu cầu hiện tại, `1 PocketBase collection` mới là đủ cho V1.

Tên đề xuất:

- `campaign_routes`

Lý do:

- đơn giản
- đủ để manual entry
- gắn được nhiều campaign vào 1 route
- không làm schema bị over-engineer quá sớm

Không cần tách ngay:

- `markets`
- `destinations`
- `campaign_route_links`

Chỉ nên normalize thêm khi:

- số routes tăng lớn
- có nhu cầu đồng bộ nhiều team
- cần nhiều metadata lặp lại cho market/destination

## 6. PocketBase Schema

Collection: `campaign_routes`

Type:

- `base`

### 6.1 Fields

#### Identity & Display

- `route_key`
  - type: `text`
  - required: `true`
  - purpose: key chuẩn hóa như `klook|HK|JP|all` hoặc `traveloka|TW|JP|tokyo`
  - note: dùng để chống duplicate, hỗ trợ search/sort

- `route_name`
  - type: `text`
  - required: `true`
  - purpose: label hiển thị như `HK -> Japan` hoặc `TW -> Tokyo, Japan`

#### Route Definition

- `platform`
  - type: `relation`
  - target: collection platform/campaign platform hiện có
  - required: `false`
  - purpose: route thuộc platform nào
  - note: nếu campaign platform collection hiện tại là `campaign_platforms` thì trỏ vào đó

- `source_market`
  - type: `select`
  - required: `true`
  - maxSelect: `1`
  - values initial: `HK`, `TW`, `ID`
  - note: có thể mở rộng sau sang `SG`, `MY`, `VN`, `PH`

- `destination_country`
  - type: `text`
  - required: `true`
  - purpose: destination cấp country như `Japan`, `Thailand`, `South Korea`
  - input UX: không nhập tay free text
  - input UX note: phải dùng dropdown canonical tương tự country filter ở AdInsight
  - source options: ưu tiên reuse country option dataset hiện có từ `platform_metadata`

- `destination_country_code`
  - type: `text`
  - required: `false`
  - purpose: ISO code chuẩn hóa như `JP`, `TH`, `KR`
  - note: nên dùng trong graph/matrix để hiển thị gọn
  - input UX: auto-fill khi user chọn `destination_country`, không cho nhập tay

- `destination_city`
  - type: `text`
  - required: `false`
  - purpose: nếu route granular tới city như `Tokyo`, `Osaka`

- `destination_label`
  - type: `text`
  - required: `false`
  - purpose: label đã format sẵn cho UI
  - example: `Tokyo, Japan`

#### Campaign Mapping

- `campaigns`
  - type: `relation`
  - target: `campaign` collection hiện có
  - required: `false`
  - maxSelect: multiple
  - purpose: một route có thể gắn nhiều campaign

#### Operational State

- `status`
  - type: `select`
  - required: `true`
  - maxSelect: `1`
  - values: `planned`, `active`, `paused`, `archived`
  - default: `active`

- `priority`
  - type: `select`
  - required: `false`
  - maxSelect: `1`
  - values: `low`, `medium`, `high`, `critical`

- `owner`
  - type: `text`
  - required: `false`
  - purpose: người chịu trách nhiệm route

- `is_core_route`
  - type: `bool`
  - required: `false`
  - default: `false`
  - purpose: route chiến lược, cần pin/highlight

#### Planning Metadata

- `seasonal_tags`
  - type: `select`
  - required: `false`
  - maxSelect: multiple
  - values initial:
    - `spring`
    - `summer`
    - `autumn`
    - `winter`
    - `sakura`
    - `golden_week`
    - `year_end`
    - `ramadan`
    - `school_break`

- `start_date`
  - type: `date`
  - required: `false`

- `end_date`
  - type: `date`
  - required: `false`

- `last_reviewed_date`
  - type: `date`
  - required: `false`

- `budget_hint`
  - type: `number`
  - required: `false`

- `target_roas_hint`
  - type: `number`
  - required: `false`

#### Notes & Extensibility

- `notes`
  - type: `text`
  - required: `false`

- `tags`
  - type: `json`
  - required: `false`
  - purpose: chỗ mở rộng cho custom labels

- `metadata`
  - type: `json`
  - required: `false`
  - purpose: extra UI state, visuals, snapshots

PocketBase system fields:

- `id`
- `created`
- `updated`

### 6.2 Minimal V1 Field Set

Nếu muốn release nhanh, có thể bắt đầu chỉ với:

- `route_key`
- `route_name`
- `platform`
- `source_market`
- `destination_country`
- `destination_country_code`
- `destination_city`
- `campaigns`
- `status`
- `priority`
- `notes`
- `is_core_route`

## 7. PocketBase Validation Rules

### 7.1 Data Rules

- `source_market` bắt buộc dùng code chuẩn, không nhập tự do
- `destination_country` không được để trống
- `destination_country` phải được chọn từ dropdown canonical, không cho user gõ text tùy ý
- `destination_country_code` được generate tự động từ country option đã chọn
- `campaigns` phải là relation thật, không lưu campId string tay
- `destination_city` là optional, nhưng nếu có thì vẫn phải thuộc cùng destination country về mặt business logic

### 7.1.1 Country Source of Truth

Ưu tiên theo thứ tự:

1. reuse source country options từ `platform_metadata` đang phục vụ country dropdown ở AdInsight
2. nếu cần enrich thêm code/label thì feed thêm data chuẩn hóa vào `platform_metadata`
3. chỉ dùng third-party country lib ở frontend như fallback mapping layer, không nên là source of truth chính

Khuyến nghị:

- `destination_country` lưu display label chuẩn
- `destination_country_code` lưu mã chuẩn như `JP`, `KR`, `TH`
- khi user chọn 1 country option, form tự set cả 2 field

Ví dụ option shape:

- `label = Japan`
- `value = Japan`
- `code = JP`

### 7.2 Duplicate Prevention

Không nên có 2 record cùng:

- `platform`
- `source_market`
- `destination_country_code`
- `destination_city`

Giải pháp:

- generate `route_key`
- đặt unique index trên `route_key`

Quy ước:

- nếu không có city thì dùng `all`
- lowercase phần city trong `route_key`

Ví dụ:

- `klook|HK|JP|all`
- `klook|HK|JP|tokyo`
- `traveloka|TW|KR|seoul`

## 8. PocketBase Indexes

Theo PocketBase best practices, đây là collection sẽ bị filter thường xuyên, nên cần index sớm.

### 8.1 Required Indexes

- unique index:
  - `route_key`

- filter index:
  - `(source_market, status)`

- filter index:
  - `(platform, source_market, status)`

- filter index:
  - `(destination_country_code, status)`

- filter index:
  - `(is_core_route, status)`

### 8.2 Optional Indexes

- `(priority, status)`
- `(owner, status)`
- `(last_reviewed_date)`

## 9. PocketBase API Rules

Do app hiện tại đang chạy thin-client React trực tiếp với PocketBase, rule nên rõ ràng ngay từ đầu.

### 9.1 V1 Internal Team Mode

Nếu đây là tool nội bộ và team đều là authenticated users:

- `listRule`: authenticated only
- `viewRule`: authenticated only
- `createRule`: authenticated only
- `updateRule`: authenticated only
- `deleteRule`: admin only hoặc authenticated only tùy team size

Pseudo:

- `listRule = @request.auth.id != ""`
- `viewRule = @request.auth.id != ""`
- `createRule = @request.auth.id != ""`
- `updateRule = @request.auth.id != ""`
- `deleteRule = @request.auth.role = "admin"`

Nếu app hiện tại vẫn dựa nhiều vào public rules để local dev nhanh, thì tối thiểu nên khóa `create/update/delete` thay vì public hết.

### 9.2 Expansion Strategy

Khi load route list, nên expand:

- `platform`
- `campaigns`

Mục tiêu:

- tránh N+1 queries
- route detail drawer mở ra có data ngay

## 10. Business Logic

### 10.1 One Route = One Direction

`HK -> JP` là record khác với:

- `JP -> HK`
- `HK -> Tokyo`

Không coi hai route đó là một.

### 10.2 Route Granularity

Ưu tiên level country cho V1.

City chỉ dùng khi:

- team thực sự cần track theo destination cụ thể
- ví dụ `HK -> Tokyo` và `HK -> Osaka` là 2 route khác nhau

Nếu chưa cần, chỉ lưu:

- `HK -> Japan`

### 10.3 Status Logic

- `planned`: route dự định chạy, chưa launch
- `active`: đang vận hành
- `paused`: tạm ngưng
- `archived`: không còn dùng, chỉ giữ lịch sử

### 10.4 Route Health Heuristic

V1 chưa cần pull Google Ads metrics. Có thể dùng health đơn giản:

- `active` nhưng không có campaign nào -> warning
- `active` nhưng `last_reviewed_date` quá cũ -> stale
- duplicate route -> merge warning
- route core nhưng status paused -> highlight

## 11. UI View System

### 11.1 View 1: Matrix View

Đây là main operator view.

Rows:

- source markets

Columns:

- destination countries

Cell content:

- số campaign
- route status dot
- core route badge nếu có

Cell interaction:

- click mở route detail drawer
- nếu chưa có route thì hiện quick-add CTA

Ưu điểm:

- scan coverage rất nhanh
- biết market nào đang thiếu destination nào
- tốt hơn mindmap khi số route tăng

### 11.2 View 2: Route Graph View

Đây là network view.

Node groups:

- left column: source markets
- right column: destinations

Edge:

- nối từ source sang destination
- thickness = campaign count hoặc budget hint
- color = status

Interaction:

- hover edge -> summary
- click edge -> drawer detail
- filter source/platform/status ngay trên graph

### 11.3 View 3: Geo Map View

Đây là executive / visual support view.

Use case:

- nhìn tổng footprint outbound
- dùng trong planning/presentation

Không nên dùng làm primary operator view vì:

- khó scan dense data
- route chồng lên nhau nhanh

## 12. Recommended Screen Layout

Route name đề xuất:

- `Outbound Route Diagram`

URL đề xuất:

- `/camp-tracking/outbound-map`

### 12.1 Screen Sections

1. Header
2. KPI summary bar
3. filter toolbar
4. view toggle
5. main canvas
6. route detail drawer

### 12.2 KPI Summary

Cards đề xuất:

- `Active Routes`
- `Source Markets Covered`
- `Destinations Covered`
- `Unmapped Active Routes`
- `Core Routes`

### 12.3 Filters

- platform
- source market
- destination country
- status
- priority
- seasonal tag
- owner
- core only
- search by route name / destination / campaign name

Note:

- `destination country` filter nên reuse dropdown pattern đang có ở AdInsight
- nếu dropdown hiện tại support multi-select thì Outbound Map cũng nên support multi-select cho destination filter
- route create/edit form thì dùng single-select cho `destination_country`

## 13. Wireframe

```text
+--------------------------------------------------------------------------------------+
| Outbound Route Diagram                                          [Add Route] [Export] |
+--------------------------------------------------------------------------------------+
| Active Routes | Markets Covered | Destinations | Unmapped | Core Routes              |
+--------------------------------------------------------------------------------------+
| Platform [All] | Source [All] | Destination [All] | Status [Active] | Core [Any]    |
| Search [ HK -> JP / Tokyo / campaign name ...                           ]            |
+--------------------------------------------------------------------------------------+
| [Matrix View] [Route Graph] [Geo Map]                                                 |
+--------------------------------------------------------------------------------------+
| MATRIX VIEW                                                                           |
|                                                                                       |
| Source \ Dest | JP       | KR       | TH       | SG       | AU       | US            |
| HK            | 3 Active | 1 Paused | 2 Active | + Add    | + Add    | 1 Planned     |
| TW            | 2 Active | 2 Active | + Add    | + Add    | + Add    | + Add         |
| ID            | 1 Active | + Add    | 4 Active | 1 Active | 2 Active | + Add         |
|                                                                                       |
| Click any cell to open route detail                                                   |
+--------------------------------------------------------------------------------------+
| ROUTE DETAIL DRAWER                                                                   |
| HK -> Japan                                                                           |
| Platform: Klook | Status: Active | Priority: High | Owner: Hien                      |
| Campaigns: [camp_123] [camp_456] [camp_789]                                          |
| Season: Sakura, Golden Week                                                           |
| Last Reviewed: 2026-03-10                                                             |
| Notes: Strong HK demand for JP evergreen + seasonal spikes                            |
|                                                               [Edit] [Archive]       |
+--------------------------------------------------------------------------------------+
```

## 14. Real-Life Professional Features

### 14.1 Coverage Gap Detection

Ví dụ:

- HK đang có JP / KR / TH nhưng chưa có SG

UI có thể gợi ý:

- `Potential gap: HK has no Singapore outbound route`

### 14.2 Route Health Badge

Badge states:

- healthy
- stale
- unmapped
- duplicate risk

### 14.3 Seasonal Planning Layer

Gắn seasonal tags để tránh route map chỉ là sơ đồ tĩnh.

Ví dụ:

- `sakura`
- `summer`
- `year_end`

Nhờ đó team nhìn được:

- route nào đang đúng mùa
- route nào là evergreen

### 14.4 Owner Visibility

Mỗi route nên có `owner`, để khi nhìn dashboard biết ai đang giữ route đó.

### 14.5 Platform Split

Cùng route:

- `HK -> JP`

nhưng Klook và Traveloka có thể là 2 record khác nhau nếu chiến lược khác nhau.

### 14.6 Quick Add

Từ matrix cell trống:

- click `+ Add`
- mở mini form:
  - platform
  - source
  - destination
  - campaign IDs
  - status

### 14.7 Drawer-First Editing

Không nên bắt user sang page khác ngay.

Best UX:

- click route
- mở side drawer
- edit inline các field quan trọng

## 15. React Implementation Proposal

Codebase hiện tại đã có:

- React + Vite
- React Router
- TanStack Query
- PocketBase client
- page pattern trong `frontend/src/pages/CampTracking`

Nên implement theo structure tương tự Camp Tracking thay vì tạo module lạ hoàn toàn.

### 15.1 New Route

Add route:

- `/camp-tracking/outbound-map`

### 15.2 Suggested Page Structure

Files đề xuất:

- `frontend/src/pages/OutboundMap/OutboundMapPage.tsx`
- `frontend/src/pages/OutboundMap/OutboundMapToolbar.tsx`
- `frontend/src/pages/OutboundMap/OutboundMapStats.tsx`
- `frontend/src/pages/OutboundMap/OutboundMapMatrix.tsx`
- `frontend/src/pages/OutboundMap/OutboundMapGraph.tsx`
- `frontend/src/pages/OutboundMap/OutboundMapGeo.tsx`
- `frontend/src/pages/OutboundMap/RouteDetailDrawer.tsx`
- `frontend/src/pages/OutboundMap/RouteFormModal.tsx`
- `frontend/src/pages/OutboundMap/useOutboundRoutes.ts`
- `frontend/src/pages/OutboundMap/types.ts`
- `frontend/src/pages/OutboundMap/utils.ts`

### 15.3 Data Hooks

`useOutboundRoutes.ts` nên chịu trách nhiệm:

- fetch route list từ PocketBase
- apply filter params
- expand `platform,campaigns`
- derive matrix data
- derive graph nodes/edges
- derive KPI counts

Ngoài ra nên có:

- `useCountryOptions.ts`
  - reuse logic country dropdown từ AdInsight
  - normalize option shape cho Outbound Map
  - expose cả `label` và `countryCode`

### 15.4 TypeScript Types

Đề xuất types:

- `CampaignRoute`
- `CampaignRouteFilters`
- `RouteMatrixCell`
- `RouteGraphNode`
- `RouteGraphEdge`
- `RouteHealthState`

### 15.5 State Model

Page state nên gồm:

- current view: `matrix | graph | geo`
- selected route id
- filter params từ URL search params
- drawer open/close
- add/edit modal state

### 15.6 Query Strategy

Dùng TanStack Query:

- query key chứa filter state
- fetch `campaign_routes`
- select/transform tại hook layer

Tránh:

- fetch routes rồi lại fetch campaign từng cái

Nên:

- expand `campaigns`
- expand `platform`

### 15.7 UI Components Reuse

Ưu tiên reuse component sẵn có:

- `SurfaceCard`
- `SafeButton`
- `FilterChip`
- `ToolbarGroup`

Điều này giữ visual language thống nhất với Camp Tracking.

Ưu tiên reuse thêm logic từ AdInsight:

- country dropdown option source
- multi-select behavior cho filter toolbar

## 16. Recommended UI Logic

### 16.1 Matrix Cell Rules

Nếu có route:

- show count campaign
- show status tint
- show core badge nếu có

Nếu không có route:

- show dashed empty cell
- hover hiện `Add route`

### 16.2 Drawer Summary Rules

Drawer luôn ưu tiên trả lời 5 câu hỏi:

1. route nào
2. platform nào
3. đang active hay không
4. đang gắn campaign nào
5. note / owner / season là gì

### 16.3 Search Behavior

Search nên match:

- `route_name`
- `source_market`
- `destination_country`
- `destination_city`
- expanded campaign name

### 16.4 Country Dropdown Behavior

Form tạo/sửa route:

- `destination_country` là single-select dropdown
- user chọn country xong thì auto fill:
  - `destination_country`
  - `destination_country_code`
  - `destination_label` nếu không có city

Filter toolbar:

- destination filter support multi-select
- option list lấy cùng source với AdInsight country dropdown

## 17. Visual Design Direction

Không nên làm diagram kiểu generic mindmap nhiều nhánh.

Nên theo visual direction:

- airline route board
- network operations map
- clean strategist dashboard

Guidelines:

- source markets dùng màu cố định
- status dùng semantic colors
- core route có accent riêng
- graph edge thickness phản ánh volume
- layout phải đọc tốt trên desktop trước, mobile là secondary

## 17.1 Premiumization Roadmap

Mục tiêu premium hóa không phải là thêm màu ngẫu nhiên.

Mục tiêu đúng:

- tăng signal hierarchy
- nhìn phát biết route nào quan trọng
- có cảm giác product dành cho operator thật, không phải internal tool thô

### Premium Direction 1: Color System By Semantics

Nên có 4 lớp màu rõ ràng:

- source market color
- route status color
- route health color
- premium neutral background system

Không nên:

- để toàn bộ card cùng một màu trắng/xám
- dùng một accent màu cho mọi meaning

Khuyến nghị:

- `HK` / `TW` / `ID` có accent riêng nhưng cùng saturation family
- `active` = emerald
- `planned` = electric blue
- `paused` = amber
- `archived` = slate
- `core route` = brass / champagne accent nhẹ, không dùng vàng chói

### Premium Direction 2: Density Layering

Page nên có 3 lớp density:

- executive summary
- operator alerts
- tactical canvas

Hiện tại direction đã đúng. Các bước tiếp theo:

- KPI cards có thêm micro-context
- signal panels có visual hierarchy mạnh hơn
- matrix cell có depth rõ giữa empty / active / multi-route / stale

### Premium Direction 3: Matrix Cell As Product Surface

Matrix là phần quan trọng nhất để premium hóa.

Các bước:

- empty cell có dashed grid đẹp hơn + hover intent rõ
- active cell có subtle gradient theo status
- multi-route cell có stacked indicator
- core route có top-left accent strip hoặc medal chip
- stale/unmapped cell có warning edge treatment

### Premium Direction 4: Drawer Experience

Drawer cần cảm giác như control panel:

- header mạnh hơn
- route switcher đẹp hơn cho multi-route cells
- campaigns list có platform/status chips rõ
- note area và metadata area tách lớp background

### Premium Direction 5: Motion

Motion nên có ít nhưng đúng:

- drawer slide-in mượt
- matrix cell hover raise nhẹ
- graph edge hover glow nhẹ
- tab switch có fade/slide ngắn

Không cần:

- micro animation everywhere
- bouncing / playful motion

### Premium Direction 6: Premium Background System

Nên thêm subtle background treatment cho toàn page:

- soft radial wash
- faint grid / airline-board texture
- top header glow theo active filter state

Background phải đủ tinh tế để không phá readability.

### Premium Direction 7: Typography Contrast

Premium cảm giác nhiều khi đến từ typography hơn là màu.

Các bước:

- section label nhỏ, uppercase, tracking rõ
- big numbers ở KPI cards cần mạnh hơn
- route title / platform / metadata có contrast cấp bậc rõ
- badge text không quá nhỏ

### Premium Direction 8: Real-Life Operator Best Practice

Premium với dashboard vận hành không phải chỉ đẹp.

Nó phải giúp user ra quyết định nhanh hơn:

- thiếu route nào
- route nào cần action
- route nào có nhiều platform split
- route nào là core business

Nghĩa là mọi lớp visual phải phục vụ:

- scan speed
- exception handling
- planning confidence

### Suggested Premiumization Order

1. semantic color system
2. matrix cell states
3. multi-route drawer switcher
4. page background / header atmosphere
5. motion polish

## 18. Operational Notes

### 18.1 Manual Data Entry Is Acceptable

Feature này hoàn toàn phù hợp với manual entry ở phase đầu.

Lý do:

- số source markets ít
- route count chưa quá lớn
- business logic do team quyết định, khó auto infer chính xác

### 18.2 Sync Discipline

Để data không nát:

- campaign mới mà thuộc route có sẵn thì phải attach vào route record
- campaign dừng hẳn thì review lại route status
- định kỳ check route active nhưng không có campaign

### 18.3 Naming Convention

Luôn dùng code chuẩn:

- `HK`
- `TW`
- `ID`
- `JP`
- `KR`
- `TH`

Display label có thể human-friendly hơn:

- `Hong Kong`
- `Taiwan`
- `Indonesia`
- `Japan`

## 19. Risks

### 19.1 Duplicate Route Risk

Nếu không có `route_key`, rất dễ bị:

- `HK -> Japan`
- `HK -> JP`
- `Hong Kong -> Japan`

thành 3 record khác nhau.

### 19.2 Granularity Drift

Nếu lúc thì lưu country, lúc thì lưu city, matrix sẽ loạn.

Giải pháp:

- define rõ default granularity là country
- city chỉ là override khi thực sự cần

### 19.3 Public Rule Risk

Nếu PocketBase collection để public write, dữ liệu route rất dễ hỏng.

## 20. V1 Build Checklist

- tạo collection `campaign_routes`
- add unique `route_key`
- map relation tới campaign collection
- add page `Outbound Route Diagram`
- add matrix view
- add detail drawer
- add quick add/edit modal
- add filters theo source/destination/status/platform
- add KPI summary

## 21. Final Recommendation

Thứ tự build nên là:

1. PocketBase schema `campaign_routes`
2. page `Outbound Route Diagram`
3. matrix view
4. route detail drawer
5. add/edit modal
6. graph view
7. geo map view

Kết luận cho current scope:

- `1 collection mới` là đủ cho V1
- `Matrix View` nên là màn chính
- `Route Graph` là secondary view
- `Geo Map` là executive support view
- tuyệt đối không biến feature này thành mindmap thuần
