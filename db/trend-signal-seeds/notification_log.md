{
  "name": "notification_log",
  "type": "base",
  "schema": [
    {
      "name": "log_key",
      "type": "text",
      "required": true,
      "unique": true,
      "options": {
        "min": 1
      }
    },
    {
      "name": "signal_key",
      "type": "text",
      "required": true,
      "options": {
        "min": 1
      }
    },
    {
      "name": "source_market",
      "type": "select",
      "required": true,
      "options": {
        "maxSelect": 1,
        "values": ["HK", "TW", "ID", "SG", "MY", "AU"]
      }
    },
    {
      "name": "alert_type",
      "type": "select",
      "required": true,
      "options": {
        "maxSelect": 1,
        "values": ["PRE_ALERT", "START", "PEAK", "END"]
      }
    },
    {
      "name": "occurrence_key",
      "type": "text",
      "required": true,
      "options": {
        "min": 1
      }
    },
    {
      "name": "alert_date",
      "type": "date",
      "required": true,
      "options": {}
    },
    {
      "name": "fired_at",
      "type": "date",
      "required": false,
      "options": {}
    }
  ]
}

🔑 Ghi chú quan trọng (cho AI & cho m)
	•	log_key phải unique → chống bắn trùng
	•	occurrence_key = resolved start date (YYYY-MM-DD)
→ đảm bảo mỗi năm / mỗi chu kỳ bắn lại được
	•	source_market single select để không suppress nhầm giữa HK/TW
	•	Không cần thêm field nào khác → đủ, gọn, không migrate nữa