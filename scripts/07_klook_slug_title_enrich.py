#!/usr/bin/env python3
"""
Enrich Klook URL list with:
- slug
- decoded_slug
- smart translated title (EN)

Output is JSON preview/seed for import.
"""

import argparse
import html
import json
import os
import random
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Tuple
from urllib.parse import unquote, urlparse

import requests

from lib.geo_engine import engine as geo_engine


TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"
TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
TARGET_FRESH_YEAR = 2026
RECENT_YEAR = 2025
FUNNEL_KEYWORDS = {
    "readiness": [
        "visit japan web",
        "visit japan",
        "vjw",
        "arrival card",
        "arrival form",
        "entry form",
        "landing card",
        "immigration",
        "customs",
        "visa",
        "e visa",
        "evisa",
        "travel visa",
        "entry visa",
        "eta",
        "k eta",
        "keta",
        "electronic travel authorization",
        "entry requirement",
        "entry requirements",
        "entry permit",
        "travel requirement",
        "border control",
        "passport validity",
        "transit visa",
        "health declaration",
        "customs declaration",
        "declaration form",
        "travel declaration",
    ],
    "planning": [
        "itinerary",
        "travel plan",
        "x day x night",
        "day trip",
        "rail pass",
        "jr pass",
        "metro pass",
        "transport pass",
        "airport transfer",
        "airport express",
        "from airport",
        "to city",
        "sim card",
        "esim",
        "pocket wifi",
        "wifi card",
        "budget",
        "cost",
        "price",
        "fare",
        "ticket",
        "booking",
        "where to stay",
        "best area",
        "hotel area",
        "best time to visit",
        "weather",
        "season",
        "restaurant guide",
        "must eat",
    ],
    "awareness": [
        "things to do",
        "top attractions",
        "best places",
        "travel guide",
        "destination guide",
        "cherry blossom",
        "autumn leaves",
        "xmas",
        "winter",
        "summer",
        "spring",
        "festival",
        "event",
        "photo spot",
        "instagrammable",
        "family activities",
        "couple date ideas",
        "top 10",
        "must visit",
        "recommendation",
    ],
}
FUNNEL_REGEX = {
    "readiness": [
        re.compile(r"\bvisit\s+japan\s+web\b"),
        re.compile(r"\bk[\s-]?eta\b"),
        re.compile(r"\be[\s-]?visa\b"),
        re.compile(r"\barrival\s+(card|form)\b"),
        re.compile(r"\b(entry|travel)\s+requirement(s)?\b"),
        re.compile(r"\b(immigration|customs)\b"),
    ],
    "planning": [
        re.compile(r"\b\d+\s*(day|days)\b"),
        re.compile(r"\b(jr|rail|metro)\s+pass\b"),
        re.compile(r"\bairport\s+(transfer|express)\b"),
        re.compile(r"\b(sim|esim|wifi|pocket wifi)\b"),
    ],
    "awareness": [],
}


def read_urls(input_file: str) -> List[str]:
    if not os.path.exists(input_file):
        raise FileNotFoundError(f"Input file not found: {input_file}")
    with open(input_file, "r", encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]


def extract_slug(url: str) -> str:
    path = urlparse(url).path.rstrip("/")
    if not path:
        return ""
    return path.split("/")[-1]


def has_non_ascii(text: str) -> bool:
    return any(ord(ch) > 127 for ch in text)


def build_decoded_slug(raw_slug: str) -> str:
    # Always unquote first (works for both encoded and plain slugs).
    decoded = unquote(raw_slug).strip()
    # For plain ASCII slugs, make it human-readable by replacing '-' with spaces.
    # For non-ASCII slugs (e.g., zh-HK), keep decoded text but still normalize separators.
    return decoded.replace("-", " ").replace("_", " ").strip()


def fetch_page_title(url: str, timeout: int = 20) -> Tuple[str, str]:
    """
    Returns (title, fetch_status)
    fetch_status: ok | timeout | http_error | blocked | parse_error | request_error
    """
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.8,zh-HK;q=0.6",
    }

    try:
        resp = requests.get(url, headers=headers, timeout=timeout, allow_redirects=True)
        status_code = resp.status_code
        if status_code >= 400:
            if status_code in (403, 429):
                return "", "blocked"
            return "", "http_error"

        match = TITLE_RE.search(resp.text or "")
        if not match:
            return "", "parse_error"

        title = html.unescape(match.group(1))
        title = re.sub(r"\s+", " ", title).strip()
        return title, "ok"
    except requests.Timeout:
        return "", "timeout"
    except requests.RequestException:
        return "", "request_error"


def sleep_backoff(attempt: int) -> None:
    # Exponential backoff + jitter
    base = 0.8 * (2 ** attempt)
    jitter = random.uniform(0, 0.4)
    time.sleep(base + jitter)


