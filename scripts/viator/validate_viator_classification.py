#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
import sys
from typing import Dict, Iterable, List, Tuple

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.viator.common import normalize_key, pretty_country_from_filename


GENERIC_SOURCES = {"europe", "caribbean"}
EXACT_COUNTRY_SOURCES = {
    "france",
    "italy",
    "spain",
    "uk",
    "united_kingdom",
    "japan",
    "mexico",
    "usa",
    "united_states",
}

SOURCE_COUNTRY_MAP = {
    "uk": "united_kingdom",
    "usa": "united_states",
}

CARIBBEAN_ALLOWED = {
    "anguilla",
    "antigua_and_barbuda",
    "aruba",
    "bahamas",
    "barbados",
    "bermuda",
    "bonaire_sint_eustatius_and_saba",
    "british_virgin_islands",
    "cayman_islands",
    "cuba",
    "curacao",
    "dominica",
    "dominican_republic",
    "grenada",
    "guadeloupe",
    "haiti",
    "jamaica",
    "martinique",
    "montserrat",
    "puerto_rico",
    "saint_barthelemy",
    "saint_kitts_and_nevis",
    "saint_lucia",
    "saint_martin",
    "saint_vincent_and_the_grenadines",
    "sint_maarten",
    "trinidad_and_tobago",
    "turks_and_caicos_islands",
    "united_states_virgin_islands",
    "virgin_islands_british",
    "virgin_islands_u_s",
}

EUROPE_ALLOWED = {
    "albania",
    "andorra",
    "armenia",
    "austria",
    "azerbaijan",
    "belarus",
    "belgium",
    "bosnia_and_herzegovina",
    "bulgaria",
    "croatia",
    "cyprus",
    "czech_republic",
    "denmark",
    "estonia",
    "faroe_islands",
    "finland",
    "france",
    "georgia",
    "germany",
    "gibraltar",
    "greece",
    "greenland",
    "hungary",
    "iceland",
    "ireland",
    "italy",
    "kosovo",
    "latvia",
    "liechtenstein",
    "lithuania",
    "luxembourg",
    "malta",
    "moldova",
    "monaco",
    "montenegro",
    "netherlands",
    "north_macedonia",
    "norway",
    "poland",
    "portugal",
    "romania",
    "san_marino",
    "serbia",
    "slovakia",
    "slovenia",
    "spain",
    "sweden",
    "switzerland",
    "turkey",
    "ukraine",
    "united_kingdom",
    "vatican",
}

PRIVATE_NEGATIVE_PATTERNS = [
    r"\bsmall[\s-]?group\s+or\s+private\b",
    r"\bshared\s+or\s+private\b",
    r"\bprivate option\b",
    r"\bprivate option available\b",
    r"\bupgrade to private\b",
    r"\bprivate room\b",
    r"\bprivate table\b",
]

PRIVATE_POSITIVE_PATTERNS = [
    r"\bprivate tour\b",
    r"\bprivate day trip\b",
    r"\bprivate excursion\b",
    r"\bprivate guide\b",
    r"\bprivate guided\b",
    r"\bprivate transfer\b",
    r"\bprivate experience\b",
    r"\bprivately guided\b",
    r"\bvip private\b",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate Viator classified CSVs before PocketBase import.")
    parser.add_argument(
        "--inputs",
        nargs="*",
        default=[],
        help="Specific classified CSV files. Defaults to all data/*_classified.csv",
    )
    parser.add_argument(
        "--report-json",
        default="data/viator_validation_report.json",
        help="Path for machine-readable JSON report",
    )
    parser.add_argument(
        "--report-csv",
        default="data/viator_validation_findings.csv",
        help="Path for detailed findings CSV",
    )
    parser.add_argument(
        "--fail-on-high",
        action="store_true",
        help="Exit 1 if any HIGH severity findings exist",
    )
    return parser.parse_args()


def infer_source_bucket(path: Path) -> str:
    normalized_name = path.name.replace("_classified.csv", ".csv")
    raw = pretty_country_from_filename(normalized_name)
    return SOURCE_COUNTRY_MAP.get(raw, raw)


def parse_rule_hits(raw: str) -> List[str]:
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(item) for item in parsed]
    except json.JSONDecodeError:
        return []
    return []


def classify_source_mode(source_bucket: str) -> str:
    if source_bucket in GENERIC_SOURCES:
        return "generic_region"
    if source_bucket in EXACT_COUNTRY_SOURCES:
        return "exact_country"
    return "unknown"


