#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
import sys
from typing import Dict, List, Tuple
from urllib.parse import urlparse, unquote

import geonamescache
import pycountry

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.viator.common import normalize_key, pretty_country_from_filename


TTD_PREFIX = "things to do in "
TICKET_PREFIX = "tickets & tours in "
GENERIC_BUCKETS = {"europe", "caribbean", "world"}

REGION_ALLOWED_COUNTRIES = {
    "europe": {
        "albania", "andorra", "armenia", "austria", "azerbaijan", "belarus", "belgium",
        "bosnia_and_herzegovina", "bulgaria", "croatia", "cyprus", "czech_republic", "denmark",
        "estonia", "faroe_islands", "finland", "france", "georgia", "germany", "gibraltar", "greece", "greenland", "hungary",
        "iceland", "ireland", "italy", "kosovo", "latvia", "liechtenstein", "lithuania",
        "luxembourg", "malta", "moldova", "monaco", "montenegro", "netherlands", "north_macedonia",
        "norway", "poland", "portugal", "romania", "san_marino", "serbia", "slovakia",
        "slovenia", "spain", "sweden", "switzerland", "turkey", "ukraine", "united_kingdom",
        "vatican",
    },
    "caribbean": {
        "anguilla", "antigua_and_barbuda", "aruba", "bahamas", "barbados",
        "bermuda", "bonaire_sint_eustatius_and_saba", "british_virgin_islands", "cayman_islands", "cuba",
        "curacao", "dominica", "dominican_republic", "grenada", "guadeloupe", "haiti", "jamaica",
        "martinique", "montserrat", "puerto_rico", "saint_barthelemy", "saint_kitts_and_nevis",
        "saint_lucia", "saint_martin", "saint_vincent_and_the_grenadines", "sint_maarten",
        "trinidad_and_tobago", "turks_and_caicos_islands", "united_states_virgin_islands",
        "virgin_islands_british", "virgin_islands_u_s",
    },
}

COUNTRY_ALIASES = {
    "bonaire_saint_eustatius_and_saba": "bonaire_sint_eustatius_and_saba",
    "czechia": "czech_republic",
    "republic_of_moldova": "moldova",
    "russian_federation": "russia",
    "syrian_arab_republic": "syria",
    "united_states_of_america": "united_states",
    "virgin_islands_british": "british_virgin_islands",
    "virgin_islands_u_s": "united_states_virgin_islands",
}


