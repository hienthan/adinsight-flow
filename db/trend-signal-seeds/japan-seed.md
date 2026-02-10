[
  {
    "key": "cherry_blossom",
    "name": "Cherry Blossom Season",
    "category": "seasonal_travel",
    "default_priority": "high",
    "default_pre_alert_days": 21
  },
  {
    "key": "ski_snow",
    "name": "Ski / Snow Season",
    "category": "seasonal_travel",
    "default_priority": "medium",
    "default_pre_alert_days": 21
  },
  {
    "key": "summer_beach",
    "name": "Summer / Beach Season",
    "category": "seasonal_travel",
    "default_priority": "medium",
    "default_pre_alert_days": 14
  },
  {
    "key": "autumn_foliage",
    "name": "Autumn Foliage Season",
    "category": "seasonal_travel",
    "default_priority": "medium",
    "default_pre_alert_days": 14
  },
  {
    "key": "golden_week",
    "name": "Golden Week",
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
    "key": "cherry_blossom__hk__jp_kanto_kansai",
    "trend_type": "cherry_blossom",
    "source_markets": ["HK"],
    "destinations": [
      { "code": "JP", "name": "Japan" },
      { "code": "KANTO", "name": "Kanto" },
      { "code": "KANSAI", "name": "Kansai" }
    ],
    "mode": "recurring",
    "start_mmdd": "02-15",
    "end_mmdd": "04-05",
    "peak_start_mmdd": "03-20",
    "peak_end_mmdd": "04-05",
    "product_types": ["guide_content", "rail", "attraction", "esim"],
    "keywords": [
      "Japan cherry blossom season",
      "Sakura Japan best time",
      "Sakura forecast Japan",
      "Tokyo cherry blossom",
      "Kyoto cherry blossom"
    ],
    "priority": "high",
    "summary": "HK users tend to search closer to bloom. Use pre-alert to prep DSA on guides/rail; add a small stable keyword set for sakura timing/forecast queries."
  },
  {
    "key": "cherry_blossom__tw__jp_kanto_kansai",
    "trend_type": "cherry_blossom",
    "source_markets": ["TW"],
    "destinations": [
      { "code": "JP", "name": "Japan" },
      { "code": "KANTO", "name": "Kanto" },
      { "code": "KANSAI", "name": "Kansai" }
    ],
    "mode": "recurring",
    "start_mmdd": "02-10",
    "end_mmdd": "04-05",
    "peak_start_mmdd": "03-15",
    "peak_end_mmdd": "04-05",
    "product_types": ["guide_content", "rail", "attraction", "esim"],
    "keywords": [
      "Japan cherry blossom season",
      "Sakura forecast Japan",
      "Best time to see sakura",
      "Kyoto cherry blossom"
    ],
    "priority": "high",
    "summary": "TW users start researching earlier. Trigger pre-alert sooner; DSA-first with destination/guide URLs, then layer selective keywords."
  },
  {
    "key": "ski_snow__hk__jp_hokkaido",
    "trend_type": "ski_snow",
    "source_markets": ["HK"],
    "destinations": [
      { "code": "HOKKAIDO", "name": "Hokkaido" }
    ],
    "mode": "recurring",
    "start_mmdd": "12-01",
    "end_mmdd": "02-28",
    "peak_start_mmdd": "01-01",
    "peak_end_mmdd": "01-31",
    "product_types": ["guide_content", "rail", "pass", "esim"],
    "keywords": [
      "Hokkaido ski season",
      "Japan winter snow travel",
      "Hokkaido winter trip"
    ],
    "priority": "medium",
    "summary": "Winter ski interest exists but is niche for HK. Keep medium priority; scale only if IS/traffic confirms."
  },
  {
    "key": "ski_snow__tw__jp_hokkaido",
    "trend_type": "ski_snow",
    "source_markets": ["TW"],
    "destinations": [
      { "code": "HOKKAIDO", "name": "Hokkaido" }
    ],
    "mode": "recurring",
    "start_mmdd": "11-25",
    "end_mmdd": "02-28",
    "peak_start_mmdd": "12-25",
    "peak_end_mmdd": "01-31",
    "product_types": ["guide_content", "rail", "pass", "esim"],
    "keywords": [
      "Hokkaido ski season",
      "Japan ski resorts",
      "Hokkaido winter travel"
    ],
    "priority": "medium",
    "summary": "TW shows earlier ski planning. Prep DSA earlier and test small keyword sets around resort access."
  },
  {
    "key": "summer_beach__hk__jp_okinawa",
    "trend_type": "summer_beach",
    "source_markets": ["HK"],
    "destinations": [
      { "code": "OKINAWA", "name": "Okinawa" }
    ],
    "mode": "recurring",
    "start_mmdd": "06-20",
    "end_mmdd": "09-10",
    "peak_start_mmdd": "07-15",
    "peak_end_mmdd": "08-20",
    "product_types": ["guide_content", "attraction", "hotel", "esim"],
    "keywords": [
      "Okinawa summer travel",
      "Okinawa beach season",
      "Japan summer vacation Okinawa"
    ],
    "priority": "medium",
    "summary": "Okinawa is the JP beach decision unit. Use DSA on destination/category pages; watch CPC mid-summer."
  },
  {
    "key": "autumn_foliage__hk__jp_kanto_kansai",
    "trend_type": "autumn_foliage",
    "source_markets": ["HK"],
    "destinations": [
      { "code": "JP", "name": "Japan" },
      { "code": "KANTO", "name": "Kanto" },
      { "code": "KANSAI", "name": "Kansai" }
    ],
    "mode": "recurring",
    "start_mmdd": "10-01",
    "end_mmdd": "11-30",
    "peak_start_mmdd": "11-05",
    "peak_end_mmdd": "11-20",
    "product_types": ["guide_content", "rail", "attraction"],
    "keywords": [
      "Japan autumn foliage",
      "Japan fall season",
      "Kyoto autumn leaves",
      "Tokyo fall foliage"
    ],
    "priority": "medium",
    "summary": "Cleaner informational intent than sakura. Good for guide-style DSA; usually smaller volume."
  },
  {
    "key": "golden_week__hk__jp_overall",
    "trend_type": "golden_week",
    "source_markets": ["HK"],
    "destinations": [
      { "code": "JP", "name": "Japan" }
    ],
    "mode": "recurring",
    "start_mmdd": "04-01",
    "end_mmdd": "05-07",
    "peak_start_mmdd": "04-29",
    "peak_end_mmdd": "05-05",
    "product_types": ["rail", "attraction", "esim", "guide_content"],
    "keywords": [
      "Japan Golden Week travel",
      "Golden Week Japan dates",
      "Japan holiday travel"
    ],
    "priority": "high",
    "summary": "High competition window. Use as a reminder to decide scale vs light seeding based on auction signals."
  },
  {
    "key": "entry_pretrip__hk__jp_overall",
    "trend_type": "entry_pretrip",
    "source_markets": ["HK"],
    "destinations": [
      { "code": "JP", "name": "Japan" }
    ],
    "mode": "recurring",
    "start_mmdd": "01-01",
    "end_mmdd": "12-31",
    "product_types": ["entry_pretrip", "esim", "guide_content"],
    "keywords": [
      "Japan entry requirements",
      "Visit Japan Web guide",
      "Japan arrival procedures"
    ],
    "priority": "high",
    "summary": "Evergreen baseline. Boost 2–4 weeks before major JP peaks while keeping always-on coverage."
  }
]