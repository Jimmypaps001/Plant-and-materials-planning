import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getList, gridPayload, isError, type Block, type GridPayload } from "@/lib/api";
import { currentIsoWeek, shiftWeek, type IsoWeek } from "@/lib/weeks";
import type { TreeNode } from "@/components/TreePicker";
import { inCrop, useCropMap, type CropMap } from "@/lib/crops";

/** Shared filters + the one grid payload every page reads (budget.grid_payload). */

type Src = "manual" | "automated";
const KEY = "planning.app.prefs.v1";

interface Prefs {
  year: number;
  src: Src;
  span: number;
}

let stored = false;
function loadPrefs(): Prefs {
  const base: Prefs = { year: new Date().getFullYear(), src: "manual", span: 11 };
  try {
    const raw = localStorage.getItem(KEY);
    stored = !!raw;
    return { ...base, ...JSON.parse(raw || "{}") };
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
  /** The open crop (a crop_key, or "all"), the crops on file, and a way to switch. */
  crop: string;
  setCrop: (c: string) => void;
  cropMap: CropMap;
  /** An Item code as its item_name (the code when the Item is unknown): what every label shows. */
  nameOf: (code: string | null | undefined) => string;
  /** Whether a variety (Item code) belongs to the open crop. */
  inOpenCrop: (variety: string) => boolean;
  /** Blocks the crop and the greenhouse/variety filter let through. */
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

export function PlanningProvider({
  crop,
  onCrop,
  children,
}: {
  crop: string;
  onCrop: (c: string) => void;
  children: React.ReactNode;
}) {
  const cropMap = useCropMap();
  const [names, setNames] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    void getList<{ name: string; item_name: string | null }>("Item", ["name", "item_name"]).then((r) => {
      if (!isError(r)) setNames(new Map((r as { name: string; item_name: string | null }[]).map((i) => [i.name, i.item_name || i.name])));
    });
  }, []);
  const nameOf = useCallback((code: string | null | undefined) => (code ? names.get(code) ?? code : ""), [names]);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [start, setStart] = useState<IsoWeek | null>(null);
  const [payload, setPayload] = useState<GridPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string> | null>(null);
  const tick = useRef(0);
  useEffect(() => setChecked(null), [crop]);
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
      const p0 = r as GridPayload;
      // Nothing typed on Production Forecast and never chosen: show the model, where the budget is.
      if (p0.mode === "manual" && !stored && !p0.budget_total && !p0.forecast_total) {
        stored = true;
        save({ ...prefs, src: "automated" });
        return;
      }
      setPayload(p0);
      if (!start && r && (r as GridPayload).weeks.length) {
        const p = r as GridPayload;
        setStart({ year: p.week_years[0] ?? p.year, week: p.weeks[0] });
      }
    });
  }, [prefs.year, prefs.src, prefs.span, start, nonce]);

  const inOpenCrop = useCallback((v: string) => inCrop(cropMap, crop, v), [cropMap, crop]);
  const cropBlocks = useMemo(() => (payload?.blocks ?? []).filter((b) => inOpenCrop(b.variety)), [payload, inOpenCrop]);

  const tree = useMemo<TreeNode[]>(() => {
    const by = new Map<string, Block[]>();
    cropBlocks.forEach((b) => by.set(b.greenhouse, [...(by.get(b.greenhouse) ?? []), b]));
    return [...by.entries()].map(([gh, list]) => ({
      id: ghId(gh),
      label: house(gh),
      search: gh,
      count: list.length,
      children: list.map((b) => ({ id: b.key, label: nameOf(b.variety), search: `${gh} ${b.variety} ${nameOf(b.variety)}` })),
    }));
  }, [cropBlocks, nameOf]);

  // Until the user touches the picker, everything is in.
  const allLeaves = useMemo(() => new Set(cropBlocks.map((b) => b.key)), [cropBlocks]);
  const effective = checked ?? allLeaves;
  const blocks = useMemo(
    () => cropBlocks.filter((b) => effective.has(b.key) || effective.has(ghId(b.greenhouse))),
    [cropBlocks, effective],
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
    crop,
    setCrop: onCrop,
    cropMap,
    inOpenCrop,
    nameOf,
    blocks,
    tree,
    checked: effective,
    setChecked,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { currentIsoWeek };
