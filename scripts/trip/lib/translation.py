#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import random
import re
import time
from pathlib import Path
from typing import Dict, Tuple

import requests


TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"
CACHE_PATH = Path(__file__).resolve().parent / "translation_cache.json"


def contains_cjk(text: str) -> bool:
    return bool(re.search(r"[\u3400-\u9fff]", text or ""))


def pretty_ascii(text: str) -> str:
    words = [word for word in re.split(r"[\s_-]+", text or "") if word]
    return " ".join(word.capitalize() for word in words)


def contains_latin(text: str) -> bool:
    return bool(re.search(r"[A-Za-z]", text or ""))


def is_usable_translation(source: str, translated: str) -> bool:
    if not translated:
        return False
    if not contains_cjk(source):
        return True
    if translated == source:
        return False
    if not contains_latin(translated):
        return False
    cjk_chars = sum(1 for ch in translated if "\u3400" <= ch <= "\u9fff")
    if cjk_chars > 0:
        return False
    return True


class TripTranslator:
    def __init__(self, cache_path: Path = CACHE_PATH) -> None:
        self.cache_path = cache_path
        self.cache = self._load_cache()
        self.enable_network = os.environ.get("TRIP_TRANSLATE_LIVE", "").strip() == "1"
        self._dirty_writes = 0
        self.save_every = 100
        self.stats = {
            "empty": 0,
            "cache": 0,
            "ascii_pretty": 0,
            "google_translate": 0,
            "fallback_pretty": 0,
        }

    def _load_cache(self) -> Dict[str, str]:
        if not self.cache_path.exists():
            return {}
        try:
            return json.loads(self.cache_path.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def _save_cache(self) -> None:
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        self.cache_path.write_text(
            json.dumps(self.cache, ensure_ascii=False, indent=2, sort_keys=True),
            encoding="utf-8",
        )
        self._dirty_writes = 0

    def _mark_dirty(self) -> None:
        self._dirty_writes += 1
        if self._dirty_writes >= self.save_every:
            self._save_cache()

    def flush(self) -> None:
        if self._dirty_writes > 0:
            self._save_cache()

    def translate(self, text: str) -> Tuple[str, str]:
        source = (text or "").strip()
        if not source:
            self.stats["empty"] += 1
            return "", "empty"

        cache_key = source
        if cache_key in self.cache:
            cached = self.cache[cache_key]
            if is_usable_translation(source, cached):
                self.stats["cache"] += 1
                return cached, "cache"

        if not contains_cjk(source):
            translated = pretty_ascii(source)
            self.cache[cache_key] = translated
            self._mark_dirty()
            self.stats["ascii_pretty"] += 1
            return translated, "ascii_pretty"

        if self.enable_network:
            translated = self._translate_google(source)
            if is_usable_translation(source, translated):
                self.cache[cache_key] = translated
                self._mark_dirty()
                self.stats["google_translate"] += 1
                return translated, "google_translate"

        fallback = pretty_ascii(source)
        if not contains_cjk(source):
            self.cache[cache_key] = fallback
            self._mark_dirty()
        self.stats["fallback_pretty"] += 1
        return fallback, "fallback_pretty"

    def _translate_google(self, text: str, max_retries: int = 3) -> str:
        params = {
            "client": "gtx",
            "sl": "auto",
            "tl": "en",
            "dt": "t",
            "q": text,
        }
        for attempt in range(max_retries):
            try:
                resp = requests.get(TRANSLATE_URL, params=params, timeout=15)
                if resp.status_code != 200:
                    if attempt < max_retries - 1:
                        self._sleep_backoff(attempt)
                        continue
                    return ""
                data = resp.json()
                translated_parts = []
                if isinstance(data, list) and data and isinstance(data[0], list):
                    for seg in data[0]:
                        if isinstance(seg, list) and seg:
                            translated_parts.append(seg[0] or "")
                return "".join(translated_parts).strip()
            except Exception:
                if attempt < max_retries - 1:
                    self._sleep_backoff(attempt)
                    continue
                return ""
        return ""

    def _sleep_backoff(self, attempt: int) -> None:
        base = 0.8 * (2 ** attempt)
        jitter = random.uniform(0, 0.4)
        time.sleep(base + jitter)
