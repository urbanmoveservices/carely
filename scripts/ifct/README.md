# IFCT extraction pipeline

**Source: Indian Food Composition Tables 2017, National Institute of Nutrition / ICMR.**

Commercial electronic product use may require written permission from NIN/ICMR. Set `IFCT_DATA_PUBLIC_USE=false` in `.env` unless you have permission.

## Setup

1. Place `IFCT.pdf` at `data/ifct/IFCT.pdf` (or `scripts/ifct/IFCT.pdf`).
2. Install Python dependencies:

```bash
pip install -r scripts/ifct/requirements.txt
```

3. Run PostgreSQL migrations: `npm run prisma:migrate`
4. Run the full pipeline:

```bash
npm run ifct:all
```

## Steps

| Script | Command | Output |
|--------|---------|--------|
| Extract | `npm run ifct:extract` | `data/ifct/raw/extracted_records.json` |
| Clean | `npm run ifct:clean` | `data/ifct/clean/ifct_clean.json` |
| Validate | `npm run ifct:validate` | `data/ifct/validation_report.json` |
| Export CSV | `python scripts/ifct/export_ifct_csv.py` | `data/ifct/*.csv` |
| Import DB | `npm run ifct:import` | PostgreSQL via Prisma |

## Diagnostics

```bash
python scripts/ifct/extract_ifct.py --diagnose
```

Outputs under `data/ifct/debug/` (page samples, candidate pages, strategies).

## Page range (debug)

```bash
python scripts/ifct/extract_ifct.py --start-page 41 --end-page 60
python scripts/ifct/extract_ifct.py --pages 43,80,200
```

## Manual CSV fallback

```bash
# Place data/ifct/manual/ifct_foods.csv (long) or ifct_foods_wide.csv
npm run ifct:import:csv
```

## Notes

- Primary extraction uses **text-line parsing** (`extract_text`); IFCT PDF table borders are often unreliable in pdfplumber.
- Raw table CSVs are saved under `data/ifct/raw/tables/` for inspection.
- Exits with code **1** if zero records (runs diagnostics automatically).
- Unknown nutrient columns are auto-registered (target ~151 components).
- Hindi/English aliases are seeded from `food_aliases_seed.json` and can be extended in Admin → Nutrition.
