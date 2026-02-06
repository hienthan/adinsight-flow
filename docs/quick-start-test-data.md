# Quick Start: Adding Test Data

Since the UI is ready, you can add test data via PocketBase Admin UI to see the campaign cards in action!

## Step 1: Open PocketBase Admin UI

Visit: http://127.0.0.1:8090/_/

## Step 2: Create Platforms

Navigate to **Collections > campaign_platforms** and click **New record**

Add these 3 platforms:

### Platform 1: Klook-ECO
- **platform_name**: `Klook`
- **marketplace**: `ECO`
- **display_name**: `Klook-ECO`
- **color**: `#FF6B6B`
- **icon**: `globe`  
- **metadata**: `{"region": "Asia Pacific"}`

### Platform 2: Klook-MO
- **platform_name**: `Klook`
- **marketplace**: `MO`
- **display_name**: `Klook-MO`
- **color**: `#4ECDC4`
- **icon**: `map-pin`
- **metadata**: `{"region": "Asia"}`

### Platform 3: Traveloka-ID
- **platform_name**: `Traveloka`
- **marketplace**: `ID`
- **display_name**: `Traveloka-ID`
- **color**: `#FFE66D`
- **icon**: `plane`
- **metadata**: `{"region": "Indonesia"}`

## Step 3: Create Campaigns

Navigate to **Collections > campaigns** and add some test campaigns.

### Campaign Example 1
- **platform**: Select `Klook-ECO` (from dropdown)
- **name**: `Hong Kong Disneyland - Peak Season`
- **status**: `active`
- **created_date**: `2026-01-15`
- **cpc**: `1.25`
- **max_daily_budget**: `500`
- **keywords**: `["hong kong", "disneyland", "theme park"]`
- **description**: Type any HTML or rich text
- **general_notes**: Type any notes

### Campaign Example 2
- **platform**: Select `Klook-MO`
- **name**: `Singapore Universal Studios`
- **status**: `active`
- **created_date**: `2026-01-10`
- **cpc**: `1.80`
- **max_daily_budget**: `800`
- **keywords**: `["singapore", "universal studios"]`

### Campaign Example 3  
- **platform**: Select `Traveloka-ID`
- **name**: `Bali Beach Resorts`
- **status**: `paused`
- **created_date**: `2025-12-20`
- **cpc**: `0.75`
- **max_daily_budget**: `400`

**Add 3-5 more campaigns** with different platforms and statuses to see the grid populate!

## Step 4: Create Test Reminders (Optional)

Navigate to **Collections > campaign_reminders**

### Reminder Example
- **campaign**: Select any campaign from dropdown
- **reminder_date**: Today's date (e.g., `2026-02-06`)
- **message**: `Check traffic after CPC increase`
- **check_metrics**: `["impressions", "CTR", "conversions"]`
- **status**: `pending`
- **priority**: `high`

This will show a **red badge** on the campaign card!

## Step 5: View Your Campaigns

1. Refresh the frontend: http://localhost:5173
2. Click **Camp Tracking > Overview** in the sidebar
3. You should see your campaign cards in a grid! 🎉

### What You'll See:
- ✅ Campaign cards with platform badges (colored dots)
- ✅ Status badges (Active/Paused/Testing/Archived)
- ✅ 🔔 Red "Reminder Due" badge if you added reminders
- ✅ 📝 "Recently Changed" badge for recently updated campaigns
- ✅ CPC and Budget metrics
- ✅ Dropdown menu (⋮) with View/Edit/Add Reminder actions
- ✅ Platform filter dropdown in the sidebar
- ✅ Filter bar with Platform, Status, and Reminders checkbox

---

## Quick JSON Examples

If you prefer copy-paste for keywords field:

```json
["hong kong", "disneyland", "family", "theme park"]
```

```json
["tokyo", "onsen", "hot springs", "relaxation"]
```

```json
["singapore", "universal studios", "attractions"]
```

For check_metrics in reminders:

```json
["impressions", "CTR", "conversions", "CPC"]
```

---

**Pro Tip**: The sidebar will automatically load and display your platforms with their assigned colors! The reminder count badge will also update automatically.