class GeoResolver:
    def __init__(self) -> None:
        gc = geonamescache.GeonamesCache()
        self.countries = gc.get_countries()
        self.cities = gc.get_cities()
        self.country_by_name: Dict[str, str] = {}
        self.city_to_country: Dict[Tuple[str, str], str] = {}
        self.city_country_score: Dict[Tuple[str, str], int] = {}
        self.overrides = self._load_overrides()
        self._build_country_index()
        self._build_city_index()

    def _load_overrides(self) -> Dict[str, Dict[str, str]]:
        path = REPO_ROOT / "scripts" / "viator" / "geo_overrides.json"
        if not path.exists():
            return {"city_to_country": {}, "name_to_country": {}}
        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        return {
            "city_to_country": {normalize_key(k): normalize_key(v) for k, v in (data.get("city_to_country") or {}).items()},
            "name_to_country": {normalize_key(k): normalize_key(v) for k, v in (data.get("name_to_country") or {}).items()},
        }

    def _canonical_country(self, value: str) -> str:
        normalized = normalize_key(value)
        return COUNTRY_ALIASES.get(normalized, normalized)

    def _build_country_index(self) -> None:
        for country_code, country in self.countries.items():
            normalized = self._canonical_country(country["name"])
            if normalized:
                self.country_by_name[normalized] = normalized
            capital = normalize_key(country.get("capital", ""))
            if capital and country_code == "VA":
                self.country_by_name[capital] = normalized

        for country in pycountry.countries:
            normalized = self._canonical_country(country.name)
            if normalized:
                self.country_by_name[normalized] = normalized
            official = self._canonical_country(getattr(country, "official_name", ""))
            if official:
                self.country_by_name[official] = normalized
            common = self._canonical_country(getattr(country, "common_name", ""))
            if common:
                self.country_by_name[common] = normalized

        # Viator-friendly aliases
        self.country_by_name["uk"] = "united_kingdom"
        self.country_by_name["vatican_city"] = "vatican"
        self.country_by_name["citta_del_vaticano"] = "vatican"

    def _build_city_index(self) -> None:
        for city in self.cities.values():
            continent = self.countries.get(city["countrycode"], {}).get("continentcode", "")
            for candidate in [city.get("name", "")] + list(city.get("alternatenames", []) or []):
                city_key = normalize_key(candidate)
                if not city_key:
                    continue
                score = int(city.get("population", 0) or 0)
                key = (city_key, continent)
                current_score = self.city_country_score.get(key)
                if current_score is None or score > current_score:
                    self.city_to_country[key] = self._country_key(city["countrycode"])
                    self.city_country_score[key] = score

    def _country_key(self, country_code: str) -> str:
        country = self.countries.get(country_code, {})
        return self._canonical_country(country.get("name", ""))

    def continent_for_bucket(self, bucket: str) -> str:
        bucket = normalize_key(bucket)
        if bucket == "europe":
            return "EU"
        return ""

    def resolve_country_name(self, text: str, continent: str = "", allowed_countries: set[str] | None = None) -> str:
        text_key = normalize_key(text)
        if not text_key:
            return ""
        override_country = self.overrides["name_to_country"].get(text_key)
        if override_country and (not allowed_countries or override_country in allowed_countries):
            return override_country
        country = self.country_by_name.get(text_key, "")
        if not country:
            for candidate, resolved in self.country_by_name.items():
                if candidate and re.search(rf"(^|_){re.escape(candidate)}($|_)", text_key):
                    country = resolved
                    break
        if not country:
            return ""
        if allowed_countries and country not in allowed_countries:
            return ""
        if continent and not allowed_countries:
            for code, payload in self.countries.items():
                if self._canonical_country(payload["name"]) == country and payload.get("continentcode") == continent:
                    return country
            if country == "vatican" and continent == "EU":
                return country
        return country

    def resolve_city_country(self, city: str, continent: str = "", allowed_countries: set[str] | None = None) -> str:
        city_key = normalize_key(city)
        if not city_key:
            return ""
        override_country = self.overrides["city_to_country"].get(city_key)
        if override_country and (not allowed_countries or override_country in allowed_countries):
            return override_country
        if continent:
            country = self.city_to_country.get((city_key, continent), "")
            if country and (not allowed_countries or country in allowed_countries):
                return country

        candidates = {
            country
            for (candidate_city, _), country in self.city_to_country.items()
            if candidate_city == city_key and (not allowed_countries or country in allowed_countries)
        }
        if len(candidates) == 1:
            return next(iter(candidates))
        return ""


GEO_RESOLVER = GeoResolver()


def detect_page_type(url: str, title: str) -> Tuple[str, str]:
    parsed = urlparse(url)
    path = parsed.path or ""
    title_lc = title.lower().strip()

    if "/tours/" in path:
        return "product", "page_type:url:/tours/"
    if "-attractions/" in path:
        return "ticket", "page_type:url:-attractions"
    if title_lc.startswith(TICKET_PREFIX):
        return "ticket", "page_type:title:tickets"
    if title_lc.startswith(TTD_PREFIX):
        return "ttd", "page_type:title:ttd"

    segments = [seg for seg in path.split("/") if seg]
    if len(segments) == 2 and re.fullmatch(r"d\d+", segments[1], re.I):
        return "ttd", "page_type:url:short-destination"

    return "product", "page_type:default:product"


def extract_city(url: str, title: str, country: str, page_type: str) -> Tuple[str, str]:
    parsed = urlparse(url)
    path = unquote(parsed.path or "")
    title = title.strip()

    if page_type == "product":
        match = re.search(r"/tours/([^/]+)/", path, re.I)
        if match:
            return normalize_key(match.group(1)), "city:url:tours-segment"

    if page_type == "ticket":
        match = re.search(r"/([^/]+)-attractions/", path, re.I)
        if match:
            return normalize_key(match.group(1)), "city:url:attractions-segment"

    if page_type == "ttd" and title.lower().startswith(TTD_PREFIX):
        destination = title[len(TTD_PREFIX):].strip()
        destination_key = normalize_key(destination)
        if destination_key and destination_key == country:
            return "", "city:ttd:country-level"
        if destination_key:
            return destination_key, "city:ttd:title-destination"

    for pattern, rule_hit in (
        (r"\bfrom ([A-Za-z0-9' .-]+)$", "city:title:from"),
        (r"\bin ([A-Za-z0-9' .-]+)$", "city:title:in"),
    ):
        match = re.search(pattern, title, re.I)
        if not match:
            continue
        candidate = normalize_key(match.group(1))
        if candidate and candidate != country:
            return candidate, rule_hit

    return "", "city:none"


