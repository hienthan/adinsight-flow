#!/usr/bin/env python3
import argparse
import json
import os
import random
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

import requests


COLLECTION_NAME = "tvlk_pages"
PB_PAGE_SIZE = 200
DEFAULT_TIMEOUT = 20
DEFAULT_WORKERS = 2
DEFAULT_MIN_JITTER = 2.0
DEFAULT_MAX_JITTER = 5.0
DEFAULT_TIMEOUT_RETRIES = 2
TRAVELOKA_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Priority": "u=0, i",
    "Sec-CH-UA": '"Chromium";v="120", "Not?A_Brand";v="24", "Google Chrome";v="120"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
}
SOFT_404_PATTERNS = (
    r"<title>\s*404\b",
    r"<title>[^<]*page not found",
    r"<title>[^<]*halaman tidak ditemukan",
    r"\bpage not found\b",
    r"\bhalaman tidak ditemukan\b",
    r"\bkonten tidak ditemukan\b",
    r"\bthe page you are looking for\b",
    r"\bsorry, we (can('|’)t|cannot) find\b",
)


@dataclass
class ProbeResult:
    record_id: str
    url: str
    checked_at: str
    head_status: Optional[int]
    get_status: Optional[int]
    final_result: str
    last_http_status: Optional[int]
    last_check_error: str
    is_active: Optional[bool]
    patch_payload: Dict


def get_pb_info() -> Optional[Dict[str, str]]:
    info: Dict[str, str] = {}
    try:
        with open("db/pb_info.txt", "r", encoding="utf-8") as handle:
            for line in handle:
                if ":" in line:
                    key, value = line.split(":", 1)
                    info[key.strip()] = value.strip()
    except OSError:
        return None
    return info


def authenticate(pb_url: str, email: str, password: str) -> Optional[str]:
    auth_url = f"{pb_url}/api/collections/_superusers/auth-with-password"
    try:
        response = requests.post(
            auth_url,
            json={"identity": email, "password": password},
            timeout=10,
        )
    except requests.RequestException:
        return None

    if response.status_code != 200:
        return None

    return response.json().get("token")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_curl_requests():
    try:
        from curl_cffi import requests as curl_requests
    except ImportError as exc:
        raise RuntimeError(
            "curl_cffi is required for live Traveloka probing. "
            "Install it before running with --apply or any live check."
        ) from exc
    return curl_requests


def classify_probe_exception(exc: Exception) -> str:
    name = exc.__class__.__name__.lower()
    message = str(exc).lower()

    if "timeout" in name or "timed out" in message:
        return "timeout"
    if "dns" in name or "name or service not known" in message or "nodename nor servname" in message:
        return "dns_error"
    if "ssl" in name or "tls" in name or "certificate" in message or "handshake" in message:
        return "tls_blocked"
    if isinstance(exc, requests.RequestException):
        return "request_error"
    return "request_error"


def looks_like_soft_404(html: str) -> bool:
    if not html:
        return False

    lowered = html.lower()
    hits = 0
    for pattern in SOFT_404_PATTERNS:
        if re.search(pattern, lowered, flags=re.IGNORECASE):
            hits += 1

    return hits >= 2


def build_patch_payload(
    checked_at: str,
    *,
    last_http_status: Optional[int],
    last_check_error: str,
    is_active: Optional[bool] = None,
) -> Dict:
    payload: Dict = {
        "last_check_error": last_check_error,
        "last_checked_at": checked_at,
    }
    payload["last_http_status"] = last_http_status
    if is_active is not None:
        payload["is_active"] = is_active
    return payload


