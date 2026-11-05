app_name = "upande_crop_material_planning"
app_title = "Crop Material Planning"
app_publisher = "Upande"
app_description = "Crop material planning: production projections, forecasts, budgets and calibration from actuals (split from upande_agriculture)"
app_email = "teddy@upande.com"
app_license = "mit"

# Apps
# ------------------

required_apps = ["upande_production"]

# Each item in the list will be shown as an app in the apps page
add_to_apps_screen = [
	{
		"name": "upande_crop_material_planning",
		"logo": "/assets/upande_crop_material_planning/images/crop_material_planning_logo.svg",
		"title": "Crop Material Planning",
		"route": "/desk/crop-material-planning",
	}
]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/upande_crop_material_planning/css/upande_crop_material_planning.css"
# The workspace home's tiled navigation block.
fixtures = [
	{"doctype": "Custom HTML Block", "filters": [["name", "in", ["Crop Material Planning Navigation"]]]},
	{"doctype": "Workflow", "filters": [["name", "in", ["Summer Flower Production Plan Approval"]]]},
	{"doctype": "Workflow State", "filters": [["name", "in", ["Draft", "Pending Approval", "Approved", "Rejected"]]]},
	{"doctype": "Workflow Action Master", "filters": [["name", "in", ["Submit for Approval", "Approve", "Reject", "Reopen"]]]},
]

# include js, css files in header of web template
# web_include_css = "/assets/upande_crop_material_planning/css/upande_crop_material_planning.css"
# web_include_js = "/assets/upande_crop_material_planning/js/upande_crop_material_planning.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "upande_crop_material_planning/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "upande_crop_material_planning/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# automatically load and sync documents of this doctype from downstream apps
# importable_doctypes = [doctype_1]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "upande_crop_material_planning.utils.jinja_methods",
# 	"filters": "upande_crop_material_planning.utils.jinja_filters"
# }

# Installation
# ------------

# `bench install-app` marks patches.txt entries as done without running them, so the take-over of the
# Summer Flowers planning doctypes (module + custom=0) is driven from here too. Idempotent.
before_install = "upande_crop_material_planning.install.before_install"
# after_install = "upande_crop_material_planning.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "upande_crop_material_planning.uninstall.before_uninstall"
# after_uninstall = "upande_crop_material_planning.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "upande_crop_material_planning.utils.before_app_install"
# after_app_install = "upande_crop_material_planning.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "upande_crop_material_planning.utils.before_app_uninstall"
# after_app_uninstall = "upande_crop_material_planning.utils.after_app_uninstall"

# Build
# ------------------
# To hook into the build process

# after_build = "upande_crop_material_planning.build.after_build"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "upande_crop_material_planning.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"upande_crop_material_planning.tasks.all"
# 	],
# 	"daily": [
# 		"upande_crop_material_planning.tasks.daily"
# 	],
# 	"hourly": [
# 		"upande_crop_material_planning.tasks.hourly"
# 	],
# 	"weekly": [
# 		"upande_crop_material_planning.tasks.weekly"
# 	],
# 	"monthly": [
# 		"upande_crop_material_planning.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "upande_crop_material_planning.install.before_tests"

# Extend DocType Class
# ------------------------------
#
# Specify custom mixins to extend the standard doctype controller.
# extend_doctype_class = {
# 	"Task": "upande_crop_material_planning.custom.task.CustomTaskMixin"
# }

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "upande_crop_material_planning.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "upande_crop_material_planning.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["upande_crop_material_planning.utils.before_request"]
# after_request = ["upande_crop_material_planning.utils.after_request"]

