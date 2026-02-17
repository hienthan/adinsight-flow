#!/usr/bin/env python3
import sys
import os
from collections import Counter
from urllib.parse import urlparse

def analyze_suffixes(input_file):
    if not os.path.exists(input_file):
        print(f"Error: Input file {input_file} not found.")
        return

    suffixes = []
    total_urls = 0

    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            url = line.strip()
            if not url:
                continue
            total_urls += 1
            
            # Extract slug part
            path = urlparse(url).path.rstrip('/')
            parts = path.split('/')
            
            if len(parts) < 2:
                continue
            
            # Usually the last part is the ID, the one before is the slug
            # e.g. /activities/some-slug-trp/12345
            slug = parts[-2] if parts[-1].isdigit() else parts[-1]
            
            # Simple heuristic for suffix: text after the last hyphen
            if '-' in slug:
                suffix = slug.split('-')[-1]
                # Filter out numbers (IDs that might be at the end of slug)
                if not suffix.isdigit() and len(suffix) <= 5:
                    suffixes.append(suffix)

    counter = Counter(suffixes)
    
    print(f"--- Suffix Analysis Report (Total URLs: {total_urls}) ---")
    print(f"{'Suffix':<10} | {'Count':<10} | {'Percentage':<10}")
    print("-" * 35)
    
    # Sort by count
    for suffix, count in counter.most_common(20):
        percentage = (count / total_urls) * 100
        print(f"{suffix:<10} | {count:<10} | {percentage:>8.2f}%")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 tvlk_suffix_analysis.py <cleaned_urls_file>")
    else:
        analyze_suffixes(sys.argv[1])
