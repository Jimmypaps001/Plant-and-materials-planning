import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { gridPayload, isError, type Block, type GridPayload } from "@/lib/api";
import { currentIsoWeek, shiftWeek, type IsoWeek } from "@/lib/weeks";
import type { TreeNode } from "@/components/TreePicker";

/** Shared filters + the one grid payload every page reads (budget.grid_payload). */

type Src = "manual" | "automated";
const KEY = "planning.app.prefs.v1";

interface Prefs {
  year: number;
  src: Src;
  span: number;
}

function loadPrefs(): Prefs {
  const base: Prefs = { year: new Date().getFullYear(), src: "manual", span: 11 };
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return base;
  }
}

export const WINDOW_SPANS = [11, 13, 26, 52] as const;

export interface PlanningState {
  payload: GridPayload | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  year: number;
  setYear: (y: number) => void;
  src: Src;
  setSrc: (s: Src) => void;
  start: IsoWeek | null;
  setStart: (w: IsoWeek) => void;
  span: number;
  setSpan: (n: number) => void;
  /** Blocks the greenhouse/variety filter lets through. */
  blocks: Block[];
  tree: TreeNode[];
  checked: Set<string>;
  setChecked: (s: Set<string>) => void;
}

const Ctx = createContext<PlanningState | null>(null);

export function usePlanning(): PlanningState {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlanning outside PlanningProvider");
  return v;
}

export const ghId = (g: string) => "gh:" + g;

/** "Main GH 05 - MFK" reads as "GH 05" once you are already inside one farm. */
export const house = (h: string | null | undefined) =>
  String(h || "").replace(/^Main\s+/i, "").replace(/\s*-\s*[A-Z]{2,4}$/, "");

export function PlanningProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [start, setStart] = useState<IsoWeek | null>(null);
  const [payload, setPayload] = useState<GridPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string> | null>(null);
  const tick = useRef(0);
  const [nonce, setNonce] = useState(0);

  const save = (p: Prefs) => {
    setPrefs(p);
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* private mode: the filters just don't persist */
    }
  };

  useEffect(() => {
    const mine = ++tick.current;
    setLoading(true);
    const args: Parameters<typeof gridPayload>[0] = { year: prefs.year, mode: prefs.src };
    if (start) {
      const end = shiftWeek(start, prefs.span - 1);
      Object.assign(args, {
        start_year: start.year,
        start_week: start.week,
        end_year: end.year,
        end_week: end.week,
      });
    }
    void gridPayload(args).then((r) => {
      if (mine !== tick.current) return;
      setLoading(false);
      if (isError(r)) {
        setError(r.error);
        return;
      }
      setError(null);
      setPayload(r as GridPayload);
      if (!start && r && (r as GridPayload).weeks.length) {
        const p = r as GridPayload;
        setStart({ year: p.week_years[0] ?? p.year, week: p.weeks[0] });
      }
    });
  }, [prefs.year, prefs.src, prefs.span, start, nonce]);

  const tree = useMemo<TreeNode[]>(() => {
    const by = new Map<string, Block[]>();
    (payload?.blocks ?? []).forEach((b) => by.set(b.greenhouse, [...(by.get(b.greenhouse) ?? []), b]));
    return [...by.entries()].map(([gh, list]) => ({
      id: ghId(gh),
      label: house(gh),
      search: gh,
      count: list.length,
      children: list.map((b) => ({ id: b.key, label: b.variety, search: `${gh} ${b.variety}` })),
    }));
  }, [payload]);

  // Until the user touches the picker, everything is in.
  const allLeaves = useMemo(() => new Set((payload?.blocks ?? []).map((b) => b.key)), [payload]);
  const effective = checked ?? allLeaves;
  const blocks = useMemo(
    () => (payload?.blocks ?? []).filter((b) => effective.has(b.key) || effective.has(ghId(b.greenhouse))),
    [payload, effective],
  );

  const value: PlanningState = {
    payload,
    loading,
    error,
    reload: useCallback(() => setNonce((n) => n + 1), []),
    year: prefs.year,
    setYear: (year) => {
      setStart(null);
      save({ ...prefs, year });
    },
    src: prefs.src,
    setSrc: (src) => save({ ...prefs, src }),
    start,
    setStart,
    span: prefs.span,
    setSpan: (span) => save({ ...prefs, span }),
    blocks,
    tree,
    checked: effective,
    setChecked,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { currentIsoWeek };
