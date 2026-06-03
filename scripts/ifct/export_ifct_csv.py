#!/usr/bin/env python3
"""Export cleaned IFCT JSON to CSV files."""

from __future__ import annotations

import csv
import logging
import sys
from pathlib import Path

from ifct_common import CLEAN_DIR, DATA_DIR, SOURCE_ATTRIBUTION, load_json

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("export_csv")


def write_csv(path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow(r)


def main() -> int:
    clean_path = CLEAN_DIR / "ifct_clean.json"
    if not clean_path.is_file():
        log.error("Run clean_ifct.py first.")
        return 1

    data = load_json(clean_path)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    foods = data.get("foods", [])
    for f in foods:
        f["source_attribution"] = SOURCE_ATTRIBUTION

    nutrients = data.get("nutrients", [])
    fns = data.get("food_nutrients", [])
    aliases = data.get("aliases", [])

    write_csv(
        DATA_DIR / "foods.csv",
        foods,
        ["ifct_code", "name", "normalized_name", "group", "scientific_name", "edible_portion", "source", "source_attribution"],
    )
    write_csv(
        DATA_DIR / "nutrients.csv",
        nutrients,
        ["code", "name", "category", "unit", "original_column", "isMacro", "isVitamin", "isMineral"],
    )
    write_csv(
        DATA_DIR / "food_nutrients.csv",
        fns,
        ["ifct_code", "nutrient_code", "value", "unit", "per_amount", "per_unit", "source_table", "source_page", "confidence", "source"],
    )
    write_csv(
        DATA_DIR / "food_aliases.csv",
        aliases,
        ["ifct_code", "alias", "language", "normalized_alias"],
    )

    errors_src = DATA_DIR / "extraction_errors.csv"
    if not errors_src.is_file():
        write_csv(DATA_DIR / "extraction_errors.csv", [], ["page", "table", "ifct_code", "error", "source"])

    log.info("Exported CSVs to %s", DATA_DIR)
    return 0


if __name__ == "__main__":
    sys.exit(main())
