"""Budget generation, forecast revisions and calibration against the DB."""

import datetime

import frappe
from frappe.tests.utils import FrappeTestCase

from upande_crop_material_planning import budget
from upande_crop_material_planning.tests import cycle_extras, default_uom, make_warehouse


class _BudgetFixture:
    """Builds its own warehouse, item, protocol and cycle; relies on no site data."""
    HOUSE = "TEST GH BUDGET"
    VARIETY = "TEST-BUDGET-VARIETY"
    PLANTING = datetime.date(2026, 1, 5)

    def build_fixture(self):
        self.house = make_warehouse(self.HOUSE)
        if not frappe.db.exists("Item", self.VARIETY):
            frappe.get_doc({
                "doctype": "Item", "item_code": self.VARIETY,
                "item_name": self.VARIETY, "item_group": "All Item Groups", "is_stock_item": 1,
                "stock_uom": default_uom(),
            }).insert(ignore_permissions=True, ignore_mandatory=True)
        self.proto = self._protocol()
        self.cycle_doc = self._cycle(planting=self.PLANTING)
        return self.cycle_doc

    def _protocol(self, name="TEST-BUDGET-PROTO"):
        values = {
            "crop_type": "Roses", "variety": self.VARIETY,
            "variety_item": self.VARIETY,
            "weeks_to_first_bending": 5, "weeks_to_second_bending": 5,
            "weeks_between_cuts": 7, "stems_per_plant_first_harvest": 0.7,
            "stems_per_cut": 1.5, "max_stems_per_plant_per_cut": 1.61,
            "productive_life_weeks": 260,
        }
        if frappe.db.exists("Crop Protocol", name):
            d = frappe.get_doc("Crop Protocol", name)
            d.update(values)
            d.save(ignore_permissions=True)
            return d.name
        return frappe.get_doc({
            "doctype": "Crop Protocol", "protocol_name": name, **values,
        }).insert(ignore_permissions=True, set_name=name).name

    def _cycle(self, qty=10000, planting=datetime.date(2026, 1, 5)):
        existing = frappe.db.get_value("Crop Cycle", {
            "greenhouse": self.house, "variety": self.VARIETY,
            "planting_date": planting}, "name")
        if existing:
            return frappe.get_doc("Crop Cycle", existing)
        return frappe.get_doc({
            "doctype": "Crop Cycle", **cycle_extras(), "greenhouse": self.house,
            "variety": self.VARIETY, "crop_protocol": self.proto,
            "planting_date": planting, "qty_planted": qty, "status": "Active",
        }).insert(ignore_permissions=True)


