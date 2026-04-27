#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import math
import re
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional
from urllib.parse import unquote, urlparse

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

try:
    from scripts.lib.geo_engine import engine as shared_geo_engine
except Exception:
    shared_geo_engine = None
try:
    from scripts.trip.lib.translation import TripTranslator
except Exception:
    TripTranslator = None  # type: ignore[assignment]


CLASSIFIER_VERSION = "trip_v2"
TRIP_GEO_KB_PATH = REPO_ROOT / "scripts" / "trip" / "lib" / "trip_geo_kb.json"


TOPIC_RULES: List[Dict[str, str]] = [
    {"topic_type": "entry_document", "sub_tag": "arrival_card", "phrase": "arrival card"},
    {"topic_type": "entry_document", "sub_tag": "arrival_card", "phrase": "入境卡"},
    {"topic_type": "visa", "sub_tag": "entry_permit", "phrase": "入台證"},
    {"topic_type": "visa", "sub_tag": "entry_permit", "phrase": "網簽"},
    {"topic_type": "visa", "sub_tag": "entry_permit", "phrase": "entry permit"},
    {"topic_type": "visa", "sub_tag": "online_application", "phrase": "online application"},
    {"topic_type": "visa", "sub_tag": "visa", "phrase": "visa"},
    {"topic_type": "entry_document", "sub_tag": "entry_requirements", "phrase": "入境"},
    {"topic_type": "plug_voltage", "sub_tag": "plug", "phrase": "插頭"},
    {"topic_type": "plug_voltage", "sub_tag": "socket", "phrase": "插座"},
    {"topic_type": "plug_voltage", "sub_tag": "voltage", "phrase": "電壓"},
    {"topic_type": "plug_voltage", "sub_tag": "adapter", "phrase": "轉插"},
    {"topic_type": "plug_voltage", "sub_tag": "plug", "phrase": "power plug"},
    {"topic_type": "plug_voltage", "sub_tag": "socket", "phrase": "socket"},
    {"topic_type": "plug_voltage", "sub_tag": "voltage", "phrase": "voltage"},
    {"topic_type": "baggage_rule", "sub_tag": "carry_on", "phrase": "手提行李"},
    {"topic_type": "baggage_rule", "sub_tag": "checked_baggage", "phrase": "寄艙"},
    {"topic_type": "baggage_rule", "sub_tag": "baggage", "phrase": "行李"},
    {"topic_type": "baggage_rule", "sub_tag": "power_bank", "phrase": "尿袋"},
    {"topic_type": "baggage_rule", "sub_tag": "power_bank", "phrase": "power bank"},
    {"topic_type": "baggage_rule", "sub_tag": "baggage", "phrase": "baggage"},
    {"topic_type": "airport_transport", "sub_tag": "airport_to_city", "phrase": "機場去市區"},
    {"topic_type": "airport_transport", "sub_tag": "airport_transport", "phrase": "機場交通"},
    {"topic_type": "airport_transport", "sub_tag": "airport_express", "phrase": "機場快線"},
    {"topic_type": "airport_transport", "sub_tag": "airport_to_city", "phrase": "airport to city"},
    {"topic_type": "airport_transport", "sub_tag": "airport_transport", "phrase": "airport transport"},
    {"topic_type": "city_transport", "sub_tag": "jr_pass", "phrase": "jr pass"},
    {"topic_type": "city_transport", "sub_tag": "metro", "phrase": "地鐵"},
    {"topic_type": "city_transport", "sub_tag": "bus", "phrase": "巴士"},
    {"topic_type": "city_transport", "sub_tag": "rail", "phrase": "鐵路"},
    {"topic_type": "city_transport", "sub_tag": "high_speed_rail", "phrase": "高鐵"},
    {"topic_type": "city_transport", "sub_tag": "transport", "phrase": "交通"},
    {"topic_type": "itinerary", "sub_tag": "itinerary", "phrase": "行程"},
    {"topic_type": "itinerary", "sub_tag": "free_and_easy", "phrase": "自由行"},
    {"topic_type": "itinerary", "sub_tag": "travel_guide", "phrase": "攻略"},
    {"topic_type": "itinerary", "sub_tag": "itinerary", "phrase": "itinerary"},
    {"topic_type": "cost_budget", "sub_tag": "budget", "phrase": "預算"},
    {"topic_type": "cost_budget", "sub_tag": "cost", "phrase": "費用"},
    {"topic_type": "cost_budget", "sub_tag": "prices", "phrase": "物價"},
    {"topic_type": "cost_budget", "sub_tag": "budget", "phrase": "budget"},
    {"topic_type": "cost_budget", "sub_tag": "cost", "phrase": "cost"},
    {"topic_type": "weather", "sub_tag": "weather", "phrase": "天氣"},
    {"topic_type": "weather", "sub_tag": "temperature", "phrase": "氣溫"},
    {"topic_type": "weather", "sub_tag": "season", "phrase": "季節"},
    {"topic_type": "weather", "sub_tag": "weather", "phrase": "weather"},
    {"topic_type": "airline_ops", "sub_tag": "online_check_in", "phrase": "online check in"},
    {"topic_type": "airline_ops", "sub_tag": "online_check_in", "phrase": "onlinecheckin"},
    {"topic_type": "airline_ops", "sub_tag": "boarding_pass", "phrase": "boarding pass"},
    {"topic_type": "airline_ops", "sub_tag": "check_in", "phrase": "check in"},
    {"topic_type": "airline_ops", "sub_tag": "check_in", "phrase": "checkin"},
    {"topic_type": "airline_ops", "sub_tag": "flight_change", "phrase": "改機票"},
    {"topic_type": "airline_ops", "sub_tag": "boarding", "phrase": "boarding"},
    {"topic_type": "destination_guide", "sub_tag": "things_to_do", "phrase": "好去處"},
    {"topic_type": "destination_guide", "sub_tag": "attractions", "phrase": "景點"},
    {"topic_type": "destination_guide", "sub_tag": "travel", "phrase": "旅遊"},
    {"topic_type": "destination_guide", "sub_tag": "destination", "phrase": "destination"},
    {"topic_type": "destination_guide", "sub_tag": "travel_guide", "phrase": "travel guide"},
]

