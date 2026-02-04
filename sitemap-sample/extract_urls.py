import xml.etree.ElementTree as ET
import sys
import os

def extract_urls(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    try:
        # Using iterparse for large XML files to save memory
        context = ET.iterparse(file_path, events=('end',))
        
        # Sitemaps usually have namespaces, we need to handle them
        urls = []
        for event, elem in context:
            # We look for tags ending in 'loc'
            if elem.tag.endswith('loc'):
                if elem.text:
                    print(elem.text)
            
            # Clear element from memory after processing
            elem.clear()

    except Exception as e:
        print(f"Error parsing XML: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 extract_urls.py <path_to_xml>")
    else:
        extract_urls(sys.argv[1])
