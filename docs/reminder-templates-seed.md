# Campaign Reminder Templates - Seed Data

These are default templates that should be added to the `reminder_templates` collection via PocketBase Admin UI (http://127.0.0.1:8090/_/) after migrations are applied.

## Template 1: CPC Increase
- **Name**: CPC Increase Check
- **Trigger Field**: `cpc`
- **Default Days Offset**: 3
- **Message Template**: "Check traffic & conversions after CPC increase"
- **Default Metrics**: `["traffic", "conversions"]`
- **Default Priority**: `medium`
- **Active**: `true`

## Template 2: Budget Change
- **Name**: Budget Change Review
- **Trigger Field**: `max_daily_budget`
- **Default Days Offset**: 2
- **Message Template**: "Review performance after budget adjustment"
- **Default Metrics**: `["spend", "impressions", "traffic"]`
- **Default Priority**: `medium`
- **Active**: `true`

## Template 3: Keywords Update
- **Name**: Keywords Performance Check
- **Trigger Field**: `keywords`
- **Default Days Offset**: 5
- **Message Template**: "Check new keywords performance and search terms"
- **Default Metrics**: `["impressions", "CTR", "search_terms"]`
- **Default Priority**: `low`
- **Active**: `true`

## Template 4: Campaign Paused
- **Name**: Paused Campaign Review
- **Trigger Field**: `status`
- **Default Days Offset**: 7
- **Message Template**: "Review if paused campaign should be reactivated"
- **Default Metrics**: `["market_trends"]`
- **Default Priority**: `low`
- **Active**: `true`

## How to Add

1. Open PocketBase Admin UI: http://127.0.0.1:8090/_/
2. Navigate to `reminder_templates` collection
3. Click "New Record"
4. Fill in the fields above for each template
5. For JSON fields like `default_metrics`, use format: `["traffic", "conversions"]`
