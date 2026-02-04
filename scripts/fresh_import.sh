#!/bin/bash
# Fresh Import Workflow
# Run this to perform a clean import of merged multi-language data

set -e

echo "=== Fresh Import Workflow ==="
echo ""
echo "📋 Steps:"
echo "  1. Add content_type field in PocketBase (manual)"
echo "  2. Clear existing records"
echo "  3. Import fresh data"
echo ""

# Check if content_type field exists
echo "⚠️  Before proceeding, please ensure:"
echo "  1. PocketBase is running at http://127.0.0.1:8090"
echo "  2. Field 'content_type' (type: Select) is added to 'pages' collection"
echo "     Options: activity, hotel, restaurant, event, poi, blog, other"
echo "  3. Field 'metadata' (type: JSON, optional) is added to 'pages' collection"
echo ""
read -p "Have you added these fields? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Please add the fields first, then re-run this script."
    exit 1
fi

echo ""
echo "Step 1/2: Clearing existing records..."
python3 scripts/clear_pages_collection.py

echo ""
echo "Step 2/2: Importing fresh data..."
echo "Importing data/klook_final_import.json (34,053 records)..."
python3 scripts/02_import_to_pb.py data/klook_final_import.json klook

echo ""
echo "✅ Fresh import complete!"
echo ""
echo "📊 Verify in PocketBase:"
echo "  - Total records: should be ~34,053"
echo "  - Languages field: should show zh-HK, zh-TW, or both"
echo "  - Content type: should show 'activity'"