def resolve_country(url: str, title: str, fixed_country: str, city: str, page_type: str) -> Tuple[str, str]:
    fixed_country = normalize_key(fixed_country)
    if fixed_country and fixed_country not in GENERIC_BUCKETS:
        return fixed_country, "country:fixed"

    continent = GEO_RESOLVER.continent_for_bucket(fixed_country)
    allowed_countries = REGION_ALLOWED_COUNTRIES.get(fixed_country, set())
    title_clean = title.strip()
    title_lc = title_clean.lower()

    if page_type == "ttd" and title_lc.startswith(TTD_PREFIX):
        destination = title_clean[len(TTD_PREFIX):].strip()
        country = GEO_RESOLVER.resolve_country_name(destination, continent, allowed_countries)
        if country:
            return country, "country:title:ttd-country"

    if page_type == "ticket" and title_lc.startswith(TICKET_PREFIX):
        destination = title_clean[len(TICKET_PREFIX):].strip()
        country = GEO_RESOLVER.resolve_country_name(destination, continent, allowed_countries)
        if country:
            return country, "country:title:ticket-country"

    if city:
        country = GEO_RESOLVER.resolve_city_country(city, continent, allowed_countries)
        if country:
            return country, "country:city-resolver"

    parsed = urlparse(url)
    segments = [seg for seg in unquote(parsed.path).split("/") if seg]
    for segment in segments:
        cleaned = re.sub(r"-attractions$", "", segment, flags=re.I)
        country = GEO_RESOLVER.resolve_country_name(cleaned, continent, allowed_countries)
        if country:
            return country, "country:url:segment-country"

    return fixed_country if fixed_country not in GENERIC_BUCKETS else "", "country:none"


def detect_intent(url: str, title: str, page_type: str) -> Tuple[str, str]:
    haystack = f"{url.lower()} {title.lower()}"

    if page_type == "ticket":
        return "ticket", "intent:page_type:ticket"

    rules = [
        ("multi_day", [r"\b\d+\s*-\s*day\b", r"\bmulti-day\b", r"\bovernight\b", r"\b\d+\s+days\b"]),
        ("day_trip", [r"\bday trip\b", r"\bfull-day\b", r"\bfull day\b", r"\bexcursion\b"]),
        ("transport", [r"\btransfer\b", r"\bshuttle\b", r"\bairport transfer\b"]),
        ("cruise", [r"\bcruise\b", r"\briver cruise\b", r"\bsunset cruise\b", r"\bcatamaran\b", r"\bsailing\b", r"\bboat tour\b"]),
        ("food", [r"\bfood tour\b", r"\bstreet food\b", r"\bwine tour\b", r"\btasting\b", r"\bcooking class\b"]),
        ("show", [r"\bshow\b", r"\bcabaret\b", r"\bflamenco\b", r"\bperformance\b", r"\bconcert\b"]),
        ("private_tour", [r"\bprivate tour\b", r"\bprivate experience\b", r"\bprivate guide\b"]),
    ]

    for intent, patterns in rules:
        for pattern in patterns:
            if re.search(pattern, haystack, re.I):
                return intent, f"intent:{intent}:{pattern}"

    if page_type == "ttd":
        return "things_to_do", "intent:default:ttd"
    return "things_to_do", "intent:default:product"


def detect_content_type(page_type: str, intent_primary: str) -> Tuple[str, str]:
    if page_type == "ticket":
        return "ticket", "content_type:page_type:ticket"
    if page_type == "ttd":
        return "destination_hub", "content_type:page_type:ttd"

    mapping = {
        "day_trip": "day_trip",
        "multi_day": "multi_day",
        "transport": "transfer",
        "cruise": "cruise",
        "food": "food_tour",
        "show": "show",
        "private_tour": "private_tour",
        "things_to_do": "tour",
    }
    content_type = mapping.get(intent_primary, "tour")
    return content_type, f"content_type:intent:{intent_primary}"


