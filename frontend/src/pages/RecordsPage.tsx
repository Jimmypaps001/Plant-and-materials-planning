import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { SearchInput } from "@/components/SearchInput";
import { ScrollTable, STICKY_HEAD } from "@/components/ScrollTable";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClassicLink, CropFilter, ReloadButton } from "@/components/PlanningFilters";
import { RowsSkeleton } from "@/components/Loading";
import { getDoc, getList, isError } from "@/lib/api";
import { usePlanning } from "@/lib/planning";
import type { View } from "@/lib/router";

export interface Col {
  key: string;
  label: string;
  /** "item" shows the Item's item_name; "num" right-aligns and groups thousands; "pct" adds a percent sign */
  kind?: "item" | "num" | "pct" | "text" | "date";
}
export interface RecordsConfig {
  view: View;
  title: string;
  doctype: string;
  blurb: string;
  cols: Col[];
  /** the field holding an Item code, used for the crop filter and the item-name labels */
  itemField?: string;
  order?: string;
}

type Row = Record<string, unknown>;

const slug = (dt: string) => dt.toLowerCase().replace(/\s+/g, "-");
const fmt = (v: unknown, kind?: Col["kind"]) => {
  if (v == null || v === "") return "—";
  if (kind === "num") return Number(v).toLocaleString("en-US");
  if (kind === "pct") return `${Number(v).toFixed(1)}%`;
  return String(v);
};

/** A list of one of this app's own doctypes, with the crop filter, item names, and a detail dialog (header figures
 *  and every child table). The full form stays on the desk, one click away. */
export function RecordsPage({ cfg }: { cfg: RecordsConfig }) {
  const { inOpenCrop, nameOf } = usePlanning();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Row | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    setRows(null);
    const fields = ["name", ...new Set([...cfg.cols.map((c) => c.key), ...(cfg.itemField ? [cfg.itemField] : [])])].filter((f) => f !== "name");
    void getList<Row>(cfg.doctype, ["name", ...fields], { order_by: cfg.order ?? "modified desc" }).then((r) =>
      isError(r) ? setErr(r.error) : setRows(r as Row[]),
    );
  }, [cfg, nonce]);

  const cell = (r: Row, c: Col) => {
    const v = r[c.key];
    if (c.kind === "item") return v ? nameOf(String(v)) : "—";
    return fmt(v, c.kind);
  };
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        (!cfg.itemField || inOpenCrop(String(r[cfg.itemField] ?? ""))) &&
        (!needle || cfg.cols.map((c) => `${r[c.key] ?? ""} ${c.kind === "item" ? nameOf(String(r[c.key] ?? "")) : ""}`).join(" ").toLowerCase().includes(needle)),
    );
  }, [rows, q, cfg, inOpenCrop, nameOf]);

  return (
    <PageShell
      title={cfg.title}
      eyebrow="Crop Material Planning"
      description={cfg.blurb}
      actions={
        <>
          {cfg.itemField && <CropFilter />}
          <SearchInput value={q} onChange={setQ} placeholder="Search…" className="w-52" />
          <ReloadButton />
          <ClassicLink view={cfg.view} />
        </>
      }
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
                  {cfg.cols.map((c) => (
                    <th key={c.key} className={`px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--sd-quiet)] ${c.kind === "num" || c.kind === "pct" ? "text-right" : ""} ${STICKY_HEAD}`}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={String(r.name)} className="cursor-pointer border-t border-[var(--sd-line-soft)] tabular-nums hover:bg-[var(--sd-bg-soft)]" onClick={() => setOpen(r)}>
                    {cfg.cols.map((c, i) => (
                      <td key={c.key} className={`px-3 py-2 ${i === 0 ? "font-medium text-[var(--sd-ink)]" : ""} ${c.kind === "num" || c.kind === "pct" ? "text-right" : ""}`} title={c.kind === "item" && r[c.key] ? `Item ${r[c.key]}` : undefined}>
                        {cell(r, c)}
                      </td>
                    ))}
                  </tr>
                ))}
                {!shown.length && <tr><td colSpan={cfg.cols.length} className="px-3 py-8 text-center text-[var(--sd-quiet)]">Nothing to show.</td></tr>}
              </tbody>
            </table>
          </ScrollTable>
        )}
      </Card>
      <p className="text-[11px] text-[var(--sd-quiet)]">{rows ? `${shown.length} of ${rows.length}` : ""}</p>
      <Detail cfg={cfg} row={open} onClose={() => { setOpen(null); setNonce((n) => n); }} nameOf={nameOf} />
    </PageShell>
  );
}

