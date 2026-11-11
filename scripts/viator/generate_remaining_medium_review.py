#!/usr/bin/env python3
from __future__ import annotations

import csv
from pathlib import Path


REVIEW_ROWS = {
    "diamond_valley": ("barbados", "obvious_override", "Caribbean destination in Barbados."),
    "bonaire": ("bonaire_sint_eustatius_and_saba", "obvious_override", "Island destination; consistent Bonaire context."),
    "kralendijk": ("bonaire_sint_eustatius_and_saba", "obvious_override", "Capital of Bonaire."),
    "choc": ("saint_lucia", "obvious_override", "Saint Lucia locality."),
    "st_john": ("united_states_virgin_islands", "obvious_override", "USVI St. John context in titles."),
    "cruz_bay": ("united_states_virgin_islands", "obvious_override", "Cruz Bay is on St. John, USVI."),
    "rincon": ("puerto_rico", "obvious_override", "Puerto Rico destination."),
    "seven_mile_beach": ("cayman_islands", "obvious_override", "Grand Cayman destination context."),
    "palm_eagle_beach": ("aruba", "obvious_override", "Aruba resort area."),
    "isla_verde": ("puerto_rico", "obvious_override", "Puerto Rico district near San Juan."),
    "culebra": ("puerto_rico", "obvious_override", "Puerto Rico island municipality."),
    "tobago": ("trinidad_and_tobago", "obvious_override", "Island of Trinidad and Tobago."),
    "rodney_bay": ("saint_lucia", "obvious_override", "Saint Lucia resort area."),
    "saint_thomas_parish": ("barbados", "obvious_override", "Barbados parish."),
    "san_salvador_island": ("bahamas", "obvious_override", "Bahamas island."),
    "falmouth": ("jamaica", "obvious_override", "Jamaica cruise/tour destination in Caribbean bucket."),
    "romantic_road": ("germany", "obvious_override", "German tourism route."),
    "sao_miguel": ("portugal", "obvious_override", "Azores island, Portugal."),
    "keswick": ("united_kingdom", "obvious_override", "Keswick in Cumbria, UK."),
    "kensington": ("united_kingdom", "obvious_override", "Kensington London district."),
    "cornwall": ("united_kingdom", "obvious_override", "Cornwall region in England."),
    "castle_road": ("", "keep_unknown", "Too generic; could span multiple locations/routes."),
    "moselle_valley": ("", "keep_unknown", "Cross-border region; avoid wrong-positive."),
    "rhine_river": ("", "keep_unknown", "Multi-country river region."),
    "adriatic_coast": ("", "keep_unknown", "Multi-country coastal region."),
    "tatra_national_park": ("", "keep_unknown", "Poland/Slovakia ambiguity."),
    "the_alps": ("", "keep_unknown", "Multi-country alpine region."),
    "new_town": ("", "keep_unknown", "Too generic without stronger context."),
}


def main() -> int:
    findings_path = Path("data/viator_validation_findings.csv")
    output_path = Path("data/viator_remaining_medium_review.csv")

    with findings_path.open("r", encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))

    output_rows = []
    for row in rows:
        city = row["city"]
        proposed_country, action, reason = REVIEW_ROWS.get(city, ("", "manual_review", "Not yet classified into obvious/ambiguous bucket."))
        output_rows.append(
            {
                "source_file": row["source_file"],
                "city": city,
                "title": row["title"],
                "url": row["url"],
                "current_country": row["country"],
                "proposed_country": proposed_country,
                "action": action,
                "reason": reason,
            }
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "source_file",
                "city",
                "title",
                "url",
                "current_country",
                "proposed_country",
                "action",
                "reason",
            ],
        )
        writer.writeheader()
        writer.writerows(output_rows)

    obvious = sum(1 for row in output_rows if row["action"] == "obvious_override")
    keep_unknown = sum(1 for row in output_rows if row["action"] == "keep_unknown")
    manual = sum(1 for row in output_rows if row["action"] == "manual_review")
    print(f"Wrote {len(output_rows)} review rows to {output_path}")
    print(f"obvious_override={obvious}")
    print(f"keep_unknown={keep_unknown}")
    print(f"manual_review={manual}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
