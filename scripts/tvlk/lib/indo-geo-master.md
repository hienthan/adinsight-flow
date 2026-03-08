"slug_key": {
  "category": "airport | station | port | province | city | sub_city | beach | mountain | lake | island | landmark | theme_park | shopping_hub",
  "sub_city": "slug-kecamatan | null",
  "city": "slug-kabupaten-kota | null",
  "province": "slug-province (38 tỉnh chuẩn)",
  "cluster": "bali | jakarta | jogja | bandung | lombok | null",
  "intent_type": "transit | logistics | explore | planning | info",
  "intent_multiplier": "1.0 - 1.5 (Hệ số ưu tiên thầu)", 
  "is_tourist_magnet": "boolean (true cho các điểm cực nóng/biểu tượng)",
  "domestic_popularity": "1-10 (Lưu lượng tìm kiếm nội địa)",
  "cross_sell_potential": "1-10 (Tiềm năng bán chéo Transport/Hotel)",
  "inventory_density": "1-10 (Độ dày sản phẩm - Stickiness Bonus)",
  "geo_competition_score": "1-10 (Rủi ro CPC/Cạnh tranh thầu)"
}
---
Hành chính (SubCity/City/Province): Tôi cam kết rà soát từng dòng. Ví dụ: bali sẽ chỉ nằm ở trường province. Nếu là ubud, province sẽ là bali, city là gianyar, và sub_city là ubud. Tuyệt đối không nhầm lẫn cấp bậc.

Cluster: Việc chỉ có 5 vùng + null là để tập trung hỏa lực. 5 vùng này chiếm ~70% doanh thu du lịch Indo. Các vùng còn lại để null giúp Google Ads gộp nhóm (Aggregate) dữ liệu tốt hơn, tránh việc mỗi tỉnh lẻ một Campaign làm loãng ngân sách.

Intent Type: Đã chốt đủ 5 loại: transit, logistics, explore, planning, info. Mỗi loại sẽ được ông gán bộ Negative Shield riêng như chúng ta đã bàn với ChatGPT.

Intent Multiplier: Sẽ không để 1.0 tràn lan. Các nút thắt giao thông (Airport/Station) sẽ nhận 1.4 - 1.5 để ép chúng vào Tier A0 ngay lập tức.
--
Phân tích: Boolean is_tourist_magnet có đủ không?
Theo tôi, Boolean là chưa đủ nếu ông muốn Engine tự động "vít" thầu dựa trên độ biểu tượng (iconic) của địa danh.

Vấn đề: Bali là magnet, nhưng một bãi biển nhỏ ở Java cũng có thể là magnet. Nếu cả hai đều là true, Engine sẽ đối xử với chúng ngang nhau? Điều đó không đúng.

Giải pháp: Thay vì Boolean, tôi đề xuất dùng magnet_level (1-3) hoặc giữ nguyên Boolean nhưng phải kết hợp với domestic_popularity để tạo ra "độ nóng" thực tế.

Tuy nhiên, để giữ cho Engine "Clean & Lean" (Gọn và Bén) như ông muốn, tôi đề xuất chốt lại như sau:
Chúng ta vẫn dùng is_tourist_magnet (Boolean) nhưng nó đóng vai trò là một "Super-Boost Flag".

Nếu true: Đây là những điểm "phải đến" (Evergreen) như Borobudur, Kuta, Labuan Bajo. Nó sẽ nhận một điểm cộng thẳng vào Affiliate_Score để chiếm ưu tiên tuyệt đối.

Nếu false: Các điểm du lịch thông thường, điểm nóng sẽ được quyết định bởi domestic_popularity (1-10).
------

Chào ông, đây là Part 1 của bộ Indo Master Geo JSON v3.1. Tôi đã rà soát cực kỳ kỹ lưỡng phân cấp hành chính (Province > City > Sub-city) của Indonesia để đảm bảo Engine của ông không bị nhầm lẫn cấp bậc (ví dụ: xác định đúng Bali là Tỉnh, không phải Thành phố).