EXCLUSION_PHRASES = {
    "promo_or_coupon": ["promo", "coupon", "優惠", "優惠碼", "折扣", "買一送一", "promo code"],
    "campaign_or_news": ["lucky draw", "subsidy", "vaccine", "抽獎", "補貼"],
    "customer_service": ["客服", "customer service", "refund", "退票", "login", "登入"],
    "review_or_ranking": ["評價", "review", "排名", "ranking"],
}


LANGUAGE_BY_HOST = {
    "hk.trip.com": "zh-HK",
    "tw.trip.com": "zh-TW",
}


HK_HIGH_MARKETS = {"japan", "taiwan", "south_korea", "thailand", "singapore"}
HK_MEDIUM_MARKETS = {
    "malaysia",
    "vietnam",
    "mainland_china",
    "china",
    "australia",
    "indonesia",
    "canada",
    "united_kingdom",
    "france",
    "italy",
    "brazil",
}
TW_HIGH_MARKETS = {"japan", "south_korea", "hong_kong", "thailand", "singapore"}
TW_MEDIUM_MARKETS = {
    "vietnam",
    "malaysia",
    "australia",
    "indonesia",
    "united_kingdom",
    "france",
    "italy",
    "canada",
}
LOCAL_DAYTRIP_ENTITIES = {
    "hong_kong",
    "macau",
    "shenzhen",
    "zhuhai",
    "tung_chung",
    "sai_ying_pun",
    "changsha_wan",
    "sham_tseng",
    "repulse_bay",
    "jordan_hk",
    "wong_chuk_hang",
    "shek_o",
    "hong_kong_island",
    "tian_tan_buddha",
}


