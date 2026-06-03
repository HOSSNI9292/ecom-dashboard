"""
Full audit v2: fetch ALL orders, handle irregular pages, compute all metrics.
"""
import json, time, urllib.request, ssl
from collections import Counter, defaultdict

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NWYxYzg1MTBiNTg2MjBhMmJjZmZiZTgiLCJlbWFpbCI6ImFybWFzaG9wNjlAZ21haWwuY29tIiwiaWF0IjoxNzgwMDA1NTYyLCJleHAiOjE3ODA2MTAzNjJ9.aKPcUtTqHbXQhWuaJmGuNfr9otkBePtomtfv5gU9pXU"
BASE = "https://api.codinafrica.com/api"

ctx = ssl.create_default_context()

def api_get(path):
    req = urllib.request.Request(f"{BASE}{path}", headers={"X-Auth-Token": TOKEN})
    with urllib.request.urlopen(req, context=ctx, timeout=30) as r:
        raw = r.read()
        return json.loads(raw)

# ── 1. FETCH ALL ORDERS ──────────────────────────────────────────────
print("=" * 70)
print("PHASE 1: FETCH ALL PAGES")
print("=" * 70)

first = api_get("/orders/search?limit=1000&page=1")
total_api = first["content"]["total"]
last_page = first["content"]["last_page"]
print(f"API reports: total={total_api}, last_page={last_page}")

all_raw = []
page_sizes = {}

for p in range(1, last_page + 2):  # try one extra page
    try:
        data = api_get(f"/orders/search?limit=1000&page={p}")
        c = data.get("content", {})
        orders = c.get("results", [])
        if not orders:
            print(f"  Page {p}: empty (stopping)")
            break
        all_raw.extend(orders)
        page_sizes[p] = len(orders)
        print(f"  Page {p}/{last_page}: {len(orders)} orders (total: {len(all_raw)})")
    except Exception as e:
        print(f"  Page {p}: ERROR {e} (stopping)")
        break
    time.sleep(0.05)

print(f"\nTotal fetched: {len(all_raw)} (API reports: {total_api})")
print(f"Page sizes: {json.dumps(page_sizes)}")
if len(all_raw) != total_api:
    print(f"WARNING: Fetched {len(all_raw)} but API says {total_api} (delta: {total_api - len(all_raw)})")

# Check for the last page: API says {last_page} but we might have fetched {last_page+1}
# If the last page before empty had < 1000, that's the real last page
real_last_page = max(page_sizes.keys())
print(f"Real last page: {real_last_page}")
print(f"Orders on last page: {page_sizes.get(real_last_page, 'N/A')}")

# ── 2. PER-STATUS COUNTS ─────────────────────────────────────────────
print("\n" + "=" * 70)
print("PHASE 2: PER-STATUS COUNTS (raw API status names)")
print("=" * 70)

raw_status_counts = Counter()
for o in all_raw:
    raw_status_counts[o["status"]["name"]] += 1

print(f"{'Status':<20} {'Count':<8}")
print("-" * 28)
for s, c in sorted(raw_status_counts.items(), key=lambda x: -x[1]):
    print(f"{s:<20} {c:<8}")
print(f"{'TOTAL':<20} {len(all_raw):<8}")

# ── 3. STATUS MAP ANALYSIS ──────────────────────────────────────────
print("\n" + "=" * 70)
print("PHASE 3: STATUS MAP (raw to mapped)")
print("=" * 70)

STATUS_MAP = {
    "Pending": "pending", "pending": "pending",
    "Confirmed": "confirmed", "confirmed": "confirmed",
    "Processed": "confirmed", "processed": "confirmed",
    "Payé": "confirmed", "payé": "confirmed", "PAYÉ": "confirmed",
    "Paye": "confirmed", "paye": "confirmed",
    "Cancelled": "cancelled", "cancelled": "cancelled",
    "Double": "double", "double": "double",
    "OutOfStock": "out_of_stock", "Out of Stock": "out_of_stock",
    "A transférer": "transferred", "A transferer": "transferred",
    "Transferred": "transferred",
    "Delivered": "delivered", "delivered": "delivered",
    "Shipping": "shipping",
}

mapped_counts = Counter()
unmapped = set()
for o in all_raw:
    name = o["status"]["name"]
    mapped = STATUS_MAP.get(name, name.lower())
    if mapped == name.lower() and name not in STATUS_MAP:
        unmapped.add(name)
    mapped_counts[mapped] += 1

print(f"\n{'Mapped Status':<20} {'Count':<8}")
print("-" * 28)
for s in ["pending", "confirmed", "delivered", "shipping", "cancelled", "double", "out_of_stock", "transferred"]:
    print(f"{s:<20} {mapped_counts.get(s, 0):<8}")