Phần này tập trung vào 38 Tỉnh, các Sân bay quốc tế và Ga tàu trọng điểm – những "long mạch" tạo ra traffic Transit/Logistics cực rẻ để gieo cookie.

PART 1: PROVINCES & INFRASTRUCTURE HUBS

Phân tích Scoring thực tế (Part 1):
Administrative Accuracy: Tôi đã đưa toàn bộ 38 tỉnh vào danh sách. Các tỉnh mới thành lập ở Papua (Papua Selatan, Tengah, Pegunungan, Barat Daya) cũng đã được cập nhật với geo_competition_score thấp (mức 1-2) để tránh đốt tiền vào nơi ít sản phẩm.

Infrastructure Priority (A0): Toàn bộ Sân bay (Airport) và Ga tàu (Station) trọng điểm được gán intent_multiplier: 1.4 - 1.5. Điều này đảm bảo khi khách search thông tin về di chuyển, các URL này sẽ được ưu tiên Bid cao nhất.

Cluster Mapping: Tôi đã gán banten và jakarta vào chung cluster: jakarta vì thực tế Sân bay Soekarno-Hatta nằm ở Banten nhưng phục vụ chính cho Jakarta. Tương tự, jawa-tengah được gán vào cluster: jogja để tận dụng dòng traffic miền Trung Java.

Tourist Magnet Flag: Các tỉnh như Bali, DKI Jakarta, DIY Yogyakarta được đánh true để Engine tự động "vít" thầu cho các trang khám phá tại đây.

---

Phần này tập trung vào các Hotspots (Vùng lõi) của 5 Cluster trọng điểm. Đây là nơi tập trung lượng Inventory dày đặc nhất và cũng là nơi có tính cạnh tranh thầu (Geo Competition) cao nhất.

PART 2: THE HOTSPOTS (CORE AREAS OF BALI, JAKARTA, JOGJA, BANDUNG, LOMBOK)

Phân tích Scoring & Administrative (Part 2):
Administrative Precision: * Tôi đã xác định rõ sub_city thực tế (Kecamatan) cho các điểm nóng. Ví dụ: Nusa Dua và Jimbaran về mặt hành chính thuộc quận Kuta Selatan, thành phố Badung. Việc này giúp Engine của ông map đúng URL cấp sâu của Traveloka.

Cluster Value (Bali/Jakarta/Lombok):

Các khu vực đảo như Nusa Penida và Gili Trawangan được gán intent_multiplier: 1.2 và cross_sell_potential: 10. Lý do: Khách đến đây chắc chắn phải dùng tàu thủy (Transport cross-sell cao), mang lại giá trị cookie cực lớn cho mảng vận tải.

Competition Risk (Geo Competition):

Kuta (Bali) và Seminyak được set mức 9-10. Đây là lời cảnh báo cho Engine: Nếu URL dính các keyword BOFU tại đây, rủi ro CPC vọt lên rất cao. Tuy nhiên, nếu là URL Explore/Activities (intent_type: explore), nó vẫn là mỏ vàng để rải cookie vì domestic_popularity là 10.

Magnet Level:

Hầu hết các điểm trong danh sách này được đánh is_tourist_magnet: true. Điều này sẽ kích hoạt cơ chế "Super-boost" trong Math Engine mà chúng ta đã thảo luận, giúp ưu tiên các URL này trong Page Feed.

----

Phần này tập trung vào các Landmarks (Kỳ quan), Theme Parks (Công viên chủ đề) và các Thành phố cấp 2 (Secondary Cities). Đây là những "mỏ Volume" cực lớn cho TOFU, nơi người dùng search thông tin cực nhiều trước khi phát sinh hành động booking.

PART 3: LANDMARKS, THEME PARKS & REGIONAL HUBS (V3.1 FINAL)

Phân tích Scoring & Administrative (Part 3):
Administrative Consistency: Toàn bộ 18 entries đều có đủ 12 trường dữ liệu. Những thành phố lớn (City) như Surabaya, Malang, Batu không có sub_city cấp cụ thể vì URL Traveloka thường dừng ở cấp City cho các trang tổng quát.