def validate_row(
    row: Dict[str, str],
    source_path: Path,
    source_bucket: str,
    source_mode: str,
) -> List[Dict[str, str]]:
    findings: List[Dict[str, str]] = []
    url = (row.get("url") or "").strip()
    title = (row.get("title") or "").strip()
    haystack = f"{url.lower()} {title.lower()}"
    country = normalize_key(row.get("country") or "")
    city = normalize_key(row.get("city") or "")
    page_type = normalize_key(row.get("page_type") or "")
    is_private = str(row.get("is_private") or "").strip().lower() == "true"
    rule_hits = parse_rule_hits(row.get("rule_hits") or "[]")

    def push(severity: str, code: str, message: str) -> None:
        findings.append(
            {
                "severity": severity,
                "code": code,
                "source_file": source_path.name,
                "source_bucket": source_bucket,
                "url": url,
                "title": title,
                "country": country or "",
                "city": city or "",
                "page_type": page_type or "",
                "is_private": "true" if is_private else "false",
                "rule_hits": json.dumps(rule_hits, ensure_ascii=True),
                "message": message,
            }
        )

    if not country:
        push("HIGH", "blank_country", "Country is blank; unresolved geo must be normalized and reviewed explicitly.")

    if source_mode == "exact_country":
        expected = source_bucket
        if country and country != expected:
            push(
                "HIGH",
                "exact_source_country_mismatch",
                f"Country '{country}' does not match exact source bucket '{expected}'.",
            )
        if source_bucket == "united_states" and country == "unknown":
            push(
                "MEDIUM",
                "us_domestic_unknown_country",
                "US domestic row kept Unknown even though source bucket is United States.",
            )

    if source_mode == "generic_region":
        allowed = EUROPE_ALLOWED if source_bucket == "europe" else CARIBBEAN_ALLOWED
        if country and country != "unknown" and country not in allowed:
            push(
                "HIGH",
                "region_country_outside_bucket",
                f"Country '{country}' is outside the allowed set for source bucket '{source_bucket}'.",
            )

    if country == "unknown" and city and city != "unknown":
        push(
            "MEDIUM",
            "unknown_country_with_city",
            "Country is Unknown even though a city/destination anchor was extracted.",
        )

    has_private_negative = any(re.search(pattern, haystack, re.I) for pattern in PRIVATE_NEGATIVE_PATTERNS)
    has_private_positive = any(re.search(pattern, haystack, re.I) for pattern in PRIVATE_POSITIVE_PATTERNS)

    if is_private and has_private_negative:
        push(
            "HIGH",
            "private_false_positive_ambiguous",
            "is_private=true even though title/url only contains ambiguous private wording.",
        )

    if (not is_private) and has_private_positive and not has_private_negative:
        push(
            "HIGH",
            "private_false_negative",
            "Title/url contains strong private signal but is_private=false.",
        )

    if "country:city-resolver" in rule_hits and source_mode == "exact_country":
        push(
            "HIGH",
            "exact_country_used_city_resolver",
            "Exact-country file relied on city resolver instead of fixed source country.",
        )

    if page_type == "product" and source_bucket == "united_states" and country and country not in {"united_states", "unknown"}:
        push(
            "HIGH",
            "us_domestic_foreign_country",
            f"US domestic row resolved to foreign country '{country}'.",
        )

    if page_type == "product" and source_bucket == "caribbean" and country == "united_states":
        push(
            "HIGH",
            "caribbean_misclassified_as_us",
            "Caribbean row resolved to United States; likely city ambiguity or wrong source-bucket logic.",
        )

    if city == source_bucket and source_mode == "exact_country":
        push(
            "MEDIUM",
            "country_bucket_used_as_city",
            "City equals source country bucket; likely country bucket was treated as a city segment.",
        )

    return findings


def iter_inputs(inputs: Iterable[str]) -> List[Path]:
    if inputs:
        return [Path(path) for path in inputs]
    return sorted(Path("data").glob("*_classified.csv"))


def main() -> int:
    args = parse_args()
    input_paths = iter_inputs(args.inputs)
    all_findings: List[Dict[str, str]] = []
    summary: Dict[str, Dict[str, object]] = {}

    for path in input_paths:
        source_bucket = infer_source_bucket(path)
        source_mode = classify_source_mode(source_bucket)
        file_findings: List[Dict[str, str]] = []
        total_rows = 0

        with path.open("r", encoding="utf-8", newline="") as fh:
            for row in csv.DictReader(fh):
                total_rows += 1
                file_findings.extend(validate_row(row, path, source_bucket, source_mode))

        severity_counts = Counter(item["severity"] for item in file_findings)
        code_counts = Counter(item["code"] for item in file_findings)

        summary[path.name] = {
            "source_bucket": source_bucket,
            "source_mode": source_mode,
            "rows": total_rows,
            "findings": len(file_findings),
            "severity_counts": dict(severity_counts),
            "top_codes": dict(code_counts.most_common(10)),
        }
        all_findings.extend(file_findings)

    report_json_path = Path(args.report_json)
    report_json_path.parent.mkdir(parents=True, exist_ok=True)
    report_json_path.write_text(
        json.dumps({"summary": summary, "finding_count": len(all_findings)}, indent=2, ensure_ascii=True),
        encoding="utf-8",
    )

    report_csv_path = Path(args.report_csv)
    report_csv_path.parent.mkdir(parents=True, exist_ok=True)
    with report_csv_path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "severity",
                "code",
                "source_file",
                "source_bucket",
                "country",
                "city",
                "page_type",
                "is_private",
                "title",
                "url",
                "rule_hits",
                "message",
            ],
        )
        writer.writeheader()
        writer.writerows(all_findings)

    overall = Counter(item["severity"] for item in all_findings)
    print("VIATOR VALIDATION SUMMARY")
    print(json.dumps(summary, indent=2, ensure_ascii=True))
    print("---")
    print(f"TOTAL_FINDINGS={len(all_findings)}")
    print(f"HIGH={overall.get('HIGH', 0)}")
    print(f"MEDIUM={overall.get('MEDIUM', 0)}")
    print(f"JSON_REPORT={report_json_path}")
    print(f"CSV_REPORT={report_csv_path}")

    if args.fail_on_high and overall.get("HIGH", 0) > 0:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
