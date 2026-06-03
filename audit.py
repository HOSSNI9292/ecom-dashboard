"""
Full audit: fetch ALL orders from CodinAfrica API (all pages), compute metrics, compare with dashboard.
"""
import json, time, urllib.request, ssl
from collections import Counter, defaultdict

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NWYxYzg1MTBiNTg2MjBhMmJjZmZiZTgiLCJlbWFpbCI6ImFybWFzaG9wNjlAZ21haWwuY29tIiwiaWF0IjoxNzgwMDA1NTYyLCJleHAiOjE3ODA2MTAzNjJ9.aKPcUtTqHbXQhWuaJmGuNfr9otkBePtomtfv5gU9pXU"
BASE = "https://api.codinafrica.com/api"

ctx = ssl.create_default_context()

def api_get(path):
    req = urllib.request.Request(f"{BASE}{path}", headers={"X-Auth-Token": TOKEN})
    with urllib.request.urlopen(req, context=ctx, timeout=30) as r:
        return json.loads(r.read())

# ── 1. FETCH ALL ORDERS ──────────────────────────────────────────────
print("=" * 70)
print("PHASE 1: FETCH ALL PAGES")
print("=" * 70)

first = api_get("/orders/search?limit=1000&page=1")
total_api = first["content"]["total"]
last_page = first["content"]["last_page"]
per_page = first["content"]["per_page"]
print(f"API reports: total={total_api}, per_page={per_page}, last_page={last_page}")

all_raw = list(first["content"]["results"])
print(f"Page 1: {len(all_raw)} orders")

pages_to_fetch = list(range(2, last_page + 1))
print(f"Fetching remaining {len(pages_to_fetch)} pages...")

for p in pages_to_fetch:
    try:
        data = api_get(f"/orders/search?limit=1000&page={p}")
        orders = data["content"]["results"]
        all_raw.extend(orders)
        print(f"  Page {p}/{last_page}: +{len(orders)} (total: {len(all_raw)})")
    except Exception as e:
        print(f"  Page {p}: ERROR {e}")
    time.sleep(0.05)  # small delay to be respectful

print(f"\nTotal fetched: {len(all_raw)}")
assert len(all_raw) == total_api, f"MISMATCH: fetched {len(all_raw)} but API says {total_api}"
print("PASS: All orders fetched, total matches API.")

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
print("PHASE 3: STATUS MAP (raw → mapped)")
print("=" * 70)

# This mirrors the dashboard's STATUS_MAP in constants.ts
STATUS_MAP = {
    "Pending": "pending",
    "pending": "pending",
    "Confirmed": "confirmed",
    "confirmed": "confirmed",
    "Processed": "confirmed",
    "processed": "confirmed",
    "Payé": "confirmed",
    "payé": "confirmed",
    "PAYÉ": "confirmed",
    "Paye": "confirmed",
    "paye": "confirmed",
    "Cancelled": "cancelled",
    "cancelled": "cancelled",
    "Double": "double",
    "double": "double",
    "OutOfStock": "out_of_stock",
    "Out of Stock": "out_of_stock",
    "A transférer": "transferred",
    "A transferer": "transferred",
    "Transferred": "transferred",
    "Delivered": "delivered",
    "delivered": "delivered",
    "Shipping": "shipping",
}

mapped_counts = Counter()
unmapped = []
for o in all_raw:
    name = o["status"]["name"]
    mapped = STATUS_MAP.get(name, name.lower())
    if mapped == name.lower() and name not in STATUS_MAP:
        unmapped.append(name)
    mapped_counts[mapped] += 1

print(f"\n{'Mapped Status':<20} {'Count':<8}")
print("-" * 28)
for s, c in sorted(mapped_counts.items(), key=lambda x: -x[1]):
    print(f"{s:<20} {c:<8}")

if unmapped:
    print(f"\nUNMAPPED STATUSES ({len(set(unmapped))} unique):")
    for u in sorted(set(unmapped)):
        print(f"  '{u}' → '{u.lower()}' (auto-lowered)")