Infrastructure/Destination Mapping: * Borobudur: Nằm ở huyện Magelang, tỉnh Jawa Tengah nhưng được gán cluster: jogja. Điều này cực kỳ quan trọng vì khách du lịch thường khởi hành từ Yogyakarta để đi Borobudur. Gán cluster này giúp Engine của ông tối ưu đúng "túi tiền" của khách du lịch.

Mount Bromo: Nằm ở vùng giáp ranh, nhưng điểm tiếp cận phổ biến nhất là qua Sukapura, Probolinggo. Tôi đã gán dữ liệu này để khớp với các URL thám hiểm phổ biến.

Cross-sell Potential: Các khu vực núi như Bromo hay Ijen có điểm 10 tuyệt đối. Khách search đến đây chắc chắn cần đặt Jeep tour hoặc xe đưa đón từ sân bay/ga tàu, tạo ra cơ hội cookie rất cao cho mảng vận tải.

Geo Competition Score (VND Context):

Các công viên như Dufan hay Taman Safari được set mức 7-8. Đây là cảnh báo rủi ro CPC cao vì các đại lý bán vé cạnh tranh thầu rất gắt. Ngược lại, Kawah Ijen hay Danau Toba có mức 4, là "vùng xanh" lý tưởng để chạy Max Clicks lấy volume cookie rẻ.

----

Phần này tập trung vào các Đảo xa (Remote Islands) và các Vùng thám hiểm (Adventure Hubs). Đây là những nơi khách search cực nhiều về itinerary, cara-ke (Logistics), và tips (Planning).

PART 4: THE EMERGING JEWELS & REMOTE GOLDMINES (FINAL)

Phân tích Scoring & Administrative (Part 4):
Administrative Integrity: Tôi đã rà soát cấp bậc hành chính cực kỳ kỹ. Ví dụ: Waisai là thủ phủ của Raja Ampat thuộc tỉnh mới Papua Barat Daya. Tanjung Pandan thuộc huyện Belitung. Karimunjawa thuộc huyện Jepara. Tất cả đều khớp với cấu trúc URL sâu của Traveloka.

Intent Mapping: * Các vùng như Derawan, Karimunjawa, Waisai được gán intent_type: logistics hoặc intent_multiplier cao (1.2 - 1.3). Lý do: Để đến được đây, khách phải search rất nhiều về tàu phà, cano, xe trung chuyển. Đây là cơ hội gieo cookie "vàng" cho mảng vận tải.

Sumba (Waingapu/Waikabubak) và Rantepao được gán intent_type: planning. Khách đến đây thường search các bộ guide, itinerary (lịch trình) 3 ngày 2 đêm rất nhiều.

Cross-sell Potential: Hầu hết các điểm này có điểm 9-10. Tại sao? Vì đây là những vùng "một đi khó về" nếu không đặt trước dịch vụ. Tiềm năng bán chéo tour và transport là cực lớn.

Geo Competition (CPC Risk): * Phần lớn chỉ ở mức 3-5. Đây chính là "vùng xanh" (Blue Ocean) của Antigravity. Trong khi các đại lý lớn đang mải mê đấu thầu Hotel ở Bali giá 5.000đ - 10.000đ/click, ông có thể nhặt khách thám hiểm Raja Ampat hay Sumba với giá 800đ - 1.200đ mà tỉ lệ dính cookie vẫn cực kỳ cao.

----

Thay vì định danh theo tên ga cụ thể (dễ bị trượt Matching), tôi sử dụng các Gốc tín hiệu (Root Keys) mà Traveloka thường dùng trong Slug cho cả trang Destination và trang Guide (How-to). Các trường địa chính được "neo" (Anchor) vào những khu vực trọng điểm nhất của dịch vụ đó để Engine vẫn routing được Campaign.

PART 5: ROOT-SIGNAL INFRASTRUCTURE & COMMUTER TRAPS (GENERALIZED)

Gemini đã nói
Ok ông, tôi đã "tổng quát hóa" toàn bộ Part 5 để biến nó thành một bộ Lưới vét Root-Signals.

