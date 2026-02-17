import argparse
import os
import re
from typing import Dict, List, Tuple
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET


KLOOK_SITEMAP_FILENAME_RE = re.compile(r"^sitemap-(?P<name>.+)-plain\.xml$")


def parse_master_index(master_file: str) -> List[str]:
    """
    Parse local Klook zh-HK master index XML and return sitemap URLs.
    Commented-out blocks are ignored by XML parsing.
    """
    if not os.path.exists(master_file):
        raise FileNotFoundError(f"Master index file not found: {master_file}")

    raw_text = open(master_file, "r", encoding="utf-8").read()
    start = raw_text.find("<sitemapindex")
    if start == -1:
        raise ValueError("Cannot find <sitemapindex> root in master index file.")

    xml_text = raw_text[start:]
    root = ET.fromstring(xml_text)

    sitemap_urls: List[str] = []
    for sitemap_node in root:
        if not sitemap_node.tag.endswith("sitemap"):
            continue
        for child in sitemap_node:
            if child.tag.endswith("loc") and child.text:
                sitemap_urls.append(child.text.strip())
                break
    return sitemap_urls


def extract_name_from_sitemap_url(sitemap_url: str) -> str:
    filename = os.path.basename(urlparse(sitemap_url).path)
    match = KLOOK_SITEMAP_FILENAME_RE.match(filename)
    if not match:
        raise ValueError(f"Unexpected sitemap filename format: {filename}")
    return match.group("name")


def fetch_xml_root(url: str) -> ET.Element:
    request = Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; klook-zhhk-sitemap-processor/1.0)"},
    )
    with urlopen(request, timeout=90) as response:
        xml_bytes = response.read()
    return ET.fromstring(xml_bytes)


def extract_loc_urls_from_sitemap(sitemap_url: str) -> List[str]:
    root = fetch_xml_root(sitemap_url)
    urls: List[str] = []
    for elem in root.iter():
        if elem.tag.endswith("loc") and elem.text:
            urls.append(elem.text.strip())
    return urls


def process_single_sitemap(sitemap_url: str, output_root: str) -> Tuple[str, int]:
    name = extract_name_from_sitemap_url(sitemap_url)
    output_dir = os.path.join(output_root, name)
    output_file = os.path.join(output_dir, f"{name}.txt")
    os.makedirs(output_dir, exist_ok=True)

    urls = extract_loc_urls_from_sitemap(sitemap_url)
    with open(output_file, "w", encoding="utf-8") as file_obj:
        for url in urls:
            file_obj.write(url + "\n")

    return output_file, len(urls)


def run(master_file: str, output_root: str, stop_on_error: bool = False) -> Dict[str, int]:
    sitemap_urls = parse_master_index(master_file)
    total = len(sitemap_urls)

    if total == 0:
        print("No sitemap URLs found in master index.")
        return {"total": 0, "ok": 0, "failed": 0, "url_count": 0}

    ok = 0
    failed = 0
    total_extracted_urls = 0

    for idx, sitemap_url in enumerate(sitemap_urls, start=1):
        try:
            output_file, count = process_single_sitemap(sitemap_url, output_root)
            ok += 1
            total_extracted_urls += count
            print(f"[{idx}/{total}] OK   {sitemap_url} -> {output_file} ({count} urls)")
        except Exception as err:
            failed += 1
            print(f"[{idx}/{total}] FAIL {sitemap_url} -> {err}")
            if stop_on_error:
                break

    print("\nDone.")
    print(f"Total sitemap URLs    : {total}")
    print(f"Processed OK          : {ok}")
    print(f"Failed                : {failed}")
    print(f"Total extracted URLs  : {total_extracted_urls}")

    return {"total": total, "ok": ok, "failed": failed, "url_count": total_extracted_urls}


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Process Klook zh-HK sitemap master index and export each sitemap <loc> to txt."
    )
    parser.add_argument(
        "--master",
        default="sitemap-sample/klook/zh-hk_sitemap-master-index.xml",
        help="Path to Klook zh-HK sitemap master index XML file.",
    )
    parser.add_argument(
        "--output-root",
        default="sitemap-sample/klook/zh-HK",
        help="Output root directory for generated txt files.",
    )
    parser.add_argument(
        "--stop-on-error",
        action="store_true",
        help="Stop immediately when any sitemap URL fails.",
    )
    return parser


if __name__ == "__main__":
    args = build_arg_parser().parse_args()
    run(master_file=args.master, output_root=args.output_root, stop_on_error=args.stop_on_error)