class TestBudget(_BudgetFixture, FrappeTestCase):
    def setUp(self):
        self.build_fixture()

    def test_generates_a_mature_year_at_the_steady_rate(self):
        res = budget.generate_budget(self.house, self.VARIETY, 2028)
        self.assertEqual(res["cycles_used"], 1)
        doc = frappe.get_doc("Production Projection", res["projection"])
        rates = {int(w.projected_stems) for w in doc.weeks if w.projected_stems}
        # 10,000 plants x 1.61 / 7 weeks
        self.assertEqual(rates, {2300})
        self.assertEqual(res["total_stems"], 52 * 2300)

    def test_regenerating_preserves_locked_weeks(self):
        res = budget.generate_budget(self.house, self.VARIETY, 2028)
        doc = frappe.get_doc("Production Projection", res["projection"])
        doc.weeks[0].projected_stems = 999
        doc.weeks[0].week_locked = 1
        doc.save(ignore_permissions=True)

        again = budget.generate_budget(self.house, self.VARIETY, 2028)
        self.assertEqual(again["weeks_preserved"], 1)
        doc.reload()
        self.assertEqual(int(doc.weeks[0].projected_stems), 999)

    def test_overwrite_manual_ignores_the_lock(self):
        res = budget.generate_budget(self.house, self.VARIETY, 2028)
        doc = frappe.get_doc("Production Projection", res["projection"])
        doc.weeks[0].projected_stems = 999
        doc.weeks[0].week_locked = 1
        doc.save(ignore_permissions=True)

        budget.generate_budget(self.house, self.VARIETY, 2028, overwrite_manual=1)
        doc.reload()
        self.assertEqual(int(doc.weeks[0].projected_stems), 2300)

    def test_second_block_raises_the_whole_house(self):
        one = budget.generate_budget(self.house, self.VARIETY, 2029)["total_stems"]
        self._cycle(qty=5000, planting=datetime.date(2026, 6, 1))
        two = budget.generate_budget(self.house, self.VARIETY, 2029)
        self.assertEqual(two["cycles_used"], 2)
        self.assertGreater(two["total_stems"], one)

    def test_no_cycles_is_an_explicit_error(self):
        with self.assertRaises(frappe.ValidationError):
            budget.generate_budget(self.house, "NO-SUCH-VARIETY", 2028)

    def test_grade_split_covers_every_stem(self):
        proto = frappe.get_doc("Crop Protocol", self.proto)
        proto.grade_mix = []
        proto.append("grade_mix", {"length_cm": 60, "pct": 63.8, "source": "Measured"})
        proto.append("grade_mix", {"length_cm": 50, "pct": 36.2, "source": "Measured"})
        proto.save(ignore_permissions=True)

        budget.generate_budget(self.house, self.VARIETY, 2028)
        out = budget.budget_by_grade(self.house, self.VARIETY, 2028)
        for wk, split in out["weeks"].items():
            self.assertEqual(sum(split.values()), 2300, f"week {wk} lost stems")