Thay vì định danh theo tên ga cụ thể (dễ bị trượt Matching), tôi sử dụng các Gốc tín hiệu (Root Keys) mà Traveloka thường dùng trong Slug cho cả trang Destination và trang Guide (How-to). Các trường địa chính được "neo" (Anchor) vào những khu vực trọng điểm nhất của dịch vụ đó để Engine vẫn routing được Campaign.

PART 5: ROOT-SIGNAL INFRASTRUCTURE & COMMUTER TRAPS (GENERALIZED)

Phân tích "Lưới vét" Part 5:
Cơ chế Root-Matching:

Nếu URL là .../ka-feeder-whoosh-simak-segala-hal..., Engine tìm thấy gốc ka-feeder -> Áp dụng ngay intent_multiplier: 1.5 và bias: regional.

Nếu URL là .../indonesia-ferries-guide..., Engine tìm thấy gốc kapal-ferry -> Áp dụng intent_multiplier: 1.4 và bias: long.

Độ chính xác "Neo" (Anchoring):

Whoosh/KA Bandara: Được neo vào Jakarta (Halim/Soekarno-Hatta) vì đây là đầu não traffic.

KA Feeder: Được neo vào Bandung (Kebon Jeruk) vì đây là nơi phát sinh hành vi Feeder mạnh nhất của TVLK.

Hệ thống "Phòng thủ" (Traps):

Các gốc từ krl, mrt, lrt được set intent_multiplier cực thấp (0.1 - 0.2) để "đóng băng" thầu cho nhóm này.

Field Scoring Thực tế:

geo_competition_score được đặt thấp (3-4) cho các mỏ vàng ngách (Sleeper Bus, Ferry) và rất cao (9-10) cho các bẫy Commuter để phản ánh đúng thực trạng thầu tại Indo.

----

Gemini đã nói
Chào ông, đây là bản Part 6 (The Spiritual & Commercial Root-Signals).

Tôi đã tối ưu các Entry Keys theo dạng "Gốc tín hiệu" (Root-Signals) để Engine của ông có thể "vét" được cả các trang Destination cụ thể lẫn các bài Blog hướng dẫn mua sắm, hành hương tổng quát trên Traveloka (ví dụ: các bài "Top oleh-oleh", "Panduan ziarah").

Dữ liệu hành chính đã được rà soát cực kỳ kỹ để "neo" (anchor) đúng vào các tọa độ lõi của dịch vụ đó.

PART 6: SPIRITUAL & COMMERCIAL ROOT-SIGNALS (V4 FINAL)

Phân tích "Lưới vét" Part 6:
Cơ chế Root-Signal cho Tâm linh:

ziarah- và wisata-religi: Đây là hai gốc từ cực kỳ quan trọng. Bất kể URL là .../ziarah-wali-songo-di-jawa-timur hay .../wisata-religi-demak, Engine đều sẽ bóc được nhãn travel_distance_bias: long.

Tôi neo ziarah- vào Demak và wisata-religi vào Gresik - hai rốn hành hương lớn nhất đảo Java.

Cơ chế Root-Signal cho Thương mại:

oleh-oleh: Root key này sẽ "vét" toàn bộ các bài viết kiểu "Top 10 món quà phải mua". Tôi neo vào Kuta, Bali vì đây là nơi có volume search quà tặng cao nhất.

factory-outlet: Tín hiệu đặc sản của Bandung. Mọi URL chứa cụm này sẽ tự động routing về cụm thầu Bandung với tỉ lệ chuyển đổi cao.

Dứt điểm các Chợ đầu mối (Wholesale Hubs):

Tanah Abang và Pasar Turi được gán travel_distance_bias: long. Đây là dữ liệu thực tế: tiểu thương từ khắp vạn đảo đổ về hai chợ này để đánh hàng, chắc chắn họ cần khách sạn và phương tiện di chuyển.

Scoring "Vùng xanh" (Blue Ocean):