def detect_is_private(url: str, title: str) -> Tuple[bool, str]:
    haystack = f"{url.lower()} {title.lower()}"
    negative_patterns = [
        r"\bsmall[\s-]?group\s+or\s+private\b",
        r"\bshared\s+or\s+private\b",
        r"\bprivate option\b",
        r"\bprivate option available\b",
        r"\bupgrade to private\b",
        r"\bprivate room\b",
        r"\bprivate table\b",
    ]
    for pattern in negative_patterns:
        if re.search(pattern, haystack, re.I):
            return False, f"is_private:negative:{pattern}"

    positive_patterns = [
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
    for pattern in positive_patterns:
        if re.search(pattern, haystack, re.I):
            return True, f"is_private:positive:{pattern}"

    return False, "is_private:default:false"


def compute_confidence(country: str, city: str, page_type: str, intent_primary: str, custom_intent: bool, inferred_country: bool) -> float:
    score = 0.2
    if country:
        score += 0.2 if inferred_country else 0.25
    if city:
        score += 0.25
    if page_type in {"product", "ticket", "ttd"}:
        score += 0.15
    score += 0.15 if custom_intent else 0.05
    if intent_primary in {"ticket", "day_trip", "multi_day", "transport", "cruise", "food", "show", "private_tour"}:
        score += 0.1
    return round(min(score, 0.99), 2)


def classify_row(row: Dict[str, str], fixed_country: str) -> Dict[str, object]:
    url = (row.get("url") or "").strip()
    title = (row.get("title") or "").strip()
    input_country = normalize_key(fixed_country or row.get("country") or "")

    page_type, page_type_hit = detect_page_type(url, title)
    city, city_hit = extract_city(url, title, input_country, page_type)
    country, country_hit = resolve_country(url, title, input_country, city, page_type)
    if page_type == "ttd" and city and country and city == country:
        city = ""
        city_hit = "city:ttd:country-level"
    intent_primary, intent_hit = detect_intent(url, title, page_type)
    content_type, content_hit = detect_content_type(page_type, intent_primary)
    is_private, private_hit = detect_is_private(url, title)

    geo_key = city or country or "unknown_geo"
    dsa_campaign = f"{intent_primary}_{geo_key}"
    dsa_adgroup = content_type

    custom_intent = not intent_hit.startswith("intent:default")
    rule_hits: List[str] = [page_type_hit, city_hit, country_hit, intent_hit, content_hit, private_hit]
    inferred_country = country_hit != "country:fixed"
    output_country = country or "Unknown"
    output_city = city or "Unknown"

    return {
        "url": url,
        "title": title,
        "country": output_country,
        "city": output_city,
        "page_type": page_type,
        "intent_primary": intent_primary,
        "content_type": content_type,
        "is_private": is_private,
        "dsa_campaign": dsa_campaign,
        "dsa_adgroup": dsa_adgroup,
        "classification_confidence": compute_confidence(country, city, page_type, intent_primary, custom_intent, inferred_country),
        "rule_hits": json.dumps(rule_hits, ensure_ascii=True),
        "notes": "",
    }


def infer_country(input_path: str, explicit_country: str) -> str:
    if explicit_country:
        return explicit_country
    return pretty_country_from_filename(input_path)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Classify Viator sitemap CSV into viator_pages schema.")
    parser.add_argument("--input", required=True, help="Input CSV with columns url,title")
    parser.add_argument("--output", required=True, help="Output classified CSV")
    parser.add_argument("--country", default="", help="Fixed country for entire file")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    country = infer_country(args.input, args.country)

    input_path = Path(args.input)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with input_path.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        rows = [classify_row(row, country) for row in reader]

    fieldnames = [
        "url",
        "title",
        "country",
        "city",
        "page_type",
        "intent_primary",
        "content_type",
        "is_private",
        "dsa_campaign",
        "dsa_adgroup",
        "classification_confidence",
        "rule_hits",
        "notes",
    ]

    with output_path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} classified rows to {output_path}")
    if country:
        print(f"Country mode: {country}")
    else:
        print("Country mode: per-row or unresolved")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
