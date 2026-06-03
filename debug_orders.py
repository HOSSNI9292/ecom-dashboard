import json

with open("C:\\Users\\Hp\\AppData\\Local\\Temp\\api_response2.json", encoding="utf-8") as f:
    data = json.load(f)

content = data.get("content", {})
print("=== RESPONSE STRUCTURE ===")
print(f"Top-level keys: {list(data.keys())}")
if "content" in data:
    print(f"Content keys: {list(content.keys())}")
    print(f"Total elements (API total): {content.get('totalElements', 'N/A')}")
    print(f"Total pages: {content.get('totalPages', 'N/A')}")
    print(f"Page: {content.get('page', 'N/A')}")
    print(f"Size: {content.get('size', 'N/A')}")

orders = content.get("results", [])
print(f"\nOrders in this response: {len(orders)}")

# Check if there are more orders than what we fetched
if content.get("totalElements"):
    total = content["totalElements"]
    fetched = len(orders)
    if total > fetched:
        print(f"\n*** PAGINATION ISSUE: API has {total} total orders but we only fetched {fetched}! ***")
        print(f"*** Missing {total - fetched} orders! ***")

# Also check country breakdown of confirmed orders
from collections import Counter
confirmed = [o for o in orders if o["status"]["name"] == "Confirmed"]
country_counts = Counter()
for o in confirmed:
    country_counts[o["customer"]["country"]] += 1
print(f"\n=== CONFIRMED ORDERS BY COUNTRY ({len(confirmed)} total) ===")
for c, cnt in sorted(country_counts.items(), key=lambda x: -x[1]):
    print(f"  {c}: {cnt}")

# Check dates of confirmed orders
print(f"\n=== CONFIRMED ORDER DATES (first 20) ===")
for o in confirmed[:20]:
    print(f"  {o['id']}: date={o.get('date','N/A')[:10]}, country={o['customer']['country']}")
