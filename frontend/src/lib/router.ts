import { useCallback, useEffect, useState } from "react";

/**
 * Hash routing, namespaced by crop: `#/<crop_key>/<view>`, the way /production_app does it. `all` is
 * "All crops". The old crop-less form `#/<view>` still works and means All crops, so existing links
 * (the workspace tiles, the classic planner) keep landing where they did.
 */
export const VIEWS = [
  "dashboard",
  "budget",
  "forecast",
  "lifetime",
  "calibration",
  "protocols",
  "market-demand",
  "production-plans",
  "season-plans",
  "budgets",
  "procurement",
  "routes",
] as const;
export type View = (typeof VIEWS)[number];
export const DEFAULT_VIEW: View = "dashboard";
export const ALL_CROPS = "all";

export function isView(v: string): v is View {
  return (VIEWS as readonly string[]).includes(v);
}

export interface Route {
  crop: string;
  view: View;
}

export function parseRoute(hash: string): Route {
  const parts = (hash || "").replace(/^#\/?/, "").split("?")[0].split("/").filter(Boolean).map((p) => p.toLowerCase());
  if (parts.length && isView(parts[0])) return { crop: ALL_CROPS, view: parts[0] };
  const view = parts[1] && isView(parts[1]) ? parts[1] : DEFAULT_VIEW;
  return { crop: parts[0] ? decodeURIComponent(parts[0]) : ALL_CROPS, view };
}

export const routeHash = (crop: string, view: View = DEFAULT_VIEW) => `#/${encodeURIComponent(crop || ALL_CROPS)}/${view}`;

export function useRoute(): [Route, (crop: string, view?: View) => void] {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  const navigate = useCallback((crop: string, view: View = DEFAULT_VIEW) => {
    const h = routeHash(crop, view);
    if (window.location.hash !== h) window.location.hash = h;
  }, []);
  return [route, navigate];
}
