# Copyright (c) 2026, Upande and contributors
# For license information, please see license.txt

"""Do the planning figures this app computes agree with the ones stored on the same records?

Every figure on a plan, a budget and a procurement plan exists twice: once stored on the document when it was
last built, and once worked out again by the code that owns it. After the Summer Flowers planner was split out
of upande_summer_flowers (and its documents were adopted in place on marginpar.local, carrying live data), this
is the check that the ported code reaches the stored numbers.

It never saves anything. Each record is loaded fresh, the document's own roll-up methods are run on it in
memory, and the result is compared with what was stored on the way in.

	bench --site <site> execute upande_crop_material_planning.summer_flowers.reconcile.report

returns (and prints) one entry per check: how many records were compared, and which disagreed.
"""

import frappe
from frappe.utils import cint, flt

# stored header figures a plan's own roll-up must reproduce
PLAN_FIELDS = (
	"total_production_stems", "total_demand_stems", "total_variance_stems", "weeks_in_deficit",
	"worst_weekly_deficit", "new_beds_required", "new_plants_required", "peak_weekly_sticking",
	"peak_weekly_sticking_planned",
)
PLAN_PCT = ("coverage_pct", "average_area_ha", "stems_per_ha_year")
# Counters a rebuild writes once and a hand-assigned block never refreshed: a recount from the rows as they stand
# differs from the stored figure on any plan whose blocks were assigned after its last rebuild. Reported, not asserted.
PLACEMENT_FIELDS = ("plantings_not_placed", "blocks_used", "unmet_stems", "placeable_production_stems")
PLACEMENT_PCT = ("placeable_coverage_pct",)
BUDGET_FIELDS = ("total_stems",)
# orders_late is "orders whose date has passed today": it moves with the calendar, so it is not a stored-vs-computed figure.
PROC_FIELDS = ("total_units_to_order", "total_plants_at_field", "beds_required")


def _close(a, b, tol=0.01):
	return abs(flt(a) - flt(b)) <= tol * max(1.0, abs(flt(b)))


def _diffs(stored, doc, fields, pct=()):
	out = {}
	for f in fields:
		if cint(stored.get(f)) != cint(doc.get(f)):
			out[f] = (stored.get(f), doc.get(f))
	for f in pct:
		if not _close(doc.get(f), stored.get(f), 0.001):
			out[f] = (stored.get(f), doc.get(f))
	return out


def production_plans():
	"""Recompute each plan's header figures and month roll-up from its week and block rows."""
	checked, bad, stale = 0, {}, {}
	for name in frappe.get_all("Summer Flower Production Plan", filters={"docstatus": ("<", 2)}, pluck="name"):
		stored = frappe.db.get_value("Summer Flower Production Plan", name,
		                             list(PLAN_FIELDS + PLAN_PCT + PLACEMENT_FIELDS + PLACEMENT_PCT), as_dict=True)
		months = [(m.year, m.month, cint(m.production_stems), cint(m.demand_stems))
		          for m in frappe.get_all("Summer Flower Plan Month", filters={"parent": name},
		                                  fields=["year", "month", "production_stems", "demand_stems"], order_by="year, month")]
		doc = frappe.get_doc("Summer Flower Production Plan", name)
		doc.roll_up_months()
		doc.set_totals()
		checked += 1
		d = _diffs(stored, doc, PLAN_FIELDS, PLAN_PCT)
		again = [(m.year, m.month, cint(m.production_stems), cint(m.demand_stems)) for m in doc.plan_months]
		if again != months:
			d["plan_months"] = (len(months), len(again))
		if d:
			bad[name] = d
		p = _diffs(stored, doc, PLACEMENT_FIELDS, PLACEMENT_PCT)
		if p:
			stale[name] = p
	return {"checked": checked, "disagree": bad, "stale_placement": stale}


def plan_weeks_against_blocks():
	"""The plan's week totals must be the sum of its blocks' weekly stems (the plan matrix)."""
	checked, bad = 0, {}
	for name in frappe.get_all("Summer Flower Production Plan", filters={"docstatus": ("<", 2)}, pluck="name"):
		doc = frappe.get_doc("Summer Flower Production Plan", name)
		try:
			rows = (frappe.parse_json(doc.matrix_json or "{}") or {}).get("rows") or []
		except Exception:
			rows = []
		if not rows:
			continue
		checked += 1
		by_week = {}
		for r in rows:
			for key, v in ((r or {}).get("weeks") or {}).items():
				by_week[key] = by_week.get(key, 0) + cint(v)
		wrong = []
		for w in doc.plan_weeks:
			key = "%s-%s" % (cint(w.year), cint(w.week_no))
			if key in by_week and not _close(by_week[key], w.production_stems, 0.001):
				wrong.append((key, cint(w.production_stems), by_week[key]))
		if wrong:
			bad[name] = wrong[:5]
	return {"checked": checked, "disagree": bad}


