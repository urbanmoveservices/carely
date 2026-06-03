import { getAdminAuthHeaders } from "./admin-auth";
import type { AdminSearchResponse } from "@/types";

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAdminAuthHeaders(),
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || "Request failed");
  }

  return data as T;
}

async function downloadBlob(url: string, filename: string): Promise<void> {
  const res = await fetch(url, {
    headers: { ...getAdminAuthHeaders() },
  });

  if (!res.ok) {
    let msg = "Download failed";
    try {
      const data = await res.json();
      msg = data.error || data.message || msg;
    } catch {}
    throw new Error(msg);
  }

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

export const adminApi = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
  downloadReportPdf: (reportId: string) =>
    downloadBlob(
      `/api/admin/reports/${reportId}/pdf`,
      `vaidya-gpt-admin-report-${reportId}.pdf`
    ),
  adminSearch: (q: string) =>
    request<AdminSearchResponse>(`/api/admin/search?q=${encodeURIComponent(q)}`),
  getLabTests: () => request<{ items: unknown[] }>("/api/admin/lab-tests"),
  createLabTest: (body: object) =>
    request<unknown>("/api/admin/lab-tests", { method: "POST", body: JSON.stringify(body) }),
  updateLabTest: (id: string, body: object) =>
    request<unknown>(`/api/admin/lab-tests/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteLabTest: (id: string) =>
    request<{ success: boolean }>(`/api/admin/lab-tests/${id}`, { method: "DELETE" }),
  getSharingOverview: () => request<unknown>("/api/admin/sharing"),
  getNutritionStats: () => request<Record<string, unknown>>("/api/admin/nutrition/stats"),
  runNutritionPipeline: (step: "extract" | "clean" | "validate" | "import" | "all") =>
    request<Record<string, unknown>>("/api/admin/nutrition/run", {
      method: "POST",
      body: JSON.stringify({ step }),
    }),
  getNutritionFoods: (q?: string) =>
    request<{ items: unknown[] }>(
      `/api/admin/nutrition/foods${q ? `?q=${encodeURIComponent(q)}` : ""}`
    ),
  addNutritionAlias: (body: { foodId: string; alias: string; language?: string }) =>
    request<unknown>("/api/admin/nutrition/aliases", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
