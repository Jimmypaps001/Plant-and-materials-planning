/**
 * The grid's arithmetic, kept out of the component so it can be tested: which value a cell shows,
 * whether it can be edited, and what a bulk action does to a selection. All of it mirrors the legacy
 * /budget-forecast page (drawGrid / persistCell) so the two screens agree.
 */
import type { Block, GridPayload, Series } from "@/lib/api";

export type Grain = "month" | "week" | "life";

export const ALL = "__all__";

export interface GradeRow {
  grade: string;
  /** what the cell shows: the revision if there is one, else the budget split */
  plan: (number | null)[];
  revised: (number | null)[];
}

export interface Derived {
  cols: string[];
  /** week number / month name used by the API for each column */
  keys: (string | number)[];
  years: number[];
  plan: (number | null)[];
  edited: boolean[];
  actual: (number | null)[];
  budget: (number | null)[];
  grades: GradeRow[];
  past: boolean[];
  now: boolean[];
}

export function seriesOf(b: Block, grain: Grain): Series {
  if (grain === "month") return b.monthly;
  if (grain === "week") return b.weekly;
  return { grades: b.lifetime.grades, revised: [], budget: b.lifetime.budget, actual: b.lifetime.actual };
}

export function columns(p: GridPayload, grain: Grain, blocks: Block[]): { cols: string[]; keys: (string | number)[]; years: number[] } {
  if (grain === "month") return { cols: p.months, keys: p.months, years: p.months.map(() => p.year) };
  if (grain === "week")
    return {
      cols: p.weeks.map((w) => `W${w}`),
      keys: p.weeks,
      years: p.weeks.map((_, i) => p.week_years?.[i] ?? p.year),
    };
  const years = blocks[0]?.lifetime?.years ?? [];
  return { cols: years, keys: years, years: years.map(() => p.year) };
}

export function derive(b: Block, p: GridPayload, grain: Grain): Derived {
  const s = seriesOf(b, grain);
  const { cols, keys, years } = columns(p, grain, [b]);
  const whole = s.revised ?? [];
  const grades: GradeRow[] = (s.grades ?? []).map((g) => ({
    grade: g.grade,
    revised: g.revised ?? [],
    plan: cols.map((_, i) => (g.revised?.[i] != null ? g.revised[i] : g.values[i]) ?? null),
  }));
  const plan = cols.map((_, i) => {
    if (whole[i] != null) return whole[i];
    const t = (s.grades ?? []).reduce((acc, g) => {
      const rev = g.revised && g.revised[i] != null;
      return acc + ((rev ? g.revised[i] : g.values[i]) || 0);
    }, 0);
    return t || null;
  });
  const edited = cols.map((_, i) => whole[i] != null || (s.grades ?? []).some((g) => g.revised && g.revised[i] != null));

  const nowKey = (p.iso_year || p.year) * 100 + p.now_week;
  const idxNow = grain === "week" ? -1 : cols.indexOf(grain === "month" ? p.now_month : p.crop_year);
  const past = cols.map((_, i) =>
    grain === "week" ? years[i] * 100 + Number(keys[i]) < nowKey : idxNow >= 0 && i < idxNow,
  );
  const now = cols.map((_, i) => (grain === "week" ? years[i] * 100 + Number(keys[i]) === nowKey : i === idxNow));
  return { cols, keys, years, plan, edited, actual: s.actual ?? [], budget: s.budget ?? [], grades, past, now };
}

/** Whether a headline/grade cell can be typed into. Past weeks are history; the monthly budget stays editable; lifetime is read-only. */
export function canEdit(grain: Grain, past: boolean, value: number | null): boolean {
  return grain !== "life" && (!past || grain === "month") && value != null;
}

/** Variance of actual against plan, as a whole percent; null when there is nothing to compare. */
export function variance(actual: number | null | undefined, plan: number | null | undefined): number | null {
  if (actual == null || !plan) return null;
  return Math.round(((actual - plan) / plan) * 100);
}

/** How far "on plan" may drift before it earns a colour; a daily number swings more than a monthly one. */
export const tolerance = (grain: Grain) => (grain === "life" ? 5 : grain === "month" ? 7 : 12);
export function varianceTone(d: number, grain: Grain): "ok" | "up" | "dn" {
  return Math.abs(d) <= tolerance(grain) ? "ok" : d > 0 ? "up" : "dn";
}

export interface CellRef {
  block: string;
  grade: string; // ALL or a grade label
  ci: number;
}
export const cellId = (c: CellRef) => `${c.block}|${c.grade}|${c.ci}`;

export type BulkOp = "fill" | "up" | "down" | "zero";

/** New values for a selection under a bulk action. `fill` copies the anchor's value across the others. */
export function bulk(op: BulkOp, cells: { ref: CellRef; value: number }[], anchor?: number): { ref: CellRef; value: number }[] {
  if (!cells.length) return [];
  const base = anchor ?? cells[0].value;
  return cells
    .map(({ ref, value }) => {
      const next =
        op === "fill" ? base : op === "up" ? Math.round(value * 1.1) : op === "down" ? Math.round(value * 0.9) : 0;
      return { ref, value: next, prev: value };
    })
    .filter((c) => c.value !== c.prev)
    .map(({ ref, value }) => ({ ref, value }));
}

/** A suggestion shifted by the week's light sum against the seasonal norm: bright weeks bring the flush forward and heavier. */
export function suggest(current: number, light: number | undefined, norm: number): { value: number; pct: number } {
  const factor = light == null ? 1 : 1 + ((light - norm) / norm) * 0.45;
  const value = Math.max(0, Math.round((current * factor) / 10) * 10);
  return { value, pct: current ? Math.round(((value - current) / current) * 100) : 0 };
}

export function toCsv(rows: { label: string[]; values: (number | null)[] }[], header: string[]): string {
  const q = (s: string | number | null) => (s == null ? "" : `"${String(s).replace(/"/g, '""')}"`);
  return [header, ...rows.map((r) => [...r.label, ...r.values])].map((r) => r.map(q).join(",")).join("\n");
}

export type SortKey = "greenhouse" | "variety" | "size";
export function sortBlocks(blocks: Block[], by: SortKey): Block[] {
  const out = [...blocks];
  if (by === "variety") out.sort((a, b) => a.variety.localeCompare(b.variety) || a.greenhouse.localeCompare(b.greenhouse));
  else if (by === "size") out.sort((a, b) => b.budget_total - a.budget_total);
  else out.sort((a, b) => a.greenhouse.localeCompare(b.greenhouse) || a.variety.localeCompare(b.variety));
  return out;
}

export const fmtN = (n: number | null | undefined) => (n == null ? "—" : Number(n).toLocaleString("en-US"));
/** 1.20M / 12,300 : the dashboard's compact stem figure. */
export const fmtM = (n: number) => (!n ? "0" : n >= 1e6 ? (n / 1e6).toFixed(2) : Math.round(n).toLocaleString());
export const unitM = (n: number) => (n >= 1e6 ? "M stems" : "stems");
export const fmtMU = (n: number) =>
  !n ? "0" : n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e4 ? Math.round(n / 1e3) + "k" : Math.round(n).toLocaleString();
export const signed = (n: number | null | undefined) => (n == null ? "—" : (n >= 0 ? "+" : "") + Number(n).toFixed(1));
