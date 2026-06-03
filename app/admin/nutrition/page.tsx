"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/admin-api-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Stats = {
  foodsCount?: number;
  nutrientsCount?: number;
  foodNutrientRows?: number;
  aliasesCount?: number;
  pdfFound?: boolean;
  pdfPath?: string | null;
  sourceAttribution?: string;
  ifctDataPublicUse?: boolean;
  pipeline?: { phase?: string; lastError?: string | null };
};

type FoodRow = {
  id: string;
  name: string;
  ifctCode: string | null;
  _count?: { nutrients: number; aliases: number };
};

export default function AdminNutritionPage() {
  return (
    <AdminLayout>{() => <AdminNutritionContent />}</AdminLayout>
  );
}

function AdminNutritionContent() {
  const [stats, setStats] = useState<Stats>({});
  const [foods, setFoods] = useState<FoodRow[]>([]);
  const [q, setQ] = useState("");
  const [running, setRunning] = useState<string | null>(null);
  const [log, setLog] = useState("");
  const [aliasFoodId, setAliasFoodId] = useState("");
  const [aliasText, setAliasText] = useState("");

  const load = useCallback(async () => {
    const s = await adminApi.getNutritionStats();
    setStats(s);
    const f = await adminApi.getNutritionFoods(q || undefined);
    setFoods((f.items as FoodRow[]) ?? []);
  }, [q]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const runStep = async (step: "extract" | "clean" | "validate" | "import" | "all") => {
    setRunning(step);
    setLog(`Running ${step}…`);
    try {
      const r = await adminApi.runNutritionPipeline(step);
      setLog(
        `${step} exit ${r.exitCode}\n${String(r.stdout ?? "")}\n${String(r.stderr ?? "")}`
      );
      await load();
    } catch (e) {
      setLog(String(e));
    } finally {
      setRunning(null);
    }
  };

  const addAlias = async () => {
    if (!aliasFoodId || !aliasText) return;
    await adminApi.addNutritionAlias({
      foodId: aliasFoodId,
      alias: aliasText,
      language: "hi",
    });
    setAliasText("");
    await load();
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">IFCT Nutrition Database</h1>
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3 mb-4">
        {stats.sourceAttribution ??
          "Source: Indian Food Composition Tables 2017, National Institute of Nutrition / ICMR."}
        <br />
        <span className="text-xs">
          IFCT_DATA_PUBLIC_USE={String(stats.ifctDataPublicUse ?? false)} — set true in .env only
          with NIN/ICMR permission.
        </span>
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          ["Foods", stats.foodsCount],
          ["Nutrients", stats.nutrientsCount],
          ["Food–nutrient rows", stats.foodNutrientRows],
          ["Aliases", stats.aliasesCount],
        ].map(([label, val]) => (
          <div key={String(label)} className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-2xl font-bold">{val ?? 0}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-600 mb-4">
        PDF: {stats.pdfFound ? stats.pdfPath : "Not found — place IFCT.pdf in data/ifct/"}
        {stats.pipeline?.phase && (
          <>
            {" "}
            · Pipeline phase: <strong>{stats.pipeline.phase}</strong>
          </>
        )}
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {(["extract", "clean", "validate", "import", "all"] as const).map((step) => (
          <Button
            key={step}
            variant="outline"
            size="sm"
            disabled={!!running}
            onClick={() => runStep(step)}
          >
            {running === step ? `…${step}` : step}
          </Button>
        ))}
      </div>

      {log && (
        <pre className="text-xs bg-gray-900 text-gray-100 rounded-lg p-3 mb-6 max-h-48 overflow-auto">
          {log}
        </pre>
      )}

      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Search food…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="outline" size="sm" onClick={() => load()}>
          Search
        </Button>
      </div>

      <ul className="space-y-2 mb-8">
        {foods.map((f) => (
          <li
            key={f.id}
            className="rounded-lg border bg-white px-4 py-3 text-sm flex justify-between gap-2"
          >
            <span>
              <span className="font-medium">{f.name}</span>
              {f.ifctCode && (
                <span className="text-gray-400 ml-2">#{f.ifctCode}</span>
              )}
            </span>
            <span className="text-gray-500 shrink-0">
              {f._count?.nutrients ?? 0} nutrients · {f._count?.aliases ?? 0} aliases
            </span>
          </li>
        ))}
        {foods.length === 0 && (
          <p className="text-sm text-gray-500">No foods in DB. Run pipeline after adding IFCT.pdf.</p>
        )}
      </ul>

      <h2 className="font-semibold mb-2">Add food alias</h2>
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-gray-500">Food ID</label>
          <Input value={aliasFoodId} onChange={(e) => setAliasFoodId(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Alias (e.g. chawal)</label>
          <Input value={aliasText} onChange={(e) => setAliasText(e.target.value)} />
        </div>
        <Button size="sm" onClick={addAlias}>
          Add alias
        </Button>
      </div>
    </>
  );
}
