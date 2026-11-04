import { useMemo, useState } from "react";
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { PageShell } from "@/components/PageShell";
import { KpiCard, KpiGrid } from "@/components/KpiCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/Loading";
import { ClassicLink, CropFilter, ReloadButton, SourceFilter, YearFilter } from "@/components/PlanningFilters";
import { OverviewTab } from "@/pages/OverviewTab";
import { fmtM, fmtMU, fmtN, signed, unitM } from "@/lib/grid";
import { house, usePlanning } from "@/lib/planning";
import { PALETTE, colourFor } from "@/lib/palette";
import type { Block, GridPayload } from "@/lib/api";


const AXIS = { fontSize: 11, fill: "var(--sd-quiet)" } as const;

export interface Summary {
  bud: number[];
  act: (number | null)[];
  vsBudget: number | null;
  monthsCompared: number;
  week: number;
  area: number;
  houses: number;
}

/** The same like-for-like comparison the legacy dashboard draws: only the budget of blocks that reported. */
export function summarise(p: GridPayload, blocks: Block[]): Summary {
  const M = p.months;
  const bud = M.map((_, i) => blocks.reduce((t, b) => t + (b.monthly.budget[i] || 0), 0));
  const act = M.map((_, i) => {
    const vals = blocks.map((b) => b.monthly.actual[i]).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, v) => a + v, 0) : null;
  });
  let pb = 0;
  let pa = 0;
  let n = 0;
  M.forEach((_, i) => {
    let mb = 0;
    let ma = 0;
    let any = false;
    blocks.forEach((b) => {
      const v = b.monthly.actual[i];
      if (v == null) return;
      any = true;
      ma += v;
      mb += b.monthly.budget[i] || 0;
    });
    if (any && mb) {
      pb += mb;
      pa += ma;
      n++;
    }
  });
  const wi = p.weeks.indexOf(p.now_week);
  const week = blocks.reduce((t, b) => (wi < 0 ? t : t + ((b.weekly.revised[wi] ?? b.weekly.budget[wi]) || 0)), 0);
  return {
    bud,
    act,
    vsBudget: pb ? Math.round(((pa - pb) / pb) * 100) : null,
    monthsCompared: n,
    week,
    area: blocks.reduce((t, b) => t + (b.area || 0), 0),
    houses: new Set(blocks.map((b) => b.greenhouse)).size,
  };
}