# Job Events
# ----------
# before_job = ["upande_crop_material_planning.utils.before_job"]
# after_job = ["upande_crop_material_planning.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Planning ownership of the former upande_agriculture endpoints; old dotted
# paths (mobile app, desk JS) keep resolving.
override_whitelisted_methods = {
	"upande_agriculture.api.get_week_summary": "upande_crop_material_planning.api.get_week_summary",
	"upande_agriculture.api.regenerate_projection": "upande_crop_material_planning.api.regenerate_projection",
	"upande_agriculture.api.get_budget_grid": "upande_crop_material_planning.api.get_budget_grid",
	"upande_agriculture.api.update_projection_week": "upande_crop_material_planning.api.update_projection_week",
	"upande_agriculture.api.bulk_update_projection_weeks": "upande_crop_material_planning.api.bulk_update_projection_weeks",
	"upande_agriculture.api.set_projection_source": "upande_crop_material_planning.api.set_projection_source",
	"upande_agriculture.api.bulk_update_aggregated_weeks": "upande_crop_material_planning.api.bulk_update_aggregated_weeks",
	"upande_agriculture.api.bulk_apply_formula": "upande_crop_material_planning.api.bulk_apply_formula",
	"upande_agriculture.api.bulk_set_aggregated_source": "upande_crop_material_planning.api.bulk_set_aggregated_source",
	"upande_agriculture.api.copy_aggregated_row": "upande_crop_material_planning.api.copy_aggregated_row",
	"upande_agriculture.api.get_prior_year_actuals": "upande_crop_material_planning.api.get_prior_year_actuals",
	"upande_agriculture.budget.generate_budget": "upande_crop_material_planning.budget.generate_budget",
	"upande_agriculture.budget.generate_all_budgets": "upande_crop_material_planning.budget.generate_all_budgets",
	"upande_agriculture.budget.budget_by_grade": "upande_crop_material_planning.budget.budget_by_grade",
	"upande_agriculture.budget.budget_week_map": "upande_crop_material_planning.budget.budget_week_map",
	"upande_agriculture.budget.revise_forecast": "upande_crop_material_planning.budget.revise_forecast",
	"upande_agriculture.budget.calibrate_variety": "upande_crop_material_planning.budget.calibrate_variety",
	"upande_agriculture.budget.grid_payload": "upande_crop_material_planning.budget.grid_payload",
	"upande_agriculture.budget.set_forecast_cell": "upande_crop_material_planning.budget.set_forecast_cell",
	"upande_agriculture.budget.revise_blocks": "upande_crop_material_planning.budget.revise_blocks",
	"upande_agriculture.budget.cell_history": "upande_crop_material_planning.budget.cell_history",
	"upande_agriculture.budget.set_budget_cell": "upande_crop_material_planning.budget.set_budget_cell",
	"upande_agriculture.mobile.api.getProductionProjection": "upande_crop_material_planning.mobile.api.getProductionProjection",
	"upande_agriculture.mobile.api.updateRevisedForecast": "upande_crop_material_planning.mobile.api.updateRevisedForecast",
	"upande_agriculture.upande_agriculture.doctype.production_forecast.production_forecast.refresh_actuals": "upande_crop_material_planning.upande_crop_material_planning.doctype.production_forecast.production_forecast.refresh_actuals",
	# upande_summer_flowers was split up: its planning endpoints keep their old paths.
	"upande_summer_flowers.summer_flowers.crop_routes.classify": "upande_production.summer_flowers.crop_routes.classify",
	"upande_summer_flowers.summer_flowers.crop_routes.provision": "upande_production.summer_flowers.crop_routes.provision",
	"upande_summer_flowers.summer_flowers.crop_routes.spread_season": "upande_production.summer_flowers.crop_routes.spread_season",
	"upande_summer_flowers.summer_flowers.demand_import.import_demand": "upande_crop_material_planning.summer_flowers.demand_import.import_demand",
	"upande_summer_flowers.summer_flowers.demand_import.preview": "upande_crop_material_planning.summer_flowers.demand_import.preview",
	"upande_summer_flowers.summer_flowers.doctype.production_forecast.production_forecast.refresh_actuals": "upande_crop_material_planning.upande_crop_material_planning.doctype.production_forecast.production_forecast.refresh_actuals",
	"upande_summer_flowers.summer_flowers.doctype.production_forecast.production_forecast.variety_query": "upande_crop_material_planning.upande_crop_material_planning.doctype.production_forecast.production_forecast.variety_query",
	"upande_summer_flowers.summer_flowers.doctype.summer_flower_budget.summer_flower_budget.build_from_plan": "upande_crop_material_planning.upande_crop_material_planning.doctype.summer_flower_budget.summer_flower_budget.build_from_plan",
	"upande_summer_flowers.summer_flowers.doctype.summer_flower_procurement_plan.summer_flower_procurement_plan.build": "upande_crop_material_planning.upande_crop_material_planning.doctype.summer_flower_procurement_plan.summer_flower_procurement_plan.build",
	"upande_summer_flowers.summer_flowers.doctype.summer_flower_procurement_plan.summer_flower_procurement_plan.methods_for": "upande_crop_material_planning.upande_crop_material_planning.doctype.summer_flower_procurement_plan.summer_flower_procurement_plan.methods_for",
	"upande_summer_flowers.summer_flowers.doctype.summer_flower_procurement_plan.summer_flower_procurement_plan.overview": "upande_crop_material_planning.upande_crop_material_planning.doctype.summer_flower_procurement_plan.summer_flower_procurement_plan.overview",
	"upande_summer_flowers.summer_flowers.doctype.summer_flower_procurement_plan.summer_flower_procurement_plan.tc_options": "upande_crop_material_planning.upande_crop_material_planning.doctype.summer_flower_procurement_plan.summer_flower_procurement_plan.tc_options",
	"upande_summer_flowers.summer_flowers.doctype.summer_flower_procurement_plan.summer_flower_procurement_plan.write_plantings_for": "upande_crop_material_planning.upande_crop_material_planning.doctype.summer_flower_procurement_plan.summer_flower_procurement_plan.write_plantings_for",
	"upande_summer_flowers.summer_flowers.doctype.summer_flower_production_plan.summer_flower_production_plan.allocate": "upande_crop_material_planning.upande_crop_material_planning.doctype.summer_flower_production_plan.summer_flower_production_plan.allocate",
	"upande_summer_flowers.summer_flowers.doctype.summer_flower_production_plan.summer_flower_production_plan.allocation_options": "upande_crop_material_planning.upande_crop_material_planning.doctype.summer_flower_production_plan.summer_flower_production_plan.allocation_options",
	"upande_summer_flowers.summer_flowers.doctype.summer_flower_production_plan.summer_flower_production_plan.assign_block": "upande_crop_material_planning.upande_crop_material_planning.doctype.summer_flower_production_plan.summer_flower_production_plan.assign_block",
	"upande_summer_flowers.summer_flowers.doctype.summer_flower_production_plan.summer_flower_production_plan.autoassign_blocks": "upande_crop_material_planning.upande_crop_material_planning.doctype.summer_flower_production_plan.summer_flower_production_plan.autoassign_blocks",
	"upande_summer_flowers.summer_flowers.doctype.summer_flower_production_plan.summer_flower_production_plan.block_suggestions": "upande_crop_material_planning.upande_crop_material_planning.doctype.summer_flower_production_plan.summer_flower_production_plan.block_suggestions",
	"upande_summer_flowers.summer_flowers.doctype.summer_flower_production_plan.summer_flower_production_plan.build_all": "upande_crop_material_planning.upande_crop_material_planning.doctype.summer_flower_production_plan.summer_flower_production_plan.build_all",
	"upande_summer_flowers.summer_flowers.doctype.summer_flower_production_plan.summer_flower_production_plan.build_from_demand": "upande_crop_material_planning.upande_crop_material_planning.doctype.summer_flower_production_plan.summer_flower_production_plan.build_from_demand",
	"upande_summer_flowers.summer_flowers.doctype.summer_flower_production_plan.summer_flower_production_plan.plan_preview": "upande_crop_material_planning.upande_crop_material_planning.doctype.summer_flower_production_plan.summer_flower_production_plan.plan_preview",
	"upande_summer_flowers.summer_flowers.doctype.summer_flower_production_plan.summer_flower_production_plan.uproot_to_free": "upande_crop_material_planning.upande_crop_material_planning.doctype.summer_flower_production_plan.summer_flower_production_plan.uproot_to_free",
	"upande_summer_flowers.summer_flowers.doctype.summer_flower_production_plan.summer_flower_production_plan.uprooting_plan": "upande_crop_material_planning.upande_crop_material_planning.doctype.summer_flower_production_plan.summer_flower_production_plan.uprooting_plan",
	"upande_summer_flowers.summer_flowers.doctype.summer_flower_season_plan.summer_flower_season_plan.for_season": "upande_crop_material_planning.upande_crop_material_planning.doctype.summer_flower_season_plan.summer_flower_season_plan.for_season",
	"upande_summer_flowers.summer_flowers.explain.explain": "upande_crop_material_planning.summer_flowers.explain.explain",
	"upande_summer_flowers.summer_flowers.explain.explainable": "upande_crop_material_planning.summer_flowers.explain.explainable",
	"upande_summer_flowers.summer_flowers.material_request.build_input_request": "upande_crop_material_planning.summer_flowers.material_request.build_input_request",
	"upande_summer_flowers.summer_flowers.material_request.input_requests": "upande_crop_material_planning.summer_flowers.material_request.input_requests",
	"upande_summer_flowers.summer_flowers.plan_sheet.sheet": "upande_crop_material_planning.summer_flowers.plan_sheet.sheet",
	"upande_summer_flowers.summer_flowers.plan_sheet.sheet_csv": "upande_crop_material_planning.summer_flowers.plan_sheet.sheet_csv",
	"upande_summer_flowers.summer_flowers.planning_api.accept_propagation_replan": "upande_crop_material_planning.summer_flowers.planning_api.accept_propagation_replan",
	"upande_summer_flowers.summer_flowers.planning_api.beds_under_block": "upande_crop_material_planning.summer_flowers.planning_api.beds_under_block",
	"upande_summer_flowers.summer_flowers.planning_api.block_forecast": "upande_crop_material_planning.summer_flowers.planning_api.block_forecast",
	"upande_summer_flowers.summer_flowers.planning_api.confirm_tc_choice": "upande_crop_material_planning.summer_flowers.planning_api.confirm_tc_choice",
	"upande_summer_flowers.summer_flowers.planning_api.delivery_schedule": "upande_crop_material_planning.summer_flowers.planning_api.delivery_schedule",
	"upande_summer_flowers.summer_flowers.planning_api.demand_vs_production": "upande_crop_material_planning.summer_flowers.planning_api.demand_vs_production",
	"upande_summer_flowers.summer_flowers.planning_api.demand_vs_production_by_variety": "upande_crop_material_planning.summer_flowers.planning_api.demand_vs_production_by_variety",
	"upande_summer_flowers.summer_flowers.planning_api.event_calendar": "upande_crop_material_planning.summer_flowers.planning_api.event_calendar",
	"upande_summer_flowers.summer_flowers.planning_api.farm_plan": "upande_crop_material_planning.summer_flowers.planning_api.farm_plan",
	"upande_summer_flowers.summer_flowers.planning_api.lifetime_production": "upande_crop_material_planning.summer_flowers.planning_api.lifetime_production",
	"upande_summer_flowers.summer_flowers.planning_api.motherstock_batches": "upande_crop_material_planning.summer_flowers.planning_api.motherstock_batches",
	"upande_summer_flowers.summer_flowers.planning_api.motherstock_line": "upande_crop_material_planning.summer_flowers.planning_api.motherstock_line",
	"upande_summer_flowers.summer_flowers.planning_api.motherstock_plan": "upande_crop_material_planning.summer_flowers.planning_api.motherstock_plan",
	"upande_summer_flowers.summer_flowers.planning_api.plan_whatif": "upande_crop_material_planning.summer_flowers.planning_api.plan_whatif",
	"upande_summer_flowers.summer_flowers.planning_api.plans": "upande_crop_material_planning.summer_flowers.planning_api.plans",
	"upande_summer_flowers.summer_flowers.planning_api.planting_plan": "upande_crop_material_planning.summer_flowers.planning_api.planting_plan",
	"upande_summer_flowers.summer_flowers.planning_api.procurement_detail": "upande_crop_material_planning.summer_flowers.planning_api.procurement_detail",
	"upande_summer_flowers.summer_flowers.planning_api.production_sheet": "upande_crop_material_planning.summer_flowers.planning_api.production_sheet",
	"upande_summer_flowers.summer_flowers.planning_api.propagation_detail": "upande_crop_material_planning.summer_flowers.planning_api.propagation_detail",
	"upande_summer_flowers.summer_flowers.planning_api.propagation_schedule": "upande_crop_material_planning.summer_flowers.planning_api.propagation_schedule",
	"upande_summer_flowers.summer_flowers.planning_api.propagation_varieties": "upande_crop_material_planning.summer_flowers.planning_api.propagation_varieties",
	"upande_summer_flowers.summer_flowers.planning_api.propagator_choices": "upande_crop_material_planning.summer_flowers.planning_api.propagator_choices",
	"upande_summer_flowers.summer_flowers.planning_api.propose_propagators": "upande_crop_material_planning.summer_flowers.planning_api.propose_propagators",
	"upande_summer_flowers.summer_flowers.planning_api.protocol_detail": "upande_crop_material_planning.summer_flowers.planning_api.protocol_detail",
	"upande_summer_flowers.summer_flowers.planning_api.record_propagation_actual": "upande_crop_material_planning.summer_flowers.planning_api.record_propagation_actual",
	"upande_summer_flowers.summer_flowers.planning_api.save_propagators": "upande_crop_material_planning.summer_flowers.planning_api.save_propagators",
	"upande_summer_flowers.summer_flowers.planning_api.save_protocol": "upande_crop_material_planning.summer_flowers.planning_api.save_protocol",
	"upande_summer_flowers.summer_flowers.planning_api.save_sellers": "upande_crop_material_planning.summer_flowers.planning_api.save_sellers",
	"upande_summer_flowers.summer_flowers.planning_api.scope": "upande_crop_material_planning.summer_flowers.planning_api.scope",
	"upande_summer_flowers.summer_flowers.planning_api.scope_of": "upande_crop_material_planning.summer_flowers.planning_api.scope_of",
	"upande_summer_flowers.summer_flowers.planning_api.seller_choices": "upande_crop_material_planning.summer_flowers.planning_api.seller_choices",
	"upande_summer_flowers.summer_flowers.planning_api.simulate_buildup": "upande_crop_material_planning.summer_flowers.planning_api.simulate_buildup",
	"upande_summer_flowers.summer_flowers.planning_api.simulate_lifecycle": "upande_crop_material_planning.summer_flowers.planning_api.simulate_lifecycle",
	"upande_summer_flowers.summer_flowers.planning_api.tc_derivation": "upande_crop_material_planning.summer_flowers.planning_api.tc_derivation",
	"upande_summer_flowers.summer_flowers.planning_api.tc_options": "upande_crop_material_planning.summer_flowers.planning_api.tc_options",
	"upande_summer_flowers.summer_flowers.planning_api.tc_purchase": "upande_crop_material_planning.summer_flowers.planning_api.tc_purchase",
	"upande_summer_flowers.summer_flowers.planning_api.uproot_bed_whatif": "upande_crop_material_planning.summer_flowers.planning_api.uproot_bed_whatif",
	"upande_summer_flowers.summer_flowers.route_backfill.run": "upande_crop_material_planning.summer_flowers.route_backfill.run",
	"upande_summer_flowers.summer_flowers.route_methods.apply_catalogue": "upande_production.summer_flowers.route_methods.apply_catalogue",
	"upande_summer_flowers.summer_flowers.sourcing.entry_options": "upande_production.summer_flowers.sourcing.entry_options",
	"upande_summer_flowers.summer_flowers.sourcing.harvest_chain": "upande_production.summer_flowers.sourcing.harvest_chain",
	"upande_summer_flowers.summer_flowers.sourcing.order_schedule": "upande_production.summer_flowers.sourcing.order_schedule",
	"upande_summer_flowers.summer_flowers.sourcing.route_plan": "upande_production.summer_flowers.sourcing.route_plan",
	"upande_summer_flowers.summer_flowers.tc_supply.batches_for": "upande_production.summer_flowers.tc_supply.batches_for",
	"upande_summer_flowers.summer_flowers.tc_supply.tc_suppliers": "upande_production.summer_flowers.tc_supply.tc_suppliers",
}

doc_events = {
	"Material Request": {
		"validate": "upande_crop_material_planning.summer_flowers.material_request.validate_input_request",
	},
	"Stock Entry": {
		"on_submit": "upande_crop_material_planning.controllers.stock_entry_forecast_actuals",
		"on_cancel": "upande_crop_material_planning.controllers.stock_entry_forecast_actuals",
	},
}

scheduler_events = {
	"daily": [
		"upande_crop_material_planning.scheduled.rollup_actuals",
	],
}

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"upande_crop_material_planning.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []

