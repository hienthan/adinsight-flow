T = tao (I), m = mày (you).
Ngữ cảnh:
- Xử lý các urls của Traveloka phục vụ cho việc chạy GoogleAds. Chiến lược gieo cookies ăn hoa hồng affiliate.

Yêu cầu:
- Khi chưa hiểu yêu cầu nào thì hỏi lại, ko tự suy luận hoặc đoán.
- Khi đã verify thông tin thì apply logic và ko được đọc full nội dung của file input, vì dữ liệu text rất lớn -> mất token.
- Thực hiện các best practice, tối ưu token. Không tự ý thay đổi các logic đã có của scripts/hệ thống.
- Khi cảm thấy yêu cầu từ user có vấn đề, ko tối ưu -> Hãy tư vấn giải pháp, tìm option tối ưu nhất. Tuyệt đối ko làm theo yêu cầu nếu nó ko tối ưu hoặc có rủi ro.

tvlk_pages pocketbase collection:

field   | specs
--------|------
platform| relation: platforms -> traveloka
url     | url: full url
url_suffix| đây là phần hậu tố của slug, chỉ xác nhận khi được lặp lại đủ nhiều, ví dụ -trp (có thể là transport), -acc (accommodation), -ta (có thể là attraction). Chỉ xác định khi có sự lặp lại đủ nhiều. Hiện tại chưa có quy tắc rõ ràng để xác định nên hãy lưu suffix, sẽ xử lý chi tiết sau.
slug    | text
slug_en | text: đây là slug đã được scrip dịch từ tiếng Indo sang EN
title_en| text: đây là title đã được scrip dịch từ slug_en sang EN
city    | text: đây là city được Geo lib xác định từ title_en, fallback slug_en, slug. Nếu k xác định được thì là Unknown
country | text: đây là country được Geo lib xác định từ title_en, fallback slug_en, slug. Nếu k xác định được thì là Unknown
sitemap_tag| text: đây sẽ là phần sẽ được chỉ định.
content_type| text: tạm thời chưa xác định, sẽ dùng script để phân loại từ title_en sau.
language| text: đây là ngôn ngữ, mặc định là id-id. Sau này khi cần xử lý đa ngôn ngữ thì sẽ cập nhật thêm, ví dụ: id-id, id-en.
tier    | text: để phân loại mức độ ưu tiên khi đấu thầu (Bidding)
funnel_stage| selection: readiness, planning, awareness.
sub_tag     | text: dựa vào suffix hoặc keyword.
metadata    | JSON: Một "thùng rác" thông minh để lưu các dữ liệu trung gian.
is_active   | boolean: mặc định là true. Để bật/tắt nhanh các URL không muốn chạy Ads nữa mà không cần xóa record.
canonical_id| string: đây là id của url gốc, là các ký tự số nằm ở cuối url. Field này sẽ hỗ trợ multi-language sau này nếu có.
created     | datetime: ngày tạo record.
updated     | datetime: ngày cập nhật record.

- Urls input: T sẽ tổng hợp các urls theo pattern phù hợp rồi cung cấp.
- Nếu slug đã đủ thông tin để dịch ra title thì dịch từ slug, ko cần xử lý slug_en.
- Url slug đã đủ thông tin để dịch ra title, không nên fetch page title khi chưa được yêu cầu.
- Làm một bước Frequency Analysis sơ bộ trên tập data input để tự động detect các suffix phổ biến.

- Trước khi thực hiện import data, hãy test kỹ pocketbase connection. Verify schema/fields trước để tránh import lỗi xong xóa rồi import lại nhiều lần.