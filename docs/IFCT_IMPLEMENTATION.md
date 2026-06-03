# IFCT implementation (VaidyaGPT)

**Source: Indian Food Composition Tables 2017, National Institute of Nutrition / ICMR.**

## Legal

- Attribution is shown on APIs, PDFs, chat nutrition answers, and admin UI.
- `IFCT_DATA_PUBLIC_USE=false` by default in `.env`. Set to `true` only if you have written permission from NIN/ICMR for your product use case.

## Architecture

```
IFCT.pdf → Python extract/clean/validate → CSV/JSON → import_ifct_to_db.ts → PostgreSQL
                                                              ↓
                    /api/nutrition/*  ←  lib/nutrition/*  ←  Chat tools (ask-chat)
```

## Run pipeline

```bash
pip install -r scripts/ifct/requirements.txt
# Place IFCT.pdf in data/ifct/
npm run prisma:migrate
npm run ifct:all
```

## APIs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/nutrition/search?q=` | Food search (aliases, fuzzy) |
| GET | `/api/nutrition/food/[id]` | Food + all nutrients |
| GET | `/api/nutrition/compare?foods=rice,wheat,moong` | Side-by-side nutrients |
| GET | `/api/nutrition/nutrients` | All nutrient definitions |
| GET | `/api/nutrition/high?nutrient=iron&limit=20` | Top foods by nutrient |
| GET | `/api/nutrition/low?nutrient=sodium&limit=20` | Lowest foods by nutrient |
| POST | `/api/nutrition/meal/analyze` | Meal totals from gram portions |
| POST | `/api/nutrition/diet/suggest` | Condition-aware general diet ideas |

All responses include IFCT source attribution where applicable.

## Chatbot tools

When a message matches nutrition intent, VaidyaGPT runs:

- `search_food_nutrition(foodName)`
- `analyze_meal_nutrition(items[])`
- `find_foods_by_nutrient(nutrient, mode)`

Results are injected into the system prompt. The model must **not guess** numbers if DB values are present.

Disclaimer: *This is general nutrition guidance, not a medical prescription.*

## Admin

`/admin/nutrition` — stats, run pipeline steps, search foods, add aliases and conversion rules.

## Limitations

- IFCT values are mainly for **raw/reference** foods per 100 g edible portion.
- **Cooking** changes nutrients; use `FoodConversionRule` where defined, otherwise answers note uncertainty.
- Portion and meal totals are **approximate**.
- Diet suggestions are **general**; kidney disease, pregnancy, and pediatrics need clinician/dietitian review.
- Not a replacement for a registered dietitian or doctor.

## Validation targets

- ~528 foods
- ~151 nutrient definitions
- See `data/ifct/validation_report.md` after `npm run ifct:validate`
