[
  {
    "key": "cherry_blossom",
    "name": "Cherry Blossom Season",
    "category": "seasonal_travel",
    "default_priority": "high",
    "default_pre_alert_days": 21
  },
  {
    "key": "autumn_foliage",
    "name": "Autumn Foliage Season",
    "category": "seasonal_travel",
    "default_priority": "medium",
    "default_pre_alert_days": 14
  },
  {
    "key": "summer_travel",
    "name": "Summer Travel Season",
    "category": "seasonal_travel",
    "default_priority": "medium",
    "default_pre_alert_days": 14
  },
  {
    "key": "winter_snow",
    "name": "Winter Snow & Ski Season",
    "category": "seasonal_travel",
    "default_priority": "medium",
    "default_pre_alert_days": 21
  },
  {
    "key": "korean_holidays",
    "name": "Korean Peak Holiday Travel",
    "category": "peak_window",
    "default_priority": "high",
    "default_pre_alert_days": 21
  },
  {
    "key": "entry_pretrip",
    "name": "Entry / Arrival / Pre-trip",
    "category": "entry_pretrip",
    "default_priority": "high",
    "default_pre_alert_days": 14
  }
]

[
  {
    "key": "cherry_blossom__hk__kr_seoul_jeju",
    "trend_type": "cherry_blossom",
    "source_markets": ["HK"],
    "destinations": [
      { "code": "KR", "name": "South Korea" },
      { "code": "SEOUL", "name": "Seoul" },
      { "code": "JEJU", "name": "Jeju" }
    ],
    "mode": "recurring",
    "start_mmdd": "03-15",
    "end_mmdd": "04-15",
    "peak_start_mmdd": "03-25",
    "peak_end_mmdd": "04-05",
    "product_types": ["guide_content", "attraction", "esim"],
    "keywords": [
      "Korea cherry blossom",
      "Seoul cherry blossom",
      "Jeju cherry blossom season",
      "Best time for cherry blossoms Korea"
    ],
    "priority": "high",
    "summary": "HK spring travel planning spikes closer to bloom. Use pre-alert to prep DSA on guides/attractions; keep a small stable keyword set for timing intents."
  },
  {
    "key": "cherry_blossom__tw__kr_seoul_jeju",
    "trend_type": "cherry_blossom",
    "source_markets": ["TW"],
    "destinations": [
      { "code": "KR", "name": "South Korea" },
      { "code": "SEOUL", "name": "Seoul" },
      { "code": "JEJU", "name": "Jeju" }
    ],
    "mode": "recurring",
    "start_mmdd": "03-05",
    "end_mmdd": "04-15",
    "peak_start_mmdd": "03-20",
    "peak_end_mmdd": "04-05",
    "product_types": ["guide_content", "attraction", "esim"],
    "keywords": [
      "Korea cherry blossom season",
      "Seoul cherry blossom spots",
      "Jeju cherry blossom",
      "Korea cherry blossom forecast"
    ],
    "priority": "high",
    "summary": "TW users often research KR spring trips earlier. Trigger pre-alert sooner; DSA-first with destination/guide URLs, then layer selective keywords."
  },
  {
    "key": "summer_travel__hk__kr_jeju",
    "trend_type": "summer_travel",
    "source_markets": ["HK"],
    "destinations": [
      { "code": "JEJU", "name": "Jeju" }
    ],
    "mode": "recurring",
    "start_mmdd": "06-15",
    "end_mmdd": "08-31",
    "peak_start_mmdd": "07-15",
    "peak_end_mmdd": "08-15",
    "product_types": ["guide_content", "attraction", "hotel", "esim"],
    "keywords": [
      "Jeju summer travel",
      "Jeju beach season",
      "Korea summer vacation",
      "Best time to visit Jeju"
    ],
    "priority": "medium",
    "summary": "Jeju is KR’s main beach decision unit. Keep medium priority for HK and scale if auction signals and IS improve during peak summer weeks."
  },
  {
    "key": "autumn_foliage__hk__kr_seoul",
    "trend_type": "autumn_foliage",
    "source_markets": ["HK"],
    "destinations": [
      { "code": "KR", "name": "South Korea" },
      { "code": "SEOUL", "name": "Seoul" }
    ],
    "mode": "recurring",
    "start_mmdd": "10-05",
    "end_mmdd": "11-15",
    "peak_start_mmdd": "10-20",
    "peak_end_mmdd": "11-05",
    "product_types": ["guide_content", "attraction"],
    "keywords": [
      "Korea autumn foliage",
      "Seoul fall season",
      "Best time to see fall foliage Korea",
      "Korea autumn travel"
    ],
    "priority": "medium",
    "summary": "Cleaner informational intent than holiday peaks. Works well with guide-style DSA; typically smaller than spring cherry blossoms."
  },
  {
    "key": "winter_snow__tw__kr_gangwon_pyeongchang",
    "trend_type": "winter_snow",
    "source_markets": ["TW"],
    "destinations": [
      { "code": "GANGWON", "name": "Gangwon" },
      { "code": "PYEONGCHANG", "name": "Pyeongchang" }
    ],
    "mode": "recurring",
    "start_mmdd": "12-01",
    "end_mmdd": "02-28",
    "peak_start_mmdd": "12-25",
    "peak_end_mmdd": "01-31",
    "product_types": ["guide_content", "pass", "esim"],
    "keywords": [
      "Korea ski season",
      "Gangwon ski resort",
      "Pyeongchang winter travel",
      "Korea winter snow"
    ],
    "priority": "medium",
    "summary": "TW tends to show more interest in KR winter activities. Use as a reminder to prep DSA and test a small keyword set during peak winter weeks."
  },
  {
    "key": "korean_holidays__hk__kr_seollal_window",
    "trend_type": "korean_holidays",
    "source_markets": ["HK"],
    "destinations": [
      { "code": "KR", "name": "South Korea" }
    ],
    "mode": "recurring",
    "start_mmdd": "01-20",
    "end_mmdd": "02-10",
    "product_types": ["guide_content", "attraction", "esim", "entry_pretrip"],
    "keywords": [
      "Seollal travel Korea",
      "Korea holiday travel",
      "Korean New Year travel"
    ],
    "priority": "high",
    "summary": "Seollal date varies by year; treat this as a conservative peak window for planning/entry queries. Decide scaling based on CPC/IS."
  },
  {
    "key": "entry_pretrip__hk__kr_overall",
    "trend_type": "entry_pretrip",
    "source_markets": ["HK"],
    "destinations": [
      { "code": "KR", "name": "South Korea" }
    ],
    "mode": "recurring",
    "start_mmdd": "01-01",
    "end_mmdd": "12-31",
    "product_types": ["entry_pretrip", "esim", "guide_content"],
    "keywords": [
      "Korea entry requirements",
      "Korea arrival card",
      "South Korea travel requirements",
      "Korea immigration guide"
    ],
    "priority": "high",
    "summary": "Evergreen baseline for entry/pre-trip info. Use it as a reminder to boost 2–4 weeks before major KR seasonal peaks while keeping always-on coverage."
  }
]