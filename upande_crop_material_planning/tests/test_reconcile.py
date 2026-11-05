"""The ported planning code reaches the figures stored on the live records (skips where the site has none)."""

import unittest

import frappe
from frappe.tests import IntegrationTestCase

from upande_crop_material_planning.summer_flowers import reconcile


class TestReconcile(IntegrationTestCase):
	def _check(self, fn, doctype):
		if not frappe.db.count(doctype):
			self.skipTest(f"no {doctype} records on this site")
		r = fn()
		self.assertTrue(r["checked"])
		self.assertEqual(r["disagree"], {}, "stored figures differ from the recomputed ones")

	def test_production_plans(self):
		self._check(reconcile.production_plans, "Summer Flower Production Plan")

	def test_plan_weeks_are_their_blocks(self):
		self._check(reconcile.plan_weeks_against_blocks, "Summer Flower Production Plan")

	def test_budgets(self):
		self._check(reconcile.budgets, "Summer Flower Budget")

	def test_budgets_equal_their_plans(self):
		self._check(reconcile.budgets_against_plans, "Summer Flower Budget")

	def test_procurement_plans(self):
		self._check(reconcile.procurement_plans, "Summer Flower Procurement Plan")


class TestRefreshPlanCounters(IntegrationTestCase):
	def test_dry_run_writes_nothing_and_is_idempotent(self):
		from upande_crop_material_planning.summer_flowers import cleanup

		if not frappe.db.count("Summer Flower Production Plan"):
			self.skipTest("no plans on this site")
		before = frappe.db.get_all("Summer Flower Production Plan", fields=["name", "modified", "status", "total_demand_stems",
		                           "plantings_not_placed", "blocks_used", "unmet_stems"], order_by="name")
		r = cleanup.refresh_plan_counters(apply=False)
		self.assertFalse(r["applied"])
		after = frappe.db.get_all("Summer Flower Production Plan", fields=["name", "modified", "status", "total_demand_stems",
		                          "plantings_not_placed", "blocks_used", "unmet_stems"], order_by="name")
		self.assertEqual(before, after)

	def test_apply_clears_stale_counters_only(self):
		from upande_crop_material_planning.summer_flowers import cleanup, reconcile

		if not frappe.db.count("Summer Flower Production Plan"):
			self.skipTest("no plans on this site")
		keep = frappe.db.get_all("Summer Flower Production Plan", fields=["name", "status", "total_demand_stems",
		                         "total_production_stems", "modified"], order_by="name")
		cleanup.refresh_plan_counters(apply=True)
		self.assertEqual(reconcile.production_plans()["stale_placement"], {})
		self.assertEqual(cleanup.refresh_plan_counters()["stale"], {})
		self.assertEqual(keep, frappe.db.get_all("Summer Flower Production Plan", fields=["name", "status",
		                 "total_demand_stems", "total_production_stems", "modified"], order_by="name"))
