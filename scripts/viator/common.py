#!/usr/bin/env python3
from __future__ import annotations

import re
import unicodedata
from pathlib import Path
from typing import Dict

import requests


PB_INFO_PATH = Path(__file__).resolve().parents[2] / "db" / "pb_info.txt"


def load_pb_info() -> Dict[str, str]:
    info: Dict[str, str] = {}
    with PB_INFO_PATH.open("r", encoding="utf-8") as fh:
        for line in fh:
            if ":" not in line:
                continue
            key, value = line.split(":", 1)
            info[key.strip()] = value.strip()
    return info


def authenticate_superuser(pb_url: str, email: str, password: str) -> str:
    resp = requests.post(
        f"{pb_url}/api/collections/_superusers/auth-with-password",
        json={"identity": email, "password": password},
        timeout=20,
    )
    resp.raise_for_status()
    return resp.json()["token"]


def create_session(pb_url: str, email: str, password: str) -> requests.Session:
    token = authenticate_superuser(pb_url, email, password)
    session = requests.Session()
    session.headers.update(
        {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
    )
    return session


def normalize_key(value: str) -> str:
    value = (value or "").strip()
    if not value:
        return ""
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii")
    value = value.lower()
    value = value.replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", "_", value)
    value = re.sub(r"_+", "_", value).strip("_")
    return value


def pretty_country_from_filename(path: str) -> str:
    name = Path(path).stem.lower()
    match = re.search(r"viator_(.+?)_(products|tickets|things_to_do)$", name)
    if not match:
        return ""
    country = normalize_key(match.group(1))
    aliases = {
        "uk": "united_kingdom",
        "usa": "united_states",
    }
    return aliases.get(country, country)
