# DSA URL Filter Quick Summary

## Purpose

File nay tom tat rat ngan de agent khac doc nhanh va hieu feature `DSA URL Filter` ma khong can nap lai toan bo spec.

## Route

- frontend page: `/dsa-filter/url`
- future namespace: `/dsa-filter/*`

## Core Architecture

- frontend chi lam UI + state + export modal
- CSV parsing, geo detection, temp session, export CSV deu di qua local API
- country detection dung `scripts/lib/geo_engine.py`
- khong insert PocketBase

## Main Files

### Frontend

- `frontend/src/pages/DSAFilter/UrlFilterPage.tsx`
- `frontend/src/pages/DSAFilter/urlFilterUtils.ts`
- `frontend/src/App.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/vite.config.ts`

### Backend/API

- `scripts/dsa-url-filter/api_server.py`
- `scripts/dsa-url-filter/processing_core.py`
- `scripts/dsa-url-filter/session_store.py`
- `scripts/dsa-url-filter/process_upload.py`
- `scripts/dsa-url-filter/export_session.py`

## API Endpoints

- `POST /api/dsa-filter/url/sessions`
- `GET /api/dsa-filter/url/sessions/:id`
- `POST /api/dsa-filter/url/sessions/:id/rows/include`
- `GET /api/dsa-filter/url/sessions/:id/export`
- `GET /api/dsa-filter/url/health`

## Current Filtering Logic

- include countries = keep only selected countries
- exclude countries = remove selected countries
- if a country appears in both include and exclude, exclude wins
- `Unknown` stays included unless user explicitly excludes it
- row-level checkbox is final include/exclude override

## Export Logic

- reuse AdInsight export modal mental model
- export format:
  - `Page URL`
  - `Custom Label`
- selected modal fields become label parts

## CSV Parsing Notes

- required header: `URL`
- optional headers:
  - `Headline`
  - `Clicks`
  - `Impressions`
  - `Cost`
  - `CTR`
  - `CTR (%)`
- quoted headlines with commas are supported via Python `csv.reader`
- locale number normalization supported:
  - `2.111` -> `2111`
  - `411.407,36` -> `411407.36`
  - `59.44%` -> `59.44`

## Important Bug Fixes Already Applied

- frontend no longer trusts `response.json()` blindly
  - now reads text first and throws clear error on empty/invalid JSON
- backend now catches uncaught exceptions in `GET/POST`
  - returns JSON error instead of empty response
- parser now accepts header alias `CTR (%)`

## Local Run

Start API:

```bash
python3 scripts/dsa-url-filter/api_server.py
```

Start frontend:

```bash
cd frontend
npm run dev
```

Vite proxy:

- `/api/*` -> `http://127.0.0.1:8765`
