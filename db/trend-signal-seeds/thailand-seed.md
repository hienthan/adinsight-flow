[
  {
    "key": "cool_season",
    "name": "Cool Season Travel",
    "category": "seasonal_travel",
    "default_priority": "high",
    "default_pre_alert_days": 21
  },
  {
    "key": "summer_beach",
    "name": "Summer Beach Travel",
    "category": "seasonal_travel",
    "default_priority": "medium",
    "default_pre_alert_days": 14
  },
  {
    "key": "songkran",
    "name": "Songkran Festival",
    "category": "peak_window",
    "default_priority": "high",
    "default_pre_alert_days": 21
  },
  {
    "key": "year_end_holiday",
    "name": "Year-end & New Year Holiday",
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
    "key": "cool_season__hk__th_bangkok_chiangmai",
    "trend_type": "cool_season",
    "source_markets": ["HK"],
    "destinations": [
      { "code": "TH", "name": "Thailand" },
      { "code": "BKK", "name": "Bangkok" },
      { "code": "CNX", "name": "Chiang Mai" }
    ],
    "mode": "recurring",
    "start_mmdd": "11-01",
    "end_mmdd": "02-28",
    "peak_start_mmdd": "12-01",
    "peak_end_mmdd": "01-31",
    "product_types": ["guide_content", "attraction", "hotel", "esim"],
    "keywords": [
      "Thailand cool season",
      "Best time to visit Thailand",
      "Bangkok cool season travel",
      "Chiang Mai cool season"
    ],
    "priority": "high",
    "summary": "Cool season is Thailand’s main inbound window. HK demand concentrates around year-end; use pre-alert to prep DSA and decide scale as CPC/IS evolve."
  },
  {
    "key": "cool_season__tw__th_bangkok_chiangmai",
    "trend_type": "cool_season",
    "source_markets": ["TW"],
    "destinations": [
      { "code": "TH", "name": "Thailand" },
      { "code": "BKK", "name": "Bangkok" },
      { "code": "CNX", "name": "Chiang Mai" }
    ],
    "mode": "recurring",
    "start_mmdd": "10-20",
    "end_mmdd": "02-28",
    "peak_start_mmdd": "11-20",
    "peak_end_mmdd": "01-31",
    "product_types": ["guide_content", "attraction", "hotel", "esim"],
    "keywords": [
      "Thailand best season travel",
      "Bangkok travel season",
      "Chiang Mai travel season",
      "Thailand winter travel"
    ],
    "priority": "high",
    "summary": "TW users start planning Thailand earlier for cool season. Trigger pre-alert sooner; DSA-first with destination and guide URLs."
  },
  {
    "key": "summer_beach__hk__th_phuket_krabi",
    "trend_type": "summer_beach",
    "source_markets": ["HK"],
    "destinations": [
      { "code": "HKT", "name": "Phuket" },
      { "code": "KBV", "name": "Krabi" }
    ],
    "mode": "recurring",
    "start_mmdd": "06-01",
    "end_mmdd": "09-15",
    "peak_start_mmdd": "07-01",
    "peak_end_mmdd": "08-15",
    "product_types": ["guide_content", "attraction", "hotel", "esim"],
    "keywords": [
      "Phuket summer travel",
      "Krabi beach season",
      "Thailand summer beach",
      "Phuket travel guide"
    ],
    "priority": "medium",
    "summary": "Summer beach demand exists but is market-dependent. Keep medium priority for HK and scale only if auction signals improve."
  },
  {
    "key": "songkran__hk__th_bangkok_chiangmai",
    "trend_type": "songkran",
    "source_markets": ["HK"],
    "destinations": [
      { "code": "TH", "name": "Thailand" },
      { "code": "BKK", "name": "Bangkok" },
      { "code": "CNX", "name": "Chiang Mai" }
    ],
    "mode": "recurring",
    "start_mmdd": "04-01",
    "end_mmdd": "04-20",
    "peak_start_mmdd": "04-13",
    "peak_end_mmdd": "04-15",
    "product_types": ["guide_content", "attraction", "esim"],
    "keywords": [
      "Songkran festival Thailand",
      "Thailand water festival",
      "Songkran travel Bangkok",
      "Songkran Chiang Mai"
    ],
    "priority": "high",
    "summary": "Songkran is a sharp peak. Use pre-alert to prep DSA and a small keyword set; decide scale near peak based on CPC/IS."
  },
  {
    "key": "year_end_holiday__hk__th_overall",
    "trend_type": "year_end_holiday",
    "source_markets": ["HK"],
    "destinations": [
      { "code": "TH", "name": "Thailand" }
    ],
    "mode": "recurring",
    "start_mmdd": "12-10",
    "end_mmdd": "01-10",
    "peak_start_mmdd": "12-24",
    "peak_end_mmdd": "01-02",
    "product_types": ["guide_content", "hotel", "attraction", "esim"],
    "keywords": [
      "Thailand year end holiday",
      "Thailand Christmas New Year travel",
      "Thailand New Year trip"
    ],
    "priority": "high",
    "summary": "Year-end overlaps cool season and is highly competitive. Use as a reminder to choose between scaling or light seeding."
  },
  {
    "key": "entry_pretrip__hk__th_overall",
    "trend_type": "entry_pretrip",
    "source_markets": ["HK"],
    "destinations": [
      { "code": "TH", "name": "Thailand" }
    ],
    "mode": "recurring",
    "start_mmdd": "01-01",
    "end_mmdd": "12-31",
    "product_types": ["entry_pretrip", "esim", "guide_content"],
    "keywords": [
      "Thailand entry requirements",
      "Thailand travel requirements",
      "Thailand immigration guide",
      "Thailand arrival procedures"
    ],
    "priority": "high",
    "summary": "Evergreen baseline for Thailand entry/pre-trip info. Boost focus 2–4 weeks before major TH peaks while keeping always-on coverage."
  }
]
