# Copyright (c) 2026, Upande and contributors
# For license information, please see license.txt

"""Take over the Summer Flowers planning doctypes, report and workflow.

Runs pre_model_sync. On a site that ran upande_summer_flowers (or mirrors it, as marginpar.local does) these
doctypes are DocType rows with module "Summer Flowers" and, on the mirror, `custom = 1`, because they were
loaded as custom DocTypes. Both have to change BEFORE the model sync:

	module  -> "Upande Crop Material Planning", so the controller resolves through this app (otherwise
	           migrate's remove_orphan_doctypes sees a standard doctype whose module has no folder and DELETES
	           it, table and records with it);
	custom  -> 0, so this app's JSON is the definition and is synced onto the existing tables instead of being
	           treated as a clash with a custom doctype.

Nothing is created, dropped or renamed: the tables and the records stay where they are. Every step is a no-op
when its row is absent or already moved, so a fresh site and a second run are both harmless.
"""

import frappe

MODULE = "Upande Crop Material Planning"
OLD_MODULE = "Summer Flowers"

DOCTYPES = (
	"Summer Flower Market Demand",
	"Summer Flower Demand Week",
	"Summer Flower Demand Grade",
	"Summer Flower Production Plan",
	"Summer Flower Plan Block",
	"Summer Flower Plan Month",
	"Summer Flower Plan Week",
	"Summer Flower Season Plan",
	"Summer Flower Season Planting",
	"Summer Flower Budget",
	"Summer Flower Budget Fiscal Year",
	"Summer Flower Budget Month",
	"Block Production Budget",
	"Block Production Budget Category",
	"Block Production Budget Line",
	"Summer Flower Procurement Plan",
	"Summer Flower Purchase Allocation",
	"Summer Flower TC Price Band",
	"Material Route",
	"Material Route Stage",
	"Material Stage",
	"Crop Material Stage",
	"Planting Material Requirement",
	"Summer Flower Grade",
	"Summer Flower Handover Wave",
	"Summer Flower Stage Lead",
)

REPORTS = ("Summer Flower Plan Space",)


def execute():
	take_over()


def take_over(require_module_def=True):
	"""Idempotent. `require_module_def=False` is for before_install, which runs before the app's Module Def exists:
	`bench install-app` marks patches.txt entries done without running them, so the install hook has to do this."""
	if require_module_def and not frappe.db.exists("Module Def", MODULE):
		return
	for name in DOCTYPES:
		row = frappe.db.get_value("DocType", name, ["module", "custom"], as_dict=True)
		if not row:
			continue
		if row.module not in (OLD_MODULE, MODULE):
			# Somebody else's by now: leave it alone.
			continue
		if row.module != MODULE or row.custom:
			frappe.db.set_value("DocType", name, {"module": MODULE, "custom": 0}, update_modified=False)
	for name in REPORTS:
		if frappe.db.get_value("Report", name, "module") == OLD_MODULE:
			frappe.db.set_value("Report", name, "module", MODULE, update_modified=False)
