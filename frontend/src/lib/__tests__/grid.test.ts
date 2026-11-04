import { describe, expect, it } from "vitest";
import type { Block, GridPayload } from "@/lib/api";
import { ALL, bulk, canEdit, derive, sortBlocks, suggest, toCsv, variance, varianceTone } from "@/lib/grid";
import { parseRoute } from "@/lib/router";
import { house } from "@/lib/planning";

const block = (over: Partial<Block> = {}): Block => ({
  key: "CC-1",
  greenhouse: "Main GH 05 - MFK",
  variety: "ATHENA",
  area: 1000,
  rate: 10,
  budget_total: 1200,
  revision: 1,
  weekly: {
    grades: [
      { grade: "50 cm", values: [100, 200, 300], revised: [null, 250, null] },
      { grade: "60 cm", values: [50, 50, 50], revised: [null, null, null] },
    ],
    revised: [null, null, null],
    budget: [150, 250, 350],
    actual: [140, null, null],
  },
  monthly: { grades: [], revised: [], budget: [], actual: [] },
  lifetime: { years: [], grades: [], budget: [], actual: [] },
  ...over,
});
const payload = { year: 2026, iso_year: 2026, now_week: 2, now_month: "Sep", crop_year: "2026/27", weeks: [1, 2, 3], week_years: [2026, 2026, 2026], months: ["Sep"] } as unknown as GridPayload;

describe("derive", () => {
  const d = derive(block(), payload, "week");
  it("sums grades, preferring a revision", () => {
    expect(d.plan).toEqual([150, 300, 350]);
    expect(d.edited).toEqual([false, true, false]);
  });
  it("marks past and current weeks", () => {
    expect(d.past).toEqual([true, false, false]);
    expect(d.now).toEqual([false, true, false]);
  });
  it("a whole-week revision wins over the grades", () => {
    const b = block();
    b.weekly.revised = [null, 999, null];
    expect(derive(b, payload, "week").plan[1]).toBe(999);
  });
});

describe("editing rules", () => {
  it("past weeks are locked, months stay editable, lifetime is read-only", () => {
    expect(canEdit("week", true, 5)).toBe(false);
    expect(canEdit("week", false, 5)).toBe(true);
    expect(canEdit("month", true, 5)).toBe(true);
    expect(canEdit("life", false, 5)).toBe(false);
    expect(canEdit("week", false, null)).toBe(false);
  });
});

describe("bulk actions", () => {
  const cells = [10, 20, 30].map((value, ci) => ({ ref: { block: "b", grade: ALL, ci }, value }));
  it("fills from the anchor", () => expect(bulk("fill", cells, 20).map((c) => c.value)).toEqual([20, 20]));
  it("scales by 10%", () => expect(bulk("up", cells).map((c) => c.value)).toEqual([11, 22, 33]));
  it("drops by 10%", () => expect(bulk("down", cells).map((c) => c.value)).toEqual([9, 18, 27]));
  it("zeroes", () => expect(bulk("zero", cells).map((c) => c.value)).toEqual([0, 0, 0]));
});

describe("variance", () => {
  it("is a whole percent and needs both sides", () => {
    expect(variance(110, 100)).toBe(10);
    expect(variance(null, 100)).toBeNull();
    expect(variance(5, 0)).toBeNull();
  });
  it("tolerance widens with a finer grain", () => {
    expect(varianceTone(10, "week")).toBe("ok");
    expect(varianceTone(10, "month")).toBe("up");
    expect(varianceTone(-10, "life")).toBe("dn");
  });
});

describe("suggest", () => {
  it("brighter weeks raise the figure, rounded to tens", () => {
    expect(suggest(1000, 23.4, 16.5).value).toBe(1190);
    expect(suggest(1000, undefined, 16.5)).toEqual({ value: 1000, pct: 0 });
  });
});

describe("misc", () => {
  it("sorts and exports", () => {
    const a = block({ key: "a", greenhouse: "B", variety: "Z", budget_total: 1 });
    const c = block({ key: "c", greenhouse: "A", variety: "Y", budget_total: 9 });
    expect(sortBlocks([a, c], "greenhouse").map((b) => b.key)).toEqual(["c", "a"]);
    expect(sortBlocks([a, c], "size").map((b) => b.key)).toEqual(["c", "a"]);
    expect(toCsv([{ label: ["x"], values: [1, null] }], ["G", "W1", "W2"])).toBe('"G","W1","W2"\n"x","1",');
  });
  it("routes by hash and strips the farm suffix", () => {
    expect(parseRoute("#/forecast")).toBe("forecast");
    expect(parseRoute("#/nope")).toBe("dashboard");
    expect(house("Main GH 05 - MFK")).toBe("GH 05");
  });
});

import { CLASSIC, NAV } from "@/lib/nav";
import { VIEWS } from "@/lib/router";

describe("navigation", () => {
  it("every view has a classic screen and a sidebar entry", () => {
    VIEWS.forEach((v) => {
      expect(CLASSIC[v]).toMatch(/^\//);
      expect(NAV.some((g) => g.items.some((i) => i.view === v))).toBe(true);
    });
  });
  it("links out stay same-origin paths", () => {
    NAV.flatMap((g) => g.items).forEach((i) => i.href && expect(i.href).toMatch(/^\/[^/]/));
  });
});
