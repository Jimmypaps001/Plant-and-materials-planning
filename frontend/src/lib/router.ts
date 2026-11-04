import { useCallback, useEffect, useState } from "react";

/**
 * Hash routing: `#/<view>`. The page is served by Frappe at a single route (/planning_app), so a
 * hash router needs no server-side catch-all.
 */
export const VIEWS = ["dashboard", "budget", "forecast", "lifetime", "calibration", "protocols"] as const;
export type View = (typeof VIEWS)[number];
export const DEFAULT_VIEW: View = "dashboard";

export function isView(v: string): v is View {
  return (VIEWS as readonly string[]).includes(v);
}

export function parseRoute(hash: string): View {
  const raw = (hash || "").replace(/^#\/?/, "").split("?")[0].split("/")[0].toLowerCase();
  return isView(raw) ? raw : DEFAULT_VIEW;
}

export const routeHash = (v: View) => `#/${v}`;

export function useRoute(): [View, (v: View) => void] {
  const [view, setView] = useState<View>(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => setView(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  const navigate = useCallback((v: View) => {
    if (window.location.hash !== routeHash(v)) window.location.hash = routeHash(v);
  }, []);
  return [view, navigate];
}
