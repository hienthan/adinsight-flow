#!/usr/bin/env python3
"""
Extract product URLs and titles from a Viator HTML sitemap page.

Usage:
  python3 scripts/viator/extract_html_sitemap.py \
      --url https://www.viator.com/sitemap/France/d51-products \
      --output data/viator_france_products.csv

  python3 scripts/viator/extract_html_sitemap.py \
      --html saved_page.html \
      --output data/viator_france_products.csv
"""

from __future__ import annotations

import argparse
import csv
import sys
from html.parser import HTMLParser
from pathlib import Path
from typing import List
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen


BASE_URL = "https://www.viator.com"
BLOCKED_PREFIXES = (
    "/support/",
    "/blog",
    "/legal/",
    "/about",
    "/careers",
    "/sitemap",
)
PRODUCT_PATH_HINTS = (
    "/tours/",
    "/attractions/",
)
TICKET_TITLE_PREFIX = "Tickets & tours in "
TTD_TITLE_PREFIX = "Things to do in "


class ViatorSitemapParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.in_anchor = False
        self.current_href = ""
        self.current_text_parts: List[str] = []
        self.rows: List[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag != "a":
            return
        self.in_anchor = True
        self.current_href = dict(attrs).get("href", "").strip()
        self.current_text_parts = []

    def handle_data(self, data: str) -> None:
        if self.in_anchor:
            self.current_text_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag != "a" or not self.in_anchor:
            return

        text = " ".join(part.strip() for part in self.current_text_parts if part.strip())
        href = self.current_href

        if text and is_relevant_href(href, text):
            self.rows.append((normalize_url(href), text))

        self.in_anchor = False
        self.current_href = ""
        self.current_text_parts = []


def is_relevant_href(href: str, text: str) -> bool:
    if not href:
        return False

    full_url = normalize_url(href)
    parsed = urlparse(full_url)
    path = parsed.path or ""

    if parsed.netloc and parsed.netloc not in {"www.viator.com", "viator.com"}:
        return False

    if any(path.startswith(prefix) for prefix in BLOCKED_PREFIXES):
        return False

    if any(hint in path for hint in PRODUCT_PATH_HINTS):
        return True

    # Ticket sitemap pages expose attraction/category landing pages instead of
    # direct product URLs, so we key off the visible label pattern.
    if text.startswith(TICKET_TITLE_PREFIX) and path and path != "/":
        return True

    if text.startswith(TTD_TITLE_PREFIX) and path and path != "/":
        return True

    return False


def normalize_url(href: str) -> str:
    return urljoin(BASE_URL, href.split("#", 1)[0]).strip()


def fetch_html(url: str) -> str:
    request = Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/135.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
        },
    )

    with urlopen(request, timeout=30) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def dedupe_rows(rows: List[tuple[str, str]]) -> List[tuple[str, str]]:
    seen = set()
    deduped: List[tuple[str, str]] = []
    for url, title in rows:
        key = (url, title)
        if key in seen:
            continue
        seen.add(key)
        deduped.append((url, title))
    return deduped


def write_csv(rows: List[tuple[str, str]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["url", "title"])
        writer.writerows(rows)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--url", help="Viator HTML sitemap URL")
    group.add_argument("--html", help="Path to saved HTML file")
    parser.add_argument("--output", required=True, help="Output CSV path")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        if args.url:
            html = fetch_html(args.url)
        else:
            html = Path(args.html).read_text(encoding="utf-8")
    except FileNotFoundError:
        print(f"HTML file not found: {args.html}", file=sys.stderr)
        return 1
    except HTTPError as exc:
        print(f"HTTP error while fetching {args.url}: {exc.code} {exc.reason}", file=sys.stderr)
        return 2
    except URLError as exc:
        print(f"Network error while fetching {args.url}: {exc.reason}", file=sys.stderr)
        return 2

    parser = ViatorSitemapParser()
    parser.feed(html)
    rows = dedupe_rows(parser.rows)

    if not rows:
        print("No relevant links found.", file=sys.stderr)
        return 3

    output_path = Path(args.output)
    write_csv(rows, output_path)
    print(f"Wrote {len(rows)} rows to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