def evaluate_probe(
    record_id: str,
    url: str,
    checked_at: str,
    *,
    head_status: Optional[int],
    get_status: Optional[int] = None,
    get_body: str = "",
    error: str = "",
) -> ProbeResult:
    if error:
        payload = build_patch_payload(
            checked_at,
            last_http_status=None,
            last_check_error=error,
        )
        return ProbeResult(
            record_id=record_id,
            url=url,
            checked_at=checked_at,
            head_status=head_status,
            get_status=get_status,
            final_result=error,
            last_http_status=None,
            last_check_error=error,
            is_active=None,
            patch_payload=payload,
        )

    if get_status == 404 or head_status == 404 and get_status is None:
        payload = build_patch_payload(
            checked_at,
            last_http_status=404,
            last_check_error="",
            is_active=False,
        )
        return ProbeResult(
            record_id=record_id,
            url=url,
            checked_at=checked_at,
            head_status=head_status,
            get_status=get_status,
            final_result="confirmed_404",
            last_http_status=404,
            last_check_error="",
            is_active=False,
            patch_payload=payload,
        )

    if get_status == 200 and looks_like_soft_404(get_body):
        payload = build_patch_payload(
            checked_at,
            last_http_status=200,
            last_check_error="soft_404",
        )
        return ProbeResult(
            record_id=record_id,
            url=url,
            checked_at=checked_at,
            head_status=head_status,
            get_status=get_status,
            final_result="soft_404",
            last_http_status=200,
            last_check_error="soft_404",
            is_active=None,
            patch_payload=payload,
        )

    if get_status is not None:
        payload = build_patch_payload(
            checked_at,
            last_http_status=get_status,
            last_check_error="",
        )
        return ProbeResult(
            record_id=record_id,
            url=url,
            checked_at=checked_at,
            head_status=head_status,
            get_status=get_status,
            final_result=f"http_{get_status}",
            last_http_status=get_status,
            last_check_error="",
            is_active=None,
            patch_payload=payload,
        )

    if head_status is not None:
        payload = build_patch_payload(
            checked_at,
            last_http_status=head_status,
            last_check_error="",
        )
        return ProbeResult(
            record_id=record_id,
            url=url,
            checked_at=checked_at,
            head_status=head_status,
            get_status=None,
            final_result=f"http_{head_status}",
            last_http_status=head_status,
            last_check_error="",
            is_active=None,
            patch_payload=payload,
        )

    payload = build_patch_payload(
        checked_at,
        last_http_status=None,
        last_check_error="request_error",
    )
    return ProbeResult(
        record_id=record_id,
        url=url,
        checked_at=checked_at,
        head_status=None,
        get_status=None,
        final_result="request_error",
        last_http_status=None,
        last_check_error="request_error",
        is_active=None,
        patch_payload=payload,
    )


class TravelokaProbeClient:
    def __init__(self, timeout: int):
        self.timeout = timeout
        self.curl_requests = load_curl_requests()

    def head(self, url: str):
        return self.curl_requests.head(
            url,
            headers=TRAVELOKA_HEADERS,
            timeout=self.timeout,
            allow_redirects=True,
            impersonate="chrome120",
        )

    def get(self, url: str):
        return self.curl_requests.get(
            url,
            headers=TRAVELOKA_HEADERS,
            timeout=self.timeout,
            allow_redirects=True,
            impersonate="chrome120",
        )


