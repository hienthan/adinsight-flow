Technical Specifications: Traveloka Stealth 404 Checker

1. Objective
Identify dead Traveloka landing pages in `tvlk_pages` for the Indonesian market and update operational status fields without affecting the URL classifier/import flow.

2. Infrastructure
Library: `curl_cffi` (browser TLS fingerprinting).
Endpoint: PocketBase REST API.
Collection: `tvlk_pages`.

3. Execution Model
This checker is a separate maintenance job.
It must not run inside the URL classifier engine flow.

Reason:
- classifier/import speed must stay stable
- transient anti-bot or network failures must not block URL ingestion
- 404 verification is an operational audit, not a classification signal

4. Workflow Logic
Phase A: Data Acquisition
Source: PocketBase API.
Query Filter: `country = "indonesia" && is_active = true`.
Target Fields: `id`, `url`, `last_http_status`, `last_check_error`, `last_checked_at`, `updated`.

Phase B: Stealth Verification
Primary Method: `HEAD` request.
Fallback Method: lightweight `GET` request only when `HEAD` returns `404` or when soft-404 confirmation is needed.
Concurrency: 3-5 simultaneous workers.
Rate Limiting: Random jitter of 1-3 seconds between requests per worker.
Headers: Full browser emulation (`User-Agent`, `Sec-CH-UA`, etc.).
Impersonation: `chrome120` (provided by `curl_cffi`).

Verification Rules:
- `HEAD 200`: treat as alive, no fallback `GET` needed.
- `HEAD 404`: run confirmatory `GET`.
- `GET 404`: confirmed dead page.
- `GET 200` with known missing-page markers: treat as `soft_404`.
- `403`, `429`, `5xx`, TLS errors, DNS errors, and timeouts: operational failure only, do not deactivate.

Phase C: State Synchronization
Execution: row-by-row update immediately after check.

Logic:
- Status 200:
  - update `last_http_status = 200`
  - update `last_check_error = ""`
  - update `last_checked_at` to the checker timestamp
  - keep `is_active` unchanged
- Confirmed 404:
  - update `is_active = false`
  - update `last_http_status = 404`
  - update `last_check_error = ""`
  - update `last_checked_at` to the checker timestamp
- Soft 404:
  - keep `is_active` unchanged for manual review by default
  - update `last_http_status = 200`
  - update `last_check_error = "soft_404"`
  - update `last_checked_at` to the checker timestamp
- Other HTTP statuses (`403`, `429`, `5xx`):
  - update `last_http_status` with the returned code
  - update `last_check_error = ""`
  - update `last_checked_at` to the checker timestamp
  - keep `is_active` unchanged
- Timeout / network / TLS / request errors:
  - do not write fake HTTP codes
  - update `last_check_error` with a machine-readable value such as `timeout`, `dns_error`, `tls_blocked`, `request_error`
  - update `last_checked_at` to the checker timestamp
  - keep `is_active` unchanged

5. Integration Details
Database Fields:
- `last_http_status` (Number): stores the latest real HTTP status code.
- `last_check_error` (Text): stores the latest non-HTTP checker outcome.
- `last_checked_at` (Date): stores the latest checker execution timestamp.
- `is_active` (Bool): set to `false` only on confirmed hard 404.
- `updated` (DateTime): PocketBase autodate; stores the latest record update timestamp.

6. Error Handling and Logging
Local Log: keep a JSON log at `scripts/tvlk/logs/check_results_[timestamp].json`.

Each log row should include:
- `record_id`
- `url`
- `head_status`
- `get_status`
- `final_result`
- `patch_payload`
- `checked_at`

Retry Logic:
- max 2 retries for connection timeouts
- no retry for confirmed `404`
- optional 1 retry for `403` or `429` with backoff if anti-bot behavior looks temporary