GEO_CANDIDATES: List[Dict[str, str]] = [
    {"alias": "中國內地", "geo_entity": "mainland_china", "geo_category": "country", "country": "mainland_china", "city": "Unknown", "title_en": "Mainland China"},
    {"alias": "中国内地", "geo_entity": "mainland_china", "geo_category": "country", "country": "mainland_china", "city": "Unknown", "title_en": "Mainland China"},
    {"alias": "south korea", "geo_entity": "south_korea", "geo_category": "country", "country": "south_korea", "city": "Unknown", "title_en": "South Korea"},
    {"alias": "korea", "geo_entity": "south_korea", "geo_category": "country", "country": "south_korea", "city": "Unknown", "title_en": "South Korea"},
    {"alias": "thailand", "geo_entity": "thailand", "geo_category": "country", "country": "thailand", "city": "Unknown", "title_en": "Thailand"},
    {"alias": "taiwan", "geo_entity": "taiwan", "geo_category": "country", "country": "taiwan", "city": "Unknown", "title_en": "Taiwan"},
    {"alias": "singapore", "geo_entity": "singapore", "geo_category": "country", "country": "singapore", "city": "Unknown", "title_en": "Singapore"},
    {"alias": "malaysia", "geo_entity": "malaysia", "geo_category": "country", "country": "malaysia", "city": "Unknown", "title_en": "Malaysia"},
    {"alias": "vietnam", "geo_entity": "vietnam", "geo_category": "country", "country": "vietnam", "city": "Unknown", "title_en": "Vietnam"},
    {"alias": "indonesia", "geo_entity": "indonesia", "geo_category": "country", "country": "indonesia", "city": "Unknown", "title_en": "Indonesia"},
    {"alias": "hong kong", "geo_entity": "hong_kong", "geo_category": "city", "country": "hong_kong", "city": "hong_kong", "title_en": "Hong Kong"},
    {"alias": "macau", "geo_entity": "macau", "geo_category": "city", "country": "macau", "city": "macau", "title_en": "Macau"},
    {"alias": "shenzhen", "geo_entity": "shenzhen", "geo_category": "city", "country": "mainland_china", "city": "shenzhen", "title_en": "Shenzhen"},
    {"alias": "zhuhai", "geo_entity": "zhuhai", "geo_category": "city", "country": "mainland_china", "city": "zhuhai", "title_en": "Zhuhai"},
    {"alias": "canada", "geo_entity": "canada", "geo_category": "country", "country": "canada", "city": "Unknown", "title_en": "Canada"},
    {"alias": "brazil", "geo_entity": "brazil", "geo_category": "country", "country": "brazil", "city": "Unknown", "title_en": "Brazil"},
    {"alias": "myanmar", "geo_entity": "myanmar", "geo_category": "country", "country": "myanmar", "city": "Unknown", "title_en": "Myanmar"},
    {"alias": "泰國", "geo_entity": "thailand", "geo_category": "country", "country": "thailand", "city": "Unknown", "title_en": "Thailand"},
    {"alias": "台灣", "geo_entity": "taiwan", "geo_category": "country", "country": "taiwan", "city": "Unknown", "title_en": "Taiwan"},
    {"alias": "台湾", "geo_entity": "taiwan", "geo_category": "country", "country": "taiwan", "city": "Unknown", "title_en": "Taiwan"},
    {"alias": "韓國", "geo_entity": "south_korea", "geo_category": "country", "country": "south_korea", "city": "Unknown", "title_en": "South Korea"},
    {"alias": "韩国", "geo_entity": "south_korea", "geo_category": "country", "country": "south_korea", "city": "Unknown", "title_en": "South Korea"},
    {"alias": "南韓", "geo_entity": "south_korea", "geo_category": "country", "country": "south_korea", "city": "Unknown", "title_en": "South Korea"},
    {"alias": "新加坡", "geo_entity": "singapore", "geo_category": "country", "country": "singapore", "city": "Unknown", "title_en": "Singapore"},
    {"alias": "馬來西亞", "geo_entity": "malaysia", "geo_category": "country", "country": "malaysia", "city": "Unknown", "title_en": "Malaysia"},
    {"alias": "马来西亚", "geo_entity": "malaysia", "geo_category": "country", "country": "malaysia", "city": "Unknown", "title_en": "Malaysia"},
    {"alias": "越南", "geo_entity": "vietnam", "geo_category": "country", "country": "vietnam", "city": "Unknown", "title_en": "Vietnam"},
    {"alias": "印尼", "geo_entity": "indonesia", "geo_category": "country", "country": "indonesia", "city": "Unknown", "title_en": "Indonesia"},
    {"alias": "印尼", "geo_entity": "indonesia", "geo_category": "country", "country": "indonesia", "city": "Unknown", "title_en": "Indonesia"},
    {"alias": "香港", "geo_entity": "hong_kong", "geo_category": "city", "country": "hong_kong", "city": "hong_kong", "title_en": "Hong Kong"},
    {"alias": "澳門", "geo_entity": "macau", "geo_category": "city", "country": "macau", "city": "macau", "title_en": "Macau"},
    {"alias": "澳门", "geo_entity": "macau", "geo_category": "city", "country": "macau", "city": "macau", "title_en": "Macau"},
    {"alias": "深圳", "geo_entity": "shenzhen", "geo_category": "city", "country": "mainland_china", "city": "shenzhen", "title_en": "Shenzhen"},
    {"alias": "珠海", "geo_entity": "zhuhai", "geo_category": "city", "country": "mainland_china", "city": "zhuhai", "title_en": "Zhuhai"},
    {"alias": "日本", "geo_entity": "japan", "geo_category": "country", "country": "japan", "city": "Unknown", "title_en": "Japan"},
    {"alias": "東京", "geo_entity": "tokyo", "geo_category": "city", "country": "japan", "city": "tokyo", "title_en": "Tokyo"},
    {"alias": "大阪", "geo_entity": "osaka", "geo_category": "city", "country": "japan", "city": "osaka", "title_en": "Osaka"},
    {"alias": "名古屋", "geo_entity": "nagoya", "geo_category": "city", "country": "japan", "city": "nagoya", "title_en": "Nagoya"},
    {"alias": "台北", "geo_entity": "taipei", "geo_category": "city", "country": "taiwan", "city": "taipei", "title_en": "Taipei"},
    {"alias": "釜山", "geo_entity": "busan", "geo_category": "city", "country": "south_korea", "city": "busan", "title_en": "Busan"},
    {"alias": "澳洲", "geo_entity": "australia", "geo_category": "country", "country": "australia", "city": "Unknown", "title_en": "Australia"},
    {"alias": "東涌", "geo_entity": "tung_chung", "geo_category": "district", "country": "hong_kong", "city": "hong_kong", "title_en": "Tung Chung"},
    {"alias": "深井", "geo_entity": "sham_tseng", "geo_category": "district", "country": "hong_kong", "city": "hong_kong", "title_en": "Sham Tseng"},
    {"alias": "淺水灣", "geo_entity": "repulse_bay", "geo_category": "district", "country": "hong_kong", "city": "hong_kong", "title_en": "Repulse Bay"},
    {"alias": "佐敦", "geo_entity": "jordan_hk", "geo_category": "district", "country": "hong_kong", "city": "hong_kong", "title_en": "Jordan"},
    {"alias": "黃竹坑", "geo_entity": "wong_chuk_hang", "geo_category": "district", "country": "hong_kong", "city": "hong_kong", "title_en": "Wong Chuk Hang"},
    {"alias": "石澳", "geo_entity": "shek_o", "geo_category": "district", "country": "hong_kong", "city": "hong_kong", "title_en": "Shek O"},
    {"alias": "港島", "geo_entity": "hong_kong_island", "geo_category": "district", "country": "hong_kong", "city": "hong_kong", "title_en": "Hong Kong Island"},
    {"alias": "天壇大佛", "geo_entity": "tian_tan_buddha", "geo_category": "landmark", "country": "hong_kong", "city": "hong_kong", "title_en": "Tian Tan Buddha"},
    {"alias": "萬象天地", "geo_entity": "mixc_world_shenzhen", "geo_category": "district", "country": "mainland_china", "city": "shenzhen", "title_en": "MixC World Shenzhen"},
    {"alias": "萬象城", "geo_entity": "mixc_shenzhen", "geo_category": "district", "country": "mainland_china", "city": "shenzhen", "title_en": "MixC Shenzhen"},
    {"alias": "福田", "geo_entity": "futian", "geo_category": "district", "country": "mainland_china", "city": "shenzhen", "title_en": "Futian"},
    {"alias": "益田假日廣場", "geo_entity": "yitian_holiday_plaza", "geo_category": "district", "country": "mainland_china", "city": "shenzhen", "title_en": "Yitian Holiday Plaza"},
    {"alias": "西營盤", "geo_entity": "sai_ying_pun", "geo_category": "district", "country": "hong_kong", "city": "hong_kong", "title_en": "Sai Ying Pun"},
    {"alias": "長沙灣", "geo_entity": "changsha_wan", "geo_category": "district", "country": "hong_kong", "city": "hong_kong", "title_en": "Cheung Sha Wan"},
    {"alias": "sai ying pun", "geo_entity": "sai_ying_pun", "geo_category": "district", "country": "hong_kong", "city": "hong_kong", "title_en": "Sai Ying Pun"},
    {"alias": "changshawan", "geo_entity": "changsha_wan", "geo_category": "district", "country": "hong_kong", "city": "hong_kong", "title_en": "Cheung Sha Wan"},
    {"alias": "cheung sha wan", "geo_entity": "changsha_wan", "geo_category": "district", "country": "hong_kong", "city": "hong_kong", "title_en": "Cheung Sha Wan"},
    {"alias": "入台", "geo_entity": "taiwan", "geo_category": "country", "country": "taiwan", "city": "Unknown", "title_en": "Taiwan"},
]


