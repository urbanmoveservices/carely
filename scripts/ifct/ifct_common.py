"""
Shared utilities for IFCT 2017 extraction pipeline.
Source: Indian Food Composition Tables 2017, National Institute of Nutrition / ICMR.
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path
from typing import Any

SOURCE_ATTRIBUTION = (
    "Source: Indian Food Composition Tables 2017, National Institute of Nutrition / ICMR."
)

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data" / "ifct"
RAW_DIR = DATA_DIR / "raw"
CLEAN_DIR = DATA_DIR / "clean"
SCRIPTS_DIR = Path(__file__).resolve().parent

TABLE_TITLES = {
    1: "Proximate Principles and Dietary Fiber",
    2: "Water Soluble Vitamins",
    3: "Fat Soluble Vitamins",
    4: "Carotenoids",
    5: "Minerals and Trace Elements",
    6: "Starch and Individual Sugars",
    7: "Fatty Acid Profile",
    8: "Amino Acid Profile",
    9: "Organic Acids",
    10: "Polyphenols",
    11: "Oligosaccharides, Phytosterols, Saponins and Phytates",
    12: "Fatty Acid Profile of Edible Oils and Fats",
}

PDF_CANDIDATES = [
    DATA_DIR / "IFCT.pdf",
    SCRIPTS_DIR / "IFCT.pdf",
]


def ensure_dirs() -> None:
    for d in (DATA_DIR, RAW_DIR, CLEAN_DIR):
        d.mkdir(parents=True, exist_ok=True)


def find_pdf() -> Path | None:
    for p in PDF_CANDIDATES:
        if p.is_file():
            return p
    return None


def normalize_name(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-zA-Z0-9\s]", " ", s.lower())
    return re.sub(r"\s+", " ", s).strip()


def slug_code(name: str) -> str:
    return normalize_name(name).replace(" ", "_")[:80] or "unknown"


def parse_float(val: Any) -> float | None:
    if val is None:
        return None
    s = str(val).strip()
    if not s or s in {"-", "—", "NA", "N/A", "Tr", "tr", "trace", ""}:
        return None
    s = s.replace(",", "")
    m = re.search(r"-?\d+\.?\d*", s)
    if not m:
        return None
    try:
        return float(m.group())
    except ValueError:
        return None


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_nutrient_map() -> dict:
    path = SCRIPTS_DIR / "nutrient_map.json"
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def infer_nutrient_meta(col: str, table_num: int | None = None, _depth: int = 0) -> dict:
    """Map column header to normalized nutrient metadata; auto-discover unknown columns."""
    if _depth > 3:
        key = normalize_name(col)
        code = slug_code(col)
        return {
            "original_column": col,
            "code": code,
            "name": col.strip(),
            "category": "other",
            "unit": "g",
            "isMacro": False,
            "isVitamin": False,
            "isMineral": False,
            "isFattyAcid": False,
            "isAminoAcid": False,
            "isBioactive": False,
        }

    nmap = load_nutrient_map()
    key = normalize_name(col)
    aliases = nmap.get("aliases", {})
    categories = nmap.get("categories", {})
    units = nmap.get("default_units", {})
    nutrients = nmap.get("nutrients", {})

    if key in nutrients:
        entry = nutrients[key]
        return {
            "original_column": col,
            "code": entry["code"],
            "name": entry.get("name", col),
            "category": entry.get("category", categories.get(str(table_num), "other")),
            "unit": entry.get("unit", units.get(entry["code"], "g")),
            "isMacro": entry.get("isMacro", False),
            "isVitamin": entry.get("isVitamin", False),
            "isMineral": entry.get("isMineral", False),
            "isFattyAcid": entry.get("isFattyAcid", False),
            "isAminoAcid": entry.get("isAminoAcid", False),
            "isBioactive": entry.get("isBioactive", False),
        }

    for alias_key, target in aliases.items():
        if alias_key == key or alias_key in key or key in alias_key:
            tkey = normalize_name(str(target))
            if tkey in nutrients:
                entry = nutrients[tkey]
                return {
                    "original_column": col,
                    "code": entry["code"],
                    "name": entry.get("name", col),
                    "category": entry.get("category", categories.get(str(table_num), "other")),
                    "unit": entry.get("unit", units.get(entry["code"], "g")),
                    "isMacro": entry.get("isMacro", False),
                    "isVitamin": entry.get("isVitamin", False),
                    "isMineral": entry.get("isMineral", False),
                    "isFattyAcid": entry.get("isFattyAcid", False),
                    "isAminoAcid": entry.get("isAminoAcid", False),
                    "isBioactive": entry.get("isBioactive", False),
                }
            return infer_nutrient_meta(str(target), table_num, _depth + 1)

    code = slug_code(col)
    cat = categories.get(str(table_num), "other")
    unit = units.get(code, "mg" if table_num in (2, 3, 4, 5) else "g")
    return {
        "original_column": col,
        "code": code,
        "name": col.strip(),
        "category": cat,
        "unit": unit,
        "isMacro": code in {"energy", "protein", "carbohydrate", "total_fat", "ash", "moisture"},
        "isVitamin": table_num in (2, 3, 4) if table_num else False,
        "isMineral": table_num == 5 if table_num else False,
        "isFattyAcid": table_num in (7, 12) if table_num else False,
        "isAminoAcid": table_num == 8 if table_num else False,
        "isBioactive": table_num in (9, 10, 11) if table_num else False,
    }


def is_food_code_cell(val: Any) -> bool:
    if val is None:
        return False
    s = str(val).strip()
    return bool(re.match(r"^\d{1,4}$", s))


def detect_table_number(text: str) -> int | None:
    m = re.search(r"table\s*(\d{1,2})", text, re.I)
    if m:
        n = int(m.group(1))
        if 1 <= n <= 12:
            return n
    for num, title in TABLE_TITLES.items():
        if title.lower() in text.lower():
            return num
    return None
