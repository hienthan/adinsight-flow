BUG LOGIC: Horizon filter làm mất ACTIVE trends (ví dụ Japan Cherry Blossom đang ACTIVE nhưng chọn Next 14/30 days không thấy; chỉ thấy khi All time).

MỤC TIÊU ĐÚNG CỦA HORIZON:
Horizon là “tầm nhìn thời gian để xem các trend liên quan trong khoảng đó”, KHÔNG phải chỉ show các trend có relevantDate nằm trong tương lai.
=> Nếu 1 trend đang ACTIVE trong khoảng horizon thì PHẢI hiển thị.

NGUYÊN NHÂN THƯỜNG GẶP (phải kiểm tra):
1) Code đang filter theo: 0 <= daysDiff(today, relevantDate) <= horizonDays
   -> Điều này loại bỏ ACTIVE trend vì relevantDate (end) có thể < today hoặc daysDiff âm do timezone/startOfDay bug.
2) Code chọn relevantDate sai cho ACTIVE/PEAK, hoặc resolve recurring window sai năm (wrap-year).
3) parse date bị lệch timezone (Date("YYYY-MM-DD") dùng UTC, nhưng local timezone +0700 làm sai ngày -> end thành “hôm qua”).
4) logic horizon đang hiểu “future-only window”, loại bỏ các trend đang diễn ra.

SỬA THEO SPEC (BẮT BUỘC)

A) Định nghĩa interval đúng:
- Mỗi trend signal sau khi resolve dates sẽ có một khoảng hoạt động:
  - window = [start, end]
  - prealert window = [preAlert, start)
  - peak window = [peakStart, peakEnd] (subset)
- Horizon filter phải dựa trên “INTERSECTION” giữa window với [today, today+horizonDays] (hoặc horizonDays=0 là today)

B) Horizon filter đúng cho mọi state:
Cho 1 signal với dates:
- start, end, preAlert, (optional peakStart, peakEnd)
Cho horizon range:
- H = [todayStart, todayStart + horizonDays]

Signal được GIỮ lại nếu:
1) state == PEAK hoặc ACTIVE:
   - windowActive = [start, end]
   - KEEP nếu windowActive intersects H
   - (nghĩa là nếu trend đang diễn ra trong khoảng tầm nhìn)
2) state == IN_PREALERT:
   - windowPre = [preAlert, start]
   - KEEP nếu windowPre intersects H (hoặc start nằm trong H)
3) state == UPCOMING_PREALERT:
   - upcomingTriggerDate = preAlert
   - KEEP nếu preAlert nằm trong H (hoặc preAlert <= H.end)
4) state == ENDED:
   - Mặc định loại (trừ khi horizon = ALL hoặc user bật “show ended”)

=> Tuyệt đối KHÔNG dùng điều kiện “daysDiff >= 0” một cách cứng nhắc cho mọi state.

C) Fix timezone/date parsing (rất quan trọng)
- KHÔNG dùng new Date("YYYY-MM-DD") trực tiếp vì nó parse theo UTC.
- Hãy parse date local an toàn:
  - const [y,m,d] = "YYYY-MM-DD".split("-").map(Number)
  - new Date(y, m-1, d)
- Với recurring MM-DD cũng tạo Date(year, mm-1, dd) (local).
- Luôn normalize về startOfDay local cho so sánh.

D) resolveRecurringWindow phải “next occurrence” đúng
- Nếu end < start => wrap year (endYear = startYear+1)
- Nếu today > end => shift start/end +1 year
- Peak range cũng phải nằm trong [start,end]
- Sau resolve, đảm bảo invariant:
  - start <= end
  - preAlert = start - preAlertDays
  - peakStart/peakEnd (nếu có) nằm trong [start,end]

E) Định nghĩa “relevantDate” mới (chỉ dùng cho sorting, không dùng cho horizon filter)
- For PEAK: relevant = peakEnd else end
- For ACTIVE: relevant = end
- For IN_PREALERT: relevant = start
- For UPCOMING_PREALERT: relevant = preAlert
- For ENDED: relevant = end

Nhưng horizon filter dùng INTERSECTION, không dùng relevantDate.

IMPLEMENTATION HƯỚNG DẪN (Pseudo)
1) Compute today0 = startOfDayLocal(today)
2) Compute H_end = addDays(today0, horizonDays)
3) Define function intersects(aStart,aEnd,bStart,bEnd):
   return aStart <= bEnd && aEnd >= bStart
4) For each signal:
   - dates = resolveSignalDates(...)
   - state = computeState(...)
   - if horizonDays == null (ALL) => keep (subject to other filters)
   - else:
       if state in {PEAK, ACTIVE}:
         keep = intersects(dates.start, dates.end, today0, H_end)
       else if state == IN_PREALERT:
         keep = intersects(dates.preAlert, dates.start, today0, H_end)
       else if state == UPCOMING_PREALERT:
         keep = (dates.preAlert >= today0 && dates.preAlert <= H_end) OR intersects(dates.preAlert, dates.start, today0, H_end)
       else:
         keep = false

TEST CASES BẮT BUỘC (AI phải tự test bằng console/unit)
Assume today = Feb 10 (local):
1) ACTIVE case:
   start = Feb 1, end = Apr 5, horizon=14d
   => intersects([Feb1,Apr5],[Feb10,Feb24]) = true => must show ACTIVE
2) IN_PREALERT case:
   preAlert=Feb19, start=Mar5, horizon=14d (Feb10-Feb24)
   => intersects([Feb19,Mar5],[Feb10,Feb24]) true => show UPCOMING/IN_PREALERT
3) UPCOMING far away:
   preAlert=May1, horizon=14d => not shown
4) wrap-year case:
   start=Dec10, end=Jan10 (wrap)
   - today Dec25, horizon 14 => must be ACTIVE
   - today Jan05, horizon 7 => must be ACTIVE
5) timezone safety:
   end_date "2026-02-10" should be treated as local Feb10, not Feb09.

DELIVERABLE
- Patch TrendSignalsPage.tsx (or helper filter function) to replace horizon filtering logic with intersection-based logic.
- Replace all parsing of "YYYY-MM-DD" to local Date constructor.
- Add small debug logs or unit tests (can be removed later) verifying the above test cases.