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
