#!/usr/bin/env python3
"""
Geopy Post-Processing Script
Uses geopy to enrich Unknown URLs with intelligent rate limiting and batch processing.
"""

import json
import time
import sys
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent / 'lib'))

try:
    from geopy.geocoders import Nominatim
    from geopy.exc import GeocoderTimedOut, GeocoderServiceError
except ImportError:
    print("ERROR: geopy not installed. Run: pip3 install geopy")
    sys.exit(1)

def enrich_with_geopy(input_file, output_file, max_urls=500):
    """
    Enriches Unknown URLs using geopy with rate limiting.
    
    Args:
        input_file: Path to JSON file with URLs
        output_file: Path to save enriched JSON
        max_urls: Maximum number of URLs to process (to avoid rate limits)
    """
    print(f"Loading data from {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    unknowns = [d for d in data if d['country'] == 'Unknown']
    total = len(data)
    
    print(f"\n=== Geopy Enrichment ===")
    print(f"Total URLs: {total:,}")
    print(f"Unknown URLs: {len(unknowns):,} ({len(unknowns)/total*100:.1f}%)")
    print(f"Processing: {min(max_urls, len(unknowns)):,} URLs")
    print(f"Rate limit: 1 request/second (OpenStreetMap policy)\n")
    
    # Initialize geolocator
    geolocator = Nominatim(user_agent="adinsight_flow_v1")
    
    enriched_count = 0
    failed_count = 0
    
    # Process Unknown URLs (limited to max_urls)
    for idx, item in enumerate(unknowns[:max_urls], 1):
        slug = item['slug']
        
        try:
            # Extract meaningful words
            words = slug.replace('-', ' ').replace('_', ' ').split()
            stop_words = {'tour', 'ticket', 'pass', 'experience', 'day', 'trip', 'private', 'group', 'admission', 'half', 'full'}
            meaningful_words = [w for w in words if w not in stop_words and len(w) >= 4]
            
            if meaningful_words:
                # Try with first 3 meaningful words
                query = ' '.join(meaningful_words[:3])
                location = geolocator.geocode(query, timeout=3, language='en')
                
                if location and location.address:
                    # Extract country from address
                    address_parts = location.address.split(', ')
                    country = address_parts[-1] if address_parts else None
                    
                    if country:
                        # Extract city if available
                        city = address_parts[0] if len(address_parts) > 1 else "Unknown"
                        
                        item['country'] = country
                        item['city'] = city
                        enriched_count += 1
                        
                        print(f"✓ [{idx}/{min(max_urls, len(unknowns))}] {slug[:50]:50} -> {country}, {city}")
                    else:
                        failed_count += 1
                        print(f"✗ [{idx}/{min(max_urls, len(unknowns))}] {slug[:50]:50} -> No country found")
                else:
                    failed_count += 1
                    print(f"✗ [{idx}/{min(max_urls, len(unknowns))}] {slug[:50]:50} -> Not found")
            else:
                failed_count += 1
                print(f"✗ [{idx}/{min(max_urls, len(unknowns))}] {slug[:50]:50} -> No meaningful words")
            
            # Rate limiting: 1 request per second
            time.sleep(1)
            
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            failed_count += 1
            print(f"✗ [{idx}/{min(max_urls, len(unknowns))}] {slug[:50]:50} -> API Error: {e}")
            time.sleep(2)  # Extra delay on error
        except Exception as e:
            failed_count += 1
            print(f"✗ [{idx}/{min(max_urls, len(unknowns))}] {slug[:50]:50} -> Error: {e}")
    
    # Calculate final stats
    new_unknowns = [d for d in data if d['country'] == 'Unknown']
    
    print(f"\n=== Results ===")
    print(f"Enriched: {enriched_count} URLs")
    print(f"Failed: {failed_count} URLs")
    print(f"Remaining Unknown: {len(new_unknowns):,} ({len(new_unknowns)/total*100:.1f}%)")
    print(f"Improvement: {len(unknowns) - len(new_unknowns)} URLs")
    
    # Save enriched data
    print(f"\nSaving enriched data to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Enrichment complete!")
    print(f"   Next step: Import to database")
    print(f"   Command: python3 scripts/02_import_to_pb.py {output_file} klook")

if __name__ == "__main__":
    input_file = "data/klook_experiences-activity_preview.json"
    output_file = "data/klook_experiences-activity_geopy_enriched.json"
    
    # Process first 500 Unknown URLs (takes ~8-10 minutes)
    # Increase max_urls if needed, but be mindful of rate limits
    enrich_with_geopy(input_file, output_file, max_urls=500)
