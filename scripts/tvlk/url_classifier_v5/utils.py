import json
import os
from typing import Any, Dict

def load_json(filepath: str) -> Any:
    """Loads a JSON file from the filesystem."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)
