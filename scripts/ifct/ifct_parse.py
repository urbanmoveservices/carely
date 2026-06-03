"""
IFCT 2017 text-line and table parsers.
Source: Indian Food Composition Tables 2017, National Institute of Nutrition / ICMR.
"""

from __future__ import annotations

import re
from typing import Any

from ifct_common import parse_float, detect_table_number, TABLE_TITLES, SOURCE_ATTRIBUTION

# Food codes: A001, B014, M001, P042, etc.
FOOD_CODE_RE = re.compile(r"^([A-Z]\d{3,4})\s+(.+)$", re.DOTALL)
SECTION_RE = re.compile(r"^([A-Z])\s{2,}([A-Z][A-Z\s,&-]+)$")
SKIP_LINE_RE = re.compile(
    r"^(Table|edoC|dooF|snoigeR|fo|\.oN|mg|g|μg|mgg|KJ|All values|Proximate|Dietary|Food Name|Fish Name|Total\s)",
    re.I,
)
NUM_TOKEN_RE = re.compile(r"^[\d.]+(?:[±\u00b1][\d.]+)?$")
ABBREV_HEADER_RE = re.compile(r"^[A-Z][A-Z0-9]{2,8}(\s+[A-Z][A-Z0-9]{2,8}){2,}$")

# Map INFOODS abbreviations to readable names (unknown kept as-is)
ABBREV_TO_NAME: dict[str, str] = {
    "WATER": "Moisture",
    "PROTCNT": "Protein",
    "ASH": "Ash",
    "FATCE": "Total Fat",
    "FIBTG": "Total Dietary Fiber",
    "FIBINS": "Insoluble Dietary Fiber",
    "FIBSOL": "Soluble Dietary Fiber",
    "CHOAVLDF": "Carbohydrate",
    "ENERC": "Energy",
    "THIA": "Thiamine",
    "RIBF": "Riboflavin",
    "NIA": "Niacin",
    "PANTAC": "Pantothenic Acid",
    "VITB6C": "Vitamin B6",
    "BIOT": "Biotin",
    "FOLSUM": "Total Folates",
    "VITC": "Vitamin C",
    "RETOL": "Vitamin A (Retinol)",
    "CHOCAL": "Cholesterol",
    "TOCPHA": "Alpha Tocopherol",
    "CA": "Calcium",
    "FE": "Iron",
    "ZN": "Zinc",
    "NA": "Sodium",
    "K": "Potassium",
    "P": "Phosphorus",
    "MG": "Magnesium",
    "HIS": "Histidine",
    "ILE": "Isoleucine",
    "LEU": "Leucine",
    "LYS": "Lysine",
    "MET": "Methionine",
    "CYS": "Cystine",
    "PHE": "Phenylalanine",
    "THR": "Threonine",
    "TRP": "Tryptophan",
    "VAL": "Valine",
    "ALA": "Alanine",
    "ARG": "Arginine",
    "ASP": "Aspartic Acid",
    "GLU": "Glutamic Acid",
    "GLY": "Glycine",
    "PRO": "Proline",
    "SER": "Serine",
    "TYR": "Tyrosine",
}


def normalize_num_token(tok: str) -> str:
    return tok.replace("\u00b1", "±").replace("\x00b1", "±")


def parse_values_from_tokens(tokens: list[str]) -> tuple[list[float | None], int]:
    """Parse numeric tail; return values and index where name part ends (exclusive)."""
    values: list[float | None] = []
    i = len(tokens) - 1
    while i >= 0:
        t = normalize_num_token(tokens[i])
        if NUM_TOKEN_RE.match(t) or re.match(r"^[\d.]+$", t):
            values.insert(0, parse_float(t))
            i -= 1
        else:
            break
    return values, i + 1


def parse_food_line(
    line: str,
    headers: list[str],
    *,
    page_num: int,
    table_num: int | None,
    source_table: str,
    food_group: str | None,
) -> dict | None:
    line = line.strip()
    if not line or len(line) < 8:
        return None
    if SKIP_LINE_RE.match(line):
        return None

    m = FOOD_CODE_RE.match(line)
    if not m:
        return None

    code = m.group(1)
    rest = m.group(2).strip()
    tokens = rest.split()
    if len(tokens) < 2:
        return None

    values, name_end = parse_values_from_tokens(tokens)
    if not values:
        return None

    name_tokens = tokens[:name_end]
    region = None
    if name_tokens and name_tokens[-1] in "123456" and len(name_tokens) > 1:
        region = name_tokens[-1]
        name_tokens = name_tokens[:-1]

    # Region code (1–6) sometimes parsed as first numeric value
    if values and len(values) > 1:
        v0 = values[0]
        if v0 is not None and v0 in (1, 2, 3, 4, 5, 6) and float(v0) == int(v0):
            region = region or str(int(v0))
            values = values[1:]

    name = " ".join(name_tokens).strip()
    if not name or len(name) < 2:
        return None

    nutrients: dict[str, float] = {}
    for hi, h in enumerate(headers):
        if hi >= len(values):
            break
        v = values[hi]
        if v is not None:
            col = ABBREV_TO_NAME.get(h, h)
            nutrients[col] = v

    return {
        "ifct_code": code,
        "name": name,
        "food_group": food_group,
        "region_code": region,
        "source_table": source_table,
        "source_table_num": table_num,
        "source_page": page_num,
        "source": SOURCE_ATTRIBUTION,
        "nutrients": nutrients,
        "header_codes": headers,
    }


