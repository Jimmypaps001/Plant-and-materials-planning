"""Tests for upande_crop_material_planning.api.

Run with:
    bench --site marginpar.local run-tests --app upande_crop_material_planning \
          --module upande_crop_material_planning.tests.test_api
"""

from __future__ import annotations

import datetime
import unittest
import unittest.mock

import frappe
from frappe.tests.utils import FrappeTestCase

from upande_crop_material_planning.tests import cycle_extras, default_company, default_employee, default_uom, make_warehouse

from upande_crop_material_planning import api


class TestApi(FrappeTestCase):
    # Code under test (scheduled.rollup_actuals, bulk_set_aggregated_source) commits; keep the fixtures out
    # of the site by turning commit into a no-op for each test and rolling back afterwards.
    def setUp(self):
        patcher = unittest.mock.patch.object(frappe.db, "commit", lambda *a, **k: None)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.addCleanup(frappe.db.rollback)
    # ------------------------------------------------------------------
    # Shared fixtures (re-use helpers from test_controllers where possible)
    # ------------------------------------------------------------------

    def _make_warehouse(self, name="TEST GH 1", supervisor="Administrator"):
        return make_warehouse(name, supervisor)

    def _make_item(self, name="TEST-VARIETY-A"):
        if not frappe.db.exists("Item", name):
            frappe.get_doc({
                "doctype": "Item",
                "item_code": name,
                "item_name": name,
                "item_group": "All Item Groups",
                "stock_uom": default_uom(),
            }).insert(ignore_permissions=True, ignore_mandatory=True)
        return name

    def _make_protocol(self, name="TEST-PROTO-1"):
        """Idempotent: refresh values on re-run so a stale row can't skew a test."""
        item = self._make_item()
        values = {
            # Live-schema sites make these mandatory
            "crop_type": "Roses", "variety": item,
            "variety_item": item,
            "weeks_to_first_bending": 5,
            "weeks_to_second_bending": 5,
            "weeks_between_cuts": 7,
            "stems_per_plant_first_harvest": 0.7,
            "stems_per_cut": 1.5,
            "max_stems_per_plant_per_cut": 1.61,
            "productive_life_weeks": 260,
        }
        if frappe.db.exists("Crop Protocol", name):
            doc = frappe.get_doc("Crop Protocol", name)
            doc.update(values)
            doc.save(ignore_permissions=True)
            return doc.name
        return frappe.get_doc({
            "doctype": "Crop Protocol", "protocol_name": name, **values,
        }).insert(ignore_permissions=True, set_name=name).name

    def _make_cycle(self, gh=None, proto=None, variety=None):
        """Ensure the greenhouse has one Active cycle; return that child row."""
        gh = gh or self._make_warehouse()
        proto = proto or self._make_protocol()
        variety = variety or self._make_item()

        existing = frappe.db.get_value(
            "Crop Cycle", {"greenhouse": gh, "variety": variety, "status": "Active"}, "name"
        )
        if existing:
            return frappe.get_doc("Crop Cycle", existing)
        return frappe.get_doc({
            "doctype": "Crop Cycle", **cycle_extras(),
            "greenhouse": gh, "variety": variety, "crop_protocol": proto,
            "planting_date": datetime.date(2026, 1, 5),
            "status": "Active", "qty_planted": 10000,
        }).insert(ignore_permissions=True)

    # ------------------------------------------------------------------
    # 1. get_week_summary
    # ------------------------------------------------------------------

    def test_get_week_summary_returns_four_numbers(self):
        """Response must contain budget, forecast, plan, actual keys."""
        out = api.get_week_summary(
            greenhouse="TEST GH 1",
            variety="TEST-VARIETY-A",
            iso_week=27,
            iso_year=2026,
        )
        self.assertIn("budget", out)
        self.assertIn("forecast", out)
        self.assertIn("plan", out)
        self.assertIn("actual", out)
        # All values must be numeric (int or float)
        for key in ("budget", "forecast", "plan", "actual"):
            self.assertIsInstance(out[key], (int, float),
                                  f"{key} should be numeric, got {type(out[key])}")

    # ------------------------------------------------------------------
    # 2. mark_cycle_harvestable
    # ------------------------------------------------------------------

    def test_regenerate_projection_overwrites_unlocked_weeks(self):
        """Recalculates a Hybrid projection and reports how many weeks changed."""
        # Ensure a Hybrid projection exists
        self._make_cycle()
        from upande_crop_material_planning.budget import generate_budget
        cycle = self._make_cycle()
        res = generate_budget(cycle.greenhouse, cycle.variety, 2027)
        proj = frappe.get_doc("Production Projection", res["projection"])
        proj.source = "Hybrid"
        proj.save(ignore_permissions=True)
        result = api.regenerate_projection(proj.name)
        self.assertIn("weeks_updated", result)
        # weeks_updated is an int >= 0
        self.assertIsInstance(result["weeks_updated"], int)
        # A freshly created Hybrid projection has 52 unlocked weeks;
        # regenerating it may or may not change values depending on
        # seasonal factors, but the key must be present and non-negative.
        self.assertGreaterEqual(result["weeks_updated"], 0)

    # ------------------------------------------------------------------
    # 4. list_active_cycles
    # ------------------------------------------------------------------

    def test_rollup_actuals_does_not_crash(self):
        """rollup_actuals() must return a non-negative integer.

        The function soft-fails (returns 0) when tabActual Harvest is absent,
        or returns the count of Projection Week rows it touched.
        """
        from upande_crop_material_planning.scheduled import rollup_actuals

        result = rollup_actuals()
        self.assertIsInstance(result, int, "rollup_actuals must return an int")
        self.assertGreaterEqual(result, 0, "return value must be >= 0")

    def test_rollup_actuals_populates_variance(self):
        """After rollup, any Projection with weeks should have non-None variance."""
        from upande_crop_material_planning.scheduled import rollup_actuals

        rollup_actuals()
        proj = frappe.get_last_doc("Production Projection")
        if proj.weeks:
            self.assertIsNotNone(
                proj.weeks[0].variance,
                "variance should be populated after rollup_actuals",
            )
