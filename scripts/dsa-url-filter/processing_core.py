#!/usr/bin/env python3
from __future__ import annotations

import csv
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

CURRENT_DIR = Path(__file__).resolve().parent
LIB_DIR = CURRENT_DIR.parent / "lib"
if str(LIB_DIR) not in sys.path:
    sys.path.insert(0, str(LIB_DIR))

from geo_engine import engine as geo_engine  # type: ignore


SUPPORTED_HEADERS = {
    "url": {"url"},
    "headline": {"headline", "title"},
    "clicks": {"clicks"},
    "impressions": {"impressions"},
    "cost": {"cost", "amount spent"},
    "ctr": {"ctr", "ctr (%)", "ctr%", "ctr percent"},
}

LOCALE_SEGMENTS = {
    "th", "en", "zh-hk", "zh-tw", "id-id", "id", "vi-vn", "vi", "ko", "ja", "jp", "en-us",
}


def normalize_header(value: str) -> str:
    return " ".join(value.strip().lower().split())


def resolve_column_index(headers: list[str], logical_name: str) -> int:
    aliases = SUPPORTED_HEADERS[logical_name]
    for index, header in enumerate(headers):
        if header in aliases:
            return index
    return -1


def normalize_number(value: str, kind: str) -> float | int | None:
    if not value:
        return None

    normalized = value.strip().replace(" ", "").replace("%", "")
    if not normalized:
        return None

    has_dot = "." in normalized
    has_comma = "," in normalized

    if has_dot and has_comma:
        if normalized.rfind(",") > normalized.rfind("."):
            normalized = normalized.replace(".", "").replace(",", ".")
        else:
            normalized = normalized.replace(",", "")
    elif has_comma:
        if normalized.count(",") > 1:
            normalized = normalized.replace(",", "")
        else:
            whole, _, decimal = normalized.partition(",")
            normalized = f"{whole}.{decimal}" if decimal and len(decimal) <= 2 else f"{whole}{decimal}"
    elif has_dot:
        if normalized.count(".") > 1 or re.fullmatch(r"\d{1,3}(\.\d{3})+", normalized):
            normalized = normalized.replace(".", "")

    try:
        parsed = float(normalized)
    except ValueError:
        return None

    if kind == "integer":
        return int(round(parsed))
    return parsed


def detect_dialect(sample: str) -> csv.Dialect:
    try:
        return csv.Sniffer().sniff(sample, delimiters=",;\t")
    except csv.Error:
        return csv.get_dialect("excel")


def normalize_url(value: str) -> str:
    parsed = urlparse(value.strip())
    return parsed._replace(query="", fragment="").geturl()


def extract_slug(url_value: str) -> str:
    parsed = urlparse(url_value)
    path = unquote(parsed.path.lower())
    segments = [segment for segment in path.split("/") if segment]
    filtered_segments = [segment for segment in segments if segment not in LOCALE_SEGMENTS]
    if not filtered_segments:
        return ""
    return "-".join(filtered_segments)


def detect_country(url_value: str, headline: str) -> dict[str, str]:
    slug = extract_slug(url_value)
    country, city = geo_engine.detect_geo(slug, headline or "")
    classification = "matched" if country != "Unknown" else "unknown"
    confidence = "high" if city != "Unknown" and country != "Unknown" else ("medium" if country != "Unknown" else "low")
    reason = (
        f'Detected {country} from normalized slug "{slug}".'
        if country != "Unknown"
        else "No confident country signal found in URL or headline."
    )
    return {
        "page_country": country,
        "page_city": city,
        "classification": classification,
        "confidence": confidence,
        "matched_by": "geo_engine",
        "reason": reason,
    }


