type LabRow = {
  name: string;
  value?: string;
  unit?: string;
  status?: string;
  severity?: string;
  normalRange?: string;
};

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function normalizeLab(item: unknown): LabRow | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const name = String(o.name || o.testName || o.label || o.title || "").trim();
  if (!name) return null;
  return {
    name,
    value: o.value != null ? String(o.value) : o.valueText != null ? String(o.valueText) : undefined,
    unit: o.unit != null ? String(o.unit) : undefined,
    status: o.status != null ? String(o.status) : undefined,
    severity: o.severity != null ? String(o.severity) : undefined,
    normalRange: o.normalRange != null ? String(o.normalRange) : undefined,
  };
}

export function extractLabsFromContext(context: Record<string, unknown>): LabRow[] {
  const rows: LabRow[] = [];
  const report =
    (context.report as Record<string, unknown> | undefined) ||
    (context.latestReport as Record<string, unknown> | undefined);

  if (report) {
    for (const av of asArray<unknown>(report.abnormalValues)) {
      const n = normalizeLab(av);
      if (n) rows.push(n);
    }
    for (const mv of asArray<unknown>(report.manualLabValues)) {
      const n = normalizeLab(mv);
      if (n) rows.push(n);
    }
    for (const kf of asArray<unknown>(report.keyFindings)) {
      const n = normalizeLab(kf);
      if (n) rows.push(n);
    }
  }

  for (const r of asArray<Record<string, unknown>>(context.recentReports)) {
    for (const av of asArray<unknown>(r.abnormalValues)) {
      const n = normalizeLab(av);
      if (n) rows.push(n);
    }
  }

  return rows;
}

export function contextHasUsableHealthData(context: Record<string, unknown>): boolean {
  const report =
    (context.report as Record<string, unknown> | undefined) ||
    (context.latestReport as Record<string, unknown> | undefined);
  if (report?.summary && String(report.summary).length > 40) return true;
  if (extractLabsFromContext(context).length > 0) return true;
  if (asArray(context.recentReports).length > 0) return true;
  if (asArray((context as { activeMedications?: unknown }).activeMedications).length > 0) {
    return true;
  }
  const meds = (report as { activeMedications?: unknown })?.activeMedications;
  if (asArray(meds).length > 0) return true;
  return false;
}

export function buildContextDigest(context: Record<string, unknown>): string {
  const lines: string[] = [];
  const report =
    (context.report as Record<string, unknown> | undefined) ||
    (context.latestReport as Record<string, unknown> | undefined);

  if (report?.summary) {
    lines.push(`Report summary: ${String(report.summary).slice(0, 800)}`);
  }
  if (report?.healthScore != null) {
    lines.push(`Health score: ${report.healthScore}`);
  }

  const labs = extractLabsFromContext(context);
  if (labs.length) {
    lines.push("Lab values (use these exact numbers in answers):");
    for (const l of labs.slice(0, 20)) {
      const status = l.status || l.severity || "";
      lines.push(
        `- ${l.name}: ${l.value ?? "?"}${l.unit ? ` ${l.unit}` : ""}${status ? ` (${status})` : ""}${l.normalRange ? ` ref ${l.normalRange}` : ""}`
      );
    }
  }

  const meds = asArray<Record<string, unknown>>(
    (report?.activeMedications as unknown) ?? context.activeMedications
  );
  if (meds.length) {
    lines.push("Active medications on file:");
    for (const m of meds.slice(0, 12)) {
      lines.push(
        `- ${m.name}: ${m.dosage || "?"}${m.frequency ? `, ${m.frequency}` : ""}`
      );
    }
  }

  const recent = asArray<Record<string, unknown>>(context.recentReports);
  if (recent.length && !report) {
    lines.push(`Recent reports count: ${recent.length}`);
    const latest = recent[0];
    if (latest?.summary) lines.push(`Latest report summary: ${String(latest.summary).slice(0, 400)}`);
  }

  return lines.length ? lines.join("\n") : "No structured health digest available.";
}

function labNameMatches(name: string, patterns: RegExp) {
  return patterns.test(name);
}

export function medicineHintsForLabs(labs: LabRow[]): string {
  const names = labs.map((l) => l.name.toLowerCase()).join(" ");
  const hints: string[] = [];

  if (/sgot|sgpt|alt|ast|liver|bilirubin/.test(names)) {
    hints.push(
      "Elevated liver enzymes pattern: suggest Udiliv (Ursodeoxycholic acid) 300mg — 1 tablet twice daily after food; Silymarin e.g. Liv 52 DS — 2 tablets twice daily; avoid alcohol and paracetamol overdose; repeat LFT in 4–6 weeks."
    );
  }
  if (/hba1c|glucose|sugar|fasting blood|fbs|ppbs/.test(names)) {
    hints.push(
      "High sugar pattern: Metformin 500mg — 1 tablet twice daily with meals (if kidney OK); optional Glimepiride 1mg morning only if doctor already uses sulfonylureas; monitor sugar weekly."
    );
  }
  if (/vitamin d|25-oh|25\(oh\)d/.test(names)) {
    hints.push(
      "Low Vitamin D: Cholecalciferol sachet 60000 IU weekly × 8 weeks, then monthly; or D-Rise 2000 IU daily."
    );
  }
  if (/tsh|thyroid/.test(names)) {
    hints.push(
      "Thyroid pattern: if TSH high — Levothyroxine 25–50mcg empty stomach (dose titrated by doctor); if TSH low — doctor may reduce dose — do not self-start high dose."
    );
  }
  if (/hemoglobin|hb\b|anaemia|anemia/.test(names)) {
    hints.push(
      "Low HB pattern: Ferrous Ascorbate or Ferrous Sulphate + Folic acid once daily; add B12 if MCV high; check cause with doctor."
    );
  }

  return hints.join("\n");
}
