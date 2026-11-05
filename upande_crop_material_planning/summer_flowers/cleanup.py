# Copyright (c) 2026, Upande and contributors
# For license information, please see license.txt

"""Data clean-up for Summer Flower Production Plans.

refresh_plan_counters recomputes only the derived placement counters (plantings not placed, blocks used, unmet
stems, placeable stems and coverage, and the weekly placeable grid) from the rows as they stand. It never touches
blocks, demand, status or the budget, and it writes with db updates (no save, no modified bump, no hooks).

	bench --site <site> execute upande_crop_material_planning.summer_flowers.cleanup.refresh_plan_counters
	bench --site <site> execute upande_crop_material_planning.summer_flowers.cleanup.refresh_plan_counters --kwargs "{'apply': True}"
"""

import frappe
from frappe.utils import cint, flt

PLAN = "Summer Flower Production Plan"
INT_FIELDS = ("plantings_not_placed", "blocks_used", "unmet_stems", "placeable_production_stems")
PCT_FIELDS = ("placeable_coverage_pct",)


def _differs(field, old, new):
	if field in PCT_FIELDS:
		return abs(flt(old) - flt(new)) > 0.001 * max(1.0, abs(flt(new)))
	return cint(old) != cint(new)


def refresh_plan_counters(apply=False):
	"""Return {"checked": n, "stale": {plan: {field: (stored, recomputed)}}, "applied": bool}."""
	stale, checked = {}, 0
	fields = INT_FIELDS + PCT_FIELDS
	for name in frappe.get_all(PLAN, filters={"docstatus": ("<", 2)}, pluck="name"):
		stored = frappe.db.get_value(PLAN, name, list(fields), as_dict=True)
		weekly_before = {w.name: cint(w.placeable_production_stems) for w in
		                 frappe.get_all("Summer Flower Plan Week", filters={"parent": name},
		                                fields=["name", "placeable_production_stems"])}
		doc = frappe.get_doc(PLAN, name)
		doc.refresh_placement()
		# header figures that follow from the weekly placeable grid and the stored demand
		doc.placeable_production_stems = sum(cint(w.placeable_production_stems) for w in doc.plan_weeks)
		doc.placeable_coverage_pct = (doc.placeable_production_stems / doc.total_demand_stems * 100
		                              if doc.total_demand_stems else 0)
		checked += 1
		diff = {f: (stored.get(f), doc.get(f)) for f in fields if _differs(f, stored.get(f), doc.get(f))}
		weeks = {w.name: cint(w.placeable_production_stems) for w in doc.plan_weeks
		         if cint(w.placeable_production_stems) != weekly_before.get(w.name)}
		if not diff and not weeks:
			continue
		if weeks:
			diff["plan_weeks_placeable"] = (len(weeks), "rows differ")
		stale[name] = diff
		if apply:
			for f in fields:
				frappe.db.set_value(PLAN, name, f, doc.get(f), update_modified=False)
			for child, v in weeks.items():
				frappe.db.set_value("Summer Flower Plan Week", child, "placeable_production_stems", v,
				                    update_modified=False)
	if apply:
		frappe.db.commit()
	return {"checked": checked, "stale": stale, "applied": bool(apply)}
