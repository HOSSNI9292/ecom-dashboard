import json
with open("C:\\Users\\Hp\\AppData\\Local\\Temp\\api_response2.json", encoding="utf-8") as f:
    data = json.load(f)
c = data["content"]
print(f"total: {c.get('total')}")
print(f"per_page: {c.get('per_page')}")
print(f"current_page: {c.get('current_page')}")
print(f"last_page: {c.get('last_page')}")
print(f"results count: {len(c.get('results',[]))}")
total = c.get("total", 0)
per_page = c.get("per_page", 500)
last_page = c.get("last_page", 1)
print(f"Estimated total orders in API: {total}")
if last_page and last_page > 1:
    print(f"WARNING: There are {last_page} pages of {per_page} orders each = {total} total")
    print(f"We only fetched the first {per_page} orders. Missing {total - per_page if total else 'unknown'} orders!")
else:
    print("All orders fetched (single page or no pagination).")

# Show all confirmed order dates
confirmed = [o for o in c["results"] if o["status"]["name"] == "Confirmed"]
print(f"\nConfirmed orders count: {len(confirmed)}")

from collections import Counter
dates = Counter()
for o in confirmed:
    dt = o.get("date","N/A")[:10]
    dates[dt] += 1
print(f"Confirmed orders by date:")
for d, cnt in sorted(dates.items()):
    print(f"  {d}: {cnt}")
