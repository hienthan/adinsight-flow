#!/usr/bin/env python3
"""Delete demo outbound routes created by seed_demo_routes.py."""

from __future__ import annotations

from common import create_session, fetch_full_list, load_config


def main() -> None:
    config = load_config()
    session = create_session(config)

    routes = fetch_full_list(
        session,
        config.url,
        "campaign_routes",
        fields="id,route_name,owner",
    )

    demo_routes = [route for route in routes if route.get("owner") == "demo_seed"]

    if not demo_routes:
        print("No demo routes found.")
        return

    for route in demo_routes:
        response = session.delete(
            f"{config.url}/api/collections/campaign_routes/records/{route['id']}",
            timeout=15,
        )
        response.raise_for_status()
        print(f"Deleted route: {route['route_name']}")

    print(f"\nDone. Deleted={len(demo_routes)}")


if __name__ == "__main__":
    main()