def budgets():
	"""Each budget's totals, fiscal-year roll-up and monthly percentages worked out again from its months."""
	checked, bad = 0, {}
	for name in frappe.get_all("Summer Flower Budget", filters={"docstatus": ("<", 2)}, pluck="name"):
		stored = frappe.db.get_value("Summer Flower Budget", name, list(BUDGET_FIELDS) + ["total_value"], as_dict=True)
		fys = {(f.fiscal_year): (cint(f.stems), cint(f.months_covered)) for f in
		       frappe.get_all("Summer Flower Budget Fiscal Year", filters={"parent": name},
		                      fields=["fiscal_year", "stems", "months_covered"])}
		doc = frappe.get_doc("Summer Flower Budget", name)
		# value_months re-reads the variety's valuation while a draft; reconcile the stems, which are the plan's.
		doc.total_stems = sum((r.stems or 0) for r in doc.budget_months)
		doc.roll_up_fiscal_years()
		checked += 1
		d = {}
		if cint(stored.total_stems) != cint(doc.total_stems):
			d["total_stems"] = (stored.total_stems, doc.total_stems)
		again = {f.fiscal_year: (cint(f.stems), cint(f.months_covered)) for f in doc.fiscal_years}
		if again != fys:
			d["fiscal_years"] = (fys, again)
		if d:
			bad[name] = d
	return {"checked": checked, "disagree": bad}


def budgets_against_plans():
	"""A budget built from a plan carries the plan's stems: the months must add up to the plan's total."""
	checked, bad = 0, {}
	for b in frappe.get_all("Summer Flower Budget", filters={"docstatus": ("<", 2)}, fields=["name", "production_plan", "total_stems"]):
		if not b.production_plan or not frappe.db.exists("Summer Flower Production Plan", b.production_plan):
			continue
		plan_total = frappe.db.get_value("Summer Flower Production Plan", b.production_plan, "total_production_stems")
		checked += 1
		if not _close(b.total_stems, plan_total, 0.001):
			bad[b.name] = (b.total_stems, plan_total)
	return {"checked": checked, "disagree": bad}


def procurement_plans():
	"""Each procurement plan's ordered units, plants at field and beds, summed again from its lines."""
	checked, bad = 0, {}
	for name in frappe.get_all("Summer Flower Procurement Plan", filters={"docstatus": ("<", 2)}, pluck="name"):
		stored = frappe.db.get_value("Summer Flower Procurement Plan", name, list(PROC_FIELDS), as_dict=True)
		doc = frappe.get_doc("Summer Flower Procurement Plan", name)
		doc.set_totals()
		checked += 1
		d = _diffs(stored, doc, PROC_FIELDS)
		if d:
			bad[name] = d
	return {"checked": checked, "disagree": bad}


def plans_against_demand():
	"""Re-derive each plan's demand from its Market Demand as it stands now (plan_preview) and compare with the
	demand stored on the plan. A plan is a snapshot: where the Market Demand was edited after the plan was
	built, the two are allowed to differ, so the disagreements are reported with whether that explains them."""
	from upande_crop_material_planning.upande_crop_material_planning.doctype.summer_flower_production_plan import (
		summer_flower_production_plan as m,
	)

	checked, bad = 0, {}
	for r in frappe.get_all("Summer Flower Production Plan", filters={"docstatus": ("<", 2)},
	                        fields=["name", "market_demand", "farm", "season_start_year", "total_demand_stems", "modified"]):
		p = m.plan_preview(r.market_demand, r.farm, r.season_start_year)
		checked += 1
		if cint(p.get("demand_stems")) != cint(r.total_demand_stems):
			md = frappe.db.get_value("Summer Flower Market Demand", r.market_demand, "modified")
			bad[r.name] = {"stored": cint(r.total_demand_stems), "now": cint(p.get("demand_stems")),
			               "demand_edited_since": bool(md and md > r.modified)}
	return {"checked": checked, "disagree": bad}


CHECKS = (
	("production plans (header figures and months, recomputed from weeks and blocks)", production_plans),
	("production plans (week totals = sum of block rows)", plan_weeks_against_blocks),
	("budgets (totals and fiscal years, recomputed from months)", budgets),
	("budgets = their production plan's stems", budgets_against_plans),
	("plan demand = Market Demand as it stands (informational: plans are snapshots)", plans_against_demand),
	("procurement plans (units, plants at field, beds, late orders)", procurement_plans),
)


def report():
	out = {}
	for label, fn in CHECKS:
		try:
			r = fn()
		except Exception as e:  # a check that cannot run is a finding, not a crash
			r = {"error": repr(e)[:300]}
		out[label] = r
		if "error" in r:
			print(f"{label}: ERROR {r['error']}")
		else:
			extra = f", {len(r['stale_placement'])} with stale placement counters" if r.get("stale_placement") else ""
			print(f"{label}: {r['checked']} compared, {len(r['disagree'])} disagree{extra}")
	return out
