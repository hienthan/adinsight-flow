# Outbound Map Scripts

Scripts for the `campaign_routes` feature live here to keep the root `scripts/` folder cleaner.

## Available scripts

- `seed_demo_routes.py`
  - Creates a small set of demo outbound routes for UI testing.
  - Reuses existing `campaigns` and `campaign_platforms` records.

- `clear_demo_routes.py`
  - Deletes demo routes created by `seed_demo_routes.py`.

## Usage

```bash
python3 scripts/outbound-map/seed_demo_routes.py
python3 scripts/outbound-map/clear_demo_routes.py
```

Both scripts read PocketBase credentials from `db/pb_info.txt`.
