"""End to end: budget generation, then a submitted Harvesting Stock Entry
updates the open forecast's actuals through the planning doc_event."""

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, getdate, nowdate

from upande_crop_material_planning import budget
from upande_crop_material_planning.tests.test_budget import _BudgetFixture


class TestForecastActualsHook(_BudgetFixture, FrappeTestCase):
    HOUSE = "TEST GH ACTUALS"
    VARIETY = "TEST-ACTUALS-VARIETY"

    def setUp(self):
        self.cycle = self.build_fixture()
        self.today = getdate(nowdate())
        self.iso = self.today.isocalendar()
        self.year = self.iso[0]
        if not frappe.db.exists("Stock Entry Type", "Harvesting"):
            frappe.get_doc({"doctype": "Stock Entry Type", "name": "Harvesting",
                            "purpose": "Material Receipt"}).insert(ignore_permissions=True)

    def _week_actual(self, forecast):
        doc = frappe.get_doc("Production Forecast", forecast)
        row = [w for w in doc.weeks
               if int(w.week_number) == self.iso[1] and (w.grade or "all") == "all"][0]
        return int(row.actual_stems or 0)

    def test_budget_then_harvest_updates_forecast_actuals(self):
        res = budget.generate_budget(self.house, self.VARIETY, self.year)
        self.assertGreater(res["total_stems"], 0)

        budget.revise_forecast(self.house, self.VARIETY, self.year, self.iso[1], 2)
        forecast = frappe.db.get_value("Production Forecast", {
            "greenhouse": self.house, "variety": self.VARIETY,
            "forecast_year": self.year, "status": "Active"}, "name")
        self.assertTrue(forecast)
        before = self._week_actual(forecast)

        se = frappe.get_doc({
            "doctype": "Stock Entry", "stock_entry_type": "Harvesting",
            "purpose": "Material Receipt", "company": self.house and frappe.db.get_value(
                "Warehouse", self.house, "company"),
            "posting_date": self.today, "to_warehouse": self.house,
            "items": [{"item_code": self.VARIETY, "qty": 120, "basic_rate": 1,
                       "t_warehouse": self.house}],
        })
        se.insert(ignore_permissions=True)
        se.submit()
        self.assertEqual(self._week_actual(forecast), before + 120,
                         "submit must push the harvest into the forecast week")

        se.cancel()
        self.assertEqual(self._week_actual(forecast), before,
                         "cancel must pull the number back down")