def translate_to_en(text: str, source_lang: str = "auto", max_retries: int = 3) -> str:
    if not text:
        return ""

    params = {
        "client": "gtx",
        "sl": source_lang,
        "tl": "en",
        "dt": "t",
        "q": text,
    }

    for attempt in range(max_retries):
        try:
            resp = requests.get(TRANSLATE_URL, params=params, timeout=15)
            if resp.status_code != 200:
                if attempt < max_retries - 1:
                    sleep_backoff(attempt)
                    continue
                return ""
            data = resp.json()
            # Expected: [[["translated","original",...],...],...]
            translated_parts = []
            if isinstance(data, list) and data and isinstance(data[0], list):
                for seg in data[0]:
                    if isinstance(seg, list) and seg:
                        translated_parts.append(seg[0] or "")
            return "".join(translated_parts).strip()
        except (requests.RequestException, ValueError):
            if attempt < max_retries - 1:
                sleep_backoff(attempt)
                continue
            return ""
    return ""


def normalize_title_for_translation(title: str) -> str:
    # Keep useful semantic chunk, remove site suffix noise.
    # Example: "abc | Klook Travel"
    parts = re.split(r"\s\|\s", title)
    if parts:
        return parts[0].strip()
    return title.strip()


def normalize_geo_candidate(text: str) -> str:
    if not text:
        return ""
    cleaned = text
    # Remove common wrapper noise while preserving useful location tokens.
    cleaned = re.sub(r"\[([^\]]+)\]", r" \1 ", cleaned)
    cleaned = re.sub(r"\(([^)]+)\)", r" \1 ", cleaned)
    cleaned = re.sub(r"\{([^}]+)\}", r" \1 ", cleaned)
    cleaned = cleaned.replace("|", " ").replace("/", " ").replace("•", " ")
    cleaned = re.sub(r"[-–—]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def normalize_for_match(text: str) -> str:
    cleaned = normalize_geo_candidate(text or "").lower()
    cleaned = re.sub(r"[^a-z0-9\s]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def classify_funnel_stage(translated_title_en: str, decoded_slug: str) -> Tuple[str, str, str]:
    primary = normalize_for_match(translated_title_en)
    fallback = normalize_for_match(decoded_slug)
    source = "translated_title_vi" if primary else "decoded_slug"
    target = primary or fallback
    if not target:
        return "awareness", source, ""

    for stage in ("readiness", "planning", "awareness"):
        for pattern in FUNNEL_REGEX[stage]:
            if pattern.search(target):
                return stage, source, pattern.pattern

    for stage in ("readiness", "planning", "awareness"):
        for kw in FUNNEL_KEYWORDS[stage]:
            if kw in target:
                return stage, source, kw

    if source == "translated_title_vi" and fallback:
        for stage in ("readiness", "planning", "awareness"):
            for pattern in FUNNEL_REGEX[stage]:
                if pattern.search(fallback):
                    return stage, "decoded_slug", pattern.pattern
        for stage in ("readiness", "planning", "awareness"):
            for kw in FUNNEL_KEYWORDS[stage]:
                if kw in fallback:
                    return stage, "decoded_slug", kw

    return "awareness", source, ""


def detect_year(text: str) -> str:
    if not text:
        return ""
    if "2025" in text:
        return "2025"
    m = re.search(r"(20\d{2})", text)
    return m.group(1) if m else ""


def derive_tier(funnel_stage: str, translated_title_en: str, decoded_slug: str) -> Tuple[str, str]:
    # Tier override based on year found in translated_title_vi first.
    year = detect_year(translated_title_en) or detect_year(decoded_slug)
    if year:
        year_num = int(year)
        if year_num == RECENT_YEAR:
            return "4", year
        if year_num < RECENT_YEAR:
            return "5", year

    base_map = {
        "readiness": "1",
        "planning": "2",
        "awareness": "3",
    }
    return base_map.get(funnel_stage, "3"), year


def detect_geo_with_priority(translated_title_en: str, decoded_slug: str, raw_slug: str) -> Tuple[str, str, str]:
    title_clean = normalize_geo_candidate(translated_title_en)
    candidates = [
        ("translated_title_vi", title_clean),
        ("decoded_slug", decoded_slug),
        ("slug", raw_slug),
    ]
    for source, text in candidates:
        if not text:
            continue
        country, city = geo_engine.detect_geo(text)
        if country != "Unknown" or city != "Unknown":
            return country, city, source
    return "Unknown", "Unknown", "unknown"


def build_record(
    url: str,
    sitemap_tag: str,
    language: str,
    content_type: str,
    fetch_title_mode: str,
) -> Dict:
    raw_slug = extract_slug(url)
    decoded_slug = build_decoded_slug(raw_slug)
    slug_has_special_chars = has_non_ascii(unquote(raw_slug))

    title_raw = ""
    fetch_status = "skipped_disabled"
    title_for_translation = ""
    if fetch_title_mode != "off":
        title_raw, fetch_status = fetch_page_title(url)
        title_for_translation = normalize_title_for_translation(title_raw)

    translation_source = "fallback"
    translated_title_en = ""

    # Safe default: prefer decoded slug, only use title on-demand.
    if fetch_title_mode != "off" and title_for_translation and not slug_has_special_chars:
        translated_title_en = translate_to_en(title_for_translation, source_lang="auto")
        if translated_title_en:
            translation_source = "title"

    if not translated_title_en and decoded_slug:
        translated_title_en = translate_to_en(decoded_slug, source_lang="auto")
        if translated_title_en:
            translation_source = "decoded_slug"

    if not translated_title_en:
        translated_title_en = decoded_slug or raw_slug
        translation_source = "fallback"

    country, city, geo_source = detect_geo_with_priority(
        translated_title_en=translated_title_en,
        decoded_slug=decoded_slug,
        raw_slug=raw_slug,
    )
    funnel_stage, funnel_source, funnel_rule_hit = classify_funnel_stage(
        translated_title_en=translated_title_en,
        decoded_slug=decoded_slug,
    )
    tier, year_detected = derive_tier(
        funnel_stage=funnel_stage,
        translated_title_en=translated_title_en,
        decoded_slug=decoded_slug,
    )

    return {
        "canonical_id": "0",
        "language": language,
        "languages": [language],
        "content_type": content_type,
        "url": url,
        "slug": raw_slug,
        "decoded_slug": decoded_slug,
        "sitemap_tag": sitemap_tag,
        "sub_tag": "",
        "country": country,
        "city": city,
        "tier": tier,
        "is_private": False,
        "translated_title_vi": translated_title_en,
        "include_for_dsa": True,
        "exclude_for_dsa": False,
        "funnel_stage": funnel_stage,
        "metadata": {
            "translation_source": translation_source,
            "fetch_status": fetch_status,
            "page_title_raw": title_raw,
            "slug_has_non_ascii": slug_has_special_chars,
            "geo_source": geo_source,
            "funnel_source": funnel_source,
            "funnel_rule_hit": funnel_rule_hit,
            "year_detected": year_detected,
            "tier_source": "year_override" if tier in {"4", "5"} and year_detected else "funnel_stage",
        },
    }


def process(
    input_file: str,
    sitemap_tag: str,
    language: str,
    content_type: str,
    output_file: str,
    sleep_between: float,
    max_workers: int,
    fetch_title_mode: str,
) -> Dict[str, int]:
    urls = read_urls(input_file)
    records: List[Dict] = [None] * len(urls)

    stats = {
        "total": len(urls),
        "fetch_skipped": 0,
        "fetch_ok": 0,
        "fetch_failed": 0,
        "translated_from_title": 0,
        "translated_from_decoded_slug": 0,
        "fallback": 0,
    }

    def worker(idx: int, url: str) -> Tuple[int, Dict]:
        record = build_record(
            url=url,
            sitemap_tag=sitemap_tag,
            language=language,
            content_type=content_type,
            fetch_title_mode=fetch_title_mode,
        )
        if sleep_between > 0:
            time.sleep(sleep_between)
        return idx, record

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(worker, idx, url) for idx, url in enumerate(urls)]
        for done_count, fut in enumerate(as_completed(futures), start=1):
            idx, record = fut.result()
            records[idx] = record
            url = record["url"]
            
            fetch_status = record.get("metadata", {}).get("fetch_status")
            source = record.get("metadata", {}).get("translation_source")
            if fetch_status == "ok":
                stats["fetch_ok"] += 1
            elif fetch_status == "skipped_disabled":
                stats["fetch_skipped"] += 1
            else:
                stats["fetch_failed"] += 1
    
            if source == "title":
                stats["translated_from_title"] += 1
            elif source == "decoded_slug":
                stats["translated_from_decoded_slug"] += 1
            else:
                stats["fallback"] += 1
    
            print(f"[{done_count}/{len(urls)}] {url} | fetch={fetch_status} | source={source}")

    # type narrowing for json dump
    records = [r for r in records if r is not None]

    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print("\nDone enrich.")
    print(f"Saved: {output_file}")
    print(json.dumps(stats, indent=2))
    return stats


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Enrich Klook URLs with decoded_slug and smart translated title."
    )
    parser.add_argument("--input", required=True, help="Input txt file (one URL per line).")
    parser.add_argument("--sitemap-tag", required=True, help="Sitemap tag value (e.g. blog).")
    parser.add_argument("--language", default="zh-HK", help="Language value for pages record.")
    parser.add_argument("--content-type", default="blog", help="Content type value for pages record.")
    parser.add_argument("--output", required=True, help="Output JSON file path.")
    parser.add_argument(
        "--sleep-between",
        type=float,
        default=0.0,
        help="Optional sleep per worker after each URL processing.",
    )
    parser.add_argument(
        "--max-workers",
        type=int,
        default=6,
        help="Concurrent workers for fetch+translate.",
    )
    parser.add_argument(
        "--fetch-title-mode",
        choices=["off", "on-demand"],
        default="off",
        help="Default is off to avoid site blocks. Enable only when explicitly needed.",
    )
    return parser


if __name__ == "__main__":
    args = build_parser().parse_args()
    process(
        input_file=args.input,
        sitemap_tag=args.sitemap_tag,
        language=args.language,
        content_type=args.content_type,
        output_file=args.output,
        sleep_between=args.sleep_between,
        max_workers=args.max_workers,
        fetch_title_mode=args.fetch_title_mode,
    )