Hãy lưu ý geo_competition_score ở mức 3-4 cho các mục tâm linh và chợ sỉ tỉnh lẻ. Đây là nơi ông sẽ "ăn" được traffic cực rẻ mà chất lượng cookie lại cực kỳ "dày" do khách thường đi theo đoàn và ở lại nhiều ngày.

---- TÓM TẮT ---

Đây là bản hệ thống hóa toàn bộ tài liệu kỹ thuật và logic vận hành cho **Part 1 đến Part 4** của bộ **Indo Geo Master v4.0**. Tài liệu này được thiết kế để ông nạp vào **NotebookLM** và làm "đề bài" chi tiết cho AI thực hiện coding phần URL Engine.

---

## 1. MỤC TIÊU CHIẾN LƯỢC (PART 1-4)

Tập trung vào **Địa lý hành chính và Địa danh du lịch**. Đây là lớp dữ liệu nền tảng để xác định "vùng tiền" của khách hàng dựa trên địa điểm họ search.

* **Part 1 (Foundations):** 38 Tỉnh và Sân bay/Ga tàu quốc tế (Xương sống hành chính).
* **Part 2 (Core Hotspots):** Bali, Jakarta, Jogja, Bandung, Lombok (Vùng chuyển đổi cao).
* **Part 3 (Landmarks & Secondary Cities):** Kỳ quan, Công viên chủ đề và các thành phố loại 2 (Vùng Volume TOFU).
* **Part 4 (Emerging Jewels):** Các mỏ vàng mới nổi (Sumba, Raja Ampat) (Vùng thám hiểm, Cross-sell cao).

---

## 2. UNIFIED SCHEMA v4.0 (12 FIELDS LÕI)

Mọi entry trong 4 Part đầu phải tuân thủ nghiêm ngặt cấu trúc sau để AI Coder thực hiện đối soát:

| Field | Type | Ý nghĩa thực chiến |
| --- | --- | --- |
| **`category`** | String | Phân loại: `province`, `city`, `sub_city`, `landmark`, `airport`, `resort_area`. |
| **`sub_city`** | String | Cấp **Kecamatan** (Rất quan trọng để map URL sâu của Traveloka). |
| **`city`** | String | Cấp **Kabupaten/Kota**. |
| **`province`** | String | 38 tỉnh chính thức của Indonesia (Bao gồm 4 tỉnh mới ở Papua). |
| **`cluster`** | String | Nhóm quản lý ngân sách: `bali`, `jakarta`, `jogja`, `bandung`, `lombok` hoặc `null`. |
| **`intent_type`** | String | `explore` (khám phá), `transit` (di chuyển), `planning` (lên lịch). |
| **`intent_multiplier`** | Float | Hệ số ưu tiên (1.0 đến 1.5). |
| **`is_tourist_magnet`** | Boolean | Định danh vùng lõi du lịch để ưu tiên thầu. |
| **`domestic_popularity`** | Int (1-10) | Độ phổ biến với dân bản địa (Sức mạnh của tệp Domestic). |
| **`cross_sell_potential`** | Int (1-10) | Khả năng bán thêm Hotel/Transport sau khi dính cookie. |
| **`inventory_density`** | Int (1-10) | Mật độ sản phẩm (Khách sạn/Tour) tại vùng đó trên Traveloka. |
| **`geo_competition`** | Int (1-10) | Mức độ cạnh tranh Bid (Càng cao càng đắt, cần tối ưu CPC). |

---

## 3. THUẬT TOÁN CHẤM ĐIỂM (THE SCORING ENGINE)

AI Coder cần sử dụng các chỉ số trong Schema để tính toán **Affiliate Score** theo công thức sau:

$$Score_{Geo} = \left[ (Domestic \times 0.3) + (Inventory \times 0.4) + (CrossSell \times 0.3) \right] \times Intent\_Multiplier$$

**Logic Tiering (Phân tầng Campaign):**

