#!/usr/bin/env python3
import sys
import os

# Add scripts/lib to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'lib'))
from geo_engine import engine

def test_geo_indo():
    test_cases = [
        "pantai-pangasan-jawa-timur-trp",       # Pacitan area, should check if Jawa Timur helps
        "adult-playground-di-jakarta-trp",      # Jakarta
        "panduan-wisata-shibuya-sky-ta",        # Japan/Tokyo? (KB should catch)
        "indoor-playground-di-jakarta-trp",     # Jakarta
        "rekomendasi-playground-malaysia-ta",  # Malaysia
        "tempat-wisata-jogja-yang-lagi-hits",   # Jogja -> Yogyakarta
        "wisata-pontianak-yang-lagi-hits",      # Pontianak
        "wisata-religi-boyolali-ta",           # Boyolali
        "daftar-pantai-likupang-ta",           # Likupang
        "wisata-quezon-city-filipina-ta",      # Philippines
        "tempat-wisata-makati-filipina-ta",     # Philippines
        "wisata-brunei-darussalam-ta",         # Brunei
        "wisata-geelong-yang-tak-boleh-ta",     # Australia
        "panduan-wisata-lembah-pandawa-pandaan",# Pandaan?
        "rekomendasi-wisata-jember-murah-ta",   # Jember
        "tempat-wisata-di-rantau-prapat-ta"     # Rantau Prapat
    ]

    print("--- Indonesia Geo-Detection Test Report ---")
    print(f"{'Slug':<40} | {'Country':<15} | {'City':<15}")
    print("-" * 75)

    for slug in test_cases:
        country, city = engine.detect_geo(slug)
        print(f"{slug[:40]:<40} | {country:<15} | {city:<15}")

if __name__ == "__main__":
    test_geo_indo()
