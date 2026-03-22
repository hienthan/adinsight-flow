#!/usr/bin/env python3
"""Seed demo outbound routes for the new Outbound Map UI."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from common import create_session, fetch_full_list, load_config


SEED_OWNER = "demo_seed"

ROUTE_SPECS = [
    {
        "platform_display_name": "Klook-ECO",
        "source_market": "TW",
        "destination_country": "Japan",
        "destination_country_code": "JP",
        "campaign_names": ["3. TW Act JP All"],
        "status": "active",
        "priority": "high",
        "seasonal_tags": ["sakura", "golden_week"],
        "notes": "Demo seed: Taiwan outbound to Japan for Klook ECO campaigns.",
        "is_core_route": True,
    },
    {
        "platform_display_name": "Klook-ECO",
        "source_market": "HK",
        "destination_country": "Taiwan",
        "destination_country_code": "TW",
        "campaign_names": ["4.  HK Act TW Allx"],
        "status": "paused",
        "priority": "medium",
        "seasonal_tags": ["summer"],
        "notes": "Demo seed: paused Hong Kong outbound route to Taiwan.",
        "is_core_route": False,
    },
    {
        "platform_display_name": "Klook-MO",
        "source_market": "TW",
        "destination_country": "Japan",
        "destination_country_code": "JP",
        "campaign_names": ["TWJP pre-departure keys", "Visit Japan Web"],
        "status": "active",
        "priority": "critical",
        "seasonal_tags": ["sakura", "year_end"],
        "notes": "Demo seed: TW to JP route with multiple MO campaigns attached.",
        "is_core_route": True,
    },
    {
        "platform_display_name": "Klook-MO",
        "source_market": "HK",
        "destination_country": "South Korea",
        "destination_country_code": "KR",
        "campaign_names": ["HK Esim (KR Arrival)"],
        "status": "active",
        "priority": "high",
        "seasonal_tags": ["winter"],
        "notes": "Demo seed: HK to KR route focused on arrival utility campaigns.",
        "is_core_route": True,
    },
    {
        "platform_display_name": "Traveloka-MO",
        "source_market": "ID",
        "destination_country": "Japan",
        "destination_country_code": "JP",
        "campaign_names": ["Visit Japan Web"],
        "status": "planned",
        "priority": "medium",
        "seasonal_tags": ["spring"],
        "notes": "Demo seed: planned ID outbound route to JP for Traveloka MO.",
        "is_core_route": False,
    },
]


def build_route_key(platform_id: str, source_market: str, destination_country_code: str, destination_city: str = "") -> str:
    city_part = destination_city.strip().lower().replace(" ", "-") or "all"
    return f"{platform_id}|{source_market.upper()}|{destination_country_code.upper()}|{city_part}"


def build_route_name(source_market: str, destination_country: str, destination_city: str = "") -> str:
    destination_label = f"{destination_city}, {destination_country}" if destination_city else destination_country
    return f"{source_market} -> {destination_label}"


def find_record_by_name(records: List[Dict[str, Any]], field: str, value: str) -> Optional[Dict[str, Any]]:
    for record in records:
        if record.get(field) == value:
            return record
    return None


def main() -> None:
    config = load_config()
    session = create_session(config)

    platforms = fetch_full_list(session, config.url, "campaign_platforms", fields="id,display_name")
    campaigns = fetch_full_list(session, config.url, "campaigns", fields="id,name,platform,status")
    existing_routes = fetch_full_list(session, config.url, "campaign_routes", fields="id,route_key")
    existing_route_keys = {route["route_key"]: route["id"] for route in existing_routes}

    created = 0
    skipped = 0

    for spec in ROUTE_SPECS:
        platform = find_record_by_name(platforms, "display_name", spec["platform_display_name"])
        if not platform:
            print(f"Skip: missing platform {spec['platform_display_name']}")
            skipped += 1
            continue

        attached_campaign_ids = [
            campaign["id"]
            for campaign in campaigns
            if campaign.get("platform") == platform["id"] and campaign.get("name") in spec["campaign_names"]
        ]

        route_key = build_route_key(
            platform["id"],
            spec["source_market"],
            spec["destination_country_code"],
        )

        if route_key in existing_route_keys:
            print(f"Skip existing route: {route_key}")
            skipped += 1
            continue

        payload = {
            "route_key": route_key,
            "route_name": build_route_name(spec["source_market"], spec["destination_country"]),
            "platform": platform["id"],
            "source_market": spec["source_market"],
            "destination_country": spec["destination_country"],
            "destination_country_code": spec["destination_country_code"],
            "destination_city": "",
            "destination_label": spec["destination_country"],
            "campaigns": attached_campaign_ids,
            "status": spec["status"],
            "priority": spec["priority"],
            "owner": SEED_OWNER,
            "is_core_route": spec["is_core_route"],
            "seasonal_tags": spec["seasonal_tags"],
            "notes": spec["notes"],
            "tags": ["demo_seed"],
            "metadata": {"seed_script": "scripts/outbound-map/seed_demo_routes.py"},
        }

        response = session.post(
            f"{config.url}/api/collections/campaign_routes/records",
            json=payload,
            timeout=15,
        )
        response.raise_for_status()
        created += 1
        print(f"Created route: {payload['route_name']} ({len(attached_campaign_ids)} campaigns)")

    print(f"\nDone. Created={created}, Skipped={skipped}")


if __name__ == "__main__":
    main()
