#!/usr/bin/env python3
"""Fetch Google Search Console search-analytics data for openarabic.io.

Authenticates with a read-only **service account** (IAM, no OAuth consent
screen) — this is what makes programmatic GSC access work here, since the shared
gcloud user-OAuth client is blocked from the `webmasters` sensitive scope.

One-time setup (see README.md):
  1. The `seo-reporter@openarabic.iam.gserviceaccount.com` service account and a
     JSON key already exist (key at ~/.config/openarabic/gsc-sa.json).
  2. In Search Console -> Settings -> Users and permissions, add that SA email as
     a user (Full). Without this the API returns 403.

Usage:
  python fetch_gsc.py                 # last 28 days, default property
  python fetch_gsc.py --days 90
  python fetch_gsc.py --start 2026-06-01 --end 2026-06-18

Writes timestamped CSV (one per dimension) + a combined JSON snapshot into
./data/ and prints the top rows. Re-run weekly; data fills in ~1-2 weeks after
property verification.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import os
import sys
from pathlib import Path

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
except ImportError:
    sys.exit(
        "Missing deps. Install with:\n"
        "  python3 -m venv .venv && .venv/bin/pip install google-api-python-client google-auth\n"
        "then run with .venv/bin/python fetch_gsc.py"
    )

SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]
DEFAULT_KEY = os.path.expanduser(
    os.environ.get("GSC_SA_KEY", "~/.config/openarabic/gsc-sa.json")
)
# URL-prefix property (verified via HTML tag). Trailing slash matters.
DEFAULT_SITE = os.environ.get("GSC_SITE_URL", "https://openarabic.io/")

# Each entry: (label, [dimensions]). query+page powers striking-distance analysis.
DIMENSION_SETS = [
    ("query", ["query"]),
    ("page", ["page"]),
    ("query_page", ["query", "page"]),
    ("date", ["date"]),
]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Fetch GSC search-analytics for openarabic.io")
    p.add_argument("--days", type=int, default=28, help="Lookback window in days (default 28)")
    p.add_argument("--start", help="Start date YYYY-MM-DD (overrides --days)")
    p.add_argument("--end", help="End date YYYY-MM-DD (default: today)")
    p.add_argument("--site", default=DEFAULT_SITE, help=f"Property siteUrl (default {DEFAULT_SITE})")
    p.add_argument("--key", default=DEFAULT_KEY, help="Service-account JSON key path")
    p.add_argument("--limit", type=int, default=1000, help="Max rows per dimension (default 1000)")
    p.add_argument("--outdir", default=str(Path(__file__).parent / "data"), help="Output directory")
    p.add_argument("--top", type=int, default=15, help="Rows to print per table (default 15)")
    return p.parse_args()


def date_range(args: argparse.Namespace) -> tuple[str, str]:
    end = args.end or dt.date.today().isoformat()
    if args.start:
        start = args.start
    else:
        end_d = dt.date.fromisoformat(end)
        start = (end_d - dt.timedelta(days=args.days)).isoformat()
    return start, end


def fetch(service, site: str, start: str, end: str, dims: list[str], limit: int) -> list[dict]:
    body = {
        "startDate": start,
        "endDate": end,
        "dimensions": dims,
        "rowLimit": limit,
        "dataState": "all",  # include freshest (not-yet-finalized) data
    }
    resp = service.searchanalytics().query(siteUrl=site, body=body).execute()
    return resp.get("rows", [])


def rows_to_records(rows: list[dict], dims: list[str]) -> list[dict]:
    out = []
    for r in rows:
        rec = {d: k for d, k in zip(dims, r.get("keys", []))}
        rec["clicks"] = r.get("clicks", 0)
        rec["impressions"] = r.get("impressions", 0)
        rec["ctr"] = round(r.get("ctr", 0.0), 4)
        rec["position"] = round(r.get("position", 0.0), 2)
        out.append(rec)
    return out


def write_csv(path: Path, records: list[dict], dims: list[str]) -> None:
    header = dims + ["clicks", "impressions", "ctr", "position"]
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        w.writerows(records)


def print_table(label: str, records: list[dict], dims: list[str], top: int) -> None:
    print(f"\n=== {label}  ({len(records)} rows) ===")
    if not records:
        print("  (no rows yet — GSC Performance data is empty or still populating)")
        return
    key_w = 60
    head = "  " + " ".join(d[:key_w].ljust(min(key_w, 28)) for d in dims)
    print(head + "  clicks  impr   ctr     pos")
    for rec in records[:top]:
        keys = " ".join(str(rec[d])[:28].ljust(28) for d in dims)
        print(
            f"  {keys}  {rec['clicks']:>5}  {rec['impressions']:>5}  "
            f"{rec['ctr']*100:>5.1f}%  {rec['position']:>5.1f}"
        )


def main() -> int:
    args = parse_args()
    key_path = os.path.expanduser(args.key)
    if not os.path.exists(key_path):
        sys.exit(f"Service-account key not found: {key_path}\nSet GSC_SA_KEY or pass --key.")

    creds = service_account.Credentials.from_service_account_file(key_path, scopes=SCOPES)
    service = build("searchconsole", "v1", credentials=creds, cache_discovery=False)

    start, end = date_range(args)
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")

    print(f"Property : {args.site}")
    print(f"Range    : {start} -> {end}")
    print(f"Output   : {outdir}")

    snapshot: dict[str, object] = {
        "site": args.site,
        "start": start,
        "end": end,
        "fetched_at": stamp,
        "tables": {},
    }
    total_rows = 0
    try:
        for label, dims in DIMENSION_SETS:
            rows = fetch(service, args.site, start, end, dims, args.limit)
            records = rows_to_records(rows, dims)
            total_rows += len(records)
            write_csv(outdir / f"gsc_{label}_{stamp}.csv", records, dims)
            snapshot["tables"][label] = records
            print_table(label, records, dims, args.top)
    except HttpError as e:
        status = getattr(e, "status_code", None) or getattr(e.resp, "status", "?")
        print(f"\nAPI error {status}: {e}", file=sys.stderr)
        if str(status) == "403":
            print(
                "\n403 = the service account isn't a user on this property yet.\n"
                "Fix: Search Console -> Settings -> Users and permissions -> Add user ->\n"
                "     seo-reporter@openarabic.iam.gserviceaccount.com  (Full)\n"
                "then re-run.",
                file=sys.stderr,
            )
        return 1

    (outdir / f"gsc_snapshot_{stamp}.json").write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\nSaved snapshot: gsc_snapshot_{stamp}.json  ({total_rows} total rows)")
    if total_rows == 0:
        print(
            "\n0 rows across all tables. Expected right after verification — Google needs\n"
            "~3-14 days to populate Performance data. Re-run weekly from ~2026-07-03."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