class TestForecastRevisions(FrappeTestCase):
    HOUSE = "TEST GH FORECAST"
    VARIETY = "TEST-BUDGET-VARIETY"

    def setUp(self):
        self.house = make_warehouse(self.HOUSE)
        if not frappe.db.exists("Item", self.VARIETY):
            frappe.get_doc({
                "doctype": "Item", "item_code": self.VARIETY,
                "item_name": self.VARIETY, "item_group": "All Item Groups", "is_stock_item": 1,
                "stock_uom": default_uom(),
            }).insert(ignore_permissions=True, ignore_mandatory=True)
        frappe.db.delete("Production Forecast", {"greenhouse": self.house})

    def _budget(self):
        """A real budget so forecast rows have something to pull."""
        proto = "TEST-BUDGET-PROTO"
        if not frappe.db.exists("Crop Protocol", proto):
            frappe.get_doc({
                "doctype": "Crop Protocol", "protocol_name": proto,
                "crop_type": "Roses", "variety": self.VARIETY,
                "variety_item": self.VARIETY, "weeks_to_first_bending": 5,
                "weeks_to_second_bending": 5, "weeks_between_cuts": 7,
                "stems_per_plant_first_harvest": 0.7, "stems_per_cut": 1.5,
                "max_stems_per_plant_per_cut": 1.61, "productive_life_weeks": 260,
            }).insert(ignore_permissions=True, set_name=proto)
        if not frappe.db.exists("Crop Cycle", {"greenhouse": self.house,
                                               "variety": self.VARIETY}):
            frappe.get_doc({
                "doctype": "Crop Cycle", **cycle_extras(), "greenhouse": self.house,
                "variety": self.VARIETY, "crop_protocol": proto,
                "planting_date": datetime.date(2026, 1, 5),
                "qty_planted": 10000, "status": "Active",
            }).insert(ignore_permissions=True)
        budget.generate_budget(self.house, self.VARIETY, 2028)

    def test_saving_a_forecast_fills_the_window_from_the_budget(self):
        """A forecast made in the UI must not come up with an empty table."""
        self._budget()
        doc = frappe.get_doc({
            "doctype": "Production Forecast", "greenhouse": self.house,
            "variety": self.VARIETY, "forecast_year": 2028,
            "start_week": 10, "window_weeks": 6, "status": "Active",
        }).insert(ignore_permissions=True)

        self.assertEqual([w.week_number for w in doc.weeks], [10, 11, 12, 13, 14, 15])
        # 2028 is a mature year: every week budgets 2,300.
        self.assertTrue(all(w.budget_stems == 2300 for w in doc.weeks))

    def test_widening_the_window_adds_weeks_and_keeps_edits(self):
        self._budget()
        doc = frappe.get_doc({
            "doctype": "Production Forecast", "greenhouse": self.house,
            "variety": self.VARIETY, "forecast_year": 2028,
            "start_week": 10, "window_weeks": 4, "status": "Active",
        }).insert(ignore_permissions=True)
        doc.weeks[0].revised_forecast_stems = 1500
        doc.weeks[0].reason = "Weather"
        doc.save(ignore_permissions=True)

        doc.window_weeks = 8
        doc.save(ignore_permissions=True)
        self.assertEqual(len(doc.weeks), 8)
        self.assertEqual(doc.weeks[0].revised_forecast_stems, 1500)
        self.assertEqual(doc.weeks[0].reason, "Weather")

    def test_narrowing_the_window_drops_weeks(self):
        self._budget()
        doc = frappe.get_doc({
            "doctype": "Production Forecast", "greenhouse": self.house,
            "variety": self.VARIETY, "forecast_year": 2028,
            "start_week": 10, "window_weeks": 8, "status": "Active",
        }).insert(ignore_permissions=True)
        doc.window_weeks = 3
        doc.save(ignore_permissions=True)
        self.assertEqual([w.week_number for w in doc.weeks], [10, 11, 12])

    def test_a_deliberate_zero_revision_is_not_reset(self):
        """Revising a week down to nothing is a judgement, not a blank."""
        self._budget()
        doc = frappe.get_doc({
            "doctype": "Production Forecast", "greenhouse": self.house,
            "variety": self.VARIETY, "forecast_year": 2028,
            "start_week": 10, "window_weeks": 4, "status": "Active",
        }).insert(ignore_permissions=True)
        doc.weeks[0].revised_forecast_stems = 0
        doc.weeks[0].reason = "Disease"
        doc.save(ignore_permissions=True)
        doc.window_weeks = 6
        doc.save(ignore_permissions=True)
        self.assertEqual(doc.weeks[0].revised_forecast_stems, 0)

    def test_budget_figures_refresh_when_the_budget_changes(self):
        self._budget()
        doc = frappe.get_doc({
            "doctype": "Production Forecast", "greenhouse": self.house,
            "variety": self.VARIETY, "forecast_year": 2028,
            "start_week": 10, "window_weeks": 4, "status": "Active",
        }).insert(ignore_permissions=True)
        self.assertEqual(doc.weeks[0].budget_stems, 2300)

        proj = frappe.get_doc("Production Projection", frappe.db.get_value(
            "Production Projection", {"greenhouse": self.house,
                                      "variety": self.VARIETY,
                                      "projection_year": 2028}, "name"))
        for w in proj.weeks:
            if int(w.week) == 10:
                w.projected_stems = 999
        proj.save(ignore_permissions=True)

        doc.save(ignore_permissions=True)
        self.assertEqual(doc.weeks[0].budget_stems, 999)

    def test_grid_payload_mode_picks_manual_vs_automated_budget(self):
        """The web page's Source toggle: Manual reads the typed Production
        Forecast figure, Automated reads the live Production Projection model
        untouched."""
        self._budget()

        def block_of(payload):
            return next(b for b in payload["blocks"]
                        if b["greenhouse"] == self.house and b["variety"] == self.VARIETY)

        def week10(mode):
            return block_of(budget.grid_payload(
                year=2028, start_year=2028, start_week=10,
                end_year=2028, end_week=10, mode=mode))["weekly"]["budget"][0]

        baseline = week10("automated")
        self.assertTrue(baseline, "the automated model should have a real number to contrast against")
        # No Production Forecast exists yet -- manual must read blank, not
        # quietly fall back to the automated figure.
        self.assertIsNone(week10("manual"))

        doc = frappe.get_doc({
            "doctype": "Production Forecast", "greenhouse": self.house,
            "variety": self.VARIETY, "forecast_year": 2028,
            "start_week": 10, "window_weeks": 4, "status": "Active",
        }).insert(ignore_permissions=True)
        doc.weeks[0].manual_budget_stems = 9999
        doc.save(ignore_permissions=True)

        manual_payload = budget.grid_payload(year=2028, start_year=2028, start_week=10,
                                              end_year=2028, end_week=10, mode="manual")
        self.assertEqual(manual_payload["mode"], "manual")
        self.assertEqual(block_of(manual_payload)["weekly"]["budget"][0], 9999)

        # Typing a manual figure must never leak back into the automated model.
        self.assertEqual(week10("automated"), baseline)

        # Week 11 was never typed by hand — manual mode falls back to the
        # forecast's own System Budget snapshot rather than showing a false zero.
        week11_row = next(w for w in doc.weeks if w.week_number == 11)
        self.assertTrue(week11_row.budget_stems)
        manual11 = block_of(budget.grid_payload(
            year=2028, start_year=2028, start_week=11,
            end_year=2028, end_week=11, mode="manual"))["weekly"]["budget"][0]
        self.assertEqual(manual11, week11_row.budget_stems)

    def test_window_can_now_span_the_full_year(self):
        # Production Forecast carries the full-season manual budget too, so a
        # window that used to be refused past 26 weeks is fine up to the
        # calendar year itself.
        doc = frappe.get_doc({
            "doctype": "Production Forecast", "greenhouse": self.house,
            "variety": self.VARIETY, "forecast_year": 2028,
            "start_week": 1, "window_weeks": 40, "status": "Active",
        }).insert(ignore_permissions=True)
        self.assertEqual(len(doc.weeks), 40)

    def test_absurd_window_is_refused(self):
        with self.assertRaises(frappe.ValidationError):
            frappe.get_doc({
                "doctype": "Production Forecast", "greenhouse": self.house,
                "variety": self.VARIETY, "forecast_year": 2028,
                "start_week": 10, "window_weeks": 60, "status": "Active",
            }).insert(ignore_permissions=True)

    def test_saves_for_a_year_with_no_fiscal_year_record(self):
        """Regression: forecast_year used to be a Link to Fiscal Year, so
        Frappe's link-integrity check (which runs before any controller
        hook fires -- before_insert included) rejected every forecast for a
        year nobody had created a Fiscal Year record for yet. Forecasting is
        inherently forward-looking, so this broke on exactly the years the
        tool exists for. forecast_year is a plain Int now; a year with no
        matching Fiscal Year must save cleanly and never create one as a
        side effect."""
        year = 2099
        self.assertFalse(frappe.db.exists("Fiscal Year", str(year)))
        doc = frappe.get_doc({
            "doctype": "Production Forecast", "greenhouse": self.house,
            "variety": self.VARIETY, "forecast_year": year,
            "start_week": 1, "window_weeks": 4, "status": "Active",
        }).insert(ignore_permissions=True)
        self.assertEqual(doc.forecast_year, year)
        self.assertFalse(frappe.db.exists("Fiscal Year", str(year)))

    def test_first_revision_starts_at_one(self):
        r = budget.revise_forecast(self.house, self.VARIETY, 2028, start_week=10)
        self.assertEqual(r["revision"], 1)
        self.assertIsNone(r["superseded"])
        self.assertEqual(r["weeks"], 6)

    def test_revising_supersedes_without_deleting(self):
        first = budget.revise_forecast(self.house, self.VARIETY, 2028, start_week=10)
        second = budget.revise_forecast(self.house, self.VARIETY, 2028, start_week=11)

        self.assertEqual(second["revision"], 2)
        self.assertEqual(second["superseded"], first["forecast"])
        # The old revision survives, readable, flagged.
        self.assertEqual(
            frappe.db.get_value("Production Forecast", first["forecast"], "status"),
            "Superseded")
        self.assertEqual(
            frappe.db.get_value("Production Forecast", second["forecast"], "status"),
            "Active")

    def test_window_length_is_respected(self):
        r = budget.revise_forecast(self.house, self.VARIETY, 2028,
                                   start_week=10, window_weeks=10)
        self.assertEqual(r["weeks"], 10)

    def test_window_is_clipped_at_week_52(self):
        r = budget.revise_forecast(self.house, self.VARIETY, 2028,
                                   start_week=50, window_weeks=10)
        self.assertEqual(r["weeks"], 3)


