import { useEffect, useState } from "react";
import { getList, isError } from "@/lib/api";

/** The real Summer Flower Budget (this app's own doctype): headers and their months. */
export interface SfBudget {
  name: string;
  variety: string | null;
  farm: string | null;
  production_plan: string | null;
  budget_status: string | null;
  total_stems: number;
  total_value: number;
  months_covered: number;
  docstatus: number;
}
export interface SfBudgetMonth {
  parent: string;
  year: number;
  month: number;
  stems: number;
  value: number;
}

export function useSfBudgets(): { budgets: SfBudget[]; months: SfBudgetMonth[]; loaded: boolean } {
  const [state, setState] = useState<{ budgets: SfBudget[]; months: SfBudgetMonth[]; loaded: boolean }>({ budgets: [], months: [], loaded: false });
  useEffect(() => {
    void Promise.all([
      getList<SfBudget>(
        "Summer Flower Budget",
        ["name", "variety", "farm", "production_plan", "budget_status", "total_stems", "total_value", "months_covered", "docstatus"],
        { filters: [["docstatus", "<", 2]] },
      ),
      getList<SfBudgetMonth>("Summer Flower Budget Month", ["parent", "year", "month", "stems", "value"], {
        parent: "Summer Flower Budget",
      }),
    ]).then(([b, m]) =>
      setState({ budgets: isError(b) ? [] : (b as SfBudget[]), months: isError(m) ? [] : (m as SfBudgetMonth[]), loaded: true }),
    );
  }, []);
  return state;
}

/** Sep-Aug crop year starting in `year`: stems and value per month label. */
export function cropYearMonths(
  months: SfBudgetMonth[],
  year: number,
  keep: (parent: string) => boolean,
  labels: string[],
): { stems: number[]; value: number[] } {
  const stems = labels.map(() => 0);
  const value = labels.map(() => 0);
  months.forEach((m) => {
    if (!keep(m.parent)) return;
    const idx = m.month >= 9 ? (m.year === year ? m.month - 9 : -1) : m.year === year + 1 ? m.month + 3 : -1;
    if (idx >= 0 && idx < 12) {
      stems[idx] += m.stems || 0;
      value[idx] += m.value || 0;
    }
  });
  return { stems, value };
}
