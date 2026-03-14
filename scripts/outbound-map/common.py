#!/usr/bin/env python3
"""Shared helpers for outbound map maintenance scripts."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import requests


PB_INFO_PATH = Path(__file__).resolve().parents[2] / "db" / "pb_info.txt"
TIMEOUT = 15


@dataclass
class PocketBaseConfig:
    url: str
    email: str
    password: str


def load_config() -> PocketBaseConfig:
    raw: Dict[str, str] = {}
    for line in PB_INFO_PATH.read_text().splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        raw[key.strip()] = value.strip()

    return PocketBaseConfig(
        url=raw["pb_url"],
        email=raw["email"],
        password=raw["password"],
    )


def create_session(config: Optional[PocketBaseConfig] = None) -> requests.Session:
    config = config or load_config()
    session = requests.Session()
    auth_response = session.post(
        f"{config.url}/api/collections/_superusers/auth-with-password",
        json={"identity": config.email, "password": config.password},
        timeout=TIMEOUT,
    )
    auth_response.raise_for_status()
    token = auth_response.json()["token"]
    session.headers.update(
        {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
    )
    return session


def fetch_full_list(session: requests.Session, base_url: str, collection: str, fields: Optional[str] = None) -> List[Dict[str, Any]]:
    page = 1
    items: List[Dict[str, Any]] = []

    while True:
        params: Dict[str, Any] = {"page": page, "perPage": 200}
        if fields:
            params["fields"] = fields

        response = session.get(
            f"{base_url}/api/collections/{collection}/records",
            params=params,
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
        items.extend(payload.get("items", []))

        if page >= payload.get("totalPages", 0):
            break
        page += 1

    return items


def print_json(data: Any) -> None:
    print(json.dumps(data, indent=2, ensure_ascii=True))


def chunked(items: Iterable[Any], size: int) -> Iterable[List[Any]]:
    batch: List[Any] = []
    for item in items:
        batch.append(item)
        if len(batch) == size:
            yield batch
            batch = []
    if batch:
        yield batch
