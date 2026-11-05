# Copyright (c) 2026, Upande and contributors
# For license information, please see license.txt


def before_install():
	"""A fresh install of this app on a site that ran upande_summer_flowers must adopt its planning doctypes."""
	from upande_crop_material_planning.patches.v1_2.adopt_summer_flowers_planning import take_over

	take_over(require_module_def=False)