print(f"{'TOTAL':<20} {sum(mapped_counts.values()):<8}")

if unmapped:
    print(f"\nUNMAPPED STATUSES: {sorted(unmapped)}")
else:
    print("\nAll statuses have explicit mappings.")

# ── 4. REVENUE ANALYSIS ──────────────────────────────────────────────
print("\n" + "=" * 70)
print("PHASE 4: REVENUE ANALYSIS")
print("=" * 70)

COUNTRY_FEES = {"GA": 6500, "CG": 5000, "CI": 5000, "ML": 5000, "BF": 5000, "DEFAULT": 5000}

total_revenue = sum(o["totalPrice"] or 0 for o in all_raw)
print(f"Gross Revenue (all orders):        {total_revenue:>12,} XOF")

confirmed_orders = [o for o in all_raw if STATUS_MAP.get(o["status"]["name"], o["status"]["name"].lower()) == "confirmed"]
confirmed_revenue = sum(o["totalPrice"] or 0 for o in confirmed_orders)
print(f"Confirmed/mapped Orders:           {len(confirmed_orders):>12}")
print(f"Confirmed Revenue:                 {confirmed_revenue:>12,} XOF")

# Dashboard also counts delivered+shipping as "confirmed" in confirmedOrders
confirmed_plus_delivered_orders = [o for o in all_raw if STATUS_MAP.get(o["status"]["name"], o["status"]["name"].lower()) in ("confirmed", "delivered", "shipping")]
confirmed_plus_delivered_revenue = sum(o["totalPrice"] or 0 for o in confirmed_plus_delivered_orders)
print(f"Confirmed+Delivered+Shipping Orders: {len(confirmed_plus_delivered_orders):>12}")
print(f"Confirmed+Delivered+Shipping Revenue: {confirmed_plus_delivered_revenue:>12,} XOF")

# Service fees
processed_by_country = Counter()
for o in confirmed_orders:
    country = o["customer"]["country"] or "XX"
    processed_by_country[country] += 1

service_fees_total = 0
print(f"\nProcessed orders by country:")
print(f"{'Country':<10} {'Count':<8} {'Fee/Order':<10} {'Total Fee':<12}")
print("-" * 42)
for c, cnt in sorted(processed_by_country.items(), key=lambda x: -x[1]):
    fee = COUNTRY_FEES.get(c, COUNTRY_FEES["DEFAULT"])
    total_fee = cnt * fee
    service_fees_total += total_fee
    print(f"{c:<10} {cnt:<8} {fee:<10,} {total_fee:<12,}")
print(f"{'TOTAL':<10} {sum(processed_by_country.values()):<8} {'':<10} {service_fees_total:<12,}")

net_revenue = confirmed_revenue - service_fees_total
print(f"\nNet Revenue (confirmed revenue - fees):")
print(f"  {confirmed_revenue:>12,} - {service_fees_total:>12,} = {net_revenue:>12,} XOF")

# ── 5. COUNTRY ANALYSIS ──────────────────────────────────────────────
print("\n" + "=" * 70)
print("PHASE 5: COUNTRY ANALYTICS")
print("=" * 70)

country_data = defaultdict(lambda: {"revenue": 0, "orders": 0, "confirmed": 0, "pending": 0,
                                     "cancelled": 0, "out_of_stock": 0, "processed_orders": 0,
                                     "processed_revenue": 0})
for o in all_raw:
    c = o["customer"]["country"] or "XX"
    status_raw = o["status"]["name"]
    mapped = STATUS_MAP.get(status_raw, status_raw.lower())
    d = country_data[c]
    d["orders"] += 1
    amt = o["totalPrice"] or 0
    d["revenue"] += amt
    if mapped == "pending":
        d["pending"] += 1
    elif mapped == "cancelled":
        d["cancelled"] += 1
    elif mapped == "out_of_stock":
        d["out_of_stock"] += 1
    elif mapped == "confirmed":
        d["confirmed"] += 1
        d["processed_orders"] += 1
        d["processed_revenue"] += amt
    elif mapped in ("delivered", "shipping"):
        d["confirmed"] += 1

print(f"{'Country':<15} {'Code':<4} {'Orders':<8} {'Revenue':<10} {'Confirmed':<10} {'Processed':<10} {'ProcRev':<10} {'Fees':<10} {'NetRev':<10}")
print("-" * 90)
for c, d in sorted(country_data.items(), key=lambda x: -x[1]["revenue"]):
    fee_per = COUNTRY_FEES.get(c, COUNTRY_FEES["DEFAULT"])
    fees = d["processed_orders"] * fee_per
    net = d["processed_revenue"] - fees
    print(f"{c:<15} {c:<4} {d['orders']:<8} {d['revenue']:<10,} {d['confirmed']:<10} {d['processed_orders']:<10} {d['processed_revenue']:<10,} {fees:<10,} {net:<10,}")