def normalize_text(value: str) -> str:
    lowered = (value or "").strip().lower()
    lowered = unquote(lowered)
    lowered = lowered.replace("%20", " ")
    lowered = re.sub(r"[-_/]+", " ", lowered)
    lowered = re.sub(r"\s+", " ", lowered).strip()
    return lowered


def snake_case(value: str) -> str:
    normalized = normalize_text(value)
    normalized = re.sub(r"[^a-z0-9]+", "_", normalized)
    normalized = re.sub(r"_+", "_", normalized).strip("_")
    return normalized


def pretty_title_from_text(value: str) -> str:
    words = [word for word in re.split(r"[\s_-]+", value) if word]
    return " ".join(word.capitalize() for word in words)


def compact_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "")).strip()


def strip_geo_noise(value: str) -> str:
    cleaned = normalize_text(value)
    noise_patterns = [
        r"\btravel guide\b",
        r"\bguide\b",
        r"\bweather\b",
        r"\btemperature\b",
        r"\bpower plug\b",
        r"\bpower bank rules\b",
        r"\bbaggage rules\b",
        r"\bairline operations info\b",
        r"\bairport transport\b",
        r"\btransport guide\b",
        r"\bentry permit online application\b",
        r"\bentry permit\b",
        r"\barrival card\b",
        r"\bvisa\b",
        r"\bitinerary\b",
        r"\btravel budget\b",
        r"\bdestination\b",
        r"\bprovince\b",
        r"\bdistrict\b",
        r"\bregion\b",
        r"\bisland\b",
        r"\bmount\b",
        r"\bairport\b",
        r"\bcity\b",
        r"旅遊攻略",
        r"旅游攻略",
        r"攻略",
        r"天氣",
        r"天气",
        r"氣溫",
        r"气温",
        r"插頭",
        r"插头",
        r"電壓",
        r"电压",
        r"轉插",
        r"转插",
        r"入境卡",
        r"入台證",
        r"入台证",
        r"網簽",
        r"网签",
        r"onlinecheckin",
    ]
    for pattern in noise_patterns:
        cleaned = re.sub(pattern, " ", cleaned)
    cleaned = compact_spaces(cleaned)
    return cleaned


