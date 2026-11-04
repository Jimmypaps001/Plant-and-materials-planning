import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Download,
  Plus,
  Printer,
  Redo2,
  RefreshCw,
  Undo2,
  X,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { HeaderIconButton } from "@/components/header-controls";
import { TogglePill } from "@/components/TogglePill";
import { SearchInput } from "@/components/SearchInput";
import { FilterSelect } from "@/components/FilterSelect";
import { ScrollTable, STICKY_HEAD } from "@/components/ScrollTable";
import { CellDialog, type CellTarget } from "@/components/CellDialog";
import { MiniSpark } from "@/components/MiniSpark";
import { PageSkeleton } from "@/components/Loading";
import { useToast } from "@/components/Toast";
import { BlockFilter, ClassicLink, SourceFilter, WindowFilter, YearFilter } from "@/components/PlanningFilters";
import { generateAllBudgets, isError, reviseBlocks, setBudgetCell, setForecastCell } from "@/lib/api";
import {
  ALL,
  bulk,
  canEdit,
  cellId,
  derive,
  fmtM,
  fmtN,
  signed,
  sortBlocks,
  toCsv,
  unitM,
  variance,
  varianceTone,
  type BulkOp,
  type CellRef,
  type Derived,
  type Grain,
  type SortKey,
} from "@/lib/grid";
import { house, usePlanning } from "@/lib/planning";
import type { View } from "@/lib/router";
import { cn } from "@/lib/utils";

const TITLES: Record<Grain, { title: string; view: View; blurb: string }> = {
  month: {
    title: "Budget",
    view: "budget",
    blurb: "The crop-year budget by month for every greenhouse and variety. Double-click a month to override it; it is spread over that month's weeks.",
  },
  week: {
    title: "Forecast",
    view: "forecast",
    blurb: "Week by week revisions of the budget. Double-click a week to revise it; each edit is kept in the revision history.",
  },
  life: {
    title: "Lifetime",
    view: "lifetime",
    blurb: "Year-by-year budget over the whole life of each planting, from first harvest to uprooting. Read-only.",
  },
};

interface Edit {
  ref: CellRef;
  prev: number;
  next: number;
}

const TONE = {
  ok: "bg-[color-mix(in_srgb,var(--sd-data-green)_14%,transparent)]",
  up: "bg-[color-mix(in_srgb,var(--sd-data-cyan)_16%,transparent)]",
  dn: "bg-[color-mix(in_srgb,var(--sd-data-red)_14%,transparent)]",
};

