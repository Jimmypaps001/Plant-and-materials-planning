import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { KpiCard, KpiGrid } from "@/components/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterSelect } from "@/components/FilterSelect";
import { SearchInput } from "@/components/SearchInput";
import { ClearFiltersPill } from "@/components/ClearFiltersPill";
import { PageSkeleton } from "@/components/Loading";
import { ScrollTable, STICKY_HEAD } from "@/components/ScrollTable";
import { getList, isError } from "@/lib/api";
import { fmtN } from "@/lib/grid";
import { PALETTE } from "@/lib/palette";

interface Gh { name: string; farm: string | null; number_of_beds: number; number_of_plants: number; area_planted: number; gross_area: number }
interface Cycle { name: string; greenhouse: string; farm: string | null; variety: string; status: string; qty_planted: number; plants_standing: number; planted_area: number; planting_date: string | null }

const AXIS = { fontSize: 11, fill: "var(--sd-quiet)" } as const;

function by<T>(rows: T[], key: (r: T) => string, val: (r: T) => number) {
  const m = new Map<string, number>();
  rows.forEach((r) => m.set(key(r) || "—", (m.get(key(r) || "—") ?? 0) + val(r)));
  return [...m.entries()].map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
}

/** Production overview (legacy Dashboard tab): area, plants and plantings across every farm, from Crop Cycle and Greenhouse. */
export function OverviewTab() {
  const [ghs, setGhs] = useState<Gh[] | null>(null);
  const [ccs, setCcs] = useState<Cycle[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [farm, setFarm] = useState("");
  const [gh, setGh] = useState("");
  const [variety, setVariety] = useState("");
  const [year, setYear] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    void Promise.all([
      getList<Gh>("Greenhouse", ["name", "farm", "number_of_beds", "number_of_plants", "area_planted", "gross_area"]),
      getList<Cycle>("Crop Cycle", ["name", "greenhouse", "farm", "variety", "status", "qty_planted", "plants_standing", "planted_area", "planting_date"]),
    ]).then(([g, c]) => {
      if (isError(g)) return setErr(g.error);
      if (isError(c)) return setErr(c.error);
      setGhs(g as Gh[]);
      setCcs(c as Cycle[]);
    });
  }, []);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (ccs ?? []).filter(
      (c) =>
        (!farm || c.farm === farm) &&
        (!gh || c.greenhouse === gh) &&
        (!variety || c.variety === variety) &&
        (!year || (c.planting_date ?? "").startsWith(year)) &&
        (!needle || `${c.greenhouse} ${c.variety} ${c.name}`.toLowerCase().includes(needle)),
    );
  }, [ccs, farm, gh, variety, year, q]);

  if (err) return <p className="text-[13px] text-[var(--sd-muted)]">Could not load Crop Cycle / Greenhouse data: {err}</p>;
  if (!ghs || !ccs) return <PageSkeleton />;

  const uniq = (f: (c: Cycle) => string | null | undefined) => [...new Set(ccs.map(f).filter(Boolean) as string[])].sort();
  const active = rows.filter((c) => c.status === "Active");
  const plants = active.reduce((t, c) => t + (c.plants_standing || 0), 0);
  const area = active.reduce((t, c) => t + (c.planted_area || 0), 0);
  const ghCount = new Set(active.map((c) => c.greenhouse)).size;
  const dirty = !!(farm || gh || variety || year || q);

  const byFarm = by(active, (c) => c.farm ?? "", (c) => c.planted_area || 0);
  const topVar = by(active, (c) => c.variety, (c) => c.plants_standing || 0).slice(0, 10);
  const status = by(rows, (c) => c.status, () => 1);
  const byYear = by(rows, (c) => (c.planting_date ?? "").slice(0, 4), () => 1).sort((a, b) => a.k.localeCompare(b.k));
  const table = by(active, (c) => c.greenhouse, (c) => c.plants_standing || 0).map((r) => {
    const cs = active.filter((c) => c.greenhouse === r.k);
    return { gh: r.k, farm: cs[0]?.farm, cycles: cs.length, varieties: new Set(cs.map((c) => c.variety)).size, plants: r.v, area: cs.reduce((t, c) => t + (c.planted_area || 0), 0) };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect label="Farm" value={farm} onChange={setFarm} options={uniq((c) => c.farm)} allLabel="All farms" />
        <FilterSelect label="Greenhouse" value={gh} onChange={setGh} options={uniq((c) => c.greenhouse)} allLabel="All greenhouses" />
        <FilterSelect label="Variety" value={variety} onChange={setVariety} options={uniq((c) => c.variety)} allLabel="All varieties" />
        <FilterSelect label="Planting year" value={year} onChange={setYear} options={uniq((c) => (c.planting_date ?? "").slice(0, 4)).reverse()} allLabel="All years" />
        <SearchInput value={q} onChange={setQ} placeholder="greenhouse, variety, cycle…" className="w-56" />
        <ClearFiltersPill active={dirty} onClear={() => { setFarm(""); setGh(""); setVariety(""); setYear(""); setQ(""); }} />
      </div>

      <KpiGrid cols={5}>
        <KpiCard label="Plants standing" value={plants} />
        <KpiCard label="Greenhouses" value={ghCount} hint={`of ${ghs.length} on file`} />
        <KpiCard label="Planted area" value={(area / 10000).toFixed(2)} hint="ha" tone="warning" />
        <KpiCard label="Active cycles" value={active.length} hint={`${rows.length} cycles in view`} />
        <KpiCard label="Varieties" value={new Set(active.map((c) => c.variety)).size} />
      </KpiGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-[14px]">Planted area by farm (m²)</CardTitle></CardHeader><CardContent>
          <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={byFarm}><XAxis dataKey="k" tick={AXIS} axisLine={false} tickLine={false} /><YAxis tick={AXIS} axisLine={false} tickLine={false} width={48} /><RTooltip formatter={(v: number) => fmtN(Math.round(v))} /><Bar dataKey="v" name="m²" radius={4} fill="var(--sd-data-green)" /></BarChart></ResponsiveContainer></div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-[14px]">Top varieties by plants</CardTitle></CardHeader><CardContent>
          <div style={{ height: Math.max(160, topVar.length * 26) }}><ResponsiveContainer width="100%" height="100%"><BarChart data={topVar} layout="vertical" margin={{ left: 8, right: 16 }}><XAxis type="number" hide /><YAxis type="category" dataKey="k" tick={AXIS} axisLine={false} tickLine={false} width={110} /><RTooltip formatter={(v: number) => fmtN(v)} /><Bar dataKey="v" name="Plants" radius={4} fill="var(--sd-data-cyan)" /></BarChart></ResponsiveContainer></div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-[14px]">Cycles by status</CardTitle></CardHeader><CardContent>
          <div className="h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={status} dataKey="v" nameKey="k" innerRadius={50} outerRadius={80} paddingAngle={2}>{status.map((s, i) => <Cell key={s.k} fill={PALETTE[i % PALETTE.length]} />)}</Pie><RTooltip /></PieChart></ResponsiveContainer></div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-[14px]">Plantings by year</CardTitle></CardHeader><CardContent>
          <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={byYear}><XAxis dataKey="k" tick={AXIS} axisLine={false} tickLine={false} /><YAxis tick={AXIS} axisLine={false} tickLine={false} width={32} allowDecimals={false} /><RTooltip /><Bar dataKey="v" name="Cycles" radius={4} fill="var(--sd-data-amber)" /></BarChart></ResponsiveContainer></div>
        </CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="text-[14px]">Greenhouses</CardTitle></CardHeader><CardContent>
        <ScrollTable>
          <table className="w-full text-[12px]">
            <thead><tr className="text-left text-[10px] uppercase tracking-[0.14em] text-[var(--sd-quiet)]">
              {["Greenhouse", "Farm", "Cycles", "Varieties", "Plants", "Area m²"].map((h, i) => <th key={h} className={`py-1 font-medium ${i > 1 ? "text-right" : ""} ${STICKY_HEAD}`}>{h}</th>)}
            </tr></thead>
            <tbody>{table.map((r) => (
              <tr key={r.gh} className="border-t border-[var(--sd-line-soft)] tabular-nums">
                <td className="py-1.5">{r.gh}</td><td>{r.farm ?? "—"}</td><td className="text-right">{r.cycles}</td><td className="text-right">{r.varieties}</td><td className="text-right">{fmtN(r.plants)}</td><td className="text-right">{fmtN(Math.round(r.area))}</td>
              </tr>))}</tbody>
          </table>
        </ScrollTable>
      </CardContent></Card>
    </div>
  );
}