class TripClassifier:
    def __init__(self) -> None:
        self.geo_candidates = sorted(self.load_geo_candidates(), key=lambda item: len(item["alias"]), reverse=True)
        self.topic_rules = sorted(TOPIC_RULES, key=lambda item: len(item["phrase"]), reverse=True)
        self.translator = TripTranslator() if TripTranslator else None

    def load_geo_candidates(self) -> List[Dict[str, str]]:
        candidates = list(GEO_CANDIDATES)
        if TRIP_GEO_KB_PATH.exists():
            try:
                payload = json.loads(TRIP_GEO_KB_PATH.read_text(encoding="utf-8"))
                if isinstance(payload, list):
                    for item in payload:
                        if isinstance(item, dict) and item.get("alias"):
                            candidates.append(item)
            except Exception:
                pass
        return candidates

    def classify_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        url = str(row.get("url") or row.get("URL") or "").strip()
        if not url:
            raise ValueError("Missing URL")

        pattern = self.extract_pattern(url)
        source_text = self.extract_source_text(url, pattern)
        translated_text, translation_source = self.translate_source_text(source_text)
        language = self.detect_language(url, row.get("language"))
        semrush_metrics = self.extract_semrush_metrics(row)
        geo = self.detect_geo(url, source_text, translated_text)
        topic = self.detect_topic(source_text, translated_text, pattern, geo)
        interpretation = self.interpret(topic, geo, language)
        semrush_hint = self.interpret_semrush_signals(topic, semrush_metrics)
        activity = self.determine_activity(url, source_text, pattern, geo, topic)
        title = self.generate_title(source_text, translated_text, geo, topic)

        metadata = {
            "classifier_version": CLASSIFIER_VERSION,
            "source_text": source_text,
            "translated_source_text": translated_text,
            "translation_source": translation_source,
            "pattern_source": pattern,
            "semrush_signal_hint": semrush_hint["hint"],
            "semrush_ratios": semrush_hint["ratios"],
            "inferred_language": language,
            "exclusion_reason": activity["reason"],
        }

        return {
            "url": url,
            "title": title,
            "language": language,
            "pattern": pattern,
            "traffic": semrush_metrics["traffic"],
            "traffic_pct": semrush_metrics["traffic_pct"],
            "keyword_count": semrush_metrics["keyword_count"],
            "traffic_change": semrush_metrics["traffic_change"],
            "semrush_metrics": semrush_metrics["raw"],
            "country": geo["country"],
            "city": geo["city"],
            "geo_entity": geo["geo_entity"],
            "geo_category": geo["geo_category"],
            "topic_type": topic["topic_type"],
            "intent_primary": topic["intent_primary"],
            "content_type": topic["content_type"],
            "sub_tag": topic["sub_tag"],
            "readiness_hint": interpretation["readiness_hint"],
            "remaining_commission_potential": interpretation["remaining_commission_potential"],
            "post_booking_risk": interpretation["post_booking_risk"],
            "trip_mode_risk": interpretation["trip_mode_risk"],
            "market_fit": interpretation["market_fit"],
            "is_active": activity["is_active"],
            "metadata": metadata,
            "notes": "",
        }

    def extract_pattern(self, url: str) -> str:
        path = urlparse(url).path
        for candidate in ["/travel-guide/destination/", "/guide/destination/", "/guide/info/", "/blog/"]:
            if candidate in path:
                return candidate.strip("/")
        segments = [segment for segment in path.split("/") if segment]
        return "/".join(segments[:2]) if segments else "root"

    def extract_source_text(self, url: str, pattern: str) -> str:
        path = unquote(urlparse(url).path or "")
        path = path.strip("/")
        if not path:
            return ""
        parts = path.split("/")
        tail = parts[-1]
        if tail.endswith(".html"):
            tail = tail[:-5]
        if pattern == "travel-guide/destination":
            tail = re.sub(r"-\d+$", "", tail)
        return tail.replace("-", " ").strip()

    def geo_text_candidates(self, url: str, source_text: str, translated_text: str) -> List[str]:
        path = unquote(urlparse(url).path or "")
        tail = path.strip("/").split("/")[-1] if path else ""
        if tail.endswith(".html"):
            tail = tail[:-5]
        raw_tail = re.sub(r"-\d+$", "", tail)

        candidates = [
            source_text,
            translated_text,
            raw_tail,
            raw_tail.replace("-", " "),
            normalize_text(source_text),
            normalize_text(translated_text),
            normalize_text(raw_tail),
            normalize_text(urlparse(url).path),
            strip_geo_noise(source_text),
            strip_geo_noise(translated_text),
            strip_geo_noise(raw_tail),
        ]
        return [compact_spaces(text) for text in candidates if compact_spaces(text)]

    def translate_source_text(self, source_text: str) -> tuple[str, str]:
        if not source_text:
            return "", "empty"
        if not self.translator:
            return pretty_title_from_text(source_text), "fallback_pretty"
        translated, source = self.translator.translate(source_text)
        return translated, source

    def detect_language(self, url: str, raw_language: Any) -> str:
        raw = str(raw_language or "").strip()
        if raw:
            return raw
        host = urlparse(url).netloc.lower()
        return LANGUAGE_BY_HOST.get(host, "zh-HK")

    def extract_semrush_metrics(self, row: Dict[str, Any]) -> Dict[str, Any]:
        def to_number(value: Any, *, integer: bool = False) -> Optional[float]:
            if value is None or value == "":
                return None
            try:
                number = float(str(value).replace(",", "").strip())
            except ValueError:
                return None
            if integer:
                return int(number)
            return number

        raw = {
            "adwords_positions": to_number(row.get("Adwords Positions")),
            "positions_commercial_top20": to_number(row.get("Positions with commercial intents in top 20")),
            "positions_info_top20": to_number(row.get("Positions with informational intents in top 20")),
            "positions_navigational_top20": to_number(row.get("Positions with navigational intents in top 20")),
            "positions_transactional_top20": to_number(row.get("Positions with transactional intents in top 20")),
            "traffic_commercial_top20": to_number(row.get("Traffic with commercial intents in top 20")),
            "traffic_info_top20": to_number(row.get("Traffic with informational intents in top 20")),
            "traffic_navigational_top20": to_number(row.get("Traffic with navigational intents in top 20")),
            "traffic_transactional_top20": to_number(row.get("Traffic with transactional intents in top 20")),
        }
        return {
            "traffic": to_number(row.get("Traffic")),
            "traffic_pct": to_number(row.get("Traffic (%)")),
            "keyword_count": to_number(row.get("Number of Keywords"), integer=True),
            "traffic_change": to_number(row.get("Traffic Change")),
            "raw": raw,
        }

    def detect_geo(self, url: str, source_text: str, translated_text: str) -> Dict[str, str]:
        haystacks = self.geo_text_candidates(url, source_text, translated_text)
        for candidate in self.geo_candidates:
            alias = candidate["alias"]
            for haystack in haystacks:
                if alias.lower() in haystack.lower():
                    return {
                        "country": candidate["country"],
                        "city": candidate["city"],
                        "geo_entity": candidate["geo_entity"],
                        "geo_category": candidate["geo_category"],
                        "title_en": candidate["title_en"],
                    }
        if shared_geo_engine:
            path_text = normalize_text(urlparse(url).path)
            country_names = getattr(shared_geo_engine, "country_names", {}) or {}
            city_lookup = getattr(shared_geo_engine, "city_lookup", {}) or {}
            for text in haystacks + [path_text]:
                if not text:
                    continue

                # Multi-word direct match before the shared engine falls back to token-level scans.
                if text in country_names:
                    country = country_names[text]
                    return {
                        "country": snake_case(country),
                        "city": "Unknown",
                        "geo_entity": snake_case(country),
                        "geo_category": "country",
                        "title_en": pretty_title_from_text(country),
                    }
                if text in city_lookup and city_lookup[text]:
                    top = sorted(city_lookup[text], key=lambda item: item.get("population", 0), reverse=True)[0]
                    country = shared_geo_engine.normalize_country(top.get("countrycode", ""))
                    city = top.get("name", "")
                    return {
                        "country": snake_case(country),
                        "city": snake_case(city),
                        "geo_entity": snake_case(city),
                        "geo_category": "city",
                        "title_en": pretty_title_from_text(city),
                    }

                title_hint = pretty_title_from_text(strip_geo_noise(translated_text or source_text))
                country, city = shared_geo_engine.detect_geo(text, title_hint)
                if country != "Unknown" or city != "Unknown":
                    normalized_country = snake_case(country) if country != "Unknown" else "Unknown"
                    normalized_city = snake_case(city) if city != "Unknown" else "Unknown"
                    geo_entity = normalized_city if normalized_city != "Unknown" else normalized_country
                    geo_category = "city" if normalized_city != "Unknown" else "country"
                    title_en = pretty_title_from_text(city if city != "Unknown" else country)
                    return {
                        "country": normalized_country,
                        "city": normalized_city,
                        "geo_entity": geo_entity,
                        "geo_category": geo_category,
                        "title_en": title_en,
                    }
        return {
            "country": "Unknown",
            "city": "Unknown",
            "geo_entity": "unknown",
            "geo_category": "non_geo",
            "title_en": "",
        }

    def detect_topic(self, source_text: str, translated_text: str, pattern: str, geo: Dict[str, str]) -> Dict[str, str]:
        raw = source_text
        normalized = normalize_text(source_text)
        translated_normalized = normalize_text(translated_text)

        topic_type = "generic_info"
        sub_tag = "general"

        for rule in self.topic_rules:
            phrase = rule["phrase"]
            if self.phrase_in_text(phrase, raw, normalized) or (
                translated_normalized and phrase.lower() in translated_normalized
            ):
                topic_type = rule["topic_type"]
                sub_tag = rule["sub_tag"]
                break

        if topic_type == "destination_guide" and geo["geo_entity"] in LOCAL_DAYTRIP_ENTITIES:
            topic_type = "local_daytrip"
            sub_tag = "local_leisure"
        elif topic_type == "generic_info":
            if pattern in {"guide/destination", "travel-guide/destination"}:
                topic_type = "destination_guide"
                sub_tag = "destination"
            elif pattern == "guide/info":
                topic_type = "generic_info"
                sub_tag = "info"
            elif pattern == "blog":
                topic_type = "generic_info"
                sub_tag = "blog"

        if pattern == "blog" and self.phrase_in_text("local travel", raw, normalized):
            topic_type = "local_daytrip"
            sub_tag = "local_leisure"
        elif pattern == "blog" and geo["geo_entity"] in LOCAL_DAYTRIP_ENTITIES:
            topic_type = "local_daytrip"
            sub_tag = "local_leisure"

        if topic_type in {"entry_document", "visa"}:
            intent_primary = "travel_requirements"
            content_type = "requirements"
        elif topic_type in {"plug_voltage", "baggage_rule"}:
            intent_primary = "travel_readiness"
            content_type = "utility_info"
        elif topic_type in {"airport_transport", "city_transport"}:
            intent_primary = "transport"
            content_type = "transport_info"
        elif topic_type in {"itinerary", "cost_budget"}:
            intent_primary = "planning"
            content_type = "planning_guide"
        elif topic_type == "destination_guide":
            intent_primary = "destination_research"
            content_type = "destination_guide"
        elif topic_type == "weather":
            intent_primary = "general_info"
            content_type = "weather_info"
        elif topic_type == "airline_ops":
            intent_primary = "travel_readiness"
            content_type = "airline_ops_info"
        elif topic_type == "local_daytrip":
            intent_primary = "destination_research"
            content_type = "destination_guide"
        else:
            intent_primary = "general_info"
            content_type = "generic_info"

        return {
            "topic_type": topic_type,
            "sub_tag": sub_tag,
            "intent_primary": intent_primary,
            "content_type": content_type,
        }

    def interpret(self, topic: Dict[str, str], geo: Dict[str, str], language: str) -> Dict[str, str]:
        topic_type = topic["topic_type"]
        if topic_type in {"entry_document", "visa"}:
            readiness_hint = "high"
            remaining_commission_potential = "medium"
            post_booking_risk = "medium"
            trip_mode_risk = "low"
        elif topic_type == "plug_voltage":
            readiness_hint = "high"
            remaining_commission_potential = "low"
            post_booking_risk = "medium"
            trip_mode_risk = "low"
        elif topic_type == "baggage_rule":
            readiness_hint = "high"
            remaining_commission_potential = "low"
            post_booking_risk = "high"
            trip_mode_risk = "low"
        elif topic_type == "airport_transport":
            readiness_hint = "high"
            remaining_commission_potential = "medium"
            post_booking_risk = "medium"
            trip_mode_risk = "low"
        elif topic_type == "city_transport":
            readiness_hint = "medium_high"
            remaining_commission_potential = "medium"
            post_booking_risk = "medium"
            trip_mode_risk = "low"
        elif topic_type in {"itinerary", "cost_budget"}:
            readiness_hint = "medium_high"
            remaining_commission_potential = "high"
            post_booking_risk = "medium"
            trip_mode_risk = "low"
        elif topic_type == "destination_guide":
            readiness_hint = "medium"
            remaining_commission_potential = "medium"
            post_booking_risk = "low"
            trip_mode_risk = "low"
        elif topic_type == "weather":
            readiness_hint = "low"
            remaining_commission_potential = "low"
            post_booking_risk = "low"
            trip_mode_risk = "low"
        elif topic_type == "airline_ops":
            readiness_hint = "high"
            remaining_commission_potential = "low"
            post_booking_risk = "high"
            trip_mode_risk = "low"
        elif topic_type == "local_daytrip":
            readiness_hint = "low"
            remaining_commission_potential = "low"
            post_booking_risk = "low"
            trip_mode_risk = "high"
        else:
            readiness_hint = "low"
            remaining_commission_potential = "low"
            post_booking_risk = "low"
            trip_mode_risk = "medium"

        market_fit = self.estimate_market_fit(language, geo, trip_mode_risk)
        return {
            "readiness_hint": readiness_hint,
            "remaining_commission_potential": remaining_commission_potential,
            "post_booking_risk": post_booking_risk,
            "trip_mode_risk": trip_mode_risk,
            "market_fit": market_fit,
        }

    def estimate_market_fit(self, language: str, geo: Dict[str, str], trip_mode_risk: str) -> str:
        country = geo["country"]
        entity = geo["geo_entity"]
        if trip_mode_risk == "high" or entity in LOCAL_DAYTRIP_ENTITIES:
            return "low"
        if country == "Unknown":
            return "medium"
        if language == "zh-HK":
            if country in HK_HIGH_MARKETS:
                return "high"
            if country in HK_MEDIUM_MARKETS:
                return "medium"
            return "low" if country in {"hong_kong", "macau"} else "medium"
        if language == "zh-TW":
            if country in TW_HIGH_MARKETS:
                return "high"
            if country in TW_MEDIUM_MARKETS:
                return "medium"
            return "medium"
        return "medium"

    def interpret_semrush_signals(self, topic: Dict[str, str], metrics: Dict[str, Any]) -> Dict[str, Any]:
        traffic = metrics["traffic"] or 0
        raw = metrics["raw"]
        ratios = {
            "informational_ratio": self.safe_ratio(raw.get("traffic_info_top20"), traffic),
            "commercial_ratio": self.safe_ratio(raw.get("traffic_commercial_top20"), traffic),
            "navigational_ratio": self.safe_ratio(raw.get("traffic_navigational_top20"), traffic),
            "transactional_ratio": self.safe_ratio(raw.get("traffic_transactional_top20"), traffic),
        }
        hint = "neutral"
        if (
            ratios["informational_ratio"] >= 0.60
            and ratios["commercial_ratio"] < 0.10
            and topic["topic_type"] in {"entry_document", "visa", "plug_voltage", "baggage_rule", "airport_transport"}
        ):
            hint = "hidden_gold"
        elif 0.02 <= ratios["commercial_ratio"] <= 0.35:
            hint = "commercial_support"
        elif (
            ratios["informational_ratio"] >= 0.80
            and ratios["commercial_ratio"] < 0.02
            and topic["topic_type"] in {"weather", "generic_info", "destination_guide"}
        ):
            hint = "broad_info_only"
        elif ratios["navigational_ratio"] >= 0.50:
            hint = "navigation_heavy"
        return {"hint": hint, "ratios": ratios}

    def determine_activity(
        self,
        url: str,
        source_text: str,
        pattern: str,
        geo: Dict[str, str],
        topic: Dict[str, str],
    ) -> Dict[str, Any]:
        raw = source_text
        normalized = normalize_text(source_text)
        host = urlparse(url).netloc.lower()

        if host not in LANGUAGE_BY_HOST:
            return {"is_active": False, "reason": "unsupported_market_domain"}
        if topic["topic_type"] == "local_daytrip":
            return {"is_active": False, "reason": "local_daytrip"}
        for reason, phrases in EXCLUSION_PHRASES.items():
            for phrase in phrases:
                if self.phrase_in_text(phrase, raw, normalized):
                    if reason == "review_or_ranking" and topic["topic_type"] in {"entry_document", "visa", "plug_voltage"}:
                        continue
                    return {"is_active": False, "reason": reason}
        if any(token in url for token in ["/hotels/", "/flights/", "/searchresult"]):
            return {"is_active": False, "reason": "non_content_transactional_url"}
        if geo["geo_entity"] in LOCAL_DAYTRIP_ENTITIES:
            return {"is_active": False, "reason": "local_short_haul"}
        return {"is_active": True, "reason": ""}

    def generate_title(self, source_text: str, translated_text: str, geo: Dict[str, str], topic: Dict[str, str]) -> str:
        geo_title = geo.get("title_en") or pretty_title_from_text(translated_text or source_text)
        topic_type = topic["topic_type"]
        sub_tag = topic["sub_tag"]

        if topic_type == "entry_document" and sub_tag == "arrival_card":
            return f"{geo_title} Arrival Card"
        if topic_type == "visa" and sub_tag == "entry_permit":
            if "online" in normalize_text(source_text) or "網上申請" in source_text:
                return f"{geo_title} Entry Permit Online Application"
            return f"{geo_title} Entry Permit"
        if topic_type == "visa":
            return f"{geo_title} Visa"
        if topic_type == "plug_voltage":
            return f"{geo_title} Power Plug"
        if topic_type == "baggage_rule" and sub_tag == "power_bank":
            return f"{geo_title} Power Bank Rules"
        if topic_type == "baggage_rule":
            return f"{geo_title} Baggage Rules"
        if topic_type == "airport_transport":
            return f"{geo_title} Airport Transport"
        if topic_type == "city_transport":
            return f"{geo_title} Transport Guide"
        if topic_type == "itinerary":
            return f"{geo_title} Itinerary"
        if topic_type == "cost_budget":
            return f"{geo_title} Travel Budget"
        if topic_type == "weather":
            return f"{geo_title} Weather"
        if topic_type == "destination_guide":
            return f"{geo_title} Travel Guide"
        if topic_type == "airline_ops":
            return f"{geo_title} Airline Operations Info"

        pretty = pretty_title_from_text(translated_text or source_text)
        return pretty or geo_title or "Trip Guide"

    def phrase_in_text(self, phrase: str, raw: str, normalized: str) -> bool:
        if re.search(r"[\u4e00-\u9fff]", phrase):
            return phrase in raw
        return phrase.lower() in normalized

    def safe_ratio(self, numerator: Optional[float], denominator: float) -> float:
        if not numerator or denominator <= 0:
            return 0.0
        return round(numerator / denominator, 4)


def classify_csv(input_path: Path, limit: int | None = None) -> List[Dict[str, Any]]:
    classifier = TripClassifier()
    results: List[Dict[str, Any]] = []
    with input_path.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for idx, row in enumerate(reader):
            if limit is not None and idx >= limit:
                break
            results.append(classifier.classify_row(row))
    return results


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Classify Trip CSV rows into trip_pages schema.")
    parser.add_argument("--input", required=True, help="Path to Trip CSV input")
    parser.add_argument("--limit", type=int, default=5, help="Rows to classify")
    args = parser.parse_args()

    rows = classify_csv(Path(args.input), limit=args.limit)
    print(json.dumps(rows, ensure_ascii=False, indent=2))