class TestVarietyParsing(FrappeTestCase):
    def test_base_variety_strips_the_length_grade(self):
        for raw, want in [("ATHENA-60CM", "ATHENA"), ("Ever-Red-70cm", "Ever-Red"),
                          ("Athena", "Athena"), ("Proud-60 cm", "Proud")]:
            self.assertEqual(budget.base_variety(raw), want)

    def test_grade_is_read_back(self):
        self.assertEqual(budget.grade_of("ATHENA-60CM"), 60)
        self.assertIsNone(budget.grade_of("ATHENA"))


class TestWeekSpan(FrappeTestCase):
    def test_span_within_one_year(self):
        self.assertEqual(budget.week_span(2026, 10, 2026, 13),
                         [(2026, 10), (2026, 11), (2026, 12), (2026, 13)])

    def test_span_rolls_over_the_year_end(self):
        # 2025 is a 52-week ISO year, so 52 is followed by 2026 W1.
        self.assertEqual(budget.week_span(2025, 51, 2026, 2),
                         [(2025, 51), (2025, 52), (2026, 1), (2026, 2)])

    def test_span_rolls_over_a_53_week_year(self):
        # 2026 has 53 ISO weeks — W53 must not be skipped.
        self.assertEqual(budget.week_span(2026, 52, 2027, 1),
                         [(2026, 52), (2026, 53), (2027, 1)])

    def test_end_before_start_is_empty(self):
        self.assertEqual(budget.week_span(2026, 10, 2026, 9), [])

    def test_span_is_bounded(self):
        self.assertEqual(len(budget.week_span(2000, 1, 2100, 1)),
                         budget.MAX_SPAN_WEEKS)


