#!/usr/bin/env python3
"""
Extract food composition tables from IFCT.pdf into raw JSON.
Primary: text-line parsing (IFCT PDF table boundaries are unreliable in pdfplumber).
Secondary: pdfplumber table strategies + raw CSV export.

Usage:
  python scripts/ifct/extract_ifct.py
  python scripts/ifct/extract_ifct.py --diagnose
  python scripts/ifct/extract_ifct.py --start-page 41 --end-page 60
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from ifct_common import (
    SOURCE_ATTRIBUTION,
    RAW_DIR,
    DATA_DIR,
    ensure_dirs,
    find_pdf,
    save_json,
    detect_table_number,
    TABLE_TITLES,
)
from ifct_parse import (
    FOOD_CODE_RE,
    extract_records_from_page_text,
    score_table,
    TABLE_SETTINGS_LIST,
    row_plausible,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("extract_ifct")

DEBUG_DIR = DATA_DIR / "debug"
RAW_TABLES_DIR = RAW_DIR / "tables"
ERRORS_PATH = DATA_DIR / "extraction_errors.csv"

KEYWORD_SCAN = [
    "Table",
    "Food",
    "Moisture",
    "Protein",
    "Energy",
    "Cereals",
    "Food Name",
    "Fish Name",
    "WATER",
    "PROTCNT",
]

FOOD_INDICATORS = [
    "food name",
    "fish name",
    "food code",
    "moisture",
    "protein",
    "energy",
    "water",
    "protcnt",
    "thiamine",
    "vitamin",
    "calcium",
    "iron",
    "cereal",
    "pulse",
]


def try_import_pdfplumber():
    try:
        import pdfplumber
        return pdfplumber
    except ImportError:
        log.error("pdfplumber not installed. Run: pip install -r scripts/ifct/requirements.txt")
        sys.exit(1)


def page_is_candidate(text: str) -> bool:
    t = text.lower()
    if re.search(r"^[A-Z]\d{3,4}\s", text, re.M):
        return True
    hits = sum(1 for k in FOOD_INDICATORS if k in t)
    return hits >= 2


def extract_tables_with_strategies(page, page_num: int) -> tuple[list[list], str, list]:
    """Try multiple pdfplumber strategies; return best rows, strategy name, all attempts."""
    pdfplumber = try_import_pdfplumber()
    attempts: list[dict] = []
    best_rows: list[list] = []
    best_name = "none"
    best_score = 0

    for idx, settings in enumerate(TABLE_SETTINGS_LIST):
        name = json.dumps(settings, sort_keys=True) if settings else "default"
        try:
            if settings:
                tables = page.extract_tables(table_settings=settings) or []
            else:
                tables = page.extract_tables() or []
        except Exception as e:
            attempts.append({"strategy": name, "error": str(e), "tables": 0})
            continue

        all_rows: list[list] = []
        for tbl in tables:
            if tbl:
                all_rows.extend(tbl)
        sc = score_table(all_rows)
        attempts.append({"strategy": name, "tables": len(tables), "rows": len(all_rows), "score": sc})
        if sc > best_score:
            best_score = sc
            best_rows = all_rows
            best_name = name

    return best_rows, best_name, attempts


def save_raw_table_csv(page_num: int, t_idx: int, rows: list[list]) -> None:
    RAW_TABLES_DIR.mkdir(parents=True, exist_ok=True)
    path = RAW_TABLES_DIR / f"page_{page_num:04d}_table_{t_idx}.csv"
    if not rows:
        return
    max_cols = max(len(r) for r in rows)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        for row in rows:
            padded = [(str(c or "").replace("\n", " ")) for c in row] + [""] * (max_cols - len(row))
            w.writerow(padded[:max_cols])


def parse_page(
    page,
    page_num: int,
    *,
    current_table: int | None,
    export_raw_tables: bool = True,
) -> tuple[list[dict], list[dict], int | None, dict]:
    """Returns records, errors, updated table num, page meta."""
    text = page.extract_text() or ""
    table_num = detect_table_number(text) or current_table
    meta: dict[str, Any] = {
        "page": page_num,
        "text_len": len(text),
        "candidate": page_is_candidate(text),
    }

    records, header_sig = extract_records_from_page_text(text, page_num, current_table=table_num)
    meta["text_records"] = len(records)
    meta["header_sig"] = header_sig

    errors: list[dict] = []

    if export_raw_tables:
        pdfplumber = try_import_pdfplumber()
        try:
            tables = page.extract_tables() or []
            for ti, tbl in enumerate(tables):
                if tbl and row_plausible(tbl[0] if tbl else []):
                    save_raw_table_csv(page_num, ti, tbl)
            meta["default_tables"] = len(tables)
        except Exception as e:
            errors.append({"page": page_num, "error": f"raw_table_export:{e}", "source": SOURCE_ATTRIBUTION})

    best_rows, strategy, attempts = extract_tables_with_strategies(page, page_num)
    meta["best_strategy"] = strategy
    meta["strategy_attempts"] = attempts
    if export_raw_tables and best_rows:
        save_raw_table_csv(page_num, 99, best_rows)

    return records, errors, table_num, meta


def run_extraction(
    pdf_path: Path,
    *,
    start_page: int = 1,
    end_page: int | None = None,
    page_list: list[int] | None = None,
    export_raw_tables: bool = True,
) -> tuple[list[dict], list[dict], list[dict]]:
    pdfplumber = try_import_pdfplumber()
    all_records: list[dict] = []
    all_errors: list[dict] = []
    page_meta: list[dict] = []
    current_table: int | None = None

    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        if page_list:
            pages_to_run = [p for p in page_list if 1 <= p <= total]
        else:
            end = end_page or total
            pages_to_run = list(range(start_page, end + 1))

        log.info("Processing %s pages (%s-%s) from %s", len(pages_to_run), pages_to_run[0], pages_to_run[-1], pdf_path)

        for page_num in pages_to_run:
            page = pdf.pages[page_num - 1]
            recs, errs, current_table, meta = parse_page(
                page,
                page_num,
                current_table=current_table,
                export_raw_tables=export_raw_tables,
            )
            all_records.extend(recs)
            all_errors.extend(errs)
            page_meta.append(meta)
            if recs:
                log.debug("Page %s: %s records", page_num, len(recs))

    return all_records, all_errors, page_meta


def run_diagnostics(pdf_path: Path, sample_pages: int = 80) -> int:
    pdfplumber = try_import_pdfplumber()
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)
    RAW_TABLES_DIR.mkdir(parents=True, exist_ok=True)

    keyword_pages: dict[str, list[int]] = {k: [] for k in KEYWORD_SCAN}
    candidates: list[dict] = []
    table_counts: list[dict] = []
    headers_found: list[dict] = []
    text_samples: list[str] = []
    strategy_rows: list[dict] = []
    preview_pages: list[int] = []

    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        log.info("Diagnose: %s pages", total)

        for page_num, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            tl = len(text)
            try:
                n_tables = len(page.extract_tables() or [])
            except Exception:
                n_tables = -1

            table_counts.append({"page": page_num, "table_count": n_tables, "text_len": tl})

            for kw in KEYWORD_SCAN:
                if kw.lower() in text.lower():
                    keyword_pages[kw].append(page_num)

            recs: list[dict] = []
            header_sig = None
            if page_is_candidate(text):
                recs, header_sig = extract_records_from_page_text(text, page_num)
                candidates.append({
                    "page": page_num,
                    "text_len": tl,
                    "table_count": n_tables,
                    "text_records": len(recs),
                    "header_sig": header_sig,
                })
                if header_sig:
                    headers_found.append({"page": page_num, "headers": header_sig})

            if len(preview_pages) < sample_pages and len(recs) > 5:
                preview_pages.append(page_num)

            _, strategy, attempts = extract_tables_with_strategies(page, page_num)
            strategy_rows.append({"page": page_num, "best_strategy": strategy, "attempts": json.dumps(attempts)})

            if page_num <= 3 or page_num in (41, 43, 80, 200, 300):
                text_samples.append(f"\n{'='*60}\nPAGE {page_num} (len={tl}, tables={n_tables})\n{'='*60}\n")
                text_samples.append(text[:500])

        # Previews for high-yield pages
        for page_num in preview_pages[:15]:
            page = pdf.pages[page_num - 1]
            recs, _, _, _ = parse_page(page, page_num, current_table=None, export_raw_tables=True)
            path = DEBUG_DIR / f"table_preview_page_{page_num}.csv"
            with path.open("w", newline="", encoding="utf-8") as f:
                w = csv.writer(f)
                w.writerow(["ifct_code", "name", "nutrients_count", "source_table"])
                for r in recs[:40]:
                    w.writerow([r["ifct_code"], r["name"], len(r.get("nutrients", {})), r.get("source_table")])

    (DEBUG_DIR / "page_text_samples.txt").write_text("\n".join(text_samples), encoding="utf-8")

    with (DEBUG_DIR / "page_table_counts.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["page", "table_count", "text_len"])
        w.writeheader()
        w.writerows(table_counts)

    with (DEBUG_DIR / "candidate_pages.csv").open("w", newline="", encoding="utf-8") as f:
        if candidates:
            w = csv.DictWriter(f, fieldnames=list(candidates[0].keys()))
            w.writeheader()
            w.writerows(candidates)
        else:
            f.write("page,text_len,table_count,text_records,header_sig\n")

    with (DEBUG_DIR / "detected_headers.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["page", "headers"])
        w.writeheader()
        w.writerows(headers_found)

    with (DEBUG_DIR / "selected_strategy.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["page", "best_strategy", "attempts"])
        w.writeheader()
        w.writerows(strategy_rows)

    debug = {
        "diagnosed_at": datetime.now(timezone.utc).isoformat(),
        "pdf": str(pdf_path),
        "total_pages": total,
        "candidate_pages": len(candidates),
        "keyword_pages": {k: v[:30] for k, v in keyword_pages.items()},
        "source_attribution": SOURCE_ATTRIBUTION,
    }
    save_json(DEBUG_DIR / "extraction_debug.json", debug)

    print("\n=== IFCT PDF diagnostics ===")
    print(f"Pages: {total}")
    for kw, pages in keyword_pages.items():
        print(f"  '{kw}': {len(pages)} pages (first: {pages[:5]})")
    print(f"Candidate nutrition pages: {len(candidates)}")
    print(f"Output: {DEBUG_DIR}")
    return 0


def merge_records_by_food_table(records: list[dict]) -> list[dict]:
    """Merge nutrient dicts for same food+table; prefer rows with more nutrients."""
    merged: dict[tuple, dict] = {}
    for rec in records:
        key = (rec["ifct_code"], rec.get("source_table", ""))
        n_count = len(rec.get("nutrients") or {})
        if key not in merged:
            merged[key] = rec
            continue
        prev_n = len(merged[key].get("nutrients") or {})
        if n_count > prev_n:
            merged[key] = rec
        elif n_count > 0:
            merged[key]["nutrients"].update(rec.get("nutrients") or {})
        if len(rec.get("name", "")) > len(merged[key].get("name", "")):
            merged[key]["name"] = rec["name"]
    return list(merged.values())


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract IFCT 2017 PDF to JSON")
    parser.add_argument("--diagnose", action="store_true", help="Run layout diagnostics only")
    parser.add_argument("--start-page", type=int, default=1)
    parser.add_argument("--end-page", type=int, default=None)
    parser.add_argument("--pages", type=str, default=None, help="Comma-separated page numbers")
    parser.add_argument("--no-raw-csv", action="store_true", help="Skip raw table CSV export")
    args = parser.parse_args()

    ensure_dirs()
    pdf = find_pdf()
    if not pdf:
        log.error("IFCT.pdf not found. Place it at data/ifct/IFCT.pdf")
        return 1

    if args.diagnose:
        return run_diagnostics(pdf)

    page_list = None
    if args.pages:
        page_list = [int(p.strip()) for p in args.pages.split(",") if p.strip()]

    records, errors, page_meta = run_extraction(
        pdf,
        start_page=args.start_page,
        end_page=args.end_page,
        page_list=page_list,
        export_raw_tables=not args.no_raw_csv,
    )

    records = merge_records_by_food_table(records)
    unique_foods = len({r["ifct_code"] for r in records})

    out_path = RAW_DIR / "extracted_records.json"
    save_json(
        out_path,
        {
            "extracted_at": datetime.now(timezone.utc).isoformat(),
            "pdf": str(pdf),
            "source_attribution": SOURCE_ATTRIBUTION,
            "record_count": len(records),
            "unique_food_codes": unique_foods,
            "records": records,
        },
    )
    log.info("Wrote %s records (%s unique foods) to %s", len(records), unique_foods, out_path)

    ERRORS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with ERRORS_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["page", "table", "ifct_code", "error", "source"], extrasaction="ignore"
        )
        writer.writeheader()
        for e in errors:
            writer.writerow(e)
    log.info("Wrote %s extraction errors", len(errors))

    save_json(
        RAW_DIR.parent / "pipeline_status.json",
        {
            "phase": "extracted" if records else "failed",
            "record_count": len(records),
            "unique_foods": unique_foods,
            "error_count": len(errors),
        },
    )

    if not records:
        log.error(
            "IFCT extraction produced 0 records. Run:\n"
            "  python scripts/ifct/extract_ifct.py --diagnose\n"
            "and inspect data/ifct/debug/"
        )
        run_diagnostics(pdf)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