class Tvlk404Checker:
    def __init__(
        self,
        pb_url: str,
        token: str,
        *,
        country: str = "indonesia",
        province: str = "",
        workers: int = DEFAULT_WORKERS,
        min_jitter: float = DEFAULT_MIN_JITTER,
        max_jitter: float = DEFAULT_MAX_JITTER,
        timeout: int = DEFAULT_TIMEOUT,
        timeout_retries: int = DEFAULT_TIMEOUT_RETRIES,
        log_dir: str = "scripts/tvlk/logs",
        client_factory=TravelokaProbeClient,
    ):
        self.pb_url = pb_url.rstrip("/")
        self.country = country
        self.province = province.strip()
        self.headers = {"Authorization": f"Bearer {token}"}
        self.workers = max(1, workers)
        self.min_jitter = min_jitter
        self.max_jitter = max(max_jitter, min_jitter)
        self.timeout = timeout
        self.timeout_retries = max(0, timeout_retries)
        self.log_dir = log_dir
        self.client_factory = client_factory

    def fetch_records(self, limit: int = 0, offset: int = 0) -> List[Dict]:
        records: List[Dict] = []
        page = 1
        skipped = 0
        filter_expr = f'country="{self.country}" && is_active=true'
        if self.province:
            filter_expr += f' && province="{self.province}"'

        while True:
            response = requests.get(
                f"{self.pb_url}/api/collections/{COLLECTION_NAME}/records",
                headers=self.headers,
                params={
                    "page": page,
                    "perPage": PB_PAGE_SIZE,
                    "filter": filter_expr,
                    "fields": "id,url,last_http_status,last_check_error,last_checked_at,updated",
                },
                timeout=15,
            )
            response.raise_for_status()
            payload = response.json()
            items = payload.get("items", [])
            if not items:
                break

            for item in items:
                if skipped < offset:
                    skipped += 1
                    continue
                records.append(item)
                if limit and len(records) >= limit:
                    return records

            if page >= payload.get("totalPages", 0):
                break
            page += 1

        return records

    def patch_record(self, record_id: str, patch_payload: Dict, apply: bool) -> None:
        if not apply:
            return

        response = requests.patch(
            f"{self.pb_url}/api/collections/{COLLECTION_NAME}/records/{record_id}",
            headers=self.headers,
            json=patch_payload,
            timeout=15,
        )
        response.raise_for_status()

    def probe_record(self, item: Dict) -> ProbeResult:
        self._sleep_jitter()
        checked_at = utc_now_iso()
        client = self.client_factory(self.timeout)
        url = item["url"]
        record_id = item["id"]

        try:
            head_response = self._perform_request(client.head, url)
            head_status = getattr(head_response, "status_code", None)
        except Exception as exc:
            return evaluate_probe(
                record_id,
                url,
                checked_at,
                head_status=None,
                error=classify_probe_exception(exc),
            )

        if head_status == 404:
            try:
                get_response = self._perform_request(client.get, url)
                return evaluate_probe(
                    record_id,
                    url,
                    checked_at,
                    head_status=head_status,
                    get_status=get_response.status_code,
                    get_body=getattr(get_response, "text", ""),
                )
            except Exception as exc:
                return evaluate_probe(
                    record_id,
                    url,
                    checked_at,
                    head_status=head_status,
                    error=classify_probe_exception(exc),
                )

        return evaluate_probe(record_id, url, checked_at, head_status=head_status)

    def run(self, limit: int = 0, offset: int = 0, apply: bool = False) -> Tuple[List[ProbeResult], str]:
        records = self.fetch_records(limit=limit, offset=offset)
        results: List[ProbeResult] = []
        os.makedirs(self.log_dir, exist_ok=True)

        with ThreadPoolExecutor(max_workers=self.workers) as executor:
            futures = {executor.submit(self.probe_record, item): item for item in records}
            for future in as_completed(futures):
                result = future.result()
                self.patch_record(result.record_id, result.patch_payload, apply=apply)
                results.append(result)

        log_path = self.write_log(results)
        return results, log_path

    def write_log(self, results: List[ProbeResult]) -> str:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        log_path = os.path.join(self.log_dir, f"check_results_{timestamp}.json")
        log_results = [result for result in results if result.final_result == "confirmed_404"]
        data = [
            {
                "record_id": result.record_id,
                "url": result.url,
                "head_status": result.head_status,
                "get_status": result.get_status,
                "final_result": result.final_result,
                "patch_payload": result.patch_payload,
                "checked_at": result.checked_at,
            }
            for result in log_results
        ]
        with open(log_path, "w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2, ensure_ascii=False)
        return log_path

    def _sleep_jitter(self) -> None:
        if self.max_jitter <= 0:
            return
        time.sleep(random.uniform(self.min_jitter, self.max_jitter))

    def _perform_request(self, request_fn, url: str):
        for attempt in range(self.timeout_retries + 1):
            try:
                return request_fn(url)
            except Exception as exc:
                if classify_probe_exception(exc) != "timeout" or attempt >= self.timeout_retries:
                    raise
                backoff = min(10.0, 2.0 * (attempt + 1))
                time.sleep(backoff + random.uniform(0.0, 1.0))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Stealth 404 checker for Traveloka records in PocketBase.")
    parser.add_argument("--country", default="indonesia")
    parser.add_argument("--province", default="")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--workers", type=int, default=DEFAULT_WORKERS)
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)
    parser.add_argument("--timeout-retries", type=int, default=DEFAULT_TIMEOUT_RETRIES)
    parser.add_argument("--min-jitter", type=float, default=DEFAULT_MIN_JITTER)
    parser.add_argument("--max-jitter", type=float, default=DEFAULT_MAX_JITTER)
    parser.add_argument("--apply", action="store_true", help="Write updates back to PocketBase.")
    parser.add_argument("--log-dir", default="scripts/tvlk/logs")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    info = get_pb_info()
    if not info:
        print("ERROR: db/pb_info.txt not found or unreadable.")
        return 1

    token = authenticate(info["pb_url"], info["email"], info["password"])
    if not token:
        print("ERROR: PocketBase authentication failed.")
        return 1

    try:
        checker = Tvlk404Checker(
            info["pb_url"],
            token,
            country=args.country,
            province=args.province,
            workers=args.workers,
            min_jitter=args.min_jitter,
            max_jitter=args.max_jitter,
            timeout=args.timeout,
            timeout_retries=args.timeout_retries,
            log_dir=args.log_dir,
        )
        results, log_path = checker.run(limit=args.limit, offset=args.offset, apply=args.apply)
    except RuntimeError as exc:
        print(f"ERROR: {exc}")
        return 1

    summary: Dict[str, int] = {}
    for result in results:
        summary[result.final_result] = summary.get(result.final_result, 0) + 1

    print(f"Checked {len(results)} records.")
    print(f"Mode: {'apply' if args.apply else 'dry-run'}")
    print(f"Log: {log_path}")
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