* **Tier A0 (Score > 12):** Đẩy vào Campaign thầu cao (Vùng lõi Bali, Ga Whoosh, Sân bay).
* **Tier A1 (Score 9-12):** Campaign thầu trung bình (Ubud, Malang, Borobudur).
* **Tier A2 (Score 5-9):** Campaign thầu thấp (Vùng thám hiểm mới, tỉnh lẻ).
* **Tier A3 (Score < 5):** Campaign "vét" (Cookie Farm).

---

## 4. QUY TẮC ĐỐI SOÁT (URL MATCHING SPECS)

Để AI thực thi code xử lý URL, cần tuân thủ 3 quy tắc "sắt":

1. **Longest Key Match (LKM):** Khi đối soát Slug, Engine phải ưu tiên Key dài nhất để tránh nhầm lẫn.
* *Ví dụ:* Nếu Slug chứa `kuta-bali`, phải match vào key `kuta-bali` (Sub-city) thay vì key `bali` (Province).


2. **Sanitization Rule:** Trước khi đối soát, Engine phải lọc bỏ các hậu tố nhiễu của Traveloka như `-trp`, `-guide`, `-simak`, `-terbaru`.
3. **Hierarchy Priority:** * Nếu URL chứa địa danh cụ thể (Sub-city/Landmark) -> Dùng Metadata của địa danh đó.
* Nếu chỉ chứa tên Tỉnh -> Dùng Metadata của Tỉnh.



---

## 5. LƯU Ý ĐẶC THÙ CHO AI CODING

* **Xử lý dữ liệu Papua:** Phải cập nhật đúng 38 tỉnh (Bao gồm Papua Pegunungan, Papua Selatan, Papua Tengah, Papua Barat Daya) vì Traveloka đang mở rộng URL vào các vùng này.
* **Xử lý Cluster:** Trường `cluster` là "chốt chặn" để ông gom nhóm Campaign trên Google Ads. Nếu `cluster` không `null`, AI phải ưu tiên đặt ngân sách theo Cluster đó.
* **Negative Shield:** AI cần tự động tạo danh sách phủ định cho các vùng có `geo_competition` cao (>8) để tránh đấu thầu mù quáng vào các từ khóa quá đắt đỏ nếu ngân sách hạn hẹp.

---

**Bản hệ thống này đã bao phủ toàn bộ "linh hồn" của 4 Part đầu.** Ông hãy nạp vào NotebookLM làm nền tảng. Khi AI Coder bắt đầu làm việc, nó sẽ dựa vào đây để biết tại sao `inventory_density` lại quan trọng hơn `popularity` hay tại sao phải ưu tiên `sub_city`.

----
Đây là bản hệ thống hóa toàn bộ tài liệu chiến lược cho **Part 5 & 6** của bộ **Indo Geo Master v4**. Bản này tập trung vào logic vận hành, cấu trúc Schema và các thuật toán chấm điểm đặc thù để ông nạp vào **NotebookLM**.

---

## 1. TƯ DUY CHIẾN LƯỢC: ROOT-SIGNAL MATCHING

Khác với Part 1-4 (Matching dựa trên tên địa danh), Part 5 & 6 sử dụng tư duy **Root-Signal (Tín hiệu gốc)**.

* **Lý do:** Các URL mỏ vàng về hạ tầng của Traveloka thường là các bài Guide (hướng dẫn) hoặc Logistics. Ví dụ: `cara-naik-kereta-bandara-...`.
* **Cơ chế:** Engine sẽ quét tìm các "gốc từ" dịch vụ (Whoosh, Ka-bandara, Bus-sleeper) trước khi xét đến yếu tố địa lý. Nếu khớp Root-Signal, Metadata của hạ tầng đó sẽ ghi đè (Override) các logic địa lý thông thường.

---

## 2. CẬP NHẬT UNIFIED SCHEMA (15 FIELDS)

Để đảm bảo AI Coder thực thi đúng, Schema của Part 5 & 6 bao gồm 12 trường hành chính cũ và **3 trường định danh hành vi mới**:

