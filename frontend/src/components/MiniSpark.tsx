/** A glance at a row: plan as a line, actual overlaid where it exists. Breaks the line at gaps. */
export function MiniSpark({ plan, actual }: { plan: (number | null)[]; actual?: (number | null)[] }) {
  const n = plan.length;
  const all = plan.concat(actual ?? []).filter((v): v is number => v != null && !Number.isNaN(v));
  if (n < 2 || !all.length) return null;
  const hi = Math.max(...all);
  const lo = Math.min(...all, 0);
  const rng = hi - lo || 1;
  const W = 100;
  const H = 20;
  const x = (i: number) => (i / (n - 1)) * (W - 3) + 1.5;
  const y = (v: number) => H - 1.5 - ((v - lo) / rng) * (H - 4);
  const runs = (vals: (number | null)[]) => {
    const out: [number, number][][] = [];
    let cur: [number, number][] = [];
    vals.forEach((v, i) => {
      if (v == null || Number.isNaN(v)) {
        if (cur.length) out.push(cur);
        cur = [];
      } else cur.push([i, v]);
    });
    if (cur.length) out.push(cur);
    return out;
  };
  const d = (seg: [number, number][]) => seg.map(([i, v], k) => `${k ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join("");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-4 w-16" aria-hidden>
      {runs(plan).map((s, i) => (
        <path key={`p${i}`} d={d(s)} fill="none" stroke="var(--sd-data-cyan)" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      ))}
      {runs(actual ?? []).map((s, i) => (
        <path key={`a${i}`} d={d(s)} fill="none" stroke="var(--sd-data-green)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