else:
    print("\nNo unmapped statuses — all statuses have explicit mappings.")

# ── 4. REVENUE ANALYSIS ──────────────────────────────────────────────
print("\n" + "=" * 70)
print("PHASE 4: REVENUE ANALYSIS")
print("=" * 70)

# Fees per country (from fees.ts)
COUNTRY_FEES = {
    "GA": 6500,  # Gabon
    "CG": 5000,  # Congo
    "CI": 5000,  # Côte d'Ivoire
    "ML": 5000,  # Mali
    "BF": 5000,  # Burkina Faso
    "DEFAULT": 5000,
}

total_revenue = sum(o["totalPrice"] or 0 for o in all_raw)
print(f"\nGross Revenue (all orders):        {total_revenue:>12,.0f} XOF")

# Processed orders = mapped to "confirmed"
processed_orders = [o for o in all_raw if STATUS_MAP.get(o["status"]["name"], o["status"]["name"].lower()) == "confirmed"]
processed_revenue = sum(o["totalPrice"] or 0 for o in processed_orders)
print(f"Processed Orders:                  {len(processed_orders):>12}")
print(f"Processed Revenue (confirmed only): {processed_revenue:>12,.0f} XOF")

# Service fees
processed_by_country = Counter()
for o in processed_orders:
    country = o["customer"]["country"] or "XX"
    processed_by_country[country] += 1

print(f"\nProcessed orders by country:")
service_fees_total = 0
print(f"{'Country':<10} {'Count':<8} {'Fee/Order':<10} {'Total Fee':<12}")
print("-" * 42)
for c, cnt in sorted(processed_by_country.items(), key=lambda x: -x[1]):
    fee = COUNTRY_FEES.get(c, COUNTRY_FEES["DEFAULT"])
    total_fee = cnt * fee
    service_fees_total += total_fee
    print(f"{c:<10} {cnt:<8} {fee:<10,} {total_fee:<12,}")
print(f"{'TOTAL':<10} {sum(processed_by_country.values()):<8} {'':<10} {service_fees_total:<12,}")

net_revenue = processed_revenue - service_fees_total
print(f"\nNet Revenue:                       {net_revenue:>12,.0f} XOF")
print(f"  = Processed Revenue ({processed_revenue:,.0f}) - Service Fees ({service_fees_total:,.0f})")

# ── 5. COUNTRY ANALYSIS ──────────────────────────────────────────────
print("\n" + "=" * 70)
print("PHASE 5: COUNTRY ANALYTICS")
print("=" * 70)

COUNTRY_NAMES = {
    "GA": "Gabon", "CG": "Congo", "CI": "Côte d'Ivoire",
    "ML": "Mali", "BF": "Burkina Faso", "SN": "Senegal",
    "MA": "Morocco", "DZ": "Algeria", "TN": "Tunisia",
    "GN": "Guinea", "TG": "Togo", "BJ": "Benin",
    "NE": "Niger", "CM": "Cameroon", "CD": "DRC",
}

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
    elif mapped == "delivered" or mapped == "shipping":
        d["confirmed"] += 1  # delivered/shipping counted in confirmed

print(f"\n{'Country':<15} {'Code':<4} {'Orders':<8} {'Revenue':<12} {'Confirmed':<10} {'Processed':<10} {'ProcRev':<12} {'Fees':<10} {'NetRev':<12}")
print("-" * 95)
for c, d in sorted(country_data.items(), key=lambda x: -x[1]["revenue"]):
    fee_per = COUNTRY_FEES.get(c, COUNTRY_FEES["DEFAULT"])
    fees = d["processed_orders"] * fee_per
    net = d["processed_revenue"] - fees
    name = COUNTRY_NAMES.get(c, c)
    print(f"{name:<15} {c:<4} {d['orders']:<8} {d['revenue']:<12,} {d['confirmed']:<10} {d['processed_orders']:<10} {d['processed_revenue']:<12,} {fees:<10,} {net:<12,}")