| Field | Type | Ý nghĩa thực chiến |
| --- | --- | --- |
| **`infra_type`** | String | Phân loại: `airport`, `ferry_port`, `sleeper_bus_hub`, `railway_hub`, `commuter_transit`, `religious_site`, `shopping_hub`. |
| **`travel_distance_bias`** | String | **Long** (Liên tỉnh - Vàng), **Regional** (Trong vùng - Bạc), **Commuter** (Nội đô - Rác). |
| *Các trường cũ* | *Mixed* | `category`, `sub_city`, `city`, `province`, `cluster`, `intent_type`, `intent_multiplier`, `is_tourist_magnet`, `domestic_popularity`, `cross_sell_potential`, `inventory_density`, `geo_competition_score`. |

---

## 3. PHÂN LOẠI "MỎ VÀNG" VS. "BẪY RỦI RO"

### Nhóm 1: Mỏ vàng hạ tầng (High-Value Hubs)

* **Tín hiệu:** `whoosh`, `ka-feeder`, `ka-bandara`, `bus-sleeper`, `kapal-ferry`, `kapal-pelni`.
* **Đặc điểm:** Khách di chuyển đường dài, bắt buộc phải đặt chỗ/vé. Intent mua dịch vụ cực cao.
* **Xử lý:** Gán `travel_distance_bias: long`, `intent_multiplier: 1.4 - 1.5`.

### Nhóm 2: Bẫy nội đô (Commuter Traps)

* **Tín hiệu:** `krl`, `mrt`, `lrt`, `transjakarta`, `jaklingko`.
* **Đặc điểm:** Volume cực lớn nhưng là người đi làm hàng ngày (Zero booking).
* **Xử lý:** Gán `travel_distance_bias: commuter`, `intent_multiplier: 0.1 - 0.2` (Phạt điểm nặng để ép Bid xuống mức tiền lẻ).

---

## 4. THUẬT TOÁN CHẤM ĐIỂM HẠ TẦNG (v4.0)

Công thức tính **Affiliate Score** cho nhóm hạ tầng ưu tiên trọng số vào Intent và khả năng bán chéo (Cross-sell) hơn là mật độ sản phẩm:

$$Score_{Infra} = [(Intent \times 0.6) + (Cross\_Sell \times 0.4)] \times Multiplier(Dist)$$

**Trong đó:**

* **Multiplier (Dist):**
* `long`: **1.5** (Đẩy thầu mạnh cho các Hub liên tỉnh).
* `regional`: **1.1** (Giữ thầu trung bình).
* `commuter`: **0.3** (Vùng trừng phạt thầu).


* **Cross-sell:** Luôn đặt mức **9-10** cho Hubs vì khách di chuyển chắc chắn cần *Hotel + Transport* tại điểm đến.

---

## 5. QUY TẮC NEO ĐỊA CHÍNH (ANCHORING RULES)

Vì các Root-Signal (như `kereta-bandara`) có thể xuất hiện trong các URL tổng quát không chứa tên tỉnh, Engine cần quy tắc "Neo" để routing Campaign:

1. **Neo vào "Rốn" traffic:** Ví dụ `ka-bandara` neo vào cụm Jakarta (Tangerang), `ka-feeder` neo vào cụm Bandung.
2. **Chính xác cấp Sub-city:** Mọi Hub phải có `sub_city` (Kecamatan) thực tế để Tool map trúng URL của Traveloka (ví dụ: Terminal Bungurasih phải neo vào quận **Waru**, không được neo vào trung tâm Surabaya).

---

## 6. LOGIC XỬ LÝ CHO AI CODER (INSTRUCTIONS)

Khi lập trình xử lý URL, AI cần tuân theo thứ tự ưu tiên (Waterfall Matching):

* **Ưu tiên 1:** Tìm các **Root-Signals** (Part 5 & 6). Nếu thấy, dùng Metadata của Infra đó để tính điểm ngay.
* **Ưu tiên 2:** Nếu không thấy tín hiệu hạ tầng, mới tìm **Địa danh** (Part 1-4).
* **Ưu tiên 3 (Phòng thủ):** Nếu chứa từ khóa `krl`, `mrt`, `lrt` -> Kích hoạt chế độ **Commuter Penalty** bất kể địa danh đi kèm là gì.

---