function Panel({ title, note, children, className }: { title: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
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

function BudgetTab() {
  const { payload, blocks, loading, error } = usePlanning();
  const s = useMemo(() => (payload ? summarise(payload, blocks) : null), [payload, blocks]);
  if (!payload || !s) return loading ? <PageSkeleton /> : <p className="text-[13px] text-[var(--sd-muted)]">{error ?? "No data."}</p>;
  if (!blocks.length)
    return <p className="text-[13px] text-[var(--sd-muted)]">No blocks. Record a Crop Cycle to begin.</p>;

  const budgetTotal = blocks.reduce((t, b) => t + b.budget_total, 0);
  const allVar = payload.blocks.map((b) => b.variety);
  const curve = payload.months.map((m, i) => ({ month: m, budget: s.bud[i], actual: s.act[i] }));
  const peak = s.bud.indexOf(Math.max(...s.bud));

  const byVariety = Object.entries(
    blocks.reduce<Record<string, number>>((a, b) => ({ ...a, [b.variety]: (a[b.variety] || 0) + b.budget_total }), {}),
  )
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  const houses = [...new Set(blocks.map((b) => b.greenhouse))];
  const varsInHouses = [...new Set(blocks.map((b) => b.variety))];
  const split = houses.map((h) => ({
    house: house(h),
    ...Object.fromEntries(varsInHouses.map((v) => [v, blocks.filter((b) => b.greenhouse === h && b.variety === v).reduce((t, b) => t + b.budget_total, 0)])),
  }));

  const gradeTotals = Object.entries(
    blocks.reduce<Record<string, number>>((a, b) => {
      b.weekly.grades.forEach((g) => {
        a[g.grade] = (a[g.grade] || 0) + g.values.reduce<number>((t, v) => t + (v || 0), 0);
      });
      return a;
    }, {}),
  )
    .filter(([g, v]) => g !== "all" && v > 0)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

  const top = [...blocks].sort((a, b) => b.budget_total - a.budget_total).slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <KpiGrid>
        <KpiCard label="Crop year budget" value={fmtM(budgetTotal)} hint={`${unitM(budgetTotal)} · ${blocks.length} blocks · ${s.houses} houses`} />
        <KpiCard label="This week" value={fmtM(s.week)} hint={`W${payload.now_week} planned · ${fmtN(payload.week_actual_total)} cut`} tone="accent" />
        <KpiCard
          label="Actual vs budget"
          value={s.vsBudget == null ? "—" : `${signed(s.vsBudget)}%`}
          tone={s.vsBudget == null ? "default" : s.vsBudget >= 0 ? "good" : "critical"}
          hint={s.monthsCompared ? `${s.monthsCompared} month${s.monthsCompared === 1 ? "" : "s"} harvested` : payload.actual_total ? `${fmtN(payload.actual_total)} stems cut · no budget to compare` : "no actuals yet"}
        />
        <KpiCard label="Planted area" value={(s.area / 10000).toFixed(2)} hint={`ha · ${fmtN(Math.round(s.area))} m² under glass`} tone="warning" />
      </KpiGrid>

      {payload.unassigned_actuals.length > 0 && (
        <Card>
          <CardContent className="pt-5 text-[12px] text-[var(--sd-muted)]">
            <b className="text-[var(--sd-ink)]">Harvested with no crop cycle: </b>
            {payload.unassigned_actuals.slice(0, 6).map((u) => `${u.variety} @ ${house(u.greenhouse)} — ${fmtN(u.stems)}`).join(" · ")}
            {payload.unassigned_actuals.length > 6 ? " · …" : ""} — plant these as crop cycles so their actuals join the budget.
          </CardContent>
        </Card>
      )}

      <Panel title="Crop year" note={`peak ${payload.months[peak]} · ${fmtMU(s.bud[peak] || 0)}`}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={curve} margin={{ left: 0, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="budfill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--sd-data-cyan)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--sd-data-cyan)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--sd-line)" />
              <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} tickFormatter={(v: number) => fmtMU(v)} />
              <RTooltip formatter={(v: number) => fmtN(v)} />
              <Area type="monotone" dataKey="budget" name="Budget" stroke="var(--sd-data-cyan)" fill="url(#budfill)" strokeWidth={2} />
              <Line type="monotone" dataKey="actual" name="Actual" stroke="var(--sd-data-green)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Variety mix" note={`${byVariety.length} of ${new Set(allVar).size} varieties budgeted`}>
          <div style={{ height: Math.max(160, byVariety.length * 26) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byVariety.map(([v, n]) => ({ v, n }))} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="v" tick={AXIS} axisLine={false} tickLine={false} width={110} />
                <RTooltip formatter={(v: number) => fmtN(v)} />
                <Bar dataKey="n" name="Stems" radius={4}>
                  {byVariety.map(([v]) => <Cell key={v} fill={colourFor(allVar, v)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Grade mix" note="over the window">
          {gradeTotals.length ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={gradeTotals.map(([g, v]) => ({ g, v }))} dataKey="v" nameKey="g" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {gradeTotals.map(([g], i) => <Cell key={g} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <RTooltip formatter={(v: number) => fmtN(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-[12px] text-[var(--sd-quiet)]">No length profile in this window.</p>
          )}
        </Panel>
      </div>

      <Panel title="Greenhouses" note={`${houses.length} of ${new Set(payload.blocks.map((b) => b.greenhouse)).size} budgeted, split by variety`}>
        <div style={{ height: Math.max(180, houses.length * 28) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={split} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="house" tick={AXIS} axisLine={false} tickLine={false} width={70} />
              <RTooltip formatter={(v: number) => fmtN(v)} />
              {varsInHouses.map((v) => <Bar key={v} dataKey={v} stackId="s" fill={colourFor(allVar, v)} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Top blocks" note="by crop-year budget">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-[var(--sd-quiet)]">
              <th className="py-1 font-medium">Greenhouse</th><th className="font-medium">Variety</th>
              <th className="text-right font-medium">Area m²</th><th className="text-right font-medium">Stems / m²</th><th className="text-right font-medium">Budget</th>
            </tr>
          </thead>
          <tbody>
            {top.map((b) => (
              <tr key={b.key} className="border-t border-[var(--sd-line-soft)] tabular-nums">
                <td className="py-1.5">{house(b.greenhouse)}</td>
                <td>{b.variety}</td>
                <td className="text-right">{b.area ? fmtN(Math.round(b.area)) : "—"}</td>
                <td className="text-right">{fmtN(b.rate)}</td>
                <td className="text-right font-semibold">{fmtN(b.budget_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

export function Dashboard() {
  const { payload } = usePlanning();
  const [tab, setTab] = useState("budget");
  return (
    <PageShell
      title="Dashboard"
      eyebrow={payload ? `${payload.site} · Crop year ${payload.crop_year} · Sep – Aug` : "Crop Material Planning"}
      tabs={
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="overview">Production overview</TabsTrigger>
          </TabsList>
        </Tabs>
      }
      actions={
        <>
          <CropFilter />
          {tab === "budget" && <><YearFilter /><SourceFilter /></>}
          <ReloadButton />
          <ClassicLink view="dashboard" />
        </>
      }
    >
      {tab === "budget" ? <BudgetTab /> : <OverviewTab />}
    </PageShell>
  );
}