# ── 6. CONSISTENCY CHECKS ──────────────────────────────────────────
print("\n" + "=" * 70)
print("PHASE 6: CONSISTENCY CHECKS")
print("=" * 70)

# Total match
status_total = sum(mapped_counts.values())
print(f"\nSum of mapped statuses: {status_total} vs total orders: {len(all_raw)}")
print("PASS" if status_total == len(all_raw) else f"FAIL: delta={len(all_raw)-status_total}")

# Delivery rate
delivery_rate = mapped_counts.get("confirmed", 0) / len(all_raw) if len(all_raw) > 0 else 0
print(f"Delivery Rate: {delivery_rate:.4f} ({mapped_counts.get('confirmed', 0)}/{len(all_raw)})")

# Average values
avg_all = total_revenue / len(all_raw) if len(all_raw) > 0 else 0
avg_proc = confirmed_revenue / len(confirmed_orders) if len(confirmed_orders) > 0 else 0
print(f"Avg Order Value (all): {avg_all:,.0f} XOF")
print(f"Avg Order Value (processed): {avg_proc:,.0f} XOF")

# Unique products
unique_products = set()
for o in all_raw:
    for d in (o.get("details") or []):
        p = d.get("product") or {}
        if p.get("_id"):
            unique_products.add(p["_id"])
print(f"Unique products: {len(unique_products)}")

# ── 7. DATE RANGE FILTERS ──────────────────────────────────────────
print("\n" + "=" * 70)
print("PHASE 7: DATE FILTER TESTS")
print("=" * 70)

from datetime import datetime, timedelta, timezone

now = datetime.now(timezone.utc)
today_str = now.strftime("%Y-%m-%d")
yesterday_str = (now - timedelta(days=1)).strftime("%Y-%m-%d")
d7 = (now - timedelta(days=7)).isoformat()
d30 = (now - timedelta(days=30)).isoformat()
this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
this_year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

def filter_by_date(orders, mode):
    filtered = []
    for o in orders:
        d = o.get("date") or o.get("createdAt") or ""
        if not d:
            continue
        if mode == "today" and d.startswith(today_str): filtered.append(o)
        elif mode == "yesterday" and d.startswith(yesterday_str): filtered.append(o)
        elif mode == "7d" and d >= d7: filtered.append(o)
        elif mode == "30d" and d >= d30: filtered.append(o)
        elif mode == "thisMonth" and d >= this_month_start: filtered.append(o)
        elif mode == "thisYear" and d >= this_year_start: filtered.append(o)
        elif mode == "all": filtered.append(o)
    return filtered

print(f"\n{'Filter':<15} {'Orders':<8} {'Revenue':<12} {'Confirmed':<10} {'ConfRev':<12}")
print("-" * 60)
for mode in ["today", "yesterday", "7d", "30d", "thisMonth", "thisYear", "all"]:
    f = filter_by_date(all_raw, mode)
    p = [o for o in f if STATUS_MAP.get(o["status"]["name"], o["status"]["name"].lower()) == "confirmed"]
    rev = sum(o["totalPrice"] or 0 for o in f)
    prev = sum(o["totalPrice"] or 0 for o in p)
    print(f"{mode:<15} {len(f):<8} {rev:<12,} {len(p):<10} {prev:<12,}")

# ── 8. FINAL REPORT ────────────────────────────────────────────────
print("\n" + "=" * 70)
print("FINAL AUDIT TABLE")
print("=" * 70)

# Save to JSON
with open("audit_results.json", "w") as f:
    json.dump({
        "fetched": len(all_raw),
        "api_total": total_api,
        "raw_statuses": dict(raw_status_counts),
        "mapped": dict(mapped_counts),
        "confirmed_count": len(confirmed_orders),
        "confirmed_revenue": confirmed_revenue,
        "confirmed_plus_delivered": len(confirmed_plus_delivered_orders),
        "confirmed_plus_delivered_revenue": confirmed_plus_delivered_revenue,
        "gross_revenue": total_revenue,
        "service_fees": service_fees_total,
        "net_revenue": net_revenue,
        "delivery_rate": delivery_rate,
        "avg_order_value": avg_all,
        "unique_products": len(unique_products),
        "processed_by_country": dict(processed_by_country),
        "country_data": {k: dict(v) for k, v in country_data.items()},
        "page_sizes": page_sizes,
    }, f, indent=2, default=str)

print(f"\nTotal fetched: {len(all_raw)} / {total_api}")
print(f"Results saved to audit_results.json")