def parse_rows(input_path: Path) -> tuple[list[dict[str, Any]], list[str]]:
    sample = input_path.read_text(encoding="utf-8")
    if not sample.strip():
        raise ValueError("The uploaded file is empty.")

    dialect = detect_dialect(sample[:4096])
    rows: list[dict[str, Any]] = []

    with input_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle, dialect)
        header_row = next(reader, None)
        if not header_row:
            raise ValueError("Missing CSV header row.")

        headers = [normalize_header(value) for value in header_row]
        url_index = resolve_column_index(headers, "url")
        if url_index == -1:
            raise ValueError('Missing required "URL" column.')

        headline_index = resolve_column_index(headers, "headline")
        clicks_index = resolve_column_index(headers, "clicks")
        impressions_index = resolve_column_index(headers, "impressions")
        cost_index = resolve_column_index(headers, "cost")
        ctr_index = resolve_column_index(headers, "ctr")

        for row_id, record in enumerate(reader, start=1):
            if url_index >= len(record):
                continue
            url_original = (record[url_index] or "").strip()
            if not url_original:
                continue

            headline = (record[headline_index] if headline_index >= 0 and headline_index < len(record) else "").strip()
            clicks_raw = (record[clicks_index] if clicks_index >= 0 and clicks_index < len(record) else "").strip()
            impressions_raw = (record[impressions_index] if impressions_index >= 0 and impressions_index < len(record) else "").strip()
            cost_raw = (record[cost_index] if cost_index >= 0 and cost_index < len(record) else "").strip()
            ctr_raw = (record[ctr_index] if ctr_index >= 0 and ctr_index < len(record) else "").strip()

            warnings: list[str] = []
            clicks = normalize_number(clicks_raw, "integer")
            if clicks_raw and clicks is None:
                warnings.append("Unable to parse Clicks.")
            impressions = normalize_number(impressions_raw, "integer")
            if impressions_raw and impressions is None:
                warnings.append("Unable to parse Impressions.")
            cost = normalize_number(cost_raw, "float")
            if cost_raw and cost is None:
                warnings.append("Unable to parse Cost.")
            ctr = normalize_number(ctr_raw, "float")
            if ctr_raw and ctr is None:
                warnings.append("Unable to parse CTR.")

            url_normalized = normalize_url(url_original)
            detection = detect_country(url_normalized, headline)

            rows.append({
                "row_id": row_id,
                "url_original": url_original,
                "url_normalized": url_normalized,
                "headline": headline,
                "clicks_raw": clicks_raw,
                "clicks": clicks,
                "impressions_raw": impressions_raw,
                "impressions": impressions,
                "cost_raw": cost_raw,
                "cost": cost,
                "ctr_raw": ctr_raw,
                "ctr": ctr,
                "page_country": detection["page_country"],
                "page_city": detection["page_city"],
                "classification": detection["classification"],
                "confidence": detection["confidence"],
                "matched_by": detection["matched_by"],
                "reason": detection["reason"],
                "include": True,
                "warnings": warnings,
            })

    countries = sorted({row["page_country"] for row in rows}, key=lambda value: (value != "Unknown", value))
    return rows, countries


def build_summary(rows: list[dict[str, Any]]) -> dict[str, Any]:
    matched_rows = sum(1 for row in rows if row["classification"] == "matched")
    unknown_rows = sum(1 for row in rows if row["classification"] == "unknown")
    included_rows = sum(1 for row in rows if row["include"])
    excluded_rows = len(rows) - included_rows
    included_clicks = sum((row.get("clicks") or 0) for row in rows if row["include"])
    excluded_clicks = sum((row.get("clicks") or 0) for row in rows if not row["include"])
    included_cost = sum((row.get("cost") or 0) for row in rows if row["include"])
    excluded_cost = sum((row.get("cost") or 0) for row in rows if not row["include"])

    by_country: dict[str, int] = {}
    for row in rows:
        country = row["page_country"]
        by_country[country] = by_country.get(country, 0) + 1

    top_countries = [
        {"country": country, "count": count}
        for country, count in sorted(by_country.items(), key=lambda item: item[1], reverse=True)[:10]
    ]

    return {
        "total_rows": len(rows),
        "matched_rows": matched_rows,
        "unknown_rows": unknown_rows,
        "included_rows": included_rows,
        "excluded_rows": excluded_rows,
        "included_clicks": included_clicks,
        "excluded_clicks": excluded_clicks,
        "included_cost": included_cost,
        "excluded_cost": excluded_cost,
        "top_countries": top_countries,
    }


def split_values(raw_value: str) -> set[str]:
    return {value for value in raw_value.split("|") if value}


def normalize_search_text(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value.lower())
    normalized = normalized.replace("đ", "d")
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn")


def row_matches_filters(row: dict[str, Any], filters: dict[str, str]) -> bool:
    search_term = normalize_search_text((filters.get("search_term") or "").strip())
    exclude_term = normalize_search_text((filters.get("exclude_term") or "").strip())
    include_countries = split_values(filters.get("include_countries", ""))
    exclude_countries = split_values(filters.get("exclude_countries", ""))
    include_status = filters.get("include_status", "all")
    classification = filters.get("classification", "all")
    searchable = normalize_search_text(f'{row.get("page_country", "")} {row.get("page_city", "")} {row.get("headline", "")}')

    if search_term and search_term not in searchable:
        return False
    if exclude_term and exclude_term in searchable:
        return False
    if classification != "all" and row.get("classification") != classification:
        return False
    if include_status == "included" and not row.get("include", True):
        return False
    if include_status == "excluded" and row.get("include", True):
        return False
    if include_countries and row.get("page_country") not in include_countries:
        return False
    if row.get("page_country") in exclude_countries:
        return False
    return True


def clean_label(value: str) -> str:
    return value.lower().replace(" ", "-").replace(",", "")


def build_custom_label(row: dict[str, Any], fields: list[str], custom_label: str) -> str:
    label_parts: list[str] = []
    prefix_map = {
        "page_country": "geo=",
        "page_city": "city=",
        "classification": "class=",
        "confidence": "confidence=",
    }

    for field in fields:
        value = row.get(field)
        if not value:
            continue
        if field == "headline":
            label_parts.append(str(value).replace(";", " ").replace(",", " ").strip())
        else:
            label_parts.append(f'{prefix_map.get(field, "")}{clean_label(str(value))}')

    if custom_label.strip():
        label_parts.append(custom_label.strip())

    return ";".join(label_parts)
