#!/usr/bin/env python3
"""
Import volume1.xlsx into Supabase transactions table.

IMPORTANT: Run supabase/migration_v2.sql in the Supabase SQL Editor first:
  https://supabase.com/dashboard/project/vhmwvxetvagphkiohdpc/sql

Entries with missing date, category, or amount are imported with null values
and marked flagged=True so the user can complete them in the app.
"""

import openpyxl
import requests
import sys
from datetime import datetime
from collections import Counter

SUPABASE_URL = "https://vhmwvxetvagphkiohdpc.supabase.co"
SUPABASE_KEY = "sb_publishable_nP4VYPFYIOsnjokv22xdiA_DTWmHgPt"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


def check_migration():
    """Verify the flagged column exists before proceeding."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/transactions?select=flagged&limit=1",
        headers=HEADERS,
    )
    if resp.status_code == 400 and "flagged" in resp.text:
        print("ERROR: The 'flagged' column is missing.")
        print("Please run supabase/migration_v2.sql in the Supabase SQL Editor first.")
        print(f"  https://supabase.com/dashboard/project/vhmwvxetvagphkiohdpc/sql")
        sys.exit(1)


def parse_amount(val):
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val) if float(val) > 0 else None
    clean = str(val).replace("Rs", "").replace(",", "").strip()
    try:
        v = float(clean)
        return v if v > 0 else None
    except ValueError:
        return None


def infer_cost_cat(desc):
    d = desc.lower()
    if any(k in d for k in ["packag", "box", "sticker", "butter paper", "neck tag", "tag", "builty", "bag"]):
        return "Packaging"
    if any(k in d for k in ["stich", "embroi", "punch", "master", "callend", "tarpai", "overlock",
                              "patcher", "dyer", "dying", "silk dying", "fusing", "sampl", "setting",
                              "layout", "sketch"]):
        return "Production"
    return "Raw Materials"


def infer_expense_cat(desc):
    d = desc.lower()
    if any(k in d for k in ["salary", "saman", "mahnoor", "hafta", "cleaner", "worker"]):
        return "Wages"
    if any(k in d for k in ["rent", "rental", "security payment", "real estate", "workspace", "godam"]):
        return "Rent"
    if any(k in d for k in ["electric", "water bill", "water charge", "utility", "utilities"]):
        return "Utilities"
    if any(k in d for k in ["shopify", "domain", "cloud", "open ai", "google", "payfast", "website", "developer"]):
        return "Software/SaaS"
    if any(k in d for k in ["ads", "ad ", "marketing", "retainer", "pr ", "photog", "model", "influenc",
                              "flyer", "makeup", "stylist", "sylist", "videog", "food for shoot"]):
        return "Marketing"
    return "Other"


COST_CLUES = [
    "fabric", "organza", "chiffon", "marina", "khadder", "viscose", "cotton", "silk",
    "dying", "dyer", "embroi", "lace", "thread", "stich", "master", "callend",
    "packag", "tag", "tarpai", "overlock", "dupatta", "fusing", "sampl", "production setting",
    "layout", "sketch", "punching", "loading charge",
]


def map_row(row, last_date):
    date_raw, category, description, income, expense = row

    # Completely empty row — skip entirely
    if not description and income is None and expense is None and not category:
        return None, last_date

    flagged = False

    # Date
    if isinstance(date_raw, datetime):
        date_str = date_raw.strftime("%Y-%m-%d")
        last_date = date_str
    else:
        date_str = last_date  # carry forward last known date
        if date_raw is None:
            flagged = True  # date was missing in source

    # Description
    desc = str(description or "").strip() or None
    if not desc:
        flagged = True

    # Category presence check (before inference)
    cat_missing = not category or str(category).strip() == ""
    if cat_missing:
        flagged = True

    cat = str(category or "").strip().lower()

    # Amount
    income_val = parse_amount(income)
    expense_val = parse_amount(expense)

    # Income row
    if income_val:
        return {
            "date": date_str,
            "type": "sale",
            "category": "Investment",
            "amount": income_val,
            "description": desc or "Investment",
            "flagged": flagged,
        }, last_date

    # No amount at all → import with nulls, fully flagged
    if not expense_val:
        return {
            "date": date_str,
            "type": None,
            "category": None,
            "amount": None,
            "description": desc,
            "flagged": True,
        }, last_date

    # Expense row — infer type and category
    if cat in ("procurement", "production"):
        tx_type, tx_cat = "cost", infer_cost_cat(desc or "")
    elif "human resource" in cat:
        tx_type, tx_cat = "expense", "Wages"
    elif cat == "marketing":
        tx_type, tx_cat = "expense", "Marketing"
    elif cat == "development":
        tx_type, tx_cat = "expense", "Software/SaaS"
    elif cat in ("general", "meetings"):
        tx_type, tx_cat = "expense", infer_expense_cat(desc or "")
    elif not cat:
        d = (desc or "").lower()
        if any(k in d for k in COST_CLUES):
            tx_type, tx_cat = "cost", infer_cost_cat(desc or "")
        else:
            tx_type, tx_cat = "expense", infer_expense_cat(desc or "")
    else:
        tx_type, tx_cat = "expense", "Other"

    return {
        "date": date_str,
        "type": tx_type,
        "category": tx_cat,
        "amount": expense_val,
        "description": desc or "Unknown",
        "flagged": flagged,
    }, last_date


def main():
    check_migration()

    wb = openpyxl.load_workbook("volume1.xlsx")
    ws = wb["Sheet1"]
    all_rows = list(ws.iter_rows(values_only=True))[1:]

    records, last_date = [], None
    skipped = 0
    for row in all_rows:
        rec, last_date = map_row(row, last_date)
        if rec is not None:
            records.append(rec)
        else:
            skipped += 1

    flagged_count = sum(1 for r in records if r["flagged"])
    print(f"Parsed {len(records)} records  |  skipped {skipped} (completely empty)  |  flagged {flagged_count} (incomplete)\n")

    print("Type breakdown:")
    for t, n in Counter(str(r["type"]) for r in records).items():
        print(f"  {t}: {n}")

    print("\nFlagged entries (need user completion):")
    for r in records:
        if r["flagged"]:
            missing = []
            if not r.get("date"):     missing.append("date")
            if not r.get("category"): missing.append("category")
            if not r.get("amount"):   missing.append("amount")
            print(f"  [{','.join(missing) or 'inferred date/category'}]  {r['description'][:60]}")

    # Check existing records
    count_resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/transactions?select=id",
        headers={**HEADERS, "Prefer": "count=exact"},
    )
    existing = int(count_resp.headers.get("content-range", "0/0").split("/")[-1])

    print(f"\nExisting records in database: {existing}")
    if existing > 0:
        clear = input("Clear existing records before importing? [y/N] ").strip().lower()
        if clear == "y":
            del_resp = requests.delete(
                f"{SUPABASE_URL}/rest/v1/transactions?id=neq.00000000-0000-0000-0000-000000000000",
                headers=HEADERS,
            )
            if del_resp.status_code in (200, 204):
                print(f"  ✓ Cleared {existing} existing records")
            else:
                print(f"  ✗ Clear failed: {del_resp.status_code} — {del_resp.text[:200]}")
                return

    confirm = input(f"\nInsert {len(records)} records ({flagged_count} flagged)? [y/N] ").strip().lower()
    if confirm != "y":
        print("Aborted.")
        return

    inserted = errors = 0
    for i in range(0, len(records), 50):
        chunk = records[i:i + 50]
        resp = requests.post(f"{SUPABASE_URL}/rest/v1/transactions", headers=HEADERS, json=chunk)
        if resp.status_code in (200, 201):
            inserted += len(chunk)
            print(f"  ✓ Chunk {i // 50 + 1}: {len(chunk)} rows")
        else:
            errors += len(chunk)
            print(f"  ✗ Chunk {i // 50 + 1} FAILED: {resp.status_code} — {resp.text[:300]}")

    print(f"\nDone. {inserted} inserted ({flagged_count} flagged), {errors} failed.")
    print("Open the Transactions page in the app to complete flagged entries.")


if __name__ == "__main__":
    main()
