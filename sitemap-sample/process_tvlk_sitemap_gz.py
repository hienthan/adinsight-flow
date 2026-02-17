import argparse
import gzip
import os
from typing import Dict, List, Tuple
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET


def output_relative_path_from_url(url: str) -> str:
    """
    Example:
    /id-id/sitemap/accommodation/accom-spe-hotel/sitemap-18.xml.gz
    -> accommodation/accom-spe-hotel/sitemap-18.txt
    """
    parsed = urlparse(url)
    marker = "/sitemap/"

    if marker not in parsed.path:
        raise ValueError(f"URL does not contain '{marker}': {url}")

    relative_part = parsed.path.split(marker, 1)[1].lstrip("/")
    directory, filename = os.path.split(relative_part)

    if not filename.endswith(".xml.gz"):
        raise ValueError(f"URL does not end with '.xml.gz': {url}")

    output_name = filename[:-7] + ".txt"  # remove ".xml.gz", add ".txt"
    return os.path.join(directory, output_name)


def iter_locs_from_gz_url(url: str):
    request = Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; tvlk-sitemap-processor/1.0)"},
    )

    with urlopen(request, timeout=90) as response:
        with gzip.GzipFile(fileobj=response) as gz_stream:
            for _, elem in ET.iterparse(gz_stream, events=("end",)):
                if elem.tag.endswith("loc") and elem.text:
                    yield elem.text.strip()
                elem.clear()


def process_single_url(url: str, output_root: str) -> Tuple[str, int]:
    relative_output = output_relative_path_from_url(url)
    output_path = os.path.join(output_root, relative_output)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    count = 0
    with open(output_path, "w", encoding="utf-8") as out_file:
        for loc in iter_locs_from_gz_url(url):
            out_file.write(loc + "\n")
            count += 1

    return output_path, count


def read_input_urls(input_file: str) -> List[str]:
    if not os.path.exists(input_file):
        raise FileNotFoundError(f"Input file not found: {input_file}")

    urls: List[str] = []
    with open(input_file, "r", encoding="utf-8") as file_obj:
        for raw in file_obj:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            urls.append(line)
    return urls


def run(input_file: str, output_root: str, stop_on_error: bool = False) -> Dict[str, int]:
    urls = read_input_urls(input_file)
    total = len(urls)

    if total == 0:
        print("No URLs found in input file.")
        return {"total": 0, "ok": 0, "failed": 0, "url_count": 0}

    ok = 0
    failed = 0
    total_extracted_urls = 0

    for idx, url in enumerate(urls, start=1):
        try:
            output_path, count = process_single_url(url, output_root)
            ok += 1
            total_extracted_urls += count
            print(f"[{idx}/{total}] OK   {url} -> {output_path} ({count} urls)")
        except Exception as err:
            failed += 1
            print(f"[{idx}/{total}] FAIL {url} -> {err}")
            if stop_on_error:
                break

    print("\nDone.")
    print(f"Total sitemap gz URLs : {total}")
    print(f"Processed OK          : {ok}")
    print(f"Failed                : {failed}")
    print(f"Total extracted URLs  : {total_extracted_urls}")

    return {
        "total": total,
        "ok": ok,
        "failed": failed,
        "url_count": total_extracted_urls,
    }


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Download TVLK sitemap .xml.gz files and extract <loc> URLs to .txt files."
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Input txt file containing .xml.gz sitemap URLs (one per line).",
    )
    parser.add_argument(
        "--output-root",
        default="sitemap-sample/tvlk",
        help="Output root directory for generated .txt files.",
    )
    parser.add_argument(
        "--stop-on-error",
        action="store_true",
        help="Stop immediately when any URL fails.",
    )
    return parser


if __name__ == "__main__":
    args = build_arg_parser().parse_args()
    run(
        input_file=args.input,
        output_root=args.output_root,
        stop_on_error=args.stop_on_error,
    )
