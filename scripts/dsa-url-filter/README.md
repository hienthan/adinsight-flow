# DSA URL Filter API

Local API bridge for the `/dsa-filter/url` frontend workspace.

## Purpose

- receive uploaded CSV files
- parse and normalize metrics
- detect country via existing `scripts/lib/geo_engine.py`
- store temporary sessions in `/tmp/dsa-url-filter`
- return filtered rows to the frontend
- export DSA-ready CSV labels

## Start The API

```bash
python3 scripts/dsa-url-filter/api_server.py
```

Default address:

- `http://127.0.0.1:8765`

## Frontend Integration

Vite dev server proxies:

- `/api/*` -> `http://127.0.0.1:8765`

So the frontend can call:

- `POST /api/dsa-filter/url/sessions`
- `GET /api/dsa-filter/url/sessions/:id`
- `POST /api/dsa-filter/url/sessions/:id/rows/include`
- `GET /api/dsa-filter/url/sessions/:id/export`

## Notes

- no PocketBase insert
- session TTL is managed by `session_store.py`
- max upload size: `10MB`
- max rows: `20,000`
