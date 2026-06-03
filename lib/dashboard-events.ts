export const DASHBOARD_REFRESH_EVENT = "carely-dashboard-refresh";

export function dispatchDashboardRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DASHBOARD_REFRESH_EVENT));
}

export function subscribeDashboardRefresh(handler: () => void) {
  if (typeof window === "undefined") return () => {};
  const fn = () => handler();
  window.addEventListener(DASHBOARD_REFRESH_EVENT, fn);
  return () => window.removeEventListener(DASHBOARD_REFRESH_EVENT, fn);
}
