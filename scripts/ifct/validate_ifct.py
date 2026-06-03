#!/usr/bin/env python3
"""Validate cleaned IFCT data and write validation reports."""

from __future__ import annotations

import json
import logging
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from ifct_common import CLEAN_DIR, DATA_DIR, RAW_DIR, SOURCE_ATTRIBUTION, load_json, save_json

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("validate_ifct")

EXPECTED_FOODS = 528
EXPECTED_NUTRIENTS = 151
HARD_FAIL_FOODS = 100
WARN_FOODS = 400
WARN_NUTRIENTS = 50


def main() -> int:
    clean_path = CLEAN_DIR / "ifct_clean.json"
    if not clean_path.is_file():
        log.error("Run clean_ifct.py first.")
        return 1

    raw_path = RAW_DIR / "extracted_records.json"
    raw_count = 0
    if raw_path.is_file():
        raw_count = load_json(raw_path).get("record_count", 0)

    data = load_json(clean_path)
    foods = data.get("foods", [])
    nutrients = data.get("nutrients", [])
    fns = data.get("food_nutrients", [])

    if raw_count == 0 and len(foods) == 0:
        log.error("Zero records — extraction failed. Run extract_ifct.py --diagnose")
        return 1

    issues: list[dict] = []
    warnings: list[dict] = []
    suspicious: list[dict] = []

    if len(foods) < HARD_FAIL_FOODS:
        issues.append({"type": "too_few_foods", "count": len(foods), "threshold": HARD_FAIL_FOODS})
    elif len(foods) < WARN_FOODS:
        warnings.append({"type": "foods_below_expected", "count": len(foods), "expected": EXPECTED_FOODS})

    if len(nutrients) < WARN_NUTRIENTS:
        warnings.append({"type": "nutrients_below_expected", "count": len(nutrients), "expected": EXPECTED_NUTRIENTS})

    non_null_values = sum(1 for r in fns if r.get("value") is not None)
    if non_null_values == 0:
        issues.append({"type": "all_values_blank"})

    name_dups = [n for n, c in Counter(f["name"] for f in foods).items() if c > 1]
    code_dups = [c for c, n in Counter(f["ifct_code"] for f in foods).items() if n > 1]

    for f in foods:
        if not f.get("name"):
            issues.append({"type": "empty_food_name", "ifct_code": f.get("ifct_code")})

    seen_fn = set()
    dupes = 0
    for row in fns:
        key = (row.get("ifct_code"), row.get("nutrient_code"), row.get("source_table"))
        if key in seen_fn:
            dupes += 1
        seen_fn.add(key)
        if not row.get("source_table"):
            issues.append({"type": "missing_source_table", "key": str(key)})

    nutrient_presence: dict[str, int] = {}
    for row in fns:
        c = row.get("nutrient_code")
        nutrient_presence[c] = nutrient_presence.get(c, 0) + 1

    missing_nutrients = [
        {"code": n.get("code"), "name": n.get("name")}
        for n in nutrients
        if nutrient_presence.get(n.get("code"), 0) == 0
    ][:30]

    for row in sorted(fns, key=lambda r: r.get("value") or 0, reverse=True)[:200]:
        v = row.get("value")
        if v is None:
            continue
        if row.get("nutrient_code") == "energy" and v > 900:
            suspicious.append({**row, "reason": "energy>900"})
        if v < 0:
            suspicious.append({**row, "reason": "negative_value"})
    suspicious = suspicious[:20]

    report = {
        "validated_at": datetime.now(timezone.utc).isoformat(),
        "source_attribution": SOURCE_ATTRIBUTION,
        "raw_record_count": raw_count,
        "counts": {
            "foods": len(foods),
            "nutrients": len(nutrients),
            "food_nutrient_rows": len(fns),
            "non_null_values": non_null_values,
            "duplicate_rows": dupes,
        },
        "expected": {"foods": EXPECTED_FOODS, "nutrients": EXPECTED_NUTRIENTS},
        "warnings": warnings,
        "issues_count": len(issues),
        "issues": issues[:50],
        "duplicate_food_names": name_dups[:20],
        "duplicate_food_codes": code_dups,
        "missing_nutrient_values": missing_nutrients,
        "suspicious_top_20": suspicious,
        "ok": len(issues) == 0 and len(foods) >= HARD_FAIL_FOODS,
    }

    save_json(DATA_DIR / "validation_report.json", report)

    md = [
        "# IFCT Validation Report",
        "",
        SOURCE_ATTRIBUTION,
        "",
        f"- Raw extracted rows: **{raw_count}**",
        f"- Foods: **{len(foods)}** (expected ~{EXPECTED_FOODS})",
        f"- Nutrients: **{len(nutrients)}** (expected ~{EXPECTED_NUTRIENTS})",
        f"- Food-nutrient rows: **{len(fns)}**",
        f"- Non-null values: **{non_null_values}**",
        f"- Issues: **{len(issues)}** | Warnings: **{len(warnings)}**",
        "",
        "## Status",
        f"- OK: **{report['ok']}**",
    ]
    if warnings:
        md.append("\n## Warnings\n```json\n" + json.dumps(warnings, indent=2) + "\n```")
    (DATA_DIR / "validation_report.md").write_text("\n".join(md), encoding="utf-8")

    log.info("Validation ok=%s foods=%s nutrients=%s", report["ok"], len(foods), len(nutrients))
    save_json(
        DATA_DIR / "pipeline_status.json",
        {"phase": "validated", "validation_ok": report["ok"], **report["counts"]},
    )
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
