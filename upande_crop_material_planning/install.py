# Copyright (c) 2026, Upande and contributors
# For license information, please see license.txt


def before_install():
	"""A fresh install of this app on a site that ran upande_summer_flowers must adopt its planning doctypes."""
	from upande_crop_material_planning.patches.v1_0.take_ownership_from_agriculture import (
		take_over as take_over_agriculture,
	)
	from upande_crop_material_planning.patches.v1_2.adopt_summer_flowers_planning import take_over

	take_over_agriculture(create_module_def=False)
	take_over(require_module_def=False)


def after_install():
	"""install_app marks patches.txt as done without running it; the desk tile setup must still happen."""
	from upande_crop_material_planning.patches.v1_1.desktop_icon_workspace_sidebar import execute

	execute()
