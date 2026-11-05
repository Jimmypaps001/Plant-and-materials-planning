import importlib
import unittest

from upande_crop_material_planning import hooks


class TestOverridesResolve(unittest.TestCase):
	def test_every_override_target_resolves_to_a_whitelisted_function(self):
		import frappe

		for old, new in hooks.override_whitelisted_methods.items():
			mod, fn = new.rsplit(".", 1)
			func = getattr(importlib.import_module(mod), fn)
			self.assertIn(func, frappe.whitelisted, f"{old} -> {new} is not whitelisted")

	def test_planning_has_no_copy_of_production_modules(self):
		import os
		here = os.path.dirname(importlib.import_module("upande_crop_material_planning.summer_flowers").__file__)
		for m in ("lifecycle_sim", "sourcing", "tc_supply", "simplex", "cohort_solver"):
			self.assertFalse(os.path.exists(os.path.join(here, m + ".py")), m)