const SKIP = new Set(["owner", "creation", "modified", "modified_by", "docstatus", "idx", "doctype", "naming_series", "name", "__unsaved", "parent", "parenttype", "parentfield"]);

function Detail({ cfg, row, onClose, nameOf }: { cfg: RecordsConfig; row: Row | null; onClose: () => void; nameOf: (c: string) => string }) {
  const [doc, setDoc] = useState<Row | null>(null);
  useEffect(() => {
    setDoc(null);
    if (!row) return;
    void getDoc<Row>(cfg.doctype, String(row.name)).then((d) => setDoc(isError(d) ? null : (d as Row)));
  }, [row, cfg.doctype]);
  if (!row) return null;
  const d = doc ?? row;
  const heads = Object.entries(d).filter(([k, v]) => !SKIP.has(k) && !Array.isArray(v) && v !== null && v !== "" && v !== 0 && typeof v !== "object");
  const tables = Object.entries(d).filter(([, v]) => Array.isArray(v) && v.length) as [string, Row[]][];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{String(row.name)}</DialogTitle>
          <DialogDescription>
            {cfg.itemField && row[cfg.itemField] ? `${nameOf(String(row[cfg.itemField]))} (Item ${row[cfg.itemField]})` : cfg.title}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] sm:grid-cols-3">
          {heads.slice(0, 30).map(([k, v]) => (
            <div key={k} className="flex flex-col py-1">
              <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--sd-quiet)]">{k.replace(/_/g, " ")}</span>
              <span className="tabular-nums text-[var(--sd-ink)]">{typeof v === "number" ? v.toLocaleString("en-US") : String(v)}</span>
            </div>
          ))}
        </div>
        {tables.map(([k, rowsOf]) => {
          const keys = Object.keys(rowsOf[0]).filter((c) => !SKIP.has(c) && typeof rowsOf[0][c] !== "object").slice(0, 8);
          return (
            <div key={k}>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--sd-quiet)]">{k.replace(/_/g, " ")} ({rowsOf.length})</div>
              <ScrollTable>
                <table className="w-full text-[11px] tabular-nums">
                  <thead><tr className="text-left">{keys.map((c) => <th key={c} className={`px-2 py-1 font-medium text-[var(--sd-quiet)] ${STICKY_HEAD}`}>{c.replace(/_/g, " ")}</th>)}</tr></thead>
                  <tbody>{rowsOf.slice(0, 80).map((r, i) => <tr key={i} className="border-t border-[var(--sd-line-soft)]">{keys.map((c) => <td key={c} className="px-2 py-1">{r[c] == null ? "—" : typeof r[c] === "number" ? (r[c] as number).toLocaleString("en-US") : String(r[c])}</td>)}</tr>)}</tbody>
                </table>
              </ScrollTable>
            </div>
          );
        })}
        <a className="inline-flex items-center gap-2 text-[12px] font-medium underline" href={`/desk/${slug(cfg.doctype)}/${encodeURIComponent(String(row.name))}`}>
          <ExternalLink className="h-3.5 w-3.5" />Open the full form on the desk
        </a>
      </DialogContent>
    </Dialog>
  );
}

