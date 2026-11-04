/**
 * Typed wrappers over the planning app's whitelisted endpoints (api.py / budget.py). Same calls the
 * legacy /budget-forecast page makes: nothing here is new on the server.
 */
import { call, isError, type Envelope } from "@/lib/frappe";

const APP = "upande_crop_material_planning.";

export interface Grade {
  grade: string;
  values: (number | null)[];
  revised: (number | null)[];
}
export interface Series {
  grades: Grade[];
  revised: (number | null)[];
  budget: (number | null)[];
  actual: (number | null)[];
}
export interface Lifetime {
  years: string[];
  grades: Grade[];
  budget: number[];
  actual: (number | null)[];
}
export interface Block {
  key: string;
  greenhouse: string;
  variety: string;
  area: number;
  rate: number | null;
  budget_total: number;
  revision: number;
  weekly: Series;
  monthly: Series;
  lifetime: Lifetime;
}
export interface WeekDate {
  start: string;
  end: string;
  start_label: string;
  end_label: string;
  span: string;
}
export interface Climate {
  icon: string;
  temp: number;
  light: number;
  source: string;
}
export interface GridPayload {
  actual_total: number;
  week_actual_total: number;
  unassigned_actuals: { variety: string; greenhouse: string; stems: number }[];
  crop_year: string;
  year: number;
  mode: "manual" | "automated";
  weeks: number[];
  week_years: number[];
  week_dates: WeekDate[];
  week_rule_label: string;
  iso_year: number;
  months: string[];
  now_week: number;
  now_month: string;
  house_count: number;
  blocks: Block[];
  budget_total: number;
  forecast_total: number;
  actual_weeks: number;
  model_error: number | null;
  model_note: string | null;
  revision: number;
  site: string;
  climate: Record<string, Climate>;
  climate_alert: string | null;
  light_norm: number;
}

export interface GridArgs {
  year?: number;
  start_year?: number;
  start_week?: number;
  end_year?: number;
  end_week?: number;
  mode?: "manual" | "automated";
}

/** `call` hands back `{error}` for refusals; planning endpoints raise, so both shapes land here. */
export function gridPayload(args: GridArgs): Promise<Envelope<GridPayload>> {
  return call<GridPayload>(APP + "budget.grid_payload", { ...args });
}

export const setBudgetCell = (a: { block: string; month: string; value: number; grade?: string }) =>
  call<{ total: number }>(APP + "budget.set_budget_cell", { ...a });

export const setForecastCell = (a: {
  block: string;
  grade: string;
  week: number;
  value: number;
  year?: number;
  reason?: string;
  note?: string;
}) => call<{ forecast: string; revision: number }>(APP + "budget.set_forecast_cell", { ...a });

export const generateAllBudgets = (year: number) =>
  call<{ generated: number }>(APP + "budget.generate_all_budgets", { year });

export const reviseBlocks = (a: { blocks: string[]; year: number; start_week: number; window_weeks: number }) =>
  call<{ revised: number; failed: { block: string; error: string }[] }>(APP + "budget.revise_blocks", { ...a });

export interface CellHistory {
  block: string;
  greenhouse: string;
  variety: string;
  week: number;
  year: number;
  grade: string;
  budget: number | null;
  actual: number | null;
  current: number | null;
  revisions: {
    revision: number;
    status: string;
    value: number;
    budget: number;
    reason?: string | null;
    note?: string | null;
    by: string;
    at: string;
    window: string;
    changed: boolean;
  }[];
  edits: { at: string; by: string; from: number | null; to: number | null }[];
}
export const cellHistory = (a: { block: string; week: number; grade: string; year?: number }) =>
  call<CellHistory>(APP + "budget.cell_history", { ...a });

export interface Calibration {
  variety: string;
  greenhouse: string;
  weeks_observed: number;
  grade_mix: Record<string, number>;
  applied: boolean;
  warning?: string;
  steady_stems_per_week?: number;
  implied_max_stems_per_plant_per_cut?: number;
  plants?: number;
  protocol?: string | null;
}
export const calibrateVariety = (a: { variety: string; greenhouse?: string; min_weeks?: number; apply?: 0 | 1 }) =>
  call<Calibration>(APP + "budget.calibrate_variety", { ...a });

/** frappe.client.get_list, the core read the legacy overview and protocol views use. */
export async function getList<T>(
  doctype: string,
  fields: string[],
  extra: Record<string, unknown> = {},
): Promise<T[] | { error: string }> {
  const r = await call<T[]>("frappe.client.get_list", {
    doctype,
    fields,
    limit_page_length: 0,
    ...extra,
  });
  return Array.isArray(r) ? r : isError(r) ? r : { error: "Unexpected response." };
}

export const getDoc = <T,>(doctype: string, name: string) =>
  call<T>("frappe.client.get", { doctype, name });

export { isError };
