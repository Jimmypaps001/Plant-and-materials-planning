"""Make the app's desk tile a Workspace Sidebar icon, so the desk builds a relative same-tab route
(`/desk/crop-material-planning?sidebar=Crop Material Planning`) instead of an External link.

Idempotent and single: updates the one App icon if present, creates it only when none exists."""

import frappe

NAME = "Crop Material Planning"
APP = "upande_crop_material_planning"
LOGO = "/assets/upande_crop_material_planning/images/crop_material_planning_logo.svg"


def execute():
	icons = frappe.get_all("Desktop Icon", filters={"icon_type": "App", "app": APP}, pluck="name") or \
		frappe.get_all("Desktop Icon", filters={"icon_type": "App", "label": NAME}, pluck="name")
	if icons:
		icon = frappe.get_doc("Desktop Icon", icons[0])
	else:
		icon = frappe.new_doc("Desktop Icon")
		icon.icon_type = "App"
		icon.app = APP
	icon.label = NAME
	icon.link_type = "Workspace Sidebar"
	icon.link_to = NAME
	icon.link = "/desk/crop-material-planning"  # kept: Frappe's workspace-icon sync reads .link
	icon.logo_url = LOGO
	icon.save(ignore_permissions=True)
	frappe.clear_cache()
