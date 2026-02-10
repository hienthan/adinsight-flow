[
  {
    "key": "outbound_planning",
    "name": "Outbound Travel Planning",
    "category": "entry_pretrip",
    "default_priority": "high",
    "default_pre_alert_days": 14
  }
]

[
  {
    "key": "outbound_planning__hk__asia_main",
    "trend_type": "outbound_planning",
    "source_markets": ["HK"],
    "destinations": [
      { "code": "JP", "name": "Japan" },
      { "code": "KR", "name": "South Korea" },
      { "code": "TH", "name": "Thailand" },
      { "code": "BALI", "name": "Bali" }
    ],
    "mode": "recurring",
    "start_mmdd": "01-01",
    "end_mmdd": "12-31",
    "product_types": ["guide_content", "entry_pretrip", "esim"],
    "keywords": [
      "Japan travel planning",
      "Korea travel planning",
      "Thailand travel planning",
      "Bali travel planning"
    ],
    "priority": "high",
    "summary": "HK outbound users plan year-round. Use this as a baseline reminder to keep always-on DSA for major Asia destinations and increase focus ahead of seasonal peaks."
  },
  {
    "key": "year_end_holiday__hk__asia_main",
    "trend_type": "year_end_holiday",
    "source_markets": ["HK"],
    "destinations": [
      { "code": "JP", "name": "Japan" },
      { "code": "KR", "name": "South Korea" },
      { "code": "TH", "name": "Thailand" },
      { "code": "BALI", "name": "Bali" }
    ],
    "mode": "recurring",
    "start_mmdd": "12-10",
    "end_mmdd": "01-10",
    "peak_start_mmdd": "12-24",
    "peak_end_mmdd": "01-02",
    "product_types": ["guide_content", "hotel", "attraction", "esim"],
    "keywords": [
      "Year end travel Asia",
      "Christmas New Year Japan travel",
      "New Year Korea travel",
      "Bali year end holiday"
    ],
    "priority": "high",
    "summary": "HK year-end outbound peak across JP/KR/TH/Bali. Use as a strong timing signal to decide scaling vs light seeding depending on CPC and IS."
  },
  {
    "key": "outbound_planning__tw__asia_main",
    "trend_type": "outbound_planning",
    "source_markets": ["TW"],
    "destinations": [
      { "code": "JP", "name": "Japan" },
      { "code": "KR", "name": "South Korea" },
      { "code": "TH", "name": "Thailand" },
      { "code": "BALI", "name": "Bali" }
    ],
    "mode": "recurring",
    "start_mmdd": "01-01",
    "end_mmdd": "12-31",
    "product_types": ["guide_content", "entry_pretrip", "esim"],
    "keywords": [
      "Japan travel planning Taiwan",
      "Korea travel planning Taiwan",
      "Thailand travel planning Taiwan",
      "Bali travel planning Taiwan"
    ],
    "priority": "high",
    "summary": "TW outbound users start researching earlier than HK for many destinations. Use this as a baseline context to trigger earlier pre-alerts for JP/KR/TH trends."
  }
]