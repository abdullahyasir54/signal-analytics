#!/usr/bin/env python3
"""
Direct import of volume1.xlsx — works with the current schema.
No migration required. Run from the project root:
  python3 scripts/import-now.py

Rows 223/224 (no amount in Excel) are imported with amount=1 as a placeholder.
Run supabase/migration_v2.sql later for full null-field and flagging support.
"""

import openpyxl, requests, sys
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

    # Completely blank row — nothing to import
    if not description and income is None and expense is None and not category:
        return None, last_date

    # Date
    if isinstance(date_raw, datetime):
        date_str = date_raw.strftime("%Y-%m-%d")
        last_date = date_str
    else:
        date_str = last_date or "2025-01-01"

    desc = str(description or "").strip() or "Unknown"
    cat = str(category or "").strip().lower()

    income_val = parse_amount(income)
    expense_val = parse_amount(expense)

    # Income row
    if income_val:
        return {"date": date_str, "type": "sale", "category": "Investment",
                "amount": income_val, "description": desc}, last_date

    # Expense row
    if expense_val:
        if cat in ("procurement", "production"):
            tx_type, tx_cat = "cost", infer_cost_cat(desc)
        elif "human resource" in cat:
            tx_type, tx_cat = "expense", "Wages"
        elif cat == "marketing":
            tx_type, tx_cat = "expense", "Marketing"
        elif cat == "development":
            tx_type, tx_cat = "expense", "Software/SaaS"
        elif cat in ("general", "meetings"):
            tx_type, tx_cat = "expense", infer_expense_cat(desc)
        elif not cat:
            d = desc.lower()
            if any(k in d for k in COST_CLUES):
                tx_type, tx_cat = "cost", infer_cost_cat(desc)
            else:
                tx_type, tx_cat = "expense", infer_expense_cat(desc)
        else:
            tx_type, tx_cat = "expense", "Other"

        return {"date": date_str, "type": tx_type, "category": tx_cat,
                "amount": expense_val, "description": desc}, last_date

    # No amount — import with placeholder so no row is skipped
    d = desc.lower()
    if any(k in d for k in COST_CLUES):
        tx_type, tx_cat = "cost", infer_cost_cat(desc)
    else:
        tx_type, tx_cat = "expense", infer_expense_cat(desc)

    return {"date": date_str, "type": tx_type, "category": tx_cat,
            "amount": 1, "description": f"[AMOUNT MISSING] {desc}"}, last_date


def main():
    wb = openpyxl.load_workbook("volume1.xlsx")
    ws = wb["Sheet1"]
    all_rows = list(ws.iter_rows(values_only=True))[1:]

    records, last_date, skipped = [], None, 0
    for row in all_rows:
        rec, last_date = map_row(row, last_date)
        if rec is not None:
            records.append(rec)
        else:
            skipped += 1

    placeholder_rows = [r for r in records if r["description"].startswith("[AMOUNT MISSING]")]
    print(f"Ready to import: {len(records)} records  |  skipped: {skipped} (blank)  |  placeholder amounts: {len(placeholder_rows)}")
    if placeholder_rows:
        print("\nRows with no amount in Excel (imported with Rs 1 placeholder — edit to fix):")
        for r in placeholder_rows:
            print(f"  {r['description']}")

    # Check / clear existing
    cr = requests.get(f"{SUPABASE_URL}/rest/v1/transactions?select=id",
                      headers={**HEADERS, "Prefer": "count=exact"})
    existing = int(cr.headers.get("content-range", "0/0").split("/")[-1])
    print(f"\nExisting records in DB: {existing}")

    if existing > 0:
        ans = input("Clear existing records before importing? [y/N] ").strip().lower()
        if ans == "y":
            dr = requests.delete(
                f"{SUPABASE_URL}/rest/v1/transactions?id=neq.00000000-0000-0000-0000-000000000000",
                headers=HEADERS)
            print(f"  {'✓ Cleared' if dr.status_code in (200,204) else '✗ Clear failed: ' + str(dr.status_code)}")
        else:
            print("Keeping existing records.")

    ans = input(f"\nInsert {len(records)} records? [y/N] ").strip().lower()
    if ans != "y":
        print("Aborted.")
        return

    inserted = errors = 0
    for i in range(0, len(records), 50):
        chunk = records[i:i + 50]
        resp = requests.post(f"{SUPABASE_URL}/rest/v1/transactions", headers=HEADERS, json=chunk)
        if resp.status_code in (200, 201):
            inserted += len(chunk)
            print(f"  ✓ Chunk {i//50+1}: {len(chunk)} rows")
        else:
            errors += len(chunk)
            print(f"  ✗ Chunk {i//50+1} FAILED: {resp.status_code} — {resp.text[:300]}")

    print(f"\nDone. {inserted} inserted, {errors} failed.")
    if placeholder_rows:
        print(f"\n{len(placeholder_rows)} rows imported with Rs 1 placeholder.")
        print("Edit them in the Transactions page to add the real amounts.")


if __name__ == "__main__":
    main()