TABLE_DEFAULT_HEADERS: dict[int, list[str]] = {
    1: ["WATER", "PROTCNT", "ASH", "FATCE", "FIBTG", "FIBINS", "FIBSOL", "CHOAVLDF", "ENERC"],
    2: ["THIA", "RIBF", "NIA", "PANTAC", "VITB6C", "BIOT", "FOLSUM", "VITC"],
    5: ["CA", "FE", "ZN", "NA", "K", "P", "MG"],
    8: ["HIS", "ILE", "LEU", "LYS", "MET", "CYS", "PHE", "THR", "TRP", "VAL"],
}


def detect_headers(lines: list[str], table_num: int | None = None) -> list[str]:
    """Find INFOODS-style abbrev header row on a page."""
    best: list[str] = []
    for line in lines:
        s = line.strip()
        if not s:
            continue
        # "Food Name    WATER   PROTCNT   ASH ..." on one line
        if "WATER" in s and "PROTCNT" in s:
            chunk = s
            if "Food Name" in chunk:
                chunk = chunk.split("Food Name", 1)[-1]
            if "Fish Name" in chunk:
                chunk = chunk.split("Fish Name", 1)[-1]
            parts = re.findall(r"[A-Z][A-Z0-9]{2,8}", chunk)
            if len(parts) > len(best):
                best = parts
            continue
        if "Food Name" in s or "Fish Name" in s:
            continue
        if ABBREV_HEADER_RE.match(s):
            parts = s.split()
            if len(parts) > len(best):
                best = parts
        if "THIA" in s and "RIBF" in s:
            parts = re.findall(r"[A-Z][A-Z0-9]{2,8}", s)
            if len(parts) > len(best):
                best = parts
    if not best and table_num and table_num in TABLE_DEFAULT_HEADERS:
        return TABLE_DEFAULT_HEADERS[table_num]
    return best


def extract_records_from_page_text(
    text: str,
    page_num: int,
    *,
    current_table: int | None = None,
) -> tuple[list[dict], str | None]:
    """Primary extraction: parse food rows from extract_text() output."""
    lines = [ln.strip() for ln in text.split("\n")]
    table_num = detect_table_number(text) or current_table
    source_table = TABLE_TITLES.get(table_num, f"Table {table_num}") if table_num else "IFCT 2017"
    headers = detect_headers(lines, table_num)
    records: list[dict] = []
    food_group: str | None = None
    pending_name: str | None = None

    for line in lines:
        if not line:
            continue
        sec = SECTION_RE.match(line)
        if sec and not FOOD_CODE_RE.match(line):
            food_group = sec.group(2).strip()
            pending_name = None
            continue

        if FOOD_CODE_RE.match(line):
            rec = parse_food_line(
                line,
                headers,
                page_num=page_num,
                table_num=table_num,
                source_table=source_table,
                food_group=food_group,
            )
            if rec:
                if pending_name and not rec["name"].startswith("("):
                    rec["name"] = f"{pending_name} {rec['name']}".strip()
                records.append(rec)
                pending_name = None
            continue

        # Continuation line for split food names (e.g. scientific name on next line)
        if pending_name is None and line.startswith("(") and records:
            records[-1]["name"] = f"{records[-1]['name']} {line}".strip()
        elif line.startswith("(") and not records:
            pending_name = line
        elif (
            pending_name
            and not SKIP_LINE_RE.match(line)
            and not ABBREV_HEADER_RE.match(line)
            and not re.search(r"[\d.]{2,}", line)
        ):
            pending_name = f"{pending_name} {line}".strip()

    return records, headers and ",".join(headers) or None


def row_plausible(row: list) -> bool:
    if not row:
        return False
    non_empty = [c for c in row if c and str(c).strip()]
    return len(non_empty) >= 3


def score_table(rows: list[list]) -> int:
    score = 0
    for row in rows:
        if not row_plausible(row):
            continue
        joined = " ".join(str(c or "") for c in row)
        if FOOD_CODE_RE.match(joined.strip()):
            score += 5
        if re.search(r"[A-Z]\d{3}", joined):
            score += 2
        nums = sum(1 for c in row if parse_float(c) is not None)
        score += min(nums, 5)
    return score


TABLE_SETTINGS_LIST = [
    {},
    {"vertical_strategy": "lines", "horizontal_strategy": "lines"},
    {"vertical_strategy": "text", "horizontal_strategy": "text"},
    {"vertical_strategy": "text", "horizontal_strategy": "lines"},
    {"vertical_strategy": "lines", "horizontal_strategy": "text"},
    {
        "vertical_strategy": "text",
        "horizontal_strategy": "text",
        "snap_tolerance": 5,
        "join_tolerance": 5,
    },
]
