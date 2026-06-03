#!/usr/bin/env python3
"""Merge raw IFCT extractions, normalize nutrients, apply aliases."""

from __future__ import annotations

import csv
import logging
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from ifct_common import (
    SOURCE_ATTRIBUTION,
    RAW_DIR,
    CLEAN_DIR,
    DATA_DIR,
    ensure_dirs,
    normalize_name,
    infer_nutrient_meta,
    load_json,
    save_json,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("clean_ifct")

HEADER_LIKE = re.compile(
    r"^(food name|fish name|table\s*\d|all values|edoc|dooF|snoigeR)$",
    re.I,
)


def load_aliases_seed() -> list[dict]:
    path = Path(__file__).parent / "food_aliases_seed.json"
    if not path.is_file():
        return []
    return load_json(path)


def is_skippable_record(rec: dict) -> bool:
    name = (rec.get("name") or "").strip()
    if not name or len(name) < 2:
        return True
    if HEADER_LIKE.match(name):
        return True
    if name.lower() in {"food name", "fish name", "edoc", "doof"}:
        return True
    return False


def main() -> int:
    ensure_dirs()
    raw_path = RAW_DIR / "extracted_records.json"
    if not raw_path.is_file():
        log.error("Run extract_ifct.py first. Missing %s", raw_path)
        return 1

    payload = load_json(raw_path)
    records = payload.get("records", [])
    if not records:
        log.error("No records in extracted JSON. Run extract_ifct.py first.")
        return 1

    foods: dict[str, dict] = {}
    nutrients: dict[str, dict] = {}
    food_nutrients: list[dict] = []
    aliases: list[dict] = []
    unknown_columns: dict[str, int] = {}

    for rec in records:
        if is_skippable_record(rec):
            continue
        code = rec.get("ifct_code")
        if not code:
            continue
        key = str(code)

        if key not in foods:
            foods[key] = {
                "ifct_code": key,
                "name": rec["name"],
                "normalized_name": normalize_name(rec["name"]),
                "group": rec.get("food_group"),
                "scientific_name": None,
                "edible_portion": None,
                "description": None,
                "source": SOURCE_ATTRIBUTION,
            }
        elif len(rec["name"]) > len(foods[key]["name"]):
            foods[key]["name"] = rec["name"]
            foods[key]["normalized_name"] = normalize_name(rec["name"])
        if rec.get("food_group") and not foods[key].get("group"):
            foods[key]["group"] = rec["food_group"]

        table_num = rec.get("source_table_num")
        for col, val in (rec.get("nutrients") or {}).items():
            if val is None:
                continue
            col_s = str(col).strip()
            if not col_s or HEADER_LIKE.match(col_s):
                continue
            meta = infer_nutrient_meta(col_s, table_num)
            ncode = meta["code"]
            if ncode not in nutrients:
                nutrients[ncode] = {**meta, "source_table": rec.get("source_table")}
            nmap = load_json(Path(__file__).parent / "nutrient_map.json")
            known = set(nmap.get("nutrients", {}).keys())
            if normalize_name(col_s) not in known and col_s not in known:
                unknown_columns[col_s] = unknown_columns.get(col_s, 0) + 1

            food_nutrients.append({
                "ifct_code": key,
                "nutrient_code": ncode,
                "value": val,
                "unit": meta["unit"],
                "per_amount": 100,
                "per_unit": "g",
                "source_table": rec.get("source_table"),
                "source_page": rec.get("source_page"),
                "confidence": 0.9 if rec.get("region_code") else 0.85,
                "notes": f"region={rec['region_code']}" if rec.get("region_code") else None,
                "source": SOURCE_ATTRIBUTION,
            })

    deduped: dict[tuple, dict] = {}
    for fn in food_nutrients:
        k = (fn["ifct_code"], fn["nutrient_code"], fn.get("source_table") or "")
        deduped[k] = fn
    food_nutrients = list(deduped.values())

    for a in load_aliases_seed():
        match_name = normalize_name(a.get("food_match", ""))
        for f in foods.values():
            if match_name in f["normalized_name"] or f["normalized_name"] in match_name:
                aliases.append({
                    "ifct_code": f["ifct_code"],
                    "alias": a["alias"],
                    "language": a.get("language", "hi"),
                    "normalized_alias": normalize_name(a["alias"]),
                })

    unknown_path = DATA_DIR / "unknown_columns.csv"
    with unknown_path.open("w", newline="", encoding="utf-8") as uf:
        w = csv.writer(uf)
        w.writerow(["column", "occurrences"])
        for col, cnt in sorted(unknown_columns.items(), key=lambda x: -x[1]):
            w.writerow([col, cnt])

    clean = {
        "cleaned_at": datetime.now(timezone.utc).isoformat(),
        "source_attribution": SOURCE_ATTRIBUTION,
        "foods": list(foods.values()),
        "nutrients": list(nutrients.values()),
        "food_nutrients": food_nutrients,
        "aliases": aliases,
        "stats": {
            "foods": len(foods),
            "nutrients": len(nutrients),
            "food_nutrients": len(food_nutrients),
            "aliases": len(aliases),
            "unknown_columns": len(unknown_columns),
        },
    }
    save_json(CLEAN_DIR / "ifct_clean.json", clean)
    log.info(
        "Cleaned: %s foods, %s nutrients, %s values, %s unknown column types",
        clean["stats"]["foods"],
        clean["stats"]["nutrients"],
        clean["stats"]["food_nutrients"],
        clean["stats"]["unknown_columns"],
    )
    save_json(RAW_DIR.parent / "pipeline_status.json", {"phase": "cleaned", **clean["stats"]})
    return 0


if __name__ == "__main__":
    sys.exit(main())
