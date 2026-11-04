import { ExternalLink, Layers } from "lucide-react";
import { FilterSelect } from "@/components/FilterSelect";
import { RefreshButton } from "@/components/RefreshButton";
import { TreePicker } from "@/components/TreePicker";
import { WeekPicker } from "@/components/WeekPicker";
import { HEADER_PILL } from "@/components/header-controls";
import { WINDOW_SPANS, currentIsoWeek, usePlanning } from "@/lib/planning";
import { CLASSIC } from "@/lib/nav";
import type { View } from "@/lib/router";
import { cn } from "@/lib/utils";

/** Crop-year picker: the budget year (calendar year of the forecast); the Sep-Aug crop year is in the eyebrow. */
export function YearFilter() {
  const { year, setYear } = usePlanning();
  const y = new Date().getFullYear();
  const years = [y - 2, y - 1, y, y + 1];
  if (!years.includes(year)) years.push(year);
  return (
    <FilterSelect
      label="Budget year"
      value={String(year)}
      onChange={(v) => setYear(Number(v))}
      options={years.sort().map((n) => ({ value: String(n), label: `Crop year ${n}/${String(n + 1).slice(-2)}` }))}
    />
  );
}

export function SourceFilter() {
  const { src, setSrc } = usePlanning();
  return (
    <FilterSelect
      label="Budget source"
      value={src}
      onChange={(v) => setSrc(v as "manual" | "automated")}
      options={[
        { value: "manual", label: "Manual budget" },
        { value: "automated", label: "Automated (model)" },
      ]}
    />
  );
}

export function WindowFilter() {
  const { start, setStart, span, setSpan } = usePlanning();
  return (
    <>
      <WeekPicker value={start ?? currentIsoWeek()} onChange={setStart} />
      <FilterSelect
        label="Window"
        value={String(span)}
        onChange={(v) => setSpan(Number(v))}
        options={WINDOW_SPANS.map((n) => ({ value: String(n), label: `${n} weeks` }))}
      />
    </>
  );
}

export function BlockFilter() {
  const { tree, checked, setChecked } = usePlanning();
  const leaves = tree.reduce((n, g) => n + (g.children?.length ?? 0), 0);
  return (
    <TreePicker
      label="Greenhouse › Variety"
      icon={<Layers className="h-3.5 w-3.5" />}
      nodes={tree}
      checked={checked}
      onChange={setChecked}
      count={[...checked].filter((id) => !id.startsWith("gh:")).length || leaves}
      emptyHint="No crop cycles yet."
      searchPlaceholder="Greenhouse or variety…"
    />
  );
}

export function ReloadButton() {
  const { reload, loading } = usePlanning();
  return <RefreshButton onClick={reload} loading={loading} label="the planning data" />;
}

/** Each React page links to its legacy screen. */
export function ClassicLink({ view, className }: { view: View; className?: string }) {
  return (
    <a href={CLASSIC[view]} className={cn(HEADER_PILL, "inline-flex items-center justify-center no-underline", className)}>
      <ExternalLink className="h-3.5 w-3.5" />
      Classic view
    </a>
  );
}
