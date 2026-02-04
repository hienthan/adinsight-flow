#!/usr/bin/env python3
"""
Fast bulk update content_type using SQL
Much faster than API calls for large datasets.
"""

import sqlite3
import os

def bulk_update_content_type():
    db_path = 'pb_data/data.db'
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found: {db_path}")
        return
    
    print("=== Fast Content Type Update (SQL) ===\n")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check how many need update
    cursor.execute("SELECT COUNT(*) FROM pages WHERE content_type IS NULL OR content_type = ''")
    count = cursor.fetchone()[0]
    
    print(f"Records needing update: {count:,}")
    
    if count == 0:
        print("All records already have content_type!")
        conn.close()
        return
    
    # Bulk update
    print("Updating...")
    cursor.execute("""
        UPDATE pages 
        SET content_type = 'activity'
        WHERE content_type IS NULL OR content_type = ''
    """)
    
    updated = cursor.rowcount
    conn.commit()
    conn.close()
    
    print(f"✅ Updated {updated:,} records in <1 second!")

if __name__ == "__main__":
    bulk_update_content_type()
