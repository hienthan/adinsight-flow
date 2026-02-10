[
  {
    "key": "dry_season",
    "name": "Dry Season Travel",
    "category": "seasonal_travel",
    "default_priority": "high",
    "default_pre_alert_days": 21
  },
  {
    "key": "summer_travel",
    "name": "Summer Holiday Travel",
    "category": "seasonal_travel",
    "default_priority": "medium",
    "default_pre_alert_days": 14
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
    "key": "dry_season__id__bali",
    "trend_type": "dry_season",
    "source_markets": ["ID"],
    "destinations": [
      { "code": "BALI", "name": "Bali" }
    ],
    "mode": "recurring",
    "start_mmdd": "05-01",
    "end_mmdd": "10-31",
    "peak_start_mmdd": "06-15",
    "peak_end_mmdd": "09-15",
    "product_types": ["guide_content", "attraction", "hotel", "esim"],
    "keywords": [
      "Bali dry season",
      "Best time to visit Bali",
      "Bali weather dry season",
      "Bali travel guide"
    ],
    "priority": "high",
    "summary": "Dry season is the main demand driver for Bali. Use as the primary timing signal to scale cookie seeding; DSA-first with destination and guide URLs."
  },
  {
    "key": "dry_season__hk__bali",
    "trend_type": "dry_season",
    "source_markets": ["HK"],
    "destinations": [
      { "code": "BALI", "name": "Bali" }
    ],
    "mode": "recurring",
    "start_mmdd": "05-15",
    "end_mmdd": "10-31",
    "peak_start_mmdd": "07-01",
    "peak_end_mmdd": "09-15",
    "product_types": ["guide_content", "attraction", "hotel", "esim"],
    "keywords": [
      "Bali dry season",
      "Bali best time to travel",
      "Bali summer travel",
      "Bali holiday guide"
    ],
    "priority": "medium",
    "summary": "HK interest in Bali rises slightly later than ID. Keep medium priority and scale when auction signals (IS/CPC) confirm lift."
  },
  {
    "key": "summer_travel__tw__bali",
    "trend_type": "summer_travel",
    "source_markets": ["TW"],
    "destinations": [
      { "code": "BALI", "name": "Bali" }
    ],
    "mode": "recurring",
    "start_mmdd": "06-15",
    "end_mmdd": "08-31",
    "peak_start_mmdd": "07-15",
    "peak_end_mmdd": "08-15",
    "product_types": ["guide_content", "attraction", "hotel", "esim"],
    "keywords": [
      "Bali summer holiday",
      "Bali beach season",
      "Bali summer travel",
      "Bali itinerary"
    ],
    "priority": "medium",
    "summary": "TW summer holidays align well with Bali travel. Use DSA-first and selectively add keywords if CPC remains stable."
  },
  {
    "key": "year_end_holiday__hk__bali",
    "trend_type": "year_end_holiday",
    "source_markets": ["HK"],
    "destinations": [
      { "code": "BALI", "name": "Bali" }
    ],
    "mode": "recurring",
    "start_mmdd": "12-10",
    "end_mmdd": "01-10",
    "peak_start_mmdd": "12-24",
    "peak_end_mmdd": "01-02",
    "product_types": ["guide_content", "hotel", "attraction", "esim"],
    "keywords": [
      "Bali year end holiday",
      "Bali Christmas New Year travel",
      "Bali New Year trip"
    ],
    "priority": "high",
    "summary": "Year-end is a sharp peak for Bali with strong competition. Use as a reminder to decide scale vs light seeding based on CPC and IS."
  },
  {
    "key": "entry_pretrip__hk__bali",
    "trend_type": "entry_pretrip",
    "source_markets": ["HK"],
    "destinations": [
      { "code": "BALI", "name": "Bali" }
    ],
    "mode": "recurring",
    "start_mmdd": "01-01",
    "end_mmdd": "12-31",
    "product_types": ["entry_pretrip", "esim", "guide_content"],
    "keywords": [
      "Bali entry requirements",
      "Indonesia entry requirements Bali",
      "Bali travel requirements",
      "Bali immigration guide"
    ],
    "priority": "high",
    "summary": "Evergreen baseline for Bali entry/pre-trip info. Increase focus 2–4 weeks before major peaks (dry season peak, year-end) while keeping always-on coverage."
  }
]