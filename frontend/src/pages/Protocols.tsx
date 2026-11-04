import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { SearchInput } from "@/components/SearchInput";
import { ScrollTable, STICKY_HEAD } from "@/components/ScrollTable";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { ClassicLink, CropFilter, ReloadButton } from "@/components/PlanningFilters";
import { RowsSkeleton } from "@/components/Loading";
import { usePlanning } from "@/lib/planning";
import { getDoc, getList, isError } from "@/lib/api";

interface Proto {
  name: string;
  protocol_name: string;
  variety_item: string | null;
  crop_type: string | null;
  weeks_to_first_bending: number;
  weeks_between_cuts: number;
  stems_per_cut: number;
  max_stems_per_plant_per_cut: number;
  productive_life_weeks: number;
  reject_pct: number;
  plants_per_sqm: number;
}
interface ProtoDoc extends Proto {
  grade_mix?: { length_cm: number; pct: number; source: string }[];
  flush_schedule?: Record<string, unknown>[];
}
const FIELDS = ["name", "protocol_name", "variety_item", "crop_type", "weeks_to_first_bending", "weeks_between_cuts", "stems_per_cut", "max_stems_per_plant_per_cut", "productive_life_weeks", "reject_pct", "plants_per_sqm"];

/** Crop Protocols: the yield model every budget is built from. Read here; edit on the desk form. */
export function Protocols() {
  const { inOpenCrop, nameOf } = usePlanning();
  const [rows, setRows] = useState<Proto[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<ProtoDoc | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    setRows(null);
    void getList<Proto>("Crop Protocol", FIELDS, { order_by: "modified desc" }).then((r) => (isError(r) ? setErr(r.error) : setRows(r as Proto[])));
  }, [nonce]);

  const shown = useMemo(() => (rows ?? []).filter((r) => inOpenCrop(r.variety_item ?? "") && (!q.trim() || `${r.protocol_name} ${r.variety_item} ${nameOf(r.variety_item)} ${r.crop_type}`.toLowerCase().includes(q.trim().toLowerCase()))), [rows, q, inOpenCrop, nameOf]);
  const num = (n: number | null | undefined) => (n == null ? "—" : Number(n).toLocaleString("en-US"));
  const head = "py-2 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--sd-quiet)]";

  return (
    <PageShell
      title="Crop Protocols"
      eyebrow="Crop Material Planning"
      description="Weeks to bending, cut cycle, stems per cut and grade mix per variety. Budgets are generated from these."
      actions={<><CropFilter /><SearchInput value={q} onChange={setQ} placeholder="Protocol or variety…" className="w-56" /><ReloadButton /><a className="inline-flex h-9 items-center gap-2 rounded-full bg-card px-4 text-xs font-medium shadow-[var(--sd-shadow-1)]" href="/desk/crop-protocol/new"><ExternalLink className="h-3.5 w-3.5" />New protocol</a><ClassicLink view="protocols" /></>}
    >
      {err && <p className="text-[13px] text-[var(--sd-data-red)]">{err}</p>}
      <Card>
        {!rows ? (
          <div className="p-4"><RowsSkeleton rows={6} /></div>
        ) : (
          <ScrollTable tall>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left">
                  {["Protocol", "Variety", "Crop type", "To 1st bending (wk)", "Between cuts (wk)", "Stems / cut", "Max / plant / cut", "Life (wk)", "Reject %", "Plants / m²"].map((h, i) => (
                    <th key={h} className={`${head} ${i > 2 ? "text-right" : ""} ${STICKY_HEAD}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.name} className="cursor-pointer border-t border-[var(--sd-line-soft)] tabular-nums hover:bg-[var(--sd-bg-soft)]" onClick={() => void getDoc<ProtoDoc>("Crop Protocol", r.name).then((d) => setOpen(isError(d) ? { ...r } : (d as ProtoDoc)))}>
                    <td className="px-3 py-2 font-medium text-[var(--sd-ink)]">{r.protocol_name || r.name}</td>
                    <td className="px-3" title={r.variety_item ? `Item ${r.variety_item}` : undefined}>{r.variety_item ? nameOf(r.variety_item) : "—"}</td>
                    <td className="px-3">{r.crop_type ?? "—"}</td>
                    <td className="px-3 text-right">{num(r.weeks_to_first_bending)}</td>
                    <td className="px-3 text-right">{num(r.weeks_between_cuts)}</td>
                    <td className="px-3 text-right">{num(r.stems_per_cut)}</td>
                    <td className="px-3 text-right">{num(r.max_stems_per_plant_per_cut)}</td>
                    <td className="px-3 text-right">{num(r.productive_life_weeks)}</td>
                    <td className="px-3 text-right">{num(r.reject_pct)}</td>
                    <td className="px-3 text-right">{num(r.plants_per_sqm)}</td>
                  </tr>
                ))}
                {!shown.length && <tr><td colSpan={10} className="px-3 py-8 text-center text-[var(--sd-quiet)]">No protocols.</td></tr>}
              </tbody>
            </table>
          </ScrollTable>
        )}
      </Card>

      <Dialog open={!!open} onOpenChange={(o) => !o && (setOpen(null), setNonce((n) => n))}>
        <DialogContent className="max-w-lg">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.protocol_name || open.name}</DialogTitle>
                <DialogDescription>{open.variety_item ? `${nameOf(open.variety_item)} (Item ${open.variety_item})` : "No variety linked"} · {open.crop_type ?? "—"}</DialogDescription>
              </DialogHeader>
              <div>
                <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--sd-quiet)]">Grade mix</div>
                {open.grade_mix?.length ? (
                  <table className="w-full text-[12px] tabular-nums">
                    <tbody>
                      {[...open.grade_mix].sort((a, b) => a.length_cm - b.length_cm).map((g) => (
                        <tr key={g.length_cm} className="border-t border-[var(--sd-line-soft)]"><td className="py-1">{g.length_cm} cm</td><td className="text-right">{g.pct}%</td><td className="text-right text-[var(--sd-quiet)]">{g.source}</td></tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="text-[12px] text-[var(--sd-quiet)]">No grade mix on this protocol.</p>}
              </div>
              <a className="inline-flex items-center gap-2 text-[12px] font-medium underline" href={`/desk/crop-protocol/${encodeURIComponent(open.name)}`}><ExternalLink className="h-3.5 w-3.5" />Edit on the desk</a>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