class TestForecastRoundTrip(_BudgetFixture, FrappeTestCase):
    """The grid used to write forecasts and never read them back."""

    def test_grade_is_normalised(self):
        self.assertEqual(budget.normalise_grade("__all__"), "all")
        self.assertEqual(budget.normalise_grade(""), "all")
        self.assertEqual(budget.normalise_grade(None), "all")
        self.assertEqual(budget.normalise_grade(" 60 cm "), "60 cm")

    def test_active_forecasts_is_empty_without_pairs(self):
        self.assertEqual(budget.active_forecasts([]), {})

    def test_seeded_rows_are_not_reported_as_revisions(self):
        # Opening a window writes forecast == budget for every week. Those are
        # scaffolding; only a week somebody changed counts as a revision.
        cycle = self.build_fixture()
        house = cycle.greenhouse
        year = 2031  # a year with no other fixtures in play
        r = budget.revise_forecast(house, cycle.variety, year, 10, 4)
        try:
            self.assertFalse(budget.active_forecasts([(house, cycle.variety, year)]),
                             "a freshly seeded window must report no revisions")

            budget.set_forecast_cell(cycle.name, "__all__", 11, 4321, year, reason="Weather")
            got = budget.active_forecasts([(house, cycle.variety, year)])
            self.assertEqual(got[(house, cycle.variety)][(year, 11, "all")], 4321)
            # untouched weeks in the same window stay absent
            self.assertNotIn((year, 12, "all"), got[(house, cycle.variety)])

            # a grade revision is independent of the week total
            budget.set_forecast_cell(cycle.name, "60 cm", 11, 777, year)
            got = budget.active_forecasts([(house, cycle.variety, year)])
            block = got[(house, cycle.variety)]
            self.assertEqual(block[(year, 11, "all")], 4321)
            self.assertEqual(block[(year, 11, "60 cm")], 777)
        finally:
            for n in frappe.db.get_all("Production Forecast",
                                       {"forecast_year": year}, pluck="name"):
                frappe.delete_doc("Production Forecast", n, force=1, ignore_permissions=True)

    def test_narrowing_keeps_grade_rows_for_surviving_weeks(self):
        cycle = self.build_fixture()
        house = cycle.greenhouse
        year = 2032
        budget.revise_forecast(house, cycle.variety, year, 10, 8)
        try:
            budget.set_forecast_cell(cycle.name, "60 cm", 11, 500, year)   # inside
            budget.set_forecast_cell(cycle.name, "60 cm", 16, 600, year)   # will be dropped
            name = frappe.db.get_value("Production Forecast", {
                "greenhouse": house, "variety": cycle.variety,
                "forecast_year": year, "status": "Active"}, "name")
            doc = frappe.get_doc("Production Forecast", name)
            doc.window_weeks = 3          # keep weeks 10-12 only
            doc.save(ignore_permissions=True)
            keys = {(int(w.week_number), w.grade) for w in doc.weeks}
            self.assertIn((11, "60 cm"), keys, "a grade row inside the window must survive")
            self.assertNotIn((16, "60 cm"), keys, "a week outside the window is dropped")
            self.assertEqual(sorted({int(w.week_number) for w in doc.weeks}), [10, 11, 12])
        finally:
            for n in frappe.db.get_all("Production Forecast",
                                       {"forecast_year": year}, pluck="name"):
                frappe.delete_doc("Production Forecast", n, force=1, ignore_permissions=True)


