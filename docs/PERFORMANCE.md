# PocketBase Performance Best Practices

## ⚡ Performance Optimization Guidelines

### Critical Rules

#### 1. **Bulk Operations: Use SQL, NOT API Loops**

❌ **SLOW - API Loop (Minutes for 30k records):**
```python
for record in records:
    requests.delete(f"{pb_url}/api/collections/pages/records/{record['id']}")
```

✅ **FAST - Direct SQL (<1 second):**
```python
import sqlite3
conn = sqlite3.connect('pb_data/data.db')
cursor = conn.cursor()
cursor.execute("DELETE FROM pages WHERE platform = 'klook'")
conn.commit()
```

#### 2. **Bulk Updates**

❌ **SLOW - API Updates:**
```python
for record in records:
    requests.patch(f"{pb_url}/api/collections/pages/records/{record['id']}", 
                   json={"content_type": "activity"})
```

✅ **FAST - SQL Update:**
```python
cursor.execute("UPDATE pages SET content_type = 'activity' WHERE content_type IS NULL")
conn.commit()
```

#### 3. **When to Use Each Approach**

| Operation | Records | Use | Speed |
|-----------|---------|-----|-------|
| Single record | 1-10 | API | Instant |
| Small batch | 10-100 | API with delay | Seconds |
| Large batch | 100+ | **SQL** | <1 second |
| Delete all | Any | **SQL** | <1 second |
| Complex queries | Any | **SQL** | Fast |

---

## 🛠️ Common Operations

### Clear Collection
```python
import sqlite3
conn = sqlite3.connect('pb_data/data.db')
cursor = conn.cursor()
cursor.execute("DELETE FROM pages")
cursor.execute("DELETE FROM sqlite_sequence WHERE name='pages'")  # Reset auto-increment
conn.commit()
conn.close()
```

### Bulk Update Field
```python
cursor.execute("""
    UPDATE pages 
    SET content_type = 'activity'
    WHERE sitemap_tag LIKE '%activity%'
""")
conn.commit()
```

### Count by Field
```python
cursor.execute("""
    SELECT content_type, COUNT(*) 
    FROM pages 
    GROUP BY content_type
""")
results = cursor.fetchall()
```

---

## ⚠️ Important Notes

1. **Backup First**: Always backup `pb_data/data.db` before SQL operations
2. **PocketBase Must Be Stopped**: For safe SQL operations, stop PocketBase first
   - Or use SQLite WAL mode (already enabled by PocketBase)
3. **Schema Changes**: Use PocketBase UI or migrations, NOT direct SQL
4. **Relations**: Be careful with foreign keys when deleting

---

## 📊 Performance Comparison

Deleting 34,053 records:
- API with delays: **~10-15 minutes** (connection errors common)
- Direct SQL: **<1 second** ✅

Updating 34,053 records:
- API: **~10 minutes**
- SQL bulk update: **<1 second** ✅

---

## 🎯 Best Practices Summary

1. ✅ Use SQL for bulk operations (>100 records)
2. ✅ Use API for single/small batch with business logic
3. ✅ Add indexes for frequently queried fields
4. ✅ Use pagination for large result sets
5. ✅ Cache frequently accessed data
6. ❌ Never loop API calls for bulk operations
7. ❌ Don't delete records one-by-one via API
