import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterSelect } from "@/components/FilterSelect";
import { cellHistory, isError, type CellHistory } from "@/lib/api";
import { ALL, fmtN, suggest, type Grain } from "@/lib/grid";

export interface CellTarget {
  block: string;
  label: string;
  grade: string;
  col: string | number;
  colLabel: string;
  year: number;
  current: number;
  light?: number;
  lightNorm: number;
  climate?: string;
  revision: number;
}

const REASONS = ["Weather", "Disease", "Bending delay", "Bud drop", "Market", "Other"];

/** The cell editor (legacy: the double-click popover): suggested value, quick sets, reason, and the cell's history. */
export function CellDialog({
  target,
  grain,
  onClose,
  onSave,
}: {
  target: CellTarget | null;
  grain: Grain;
  onClose: () => void;
  onSave: (value: number, reason?: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [hist, setHist] = useState<CellHistory | null>(null);

  useEffect(() => {
    if (!target) return;
    setText(String(target.current));
    setReason("");
    setHist(null);
    if (grain === "week") {
      void cellHistory({ block: target.block, week: Number(target.col), grade: target.grade, year: target.year }).then(
        (h) => {
          if (!isError(h)) setHist(h as CellHistory);
        },
      );
    }
  }, [target, grain]);

  if (!target) return null;
  const sug = suggest(target.current, target.light, target.lightNorm);
  const parsed = parseInt(text.replace(/[^\d-]/g, ""), 10);
  const valid = Number.isFinite(parsed) && parsed >= 0;
  const quick: [string, number][] = [
    ["Current", target.current],
    [`Suggested ${sug.pct >= 0 ? "+" : ""}${sug.pct}%`, sug.value],
    ["−10%", Math.round(target.current * 0.9)],
    ["+10%", Math.round(target.current * 1.1)],
  ];
  const save = async () => {
    if (!valid) return;
    if (parsed === target.current && !reason) return onClose();
    setBusy(true);
    try {
      await onSave(parsed, reason || undefined);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {grain === "week" ? `${target.colLabel} ${target.year}` : target.colLabel} ·{" "}
            {target.grade === ALL ? "all grades" : target.grade}
          </DialogTitle>
          <DialogDescription>
            {target.label} · {grain === "month" ? "Budget override" : `Revision ${target.revision}`}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-[var(--sd-radius-lg)] bg-[var(--sd-bg-soft)] px-4 py-3 text-[12px] text-[var(--sd-muted)]">
          <div className="text-[20px] font-semibold tabular-nums text-[var(--sd-ink)]">
            {fmtN(sug.value)}{" "}
            <span className="text-[11px] font-medium text-[var(--sd-quiet)]">
              {sug.pct >= 0 ? "+" : ""}
              {sug.pct}% vs forecast
            </span>
          </div>
          {target.climate ?? (grain === "month" ? "Derived from area × rate" : "No climate for this week")}
        </div>
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            inputMode="numeric"
            value={text}
            aria-label="Stems"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void save()}
            className="tabular-nums"
          />
          <span className="text-[12px] text-[var(--sd-quiet)]">stems</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {quick.map(([l, v]) => (
            <Button key={l} type="button" variant="outline" size="sm" onClick={() => setText(String(v))}>
              {l}
            </Button>
          ))}
        </div>
        {grain === "week" && (
          <FilterSelect
            label="Reason (optional)"
            value={reason}
            onChange={setReason}
            options={REASONS}
            allLabel="No reason"
            className="w-full"
          />
        )}
        {grain === "week" && hist && <HistoryPanel h={hist} />}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid || busy} onClick={() => void save()}>
            {grain === "month" ? "Override" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HistoryPanel({ h }: { h: CellHistory }) {
  const changed = h.revisions.filter((r) => r.changed).length;
  if (!h.revisions.length && !h.edits.length)
    return <p className="text-[12px] text-[var(--sd-quiet)]">No changes recorded for this week.</p>;
  return (
    <div className="max-h-44 overflow-auto rounded-[var(--sd-radius-lg)] border border-[var(--sd-line)] p-3 text-[12px]">
      <div className="mb-1 flex gap-4 text-[var(--sd-muted)]">
        <span>
          Budget <b className="tabular-nums text-[var(--sd-ink)]">{fmtN(h.budget)}</b>
        </span>
        <span>
          Forecast <b className="tabular-nums text-[var(--sd-ink)]">{fmtN(h.current)}</b>
        </span>
        <span>
          Actual <b className="tabular-nums text-[var(--sd-ink)]">{fmtN(h.actual)}</b>
        </span>
      </div>
      <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--sd-quiet)]">
        {h.revisions.length} revisions · {changed} with a change
      </div>
      {h.revisions.map((r) => (
        <div key={r.revision} className="flex items-baseline justify-between gap-3 border-t border-[var(--sd-line-soft)] py-1">
          <span>
            r{r.revision} {r.status === "Active" ? "(live)" : ""} {r.reason ? `· ${r.reason}` : ""}
          </span>
          <b className="tabular-nums">{fmtN(r.value)}</b>
        </div>
      ))}
      {h.edits.slice(0, 8).map((e, i) => (
        <div key={i} className="flex justify-between gap-3 border-t border-[var(--sd-line-soft)] py-1 text-[var(--sd-muted)]">
          <span>
            {String(e.by).split("@")[0]} · {e.at.slice(0, 16)}
          </span>
          <span className="tabular-nums">
            {fmtN(e.from)} → <b>{fmtN(e.to)}</b>
          </span>
        </div>
      ))}
    </div>
  );
}