# ── 6. CHECK STATUS_COUNTS CONSISTENCY ──────────────────────────────
print("\n" + "=" * 70)
print("PHASE 6: CONSISTENCY CHECKS")
print("=" * 70)

# 6a. STATUS_MAP vs dashboard computeStats
# The dashboard computeStats does:
#   confirmed = confirmed || delivered || shipping  (line 302)
#   processedOrders = confirmed only  (line 313)
#   confirmedOrders = confirmed || delivered || shipping  (line 314)
confirmed_plus_delivered = mapped_counts.get("confirmed", 0) + mapped_counts.get("delivered", 0) + mapped_counts.get("shipping", 0)
print(f"\nDashboard 'confirmedOrders' (confirmed+delivered+shipping): {confirmed_plus_delivered}")
print(f"Dashboard 'processedOrders' (confirmed only):              {mapped_counts.get('confirmed', 0)}")

# 6b. Check that total matches
status_total = sum(mapped_counts.values())
print(f"\nSum of mapped statuses: {status_total}")
print(f"Total orders:           {len(all_raw)}")
if status_total == len(all_raw):
    print("PASS: All orders accounted for in mapped statuses.")
else:
    print(f"FAIL: Missing {len(all_raw) - status_total} orders")

# 6c. Delivery Rate
delivery_rate_raw = mapped_counts.get("confirmed", 0) / len(all_raw) if len(all_raw) > 0 else 0
print(f"\nDelivery Rate (processed/total): {delivery_rate_raw:.4f} ({mapped_counts.get('confirmed', 0)}/{len(all_raw)})")

# 6d. Average Order Value
avg_all = total_revenue / len(all_raw) if len(all_raw) > 0 else 0
avg_processed = processed_revenue / len(processed_orders) if len(processed_orders) > 0 else 0
print(f"\nAverage Order Value (all):     {avg_all:>10,.0f} XOF")
print(f"Average Order Value (processed): {avg_processed:>10,.0f} XOF")

# ── 7. DATE RANGE FILTER TESTS ──────────────────────────────────────
print("\n" + "=" * 70)
print("PHASE 7: DATE FILTER TESTS")
print("=" * 70)

from datetime import datetime, timedelta, timezone

now = datetime.now(timezone.utc)
today_str = now.strftime("%Y-%m-%d")
yesterday_str = (now - timedelta(days=1)).strftime("%Y-%m-%d")
d7_str = (now - timedelta(days=7)).isoformat()
d30_str = (now - timedelta(days=30)).isoformat()
this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
this_year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

def filter_by_date(orders, mode):
    filtered = []
    for o in orders:
        d = o.get("date") or o.get("createdAt") or ""
        if not d:
            continue
        if mode == "today" and d.startswith(today_str):
            filtered.append(o)
        elif mode == "yesterday" and d.startswith(yesterday_str):
            filtered.append(o)
        elif mode == "7d" and d >= d7_str:
            filtered.append(o)
        elif mode == "30d" and d >= d30_str:
            filtered.append(o)
        elif mode == "thisMonth" and d >= this_month_start:
            filtered.append(o)
        elif mode == "thisYear" and d >= this_year_start:
            filtered.append(o)
        elif mode == "all":
            filtered.append(o)
    return filtered

print(f"\n{'Filter':<15} {'Orders':<8} {'Revenue':<12} {'Processed':<10} {'ProcRev':<12}")
print("-" * 60)
for mode in ["today", "yesterday", "7d", "30d", "thisMonth", "thisYear", "all"]:
    f = filter_by_date(all_raw, mode)
    p = [o for o in f if STATUS_MAP.get(o["status"]["name"], o["status"]["name"].lower()) == "confirmed"]
    rev = sum(o["totalPrice"] or 0 for o in f)
    prev = sum(o["totalPrice"] or 0 for o in p)
    print(f"{mode:<15} {len(f):<8} {rev:<12,} {len(p):<10} {prev:<12,}")

