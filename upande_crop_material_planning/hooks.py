app_name = "upande_crop_material_planning"
app_title = "Upande Crop Material Planning"
app_publisher = "Upande"
app_description = "Crop material planning: production projections, forecasts, budgets and calibration from actuals (split from upande_agriculture)"
app_email = "teddy@upande.com"
app_license = "mit"

# Apps
# ------------------

required_apps = ["upande_production"]

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "upande_crop_material_planning",
# 		"logo": "/assets/upande_crop_material_planning/logo.png",
# 		"title": "Upande Crop Material Planning",
# 		"route": "/upande_crop_material_planning",
# 		"has_permission": "upande_crop_material_planning.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/upande_crop_material_planning/css/upande_crop_material_planning.css"
# app_include_js = "/assets/upande_crop_material_planning/js/upande_crop_material_planning.js"

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

# before_install = "upande_crop_material_planning.install.before_install"
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
}

doc_events = {
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

