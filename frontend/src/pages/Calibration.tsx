import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { PageShell } from "@/components/PageShell";
import { KpiCard, KpiGrid } from "@/components/KpiCard";
import { FilterSelect } from "@/components/FilterSelect";
import { ToolbarButton } from "@/components/ToolbarButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClassicLink, CropFilter } from "@/components/PlanningFilters";
import { useToast } from "@/components/Toast";
import { calibrateVariety, getDoc, isError, type Calibration as Cal } from "@/lib/api";
import { fmtN } from "@/lib/grid";
import { house, usePlanning } from "@/lib/planning";

const AXIS = { fontSize: 11, fill: "var(--sd-quiet)" } as const;
interface Protocol { grade_mix?: { length_cm: number; pct: number; source: string }[] }

/** Calibration: read harvest actuals back against the Crop Protocol (budget.calibrate_variety). Applying only rewrites the measured grade mix. */
export function Calibration() {
  const { payload, blocks: cropBlocks, inOpenCrop } = usePlanning();
  void inOpenCrop;
  const toast = useToast();
  const varieties = useMemo(() => [...new Set(cropBlocks.map((b) => b.variety))].sort(), [cropBlocks]);
  const houses = useMemo(() => [...new Set(cropBlocks.map((b) => b.greenhouse))].sort(), [cropBlocks]);
  const [variety, setVariety] = useState("");
  const [gh, setGh] = useState("");
  const [res, setRes] = useState<Cal | null>(null);
  const [current, setCurrent] = useState<Protocol | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (varieties.length && !varieties.includes(variety)) setVariety(varieties[0]);
    if (!varieties.length) setVariety("");
  }, [variety, varieties]);

  const run = async (apply: 0 | 1 = 0) => {
    if (!variety) return;
    setBusy(true);
    setErr(null);
    const r = await calibrateVariety({ variety, greenhouse: gh || undefined, apply });
    setBusy(false);
    if (isError(r)) return setErr(r.error);
    const c = r as Cal;
    setRes(c);
    if (apply) toast("Measured grade mix written to the Crop Protocol", "ok");
    if (c.protocol) {
      const d = await getDoc<Protocol>("Crop Protocol", c.protocol);
      setCurrent(isError(d) ? null : (d as Protocol));
    } else setCurrent(null);
  };
  useEffect(() => {
    void run(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variety, gh]);

  const mix = Object.entries(res?.grade_mix ?? {}).map(([cm, pct]) => ({
    cm: `${cm} cm`,
    measured: pct,
    protocol: current?.grade_mix?.find((g) => String(g.length_cm) === cm)?.pct ?? 0,
  }));
  const eff = payload?.model_error == null ? null : Math.max(0, 100 - Math.abs(payload.model_error));

  return (
    <PageShell
      title="Calibration"
      eyebrow="Crop Material Planning"
      description="Back-solve the Crop Protocol from real harvest. The grade mix can be applied; yield figures are reported only, because they need a grower's eye."
      actions={
        <>
          <CropFilter />
          <FilterSelect label="Variety" value={variety} onChange={setVariety} options={varieties} />
          <FilterSelect label="Greenhouse" value={gh} onChange={setGh} options={houses} allLabel="All greenhouses" format={house} />
          <ToolbarButton disabled={busy || !res || !Object.keys(res.grade_mix).length || !res.protocol} onClick={() => window.confirm(`Replace the measured grade mix on ${res?.protocol}?\n\nManual rows are kept.`) && void run(1)}>
            Apply grade mix
          </ToolbarButton>
          <ClassicLink view="calibration" />
        </>
      }
    >
      {err && <p className="text-[13px] text-[var(--sd-data-red)]">{err}</p>}
      <KpiGrid>
        <KpiCard label="Weeks observed" value={res?.weeks_observed ?? "—"} loading={busy && !res} />
        <KpiCard label="Steady stems / week" value={res?.steady_stems_per_week != null ? fmtN(res.steady_stems_per_week) : "—"} hint="plateau of the top half" />
        <KpiCard label="Implied max stems / plant / cut" value={res?.implied_max_stems_per_plant_per_cut ?? "—"} hint={res?.plants ? `${fmtN(res.plants)} plants` : undefined} />
        <KpiCard label="Model efficiency" value={eff == null ? "not calibrated" : `${eff.toFixed(1)}%`} tone={eff == null ? "default" : eff >= 95 ? "good" : eff >= 85 ? "warning" : "critical"} hint={payload?.model_note ?? undefined} />
      </KpiGrid>
      {res?.warning && <p className="text-[13px] text-[var(--sd-target)]">{res.warning}</p>}
      <Card>
        <CardHeader><CardTitle className="text-[14px]">Grade mix: measured vs protocol</CardTitle></CardHeader>
        <CardContent>
          {mix.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mix}>
                  <CartesianGrid vertical={false} stroke="var(--sd-line)" />
                  <XAxis dataKey="cm" tick={AXIS} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS} axisLine={false} tickLine={false} width={40} unit="%" />
                  <RTooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="protocol" name="Protocol" fill="var(--sd-series-5)" radius={4} />
                  <Bar dataKey="measured" name="Measured" fill="var(--sd-data-green)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-[12px] text-[var(--sd-quiet)]">No length-graded harvest recorded for this selection.</p>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
