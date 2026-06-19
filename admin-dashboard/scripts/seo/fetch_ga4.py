#!/usr/bin/env python3
"""Fetch GA4 organic landing-page metrics for openarabic.io (optional, secondary).

GSC tells you how people *found* the site; GA4 tells you what they *did next*.
Uses the same read-only service account as fetch_gsc.py via the Analytics Data API.

One-time setup (see README.md):
  1. Enable analyticsdata.googleapis.com (done).
  2. In GA4 -> Admin -> Property Access Management, add
     seo-reporter@openarabic.iam.gserviceaccount.com as a **Viewer**.
  3. Confirm the numeric property id (GA4 Admin -> Property details). Default below.

Usage:
  python fetch_ga4.py                 # last 28 days
  python fetch_ga4.py --days 90 --property 263660391
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
        "Missing deps. Install: .venv/bin/pip install google-api-python-client google-auth"
    )

SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"]
DEFAULT_KEY = os.path.expanduser(
    os.environ.get("GSC_SA_KEY", "~/.config/openarabic/gsc-sa.json")
)
DEFAULT_PROPERTY = os.environ.get("GA4_PROPERTY_ID", "263660391")

DIMENSIONS = ["landingPagePlusQueryString", "sessionDefaultChannelGroup"]
METRICS = ["sessions", "engagedSessions", "totalUsers", "conversions"]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Fetch GA4 landing-page metrics for openarabic.io")
    p.add_argument("--days", type=int, default=28)
    p.add_argument("--property", default=DEFAULT_PROPERTY, help="GA4 numeric property id")
    p.add_argument("--key", default=DEFAULT_KEY)
    p.add_argument("--limit", type=int, default=1000)
    p.add_argument("--outdir", default=str(Path(__file__).parent / "data"))
    p.add_argument("--top", type=int, default=15)
    return p.parse_args()


def main() -> int:
    args = parse_args()
    key_path = os.path.expanduser(args.key)
    if not os.path.exists(key_path):
        sys.exit(f"Service-account key not found: {key_path}")

    creds = service_account.Credentials.from_service_account_file(key_path, scopes=SCOPES)
    service = build("analyticsdata", "v1beta", credentials=creds, cache_discovery=False)

    end = dt.date.today().isoformat()
    start = (dt.date.today() - dt.timedelta(days=args.days)).isoformat()
    body = {
        "dateRanges": [{"startDate": start, "endDate": end}],
        "dimensions": [{"name": d} for d in DIMENSIONS],
        "metrics": [{"name": m} for m in METRICS],
        "limit": args.limit,
        "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
    }

    try:
        resp = (
            service.properties()
            .runReport(property=f"properties/{args.property}", body=body)
            .execute()
        )
    except HttpError as e:
        status = getattr(e, "status_code", None) or getattr(e.resp, "status", "?")
        print(f"API error {status}: {e}", file=sys.stderr)
        if str(status) in ("403", "401"):
            print(
                "\nAdd the SA as a GA4 Viewer: GA4 -> Admin -> Property Access Management ->\n"
                "  seo-reporter@openarabic.iam.gserviceaccount.com  (Viewer)\n"
                "and confirm the property id (--property).",
                file=sys.stderr,
            )
        return 1

    records = []
    for row in resp.get("rows", []):
        rec = {d: dv["value"] for d, dv in zip(DIMENSIONS, row.get("dimensionValues", []))}
        for m, mv in zip(METRICS, row.get("metricValues", [])):
            rec[m] = mv["value"]
        records.append(rec)

    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    header = DIMENSIONS + METRICS
    with (outdir / f"ga4_landing_{stamp}.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        w.writerows(records)
    (outdir / f"ga4_snapshot_{stamp}.json").write_text(
        json.dumps({"property": args.property, "start": start, "end": end, "rows": records},
                   ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"GA4 property {args.property}  {start} -> {end}  ({len(records)} rows)")
    for rec in records[: args.top]:
        lp = str(rec.get("landingPagePlusQueryString", ""))[:45].ljust(45)
        ch = str(rec.get("sessionDefaultChannelGroup", ""))[:14].ljust(14)
        print(f"  {lp} {ch} sessions={rec.get('sessions')} engaged={rec.get('engagedSessions')}")
    if not records:
        print("  (no rows yet — GA4 was set up today; data accrues going forward)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
