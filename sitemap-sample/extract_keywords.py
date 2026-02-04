import re
from collections import Counter
import sys
import os

def extract_keywords(file_path, top_n=100):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    word_counter = Counter()
    
    # Common stopwords to ignore (can be expanded)
    stopwords = {'in', 'a', 'the', 'of', 'and', 'with', 'for', 'from', 'at', 'to', 'on', 'by'}

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                
                # Extract slug: everything after the last '/' or specifically after '/activity/'
                # Example: .../activity/123456-slug-text/
                match = re.search(r'/activity/\d+-(.*?)/?$', line)
                if match:
                    slug = match.group(1)
                else:
                    # Fallback: just get the last part if pattern doesn't match
                    slug = line.rstrip('/').split('/')[-1]
                
                # Split by hyphen and other non-alphanumeric chars
                words = re.split(r'[^a-zA-Z0-9]', slug)
                
                for word in words:
                    word = word.lower()
                    # Filter: only alphanumeric, length > 2, and not a stopword or just digits
                    if len(word) > 2 and word not in stopwords and not word.isdigit():
                        word_counter[word] += 1

        print(f"{'Keyword':<20} | {'Frequency':<10}")
        print("-" * 35)
        for word, count in word_counter.most_common(top_n):
            print(f"{word:<20} | {count:<10}")

    except Exception as e:
        print(f"Error reading file: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 extract_keywords.py <path_to_urls_txt>")
    else:
        extract_keywords(sys.argv[1])
