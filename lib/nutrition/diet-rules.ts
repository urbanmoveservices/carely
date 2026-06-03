/** General safe diet guidance rules — not diagnosis or prescriptions */

export type DietCondition =
  | "diabetes"
  | "hypertension"
  | "kidney_disease"
  | "anemia"
  | "fatty_liver"
  | "cholesterol"
  | "weight_loss"
  | "general";

export type DietRuleSeed = {
  conditionName: string;
  nutrientCode: string;
  ruleType: "prefer_high" | "prefer_low" | "limit" | "avoid" | "caution";
  description: string;
  severity: "info" | "warning";
};

export const DEFAULT_DIET_RULE_SEEDS: DietRuleSeed[] = [
  {
    conditionName: "diabetes",
    nutrientCode: "total_dietary_fiber",
    ruleType: "prefer_high",
    description: "Prefer higher-fiber whole grains and pulses; limit refined carbs and added sugars.",
    severity: "info",
  },
  {
    conditionName: "diabetes",
    nutrientCode: "carbohydrate",
    ruleType: "caution",
    description: "Monitor total carbohydrate portions; pair carbs with protein/fiber.",
    severity: "warning",
  },
  {
    conditionName: "hypertension",
    nutrientCode: "sodium",
    ruleType: "limit",
    description: "Limit high-sodium packaged foods and excess salt.",
    severity: "warning",
  },
  {
    conditionName: "hypertension",
    nutrientCode: "potassium",
    ruleType: "prefer_high",
    description: "Potassium-rich vegetables/fruits may help unless kidney disease is present.",
    severity: "info",
  },
  {
    conditionName: "kidney_disease",
    nutrientCode: "potassium",
    ruleType: "caution",
    description: "Potassium may need restriction — consult nephrologist/dietitian.",
    severity: "warning",
  },
  {
    conditionName: "kidney_disease",
    nutrientCode: "phosphorus",
    ruleType: "caution",
    description: "Phosphorus control often matters in CKD — professional guidance required.",
    severity: "warning",
  },
  {
    conditionName: "kidney_disease",
    nutrientCode: "protein",
    ruleType: "caution",
    description: "Protein needs vary by CKD stage — do not self-restrict without advice.",
    severity: "warning",
  },
  {
    conditionName: "anemia",
    nutrientCode: "iron",
    ruleType: "prefer_high",
    description: "Include iron-rich foods (e.g. green leafy vegetables, legumes); vitamin C may aid absorption.",
    severity: "info",
  },
  {
    conditionName: "fatty_liver",
    nutrientCode: "total_fat",
    ruleType: "caution",
    description: "Limit excess calories, added sugars, and refined carbs; emphasize fiber and lean protein.",
    severity: "info",
  },
  {
    conditionName: "cholesterol",
    nutrientCode: "saturated_fat",
    ruleType: "limit",
    description: "Limit saturated fat; prefer fiber-rich dals, vegetables, and whole grains.",
    severity: "info",
  },
  {
    conditionName: "weight_loss",
    nutrientCode: "energy",
    ruleType: "caution",
    description: "Calorie awareness with adequate protein and fiber; sustainable portions matter.",
    severity: "info",
  },
];