export const RECORDS: RecordsConfig[] = [
  {
    view: "market-demand", title: "Market Demand", doctype: "Summer Flower Market Demand", itemField: "variety",
    blurb: "What the market asks for, week by week, per variety and farm. Production plans are built from these.",
    cols: [
      { key: "variety", label: "Variety", kind: "item" }, { key: "farm", label: "Farm" },
      { key: "horizon_start", label: "From" }, { key: "horizon_end", label: "To" },
      { key: "weeks_covered", label: "Weeks", kind: "num" }, { key: "total_demand_stems", label: "Demand stems", kind: "num" },
      { key: "firm_demand_stems", label: "Firm", kind: "num" }, { key: "peak_weekly_demand", label: "Peak week", kind: "num" },
      { key: "horizon_status", label: "Horizon" },
    ],
  },
  {
    view: "production-plans", title: "Production Plans", doctype: "Summer Flower Production Plan", itemField: "variety",
    blurb: "Plant plans: what to grow, where and when, to meet the demand. Each carries its weeks, months and blocks.",
    cols: [
      { key: "name", label: "Plan" }, { key: "variety", label: "Variety", kind: "item" }, { key: "farm", label: "Farm" },
      { key: "season", label: "Season" }, { key: "workflow_state", label: "Status" },
      { key: "total_production_stems", label: "Production", kind: "num" }, { key: "total_demand_stems", label: "Demand", kind: "num" },
      { key: "coverage_pct", label: "Coverage", kind: "pct" }, { key: "weeks_in_deficit", label: "Weeks short", kind: "num" },
      { key: "new_beds_required", label: "New beds", kind: "num" },
    ],
  },
  {
    view: "season-plans", title: "Season Plans", doctype: "Summer Flower Season Plan", itemField: "variety",
    blurb: "The planting calendar for a season: plantings, beds and plants, first and last planting and cut.",
    cols: [
      { key: "name", label: "Season plan" }, { key: "variety", label: "Variety", kind: "item" }, { key: "farm", label: "Farm" },
      { key: "season", label: "Season" }, { key: "plantings", label: "Plantings", kind: "num" }, { key: "beds", label: "Beds", kind: "num" },
      { key: "plants", label: "Plants", kind: "num" }, { key: "blocks_used", label: "Blocks", kind: "num" },
      { key: "first_planting", label: "First planting", kind: "date" }, { key: "last_planting", label: "Last planting", kind: "date" },
    ],
  },
  {
    view: "budgets", title: "Budgets", doctype: "Summer Flower Budget", itemField: "variety",
    blurb: "The stems and value budgeted per month and fiscal year, built from each production plan.",
    cols: [
      { key: "name", label: "Budget" }, { key: "variety", label: "Variety", kind: "item" }, { key: "farm", label: "Farm" },
      { key: "budget_status", label: "Status" }, { key: "months_covered", label: "Months", kind: "num" },
      { key: "total_stems", label: "Stems", kind: "num" }, { key: "total_value", label: "Value", kind: "num" },
      { key: "production_plan", label: "Production plan" },
    ],
  },
  {
    view: "procurement", title: "Procurement", doctype: "Summer Flower Procurement Plan", itemField: "variety",
    blurb: "What to buy or raise, from whom and by when, to plant the production plan.",
    cols: [
      { key: "name", label: "Plan" }, { key: "variety", label: "Variety", kind: "item" }, { key: "farm", label: "Farm" },
      { key: "season", label: "Season" }, { key: "status", label: "Status" }, { key: "method", label: "Method" },
      { key: "entry_stage", label: "Entry stage" }, { key: "supplier", label: "Supplier" },
      { key: "total_plants_at_field", label: "Plants at field", kind: "num" }, { key: "total_units_to_order", label: "Units to order", kind: "num" },
      { key: "beds_required", label: "Beds", kind: "num" },
    ],
  },
  {
    view: "routes", title: "Material Routes", doctype: "Material Route",
    blurb: "The stages planting material passes through, from the lab or supplier to the bed.",
    cols: [{ key: "route_name", label: "Route" }, { key: "summary", label: "Summary" }, { key: "bought", label: "Bought in" }],
    order: "route_name asc",
  },
];
