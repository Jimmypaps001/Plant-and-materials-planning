"""Reassign records that upande_agriculture shipped under module "Upande Agriculture"
to this app's module. No-op on a fresh site (rows absent)."""

import frappe

OLD_MODULE = "Upande Agriculture"
NEW_MODULE = "Upande Crop Material Planning"

DOCTYPES = [
	"Production Forecast",
	"Production Forecast Week",
	"Production Projection",
	"Projection Week",
]
PAGES = ["production_budget"]


def execute():
	take_over(create_module_def=True)


def take_over(create_module_def=False):
	"""Idempotent. before_install calls it with create_module_def=False: install_app's add_module_defs
	inserts the Module Def right after and raises on a duplicate."""
	if create_module_def and not frappe.db.exists("Module Def", NEW_MODULE):
		frappe.get_doc({
			"doctype": "Module Def",
			"module_name": NEW_MODULE,
			"app_name": "upande_crop_material_planning",
		}).insert(ignore_permissions=True)
	for dt in DOCTYPES:
		if frappe.db.exists("DocType", {"name": dt, "module": OLD_MODULE}):
			frappe.db.set_value("DocType", dt, "module", NEW_MODULE, update_modified=False)
	for page in PAGES:
		if frappe.db.exists("Page", {"name": page, "module": OLD_MODULE}):
			frappe.db.set_value("Page", page, "module", NEW_MODULE, update_modified=False)
	frappe.db.commit()
