import { useMemo } from "react";
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { KpiCard, KpiGrid } from "@/components/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/Loading";
import { cropYearMonths, type SfBudget, type SfBudgetMonth } from "@/lib/sfbudget";
import { fmtMU, fmtN } from "@/lib/grid";
import { usePlanning } from "@/lib/planning";
import { colourFor } from "@/lib/palette";

const AXIS = { fontSize: 11, fill: "var(--sd-quiet)" } as const;
const LABELS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between gap-3">
          <CardTitle className="text-[14px]">{title}</CardTitle>
          {note && <span className="text-[11px] text-[var(--sd-quiet)]">{note}</span>}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** The dashboard read from the real Summer Flower Budget: stems and value per month of the chosen crop year. */
export function SfBudgetView({ budgets, months, loaded }: { budgets: SfBudget[]; months: SfBudgetMonth[]; loaded: boolean }) {
  const { year, inOpenCrop, nameOf } = usePlanning();
  const mine = useMemo(() => budgets.filter((b) => inOpenCrop(b.variety ?? "")), [budgets, inOpenCrop]);
  const keep = useMemo(() => {
    const ok = new Set(mine.map((b) => b.name));
    return (p: string) => ok.has(p);
  }, [mine]);
  const curve = useMemo(() => cropYearMonths(months, year, keep, LABELS), [months, year, keep]);

  const perBudget = useMemo(() => {
    const m = new Map<string, number>();
    months.forEach((r) => {
      if (!keep(r.parent)) return;
      const inYear = r.month >= 9 ? r.year === year : r.year === year + 1;
      if (inYear) m.set(r.parent, (m.get(r.parent) ?? 0) + (r.stems || 0));
    });
    return m;
  }, [months, keep, year]);

  if (!loaded) return <PageSkeleton />;
  const stems = curve.stems.reduce((a, b) => a + b, 0);
  const value = curve.value.reduce((a, b) => a + b, 0);
  if (!mine.length) return <p className="text-[13px] text-[var(--sd-muted)]">No Summer Flower Budget for this crop yet.</p>;

  const group = (key: (b: SfBudget) => string) => {
    const g = new Map<string, number>();
    mine.forEach((b) => g.set(key(b), (g.get(key(b)) ?? 0) + (perBudget.get(b.name) ?? 0)));
    return [...g.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  };
  const byVariety = group((b) => b.variety ?? "—");
  const byFarm = group((b) => b.farm ?? "—");
  const allVar = mine.map((b) => b.variety ?? "—");
  const peak = curve.stems.indexOf(Math.max(...curve.stems));
  const data = LABELS.map((m, i) => ({ month: m, stems: curve.stems[i], value: curve.value[i] }));

  return (
    <div className="flex flex-col gap-6">
      <KpiGrid>
        <KpiCard label="Crop year budget" value={fmtN(Math.round(stems))} hint={`stems · ${mine.length} budgets`} />
        <KpiCard label="Budgeted value" value={fmtMU(value)} hint={`over ${curve.stems.filter((v) => v).length} months`} tone="accent" />
        <KpiCard label="Varieties" value={new Set(mine.map((b) => b.variety)).size} hint={`${new Set(mine.map((b) => b.farm)).size} farms`} />
        <KpiCard label="Peak month" value={stems ? LABELS[peak] : "—"} hint={stems ? `${fmtMU(curve.stems[peak])} stems` : undefined} tone="warning" />
      </KpiGrid>

      <Panel title="Crop year" note="Summer Flower Budget, stems per month">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="sfbudfill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--sd-data-green)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--sd-data-green)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--sd-line)" />
              <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} width={48} tickFormatter={(v: number) => fmtMU(v)} />
              <RTooltip formatter={(v: number) => fmtN(Math.round(v))} />
              <Area type="monotone" dataKey="stems" name="Stems" stroke="var(--sd-data-green)" fill="url(#sfbudfill)" strokeWidth={2} />
              <Line type="monotone" dataKey="value" name="Value" stroke="var(--sd-data-amber)" strokeWidth={1.5} dot={false} yAxisId="v" hide />
              <YAxis yAxisId="v" hide />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Variety mix" note={`${byVariety.length} varieties`}>
          <div style={{ height: Math.max(160, Math.min(byVariety.length, 15) * 30) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byVariety.slice(0, 15).map(([v, n]) => ({ v: nameOf(v), n }))} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="v" tick={AXIS} axisLine={false} tickLine={false} width={150} interval={0} tickFormatter={(s: string) => (s.length > 24 ? s.slice(0, 23) + "…" : s)} />
                <RTooltip formatter={(v: number) => fmtN(Math.round(v))} />
                <Bar dataKey="n" name="Stems" radius={4}>
                  {byVariety.slice(0, 15).map(([v]) => <Cell key={v} fill={colourFor(allVar, v)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Farms" note="stems budgeted">
          <div style={{ height: Math.max(160, byFarm.length * 32) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byFarm.map(([f, n]) => ({ f, n }))} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="f" tick={AXIS} axisLine={false} tickLine={false} width={120} interval={0} />
                <RTooltip formatter={(v: number) => fmtN(Math.round(v))} />
                <Bar dataKey="n" name="Stems" radius={4} fill="var(--sd-data-cyan)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}