export function GridPage({ grain }: { grain: Grain }) {
  const { payload, blocks, loading, error, reload, year, start, span } = usePlanning();
  const toast = useToast();
  const meta = TITLES[grain];

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("greenhouse");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showGrades, setShowGrades] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [showActual, setShowActual] = useState(false);
  const [dense, setDense] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const anchor = useRef<CellRef | null>(null);
  const [undo, setUndo] = useState<Edit[][]>([]);
  const [redo, setRedo] = useState<Edit[][]>([]);
  const [editing, setEditing] = useState<CellTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortBlocks(blocks, sort).filter(
      (b) => !q || `${b.greenhouse} ${b.variety}`.toLowerCase().includes(q.replace(/\s+/g, " ")),
    );
  }, [blocks, query, sort]);

  const derived = useMemo(() => {
    const m = new Map<string, Derived>();
    if (payload) shown.forEach((b) => m.set(b.key, derive(b, payload, grain)));
    return m;
  }, [payload, shown, grain]);

  // A range and a selection belong to one payload: drop them when the columns change under them.
  useEffect(() => {
    setSel(new Set());
    anchor.current = null;
  }, [grain, year, start, span]);

  const valueOf = useCallback(
    (ref: CellRef): number | null => {
      const d = derived.get(ref.block);
      if (!d) return null;
      if (ref.grade === ALL) return d.plan[ref.ci];
      return d.grades.find((g) => g.grade === ref.grade)?.plan[ref.ci] ?? null;
    },
    [derived],
  );

  const persist = useCallback(
    async (edits: { ref: CellRef; value: number }[], reason?: string) => {
      if (!payload) return { ok: 0, failed: 0 };
      let ok = 0;
      let failed = 0;
      let firstErr = "";
      for (const { ref, value } of edits) {
        const d = derived.get(ref.block);
        if (!d) continue;
        const r: { error?: string } =
          grain === "month"
            ? await setBudgetCell({ block: ref.block, month: String(d.keys[ref.ci]), value, grade: ref.grade === ALL ? undefined : ref.grade })
            : await setForecastCell({
                block: ref.block,
                grade: ref.grade,
                week: Number(d.keys[ref.ci]),
                value,
                year: d.years[ref.ci],
                reason,
              });
        if (isError(r)) {
          failed++;
          firstErr ||= r.error;
        } else ok++;
      }
      if (failed) toast(firstErr || "Some cells could not be saved.", "error");
      return { ok, failed };
    },
    [derived, grain, payload, toast],
  );

  const commit = useCallback(
    async (edits: { ref: CellRef; value: number }[], reason?: string) => {
      if (!edits.length) return;
      setBusy(true);
      const batch: Edit[] = edits.map((e) => ({ ref: e.ref, prev: valueOf(e.ref) ?? 0, next: e.value }));
      const { ok } = await persist(edits, reason);
      if (ok) {
        setUndo((u) => [...u, batch]);
        setRedo([]);
        toast(`${ok} cell${ok === 1 ? "" : "s"} saved`, "ok");
      }
      reload();
      setBusy(false);
    },
    [persist, reload, toast, valueOf],
  );

  const replay = async (batch: Edit[], dir: "undo" | "redo") => {
    setBusy(true);
    await persist(batch.map((e) => ({ ref: e.ref, value: dir === "undo" ? e.prev : e.next })));
    if (dir === "undo") {
      setUndo((u) => u.slice(0, -1));
      setRedo((r) => [...r, batch]);
    } else {
      setRedo((r) => r.slice(0, -1));
      setUndo((u) => [...u, batch]);
    }
    reload();
    setBusy(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || busy) return;
      const t = e.target as HTMLElement;
      if (t.closest("input,textarea,[role=dialog]")) return;
      if (e.key === "z" && undo.length) {
        e.preventDefault();
        void replay(undo[undo.length - 1], "undo");
      } else if ((e.key === "y" || (e.shiftKey && e.key === "Z")) && redo.length) {
        e.preventDefault();
        void replay(redo[redo.length - 1], "redo");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const selected = useMemo(() => {
    const out: { ref: CellRef; value: number }[] = [];
    shown.forEach((b) => {
      const d = derived.get(b.key);
      if (!d) return;
      [ALL, ...d.grades.map((g) => g.grade)].forEach((grade) =>
        d.cols.forEach((_, ci) => {
          const ref = { block: b.key, grade, ci };
          const v = valueOf(ref);
          if (sel.has(cellId(ref)) && v != null && canEdit(grain, d.past[ci], v)) out.push({ ref, value: v });
        }),
      );
    });
    return out;
  }, [sel, shown, derived, valueOf, grain]);

  const runBulk = (op: BulkOp) => {
    const a = anchor.current ? valueOf(anchor.current) : undefined;
    void commit(bulk(op, selected, a ?? undefined));
  };

  const clickCell = (ref: CellRef, e: React.MouseEvent) => {
    const id = cellId(ref);
    setSel((prev) => {
      const next = new Set(e.ctrlKey || e.metaKey ? prev : []);
      const a = anchor.current;
      if (e.shiftKey && a && a.block === ref.block && a.grade === ref.grade) {
        const [lo, hi] = [Math.min(a.ci, ref.ci), Math.max(a.ci, ref.ci)];
        for (let i = lo; i <= hi; i++) next.add(cellId({ ...ref, ci: i }));
      } else if ((e.ctrlKey || e.metaKey) && prev.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (!e.shiftKey) anchor.current = ref;
  };

  const openEditor = (ref: CellRef) => {
    if (!payload) return;
    const b = blocks.find((x) => x.key === ref.block);
    const d = derived.get(ref.block);
    const cur = valueOf(ref);
    if (!b || !d || cur == null || !canEdit(grain, d.past[ref.ci], cur)) return;
    const clim = grain === "week" ? payload.climate?.[`${d.years[ref.ci]}-${d.keys[ref.ci]}`] : undefined;
    setEditing({
      block: b.key,
      label: `${house(b.greenhouse)} › ${b.variety}`,
      grade: ref.grade,
      col: d.keys[ref.ci],
      colLabel: d.cols[ref.ci],
      year: d.years[ref.ci],
      current: cur,
      light: clim?.light,
      lightNorm: payload.light_norm || 16.5,
      climate: clim ? `${clim.icon} · ${clim.temp}° · ${clim.light} MJ vs ${payload.light_norm} norm` : undefined,
      revision: b.revision || payload.revision || 1,
    });
  };

  const rebuild = async () => {
    if (!window.confirm("Rebuild every budget from the crop cycles?\n\nLocked and hand-edited weeks are kept.")) return;
    setBusy(true);
    const r = await generateAllBudgets(year);
    if (isError(r)) toast(r.error, "error");
    else toast(`${(r as { generated: number }).generated} budgets rebuilt`, "ok");
    reload();
    setBusy(false);
  };

  const revise = async () => {
    if (!payload || !shown.length) return toast("Nothing selected", "warn");
    const n = shown.length;
    if (
      !window.confirm(
        `Open a new forecast revision for ${n} block${n === 1 ? "" : "s"}?\n\nThe current revision is kept and marked superseded; your figures carry forward into the new one.`,
      )
    )
      return;
    setBusy(true);
    const r = await reviseBlocks({ blocks: shown.map((b) => b.key), year: payload.year, start_week: payload.now_week, window_weeks: payload.weeks.length });
    if (isError(r)) toast(r.error, "error");
    else toast(`Revision opened for ${(r as { revised: number }).revised} blocks`, "ok");
    reload();
    setBusy(false);
  };

  const csv = () => {
    if (!payload) return;
    const first = shown[0] && derived.get(shown[0].key);
    if (!first) return;
    const rows = shown.map((b) => ({ label: [b.greenhouse, b.variety], values: derived.get(b.key)!.plan }));
    const text = toCsv(rows, ["Greenhouse", "Variety", ...first.cols]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = `${meta.title.toLowerCase()}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const editable = grain !== "life";
  const open = (key: string) => showGrades || expanded.has(key);
  const toggle = (key: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      if (!n.delete(key)) n.add(key);
      return n;
    });

  const actions = (
    <>
      <YearFilter />
      {grain !== "life" && <SourceFilter />}
      {grain === "week" && <WindowFilter />}
      <BlockFilter />
      <ClassicLink view={meta.view} />
    </>
  );

  if (!payload && loading) return <PageSkeleton />;
  if (!payload) return <PageShell title={meta.title} eyebrow="Crop Material Planning" actions={actions}><p className="text-[13px] text-[var(--sd-muted)]">{error ?? "No data."}</p></PageShell>;

  const cols = derived.values().next().value?.cols ?? [];
  const cell = "select-none px-2 py-1 text-right tabular-nums text-[12px] whitespace-nowrap";
  const toolbtn = (label: string, icon: React.ReactNode, onClick: () => void, disabled = false) => (
    <HeaderIconButton aria-label={label} tooltip={label} onClick={onClick} disabled={disabled || busy} className="h-8 w-8">
      {icon}
    </HeaderIconButton>
  );

  return (
    <PageShell
      title={meta.title}
      eyebrow={`${payload.site} · Crop year ${payload.crop_year} · Sep – Aug`}
      actions={actions}
      description={meta.blurb}
    >
      <div className="rounded-[var(--sd-radius-card)] bg-[var(--sd-card)] p-3 shadow-[var(--sd-shadow-1)]">
        <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Grid tools">
          <SearchInput value={query} onChange={setQuery} placeholder="Filter…" className="w-44" />
          {toolbtn("Expand all groups", <ChevronsUpDown className="h-4 w-4" />, () => setExpanded(new Set(shown.map((b) => b.key))))}
          {toolbtn("Collapse all groups", <ChevronsDownUp className="h-4 w-4" />, () => { setExpanded(new Set()); setShowGrades(false); })}
          <FilterSelect
            label="Sort"
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
            options={[
              { value: "greenhouse", label: "Sort: Greenhouse" },
              { value: "variety", label: "Sort: Variety" },
              { value: "size", label: "Sort: Largest" },
            ]}
            className="h-8 min-w-0"
          />
          {editable && (
            <>
              <span className="mx-1 h-5 w-px bg-[var(--sd-line)]" />
              {toolbtn("Fill right from anchor", <ArrowRight className="h-4 w-4" />, () => runBulk("fill"), !selected.length)}
              {toolbtn("Increase 10%", <ArrowUp className="h-4 w-4" />, () => runBulk("up"), !selected.length)}
              {toolbtn("Decrease 10%", <ArrowDown className="h-4 w-4" />, () => runBulk("down"), !selected.length)}
              {toolbtn("Set to zero", <X className="h-4 w-4" />, () => runBulk("zero"), !selected.length)}
              {toolbtn("Undo (Ctrl+Z)", <Undo2 className="h-4 w-4" />, () => void replay(undo[undo.length - 1], "undo"), !undo.length)}
              {toolbtn("Redo (Ctrl+Y)", <Redo2 className="h-4 w-4" />, () => void replay(redo[redo.length - 1], "redo"), !redo.length)}
            </>
          )}
          <span className="mx-1 h-5 w-px bg-[var(--sd-line)]" />
          <TogglePill pressed={showGrades} onPressedChange={setShowGrades} className="h-8 min-w-0">Length profile</TogglePill>
          <TogglePill pressed={showBudget} onPressedChange={setShowBudget} className="h-8 min-w-0">Budget row</TogglePill>
          <TogglePill pressed={showActual} onPressedChange={setShowActual} className="h-8 min-w-0">Actual</TogglePill>
          <TogglePill pressed={dense} onPressedChange={setDense} className="h-8 min-w-0">Compact</TogglePill>
          <span className="flex-1" />
          {grain !== "life" && toolbtn("Rebuild budgets from crop cycles", <RefreshCw className="h-4 w-4" />, () => void rebuild())}
          {grain === "week" && toolbtn("Start a new forecast revision", <Plus className="h-4 w-4" />, () => void revise())}
          {toolbtn("Download CSV", <Download className="h-4 w-4" />, csv)}
          {toolbtn("Print", <Printer className="h-4 w-4" />, () => window.print())}
          <span className="text-[11px] tabular-nums text-[var(--sd-quiet)]">
            {selected.length ? `${selected.length} selected` : `${shown.length} of ${payload.blocks.length} blocks`}
          </span>
        </div>
      </div>

      {!shown.length ? (
        <div className="rounded-[var(--sd-radius-card)] bg-[var(--sd-card)] p-8 text-center text-[13px] text-[var(--sd-muted)] shadow-[var(--sd-shadow-1)]">
          <b className="block text-[var(--sd-ink)]">Nothing to show yet</b>
          Record a Crop Cycle with a Crop Protocol, then press Rebuild.
        </div>
      ) : (
        <div className="rounded-[var(--sd-radius-card)] bg-[var(--sd-card)] shadow-[var(--sd-shadow-1)]">
          <ScrollTable tall className="rounded-[var(--sd-radius-card)]">
            <div ref={scroller}>
              <table className="w-full border-separate border-spacing-0 text-[12px]" aria-label={`${meta.title} grid`}>
                <thead>
                  <tr>
                    <th className={cn("sticky left-0 z-20 min-w-[13rem] px-3 py-2 text-left text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--sd-quiet)]", STICKY_HEAD)}>
                      Greenhouse › Variety
                    </th>
                    <th className={cn("px-2 py-2 text-left text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--sd-quiet)]", STICKY_HEAD)}>Trend</th>
                    {cols.map((c, i) => {
                      const d0 = derived.values().next().value as Derived;
                      const wd = grain === "week" ? payload.week_dates?.[i] : undefined;
                      return (
                        <th
                          key={`${c}-${i}`}
                          title={wd ? `Week ${d0.keys[i]}, ${d0.years[i]} · ${wd.span}` : undefined}
                          className={cn(
                            "px-2 py-1.5 text-right text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--sd-quiet)] tabular-nums",
                            STICKY_HEAD,
                            d0.now[i] && "text-[var(--sd-ink)]",
                          )}
                        >
                          <div className={d0.now[i] ? "font-semibold" : ""}>{c}</div>
                          {wd && <div className="text-[9px] normal-case tracking-normal opacity-70">{wd.start_label}</div>}
                        </th>
                      );
                    })}
                    {grain !== "week" && (
                      <th className={cn("px-3 py-2 text-right text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--sd-quiet)]", STICKY_HEAD)}>Total</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((b) => {
                    const d = derived.get(b.key)!;
                    const isOpen = open(b.key);
                    const total = d.plan.reduce<number>((t, x) => t + (x || 0), 0);
                    return (
                      <Fragment key={b.key}>
                        <tr className="group">
                          <td className="sticky left-0 z-10 border-t border-[var(--sd-line-soft)] bg-[var(--sd-card)] px-3 py-1.5">
                            <button type="button" className="flex w-full items-center gap-1.5 text-left" onClick={() => toggle(b.key)} aria-expanded={isOpen}>
                              {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-[var(--sd-quiet)]" /> : <ChevronRight className="h-3.5 w-3.5 text-[var(--sd-quiet)]" />}
                              <span className="min-w-0">
                                <span className="block truncate text-[12px] font-medium text-[var(--sd-ink)]" title={b.greenhouse}>{house(b.greenhouse)}</span>
                                <span className="block truncate text-[11px] text-[var(--sd-muted)]">
                                  {b.variety}
                                  {b.area ? ` · ${Math.round(b.area).toLocaleString()} m²` : ""}
                                </span>
                              </span>
                            </button>
                          </td>
                          <td className="border-t border-[var(--sd-line-soft)] px-2"><MiniSpark plan={d.plan} actual={d.actual} /></td>
                          {d.cols.map((c, ci) => {
                            const a = d.actual[ci];
                            const f = d.plan[ci];
                            const reported = d.past[ci] || grain !== "week";
                            const v = a != null && reported ? a : f;
                            const dv = a != null && reported ? variance(a, f) : null;
                            const ref: CellRef = { block: b.key, grade: ALL, ci };
                            const ed = editable && canEdit(grain, d.past[ci], f);
                            const on = sel.has(cellId(ref));
                            return (
                              <td
                                key={ci}
                                onClick={ed ? (e) => clickCell(ref, e) : undefined}
                                onDoubleClick={ed ? () => openEditor(ref) : undefined}
                                tabIndex={ed ? 0 : undefined}
                                onKeyDown={ed ? (e) => e.key === "Enter" && openEditor(ref) : undefined}
                                className={cn(
                                  cell,
                                  "border-t border-[var(--sd-line-soft)]",
                                  dense ? "py-0.5" : "py-1.5",
                                  dv != null && TONE[varianceTone(dv, grain)],
                                  d.now[ci] && "font-semibold",
                                  d.past[ci] && grain === "week" && "text-[var(--sd-muted)]",
                                  d.edited[ci] && "shadow-[inset_2px_0_0_var(--sd-data-amber)]",
                                  ed && "cursor-cell hover:bg-[var(--sd-bg-soft)]",
                                  on && "outline outline-2 -outline-offset-2 outline-[var(--sd-accent-2)]",
                                )}
                              >
                                <b className="font-semibold">{fmtN(v)}</b>
                                {dv != null && !dense && (
                                  <u className="block text-[9px] font-normal no-underline opacity-70">{dv >= 0 ? "+" : ""}{dv}%</u>
                                )}
                              </td>
                            );
                          })}
                          {grain !== "week" && <td className={cn(cell, "border-t border-[var(--sd-line-soft)] font-semibold")}>{fmtN(total)}</td>}
                        </tr>
                        {isOpen &&
                          d.grades.map((g) => (
                            <tr key={g.grade} className="bg-[var(--sd-bg-soft)]/50">
                              <td className="sticky left-0 z-10 bg-[var(--sd-bg-soft)] px-3 py-1 pl-9 text-[11px] text-[var(--sd-muted)]">{g.grade === "all" ? "All grades" : g.grade}</td>
                              <td />
                              {d.cols.map((_, ci) => {
                                const ref: CellRef = { block: b.key, grade: g.grade, ci };
                                const v = g.plan[ci];
                                const ed = editable && canEdit(grain, d.past[ci], v);
                                return (
                                  <td
                                    key={ci}
                                    onClick={ed ? (e) => clickCell(ref, e) : undefined}
                                    onDoubleClick={ed ? () => openEditor(ref) : undefined}
                                    className={cn(cell, "text-[11px] text-[var(--sd-muted)]", g.revised[ci] != null && "text-[var(--sd-ink)]", ed && "cursor-cell hover:bg-[var(--sd-bg-soft)]", sel.has(cellId(ref)) && "outline outline-2 -outline-offset-2 outline-[var(--sd-accent-2)]")}
                                  >
                                    {fmtN(v)}
                                  </td>
                                );
                              })}
                              {grain !== "week" && <td className={cn(cell, "text-[11px] text-[var(--sd-muted)]")}>{fmtN(g.plan.reduce<number>((t, x) => t + (x || 0), 0))}</td>}
                            </tr>
                          ))}
                        {showBudget && (
                          <tr>
                            <td className="sticky left-0 z-10 bg-[var(--sd-card)] px-3 py-1 pl-9 text-[11px] text-[var(--sd-quiet)]">Budget</td>
                            <td />
                            {d.budget.map((v, ci) => <td key={ci} className={cn(cell, "text-[11px] text-[var(--sd-quiet)]")}>{fmtN(v)}</td>)}
                            {grain !== "week" && <td className={cn(cell, "text-[11px] text-[var(--sd-quiet)]")}>{fmtN(d.budget.reduce<number>((t, x) => t + (x || 0), 0))}</td>}
                          </tr>
                        )}
                        {showActual && (
                          <tr>
                            <td className="sticky left-0 z-10 bg-[var(--sd-card)] px-3 py-1 pl-9 text-[11px] text-[var(--sd-quiet)]">Actual</td>
                            <td />
                            {d.cols.map((_, ci) => <td key={ci} className={cn(cell, "text-[11px] text-[var(--sd-data-green)]")}>{fmtN(d.actual[ci])}</td>)}
                            {grain !== "week" && <td className={cn(cell, "text-[11px] text-[var(--sd-data-green)]")}>{fmtN(d.actual.reduce<number>((t, x) => t + (x || 0), 0))}</td>}
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ScrollTable>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[12px] text-[var(--sd-muted)]">
        <span><b className="text-[var(--sd-ink)]">{payload.blocks.length}</b> blocks · <b className="text-[var(--sd-ink)]">{payload.house_count}</b> greenhouses</span>
        <span><b className="text-[var(--sd-ink)]">{fmtM(payload.budget_total)}</b> {unitM(payload.budget_total)} budgeted</span>
        {payload.weeks.length > 0 && <span>Forecast W{payload.weeks[0]}–W{payload.weeks[payload.weeks.length - 1]} · {payload.weeks.length} weeks</span>}
        <span className="flex-1" />
        <span>
          Model efficiency{" "}
          <b className="text-[var(--sd-ink)]">
            {payload.model_error == null ? "not calibrated" : `${Math.max(0, 100 - Math.abs(payload.model_error)).toFixed(1)}%`}
          </b>
          {payload.model_error != null && ` · ${signed(payload.model_error)}% vs actual`}
        </span>
      </div>

      <CellDialog
        target={editing}
        grain={grain}
        onClose={() => setEditing(null)}
        onSave={async (value, reason) => {
          const t = editing!;
          const ci = derived.get(t.block)!.keys.indexOf(t.col);
          setEditing(null);
          await commit([{ ref: { block: t.block, grade: t.grade, ci }, value }], reason);
        }}
      />
    </PageShell>
  );
}
