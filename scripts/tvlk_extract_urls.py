#!/usr/bin/env python3
import re
import sys
import os

def extract_urls(input_file, output_file):
    if not os.path.exists(input_file):
        print(f"Error: Input file {input_file} not found.")
        return

    url_pattern = re.compile(r'https?://[^\s,]+')
    urls = []

    with open(input_file, 'r', encoding='utf-8') as f:
        # Skip the first line if it's a file path (common in the provided sample)
        first_line = f.readline()
        if not url_pattern.search(first_line):
           pass # It was a file path or header
        else:
           # If it was a URL, add it
           match = url_pattern.search(first_line)
           if match:
               urls.append(match.group(0))

        for line in f:
            match = url_pattern.search(line)
            if match:
                urls.append(match.group(0))

    with open(output_file, 'w', encoding='utf-8') as f:
        for url in urls:
            f.write(url + '\n')
    
    print(f"Extracted {len(urls)} URLs to {output_file}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 extract_tvlk_urls.py <input_file> <output_file>")
    else:
        extract_urls(sys.argv[1], sys.argv[2])