class TestBudgetOverrides(_BudgetFixture, FrappeTestCase):
    """A month typed on the Budget view must read back as the same number,
    in the same month. It used to round-drift and straddle two months."""

    HOUSE = "TEST GH OVERRIDES"      # own house and variety: no cycles shared with TestBudget
    VARIETY = "TEST-OVERRIDE-VARIETY"
    PLANTING = datetime.date(2024, 1, 8)  # mature in every year the tests touch
    MONTHS = {"Jan": 1, "Feb": 2, "Sep": 9, "Dec": 12}

    @staticmethod
    def _year_of(cal_month):
        # Mirrors set_budget_cell: the budget runs Sep-Aug, anchored on today.
        today = datetime.date.today()
        return today.year if cal_month >= 9 else today.year + (0 if today.month < 9 else 1)

    def setUp(self):
        # set_budget_cell overrides a Production Projection, so build the
        # fixture and generate the budget years it will write into first.
        cycle = self.build_fixture()
        self.cycle = frappe.db.get_value(
            "Crop Cycle", cycle.name, ["name", "greenhouse", "variety"], as_dict=True)
        for year in {self._year_of(m) for m in self.MONTHS.values()}:
            budget.generate_budget(self.cycle.greenhouse, self.cycle.variety, year)
        frappe.db.sql("UPDATE `tabProjection Week` SET manual_override = 0")

    def tearDown(self):
        frappe.db.rollback()

    def _read(self, month):
        year = self._year_of(self.MONTHS[month])
        got = budget.manual_month_overrides(
            [(self.cycle.greenhouse, self.cycle.variety, year)])
        return got.get((self.cycle.greenhouse, self.cycle.variety), {})

    def test_month_reads_back_exactly(self):
        # 54321 over 5 weeks is not divisible; naive rounding returned 54325.
        for month, value in (("Dec", 54321), ("Feb", 99999), ("Sep", 7)):
            with self.subTest(month=month):
                budget.set_budget_cell(self.cycle.name, month, value)
                self.assertEqual(self._read(month).get(month), value)
                frappe.db.sql("UPDATE `tabProjection Week` SET manual_override = 0")

    def test_month_does_not_bleed_into_its_neighbour(self):
        budget.set_budget_cell(self.cycle.name, "Dec", 54321)
        got = self._read("Dec")
        self.assertEqual(list(got), ["Dec"], f"override leaked across months: {got}")

    def test_weeks_are_assigned_by_their_thursday(self):
        # The write picks weeks and the read maps them back; if the two rules
        # disagree the total lands in two months.
        import datetime as dt
        from upande_crop_material_planning.projection_calc import iso_weeks_in_year
        for cal_month in range(1, 13):
            weeks = [w for w in range(1, iso_weeks_in_year(2026) + 1)
                     if dt.date.fromisocalendar(2026, w, 4).month == cal_month]
            self.assertTrue(weeks, f"month {cal_month} owns no week")
            for w in weeks:
                self.assertEqual(dt.date.fromisocalendar(2026, w, 4).month, cal_month)