# ── 8. PRODUCT ANALYSIS ──────────────────────────────────────────────
print("\n" + "=" * 70)
print("PHASE 8: PRODUCT ANALYSIS (TOP 20 BY REVENUE)")
print("=" * 70)

products = defaultdict(lambda: {"totalSold": 0, "revenue": 0, "qty": 0})
for o in all_raw:
    details = o.get("details") or []
    for d in details:
        p = d.get("product") or {}
        pid = p.get("_id") or d.get("_id") or "unknown"
        name = d.get("name") or p.get("name") or "Unknown"
        qty = d.get("quantity") or 1
        unit_price = d.get("unitPrice") or 0
        rev = unit_price * qty
        products[pid]["name"] = name
        products[pid]["totalSold"] += qty
        products[pid]["revenue"] += rev

print(f"\n{'Product':<30} {'Sold':<8} {'Revenue':<12}")
print("-" * 50)
for pid, data in sorted(products.items(), key=lambda x: -x[1]["revenue"])[:20]:
    print(f"{data['name'][:28]:<30} {data['totalSold']:<8} {data['revenue']:<12,.0f}")

# ── 9. SUMMARY ──────────────────────────────────────────────────────
print("\n" + "=" * 70)
print("FINAL AUDIT SUMMARY")
print("=" * 70)

print(f"""
{'Metric':<35} {'Value':<20}
{'-'*55}
{'Total Orders (API)':<35} {total_api:<20,}
{'Total Orders (Fetched)':<35} {len(all_raw):<20,}
{'Pending Orders':<35} {raw_status_counts.get('Pending', 0):<20,}
{'Confirmed Orders (raw)':<35} {raw_status_counts.get('Confirmed', 0):<20,}
{'Cancelled Orders':<35} {raw_status_counts.get('Cancelled', 0):<20,}
{'Double Orders':<35} {raw_status_counts.get('Double', 0):<20,}
{'Out Of Stock Orders':<35} {raw_status_counts.get('OutOfStock', 0):<20,}
{'Transferred (A transférer)':<35} {raw_status_counts.get('A transférer', 0):<20,}
{'MAPPED - pending':<35} {mapped_counts.get('pending', 0):<20,}
{'MAPPED - confirmed':<35} {mapped_counts.get('confirmed', 0):<20,}
{'MAPPED - cancelled':<35} {mapped_counts.get('cancelled', 0):<20,}
{'MAPPED - double':<35} {mapped_counts.get('double', 0):<20,}
{'MAPPED - out_of_stock':<35} {mapped_counts.get('out_of_stock', 0):<20,}
{'MAPPED - transferred':<35} {mapped_counts.get('transferred', 0):<20,}
{'MAPPED - delivered':<35} {mapped_counts.get('delivered', 0):<20,}
{'MAPPED - shipping':<35} {mapped_counts.get('shipping', 0):<20,}
{'Processed Orders (confirmed)':<35} {mapped_counts.get('confirmed', 0):<20,}
{'Processed Revenue':<35} {processed_revenue:<20,.0f}
{'Service Fees':<35} {service_fees_total:<20,.0f}
{'Net Revenue':<35} {net_revenue:<20,.0f}
{'Gross Revenue (all orders)':<35} {total_revenue:<20,.0f}
{'Delivery Rate':<35} {delivery_rate_raw:<20.4f}
""")

# Save raw data for further analysis
print("Saving raw audit data to audit_results.json...")
with open("audit_results.json", "w") as f:
    json.dump({
        "total_orders": len(all_raw),
        "api_total": total_api,
        "raw_status_counts": dict(raw_status_counts),
        "mapped_counts": dict(mapped_counts),
        "processed_orders": len(processed_orders),
        "processed_revenue": processed_revenue,
        "gross_revenue": total_revenue,
        "service_fees": service_fees_total,
        "net_revenue": net_revenue,
        "delivery_rate": delivery_rate_raw,
        "country_data": {k: dict(v) for k, v in country_data.items()},
        "processed_by_country": dict(processed_by_country),
        "date_filters": {}
    }, f, indent=2, default=str)
print("Done!")