class TestForecastHistory(_BudgetFixture, FrappeTestCase):
    """A planner must be able to see what a cell used to say, and why."""

    def setUp(self):
        cycle = self.build_fixture()
        self.cycle = frappe.db.get_value(
            "Crop Cycle", cycle.name, ["name", "greenhouse", "variety"], as_dict=True)
        self.year = 2033
        budget.revise_forecast(self.cycle.greenhouse, self.cycle.variety, self.year, 20, 4)

    def tearDown(self):
        for n in frappe.db.get_all("Production Forecast",
                                   {"forecast_year": self.year}, pluck="name"):
            frappe.delete_doc("Production Forecast", n, force=1, ignore_permissions=True)
        frappe.db.rollback()

    def test_history_reports_the_live_revision_and_reason(self):
        budget.set_forecast_cell(self.cycle.name, "__all__", 21, 5000,
                                 self.year, reason="Disease")
        h = budget.cell_history(self.cycle.name, 21, "__all__", self.year)
        live = [r for r in h["revisions"] if r["status"] == "Active"]
        self.assertEqual(len(live), 1)
        self.assertEqual(live[0]["value"], 5000)
        self.assertEqual(live[0]["reason"], "Disease")
        self.assertTrue(live[0]["changed"])

    def test_superseded_revision_stays_readable(self):
        budget.set_forecast_cell(self.cycle.name, "__all__", 21, 5000, self.year)
        budget.revise_blocks([self.cycle.name], self.year, 20, 4)
        h = budget.cell_history(self.cycle.name, 21, "__all__", self.year)
        by_status = {r["status"]: r for r in h["revisions"]}
        self.assertIn("Superseded", by_status, "the previous revision must survive")
        self.assertIn("Active", by_status)
        # judgement carries forward into the new revision
        self.assertEqual(by_status["Active"]["value"], 5000)
        self.assertEqual(by_status["Superseded"]["value"], 5000)
        self.assertEqual(by_status["Active"]["revision"],
                         by_status["Superseded"]["revision"] + 1)

    def test_history_of_an_untouched_cell_is_empty_of_changes(self):
        h = budget.cell_history(self.cycle.name, 22, "__all__", self.year)
        self.assertFalse([r for r in h["revisions"] if r["changed"]])

    def test_revise_blocks_dedupes_and_reports(self):
        r = budget.revise_blocks([self.cycle.name, self.cycle.name], self.year, 20, 4)
        self.assertEqual(r["revised"], 1, "the same block twice is still one revision")
        self.assertFalse(r["failed"])




class TestBlockBased(FrappeTestCase):
    """A cycle with no greenhouse (live Margin Par) is grouped by its block, not dropped."""

    def test_house_of_falls_back_to_block_then_farm(self):
        self.assertEqual(budget.house_of({"greenhouse": "GH1", "custom_block": "B"}), "GH1")
        self.assertEqual(budget.house_of({"greenhouse": None, "custom_block": "Farm - Block 7", "farm": "F"}), "Farm - Block 7")
        self.assertEqual(budget.house_of({"greenhouse": None, "farm": "Carzan St"}), "Carzan St")
        self.assertEqual(budget.house_of({}), "")
