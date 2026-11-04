"""Planning-side mobile endpoints (projection + revised forecast).

Ported from upande_agriculture.mobile.api; old paths resolve through
override_whitelisted_methods.
"""

import frappe
from frappe import _


@frappe.whitelist()
def getProductionProjection():
    greenhouse = frappe.form_dict.get("greenhouse")
    variety = frappe.form_dict.get("variety")
    year = frappe.form_dict.get("year")

    if not greenhouse or not variety or not year:
        frappe.throw("Missing required fields: greenhouse, variety, year")

    year = int(year)

    # Budget: the system-generated Production Projection for this house x variety.
    proj = frappe.db.get_value("Production Projection",
        {"greenhouse": greenhouse, "variety": variety, "projection_year": year}, "name")
    budget = {}
    if proj:
        for r in frappe.get_all("Projection Week", filters={"parent": proj},
                                fields=["week", "projected_stems"]):
            budget[int(r.get("week") or 0)] = int(r.get("projected_stems") or 0)

    # Revisions live on Production Forecast now. Make sure an Active one exists
    # so the app's Revised column has editable rows to write into.
    fc = frappe.get_all("Production Forecast",
        filters={"greenhouse": greenhouse, "variety": variety,
                 "forecast_year": year, "status": "Active"},
        order_by="revision desc", limit=1, pluck="name")
    fcname = fc[0] if fc else None
    if not fcname:
        today = frappe.utils.getdate(frappe.utils.nowdate())
        iso = today.isocalendar()
        lastweek = frappe.utils.getdate(str(year) + "-12-28").isocalendar()[1]
        startweek = 1
        if iso[0] == year:
            startweek = iso[1]
        window = lastweek - startweek + 1
        if window < 1:
            window = 1
        fdoc = frappe.new_doc("Production Forecast")
        fdoc.greenhouse = greenhouse
        fdoc.variety = variety
        fdoc.forecast_year = year
        fdoc.start_week = startweek
        fdoc.window_weeks = window
        fdoc.insert(ignore_permissions=True)
        frappe.db.commit()
        fcname = fdoc.name

    fcrows = {}
    for r in frappe.get_all("Production Forecast Week",
            filters={"parent": fcname, "grade": "all"},
            fields=["name", "week_number", "budget_stems",
                    "revised_forecast_stems", "actual_stems", "note"]):
        fcrows[int(r.get("week_number") or 0)] = r

    # Live actuals straight from Harvesting entries, per ISO week (WEEK mode 3).
    actuals = frappe.db.sql("""
        SELECT WEEK(se.posting_date, 3) AS week_no, SUM(sed.qty) AS total_stems
        FROM `tabStock Entry` se
        JOIN `tabStock Entry Detail` sed ON sed.parent = se.name
        WHERE se.docstatus = 1
          AND se.stock_entry_type = 'Harvesting'
          AND (se.custom_greenhouse = %(greenhouse)s OR sed.t_warehouse = %(greenhouse)s)
          AND sed.item_code = %(variety)s
          AND YEAR(se.posting_date) = %(year)s
        GROUP BY WEEK(se.posting_date, 3)
    """, {"greenhouse": greenhouse, "variety": variety, "year": year}, as_dict=True)
    actuals_map = {}
    for row in actuals:
        actuals_map[int(row.week_no)] = int(row.total_stems)

    weeknums = []
    for wk in budget:
        if wk not in weeknums:
            weeknums.append(wk)
    for wk in fcrows:
        if wk not in weeknums:
            weeknums.append(wk)
    weeknums = sorted(weeknums)

    weeks = []
    for wk in weeknums:
        fr = fcrows.get(wk)
        weeks.append({
            # Rows inside the forecast window carry the real child-row name and
            # are editable; rows outside it are budget-only and read back as
            # skipped if the app tries to save them.
            "name": fr.get("name") if fr else "week-" + str(wk),
            "week_no": wk,
            "projected_qty": budget.get(wk, int(fr.get("budget_stems") or 0) if fr else 0),
            "actual_harvest": actuals_map.get(wk, int(fr.get("actual_stems") or 0) if fr else 0),
            "revised_forecast": int(fr.get("revised_forecast_stems") or 0) if fr else 0,
            "custom_comment": (fr.get("note") or "") if fr else "",
        })

    area = 0.0
    for c in frappe.get_all("Crop Cycle",
            filters={"greenhouse": greenhouse, "variety": variety, "status": ["!=", "Ended"]},
            fields=["planted_area"]):
        area = area + float(c.get("planted_area") or 0)

    crop_type = frappe.db.get_value("Item", variety, "item_group") or ""
    colour = ""
    try:
        colour = frappe.db.get_value("Item", variety, "custom_colour") or ""
    except Exception:
        colour = ""

    wh = frappe.db.get_value("Warehouse", greenhouse, "custom_farm") or ""

    frappe.response["message"] = {
        "status": "success",
        "name": fcname,
        "farm": wh,
        "greenhouse": greenhouse,
        "crop_variety": variety,
        "crop_type": crop_type,
        "colour": colour,
        "area": area,
        "year": year,
        "weeks": weeks,
    }



@frappe.whitelist()
def updateRevisedForecast():
    projection_name = frappe.form_dict.get("projection_name")
    weeks = frappe.form_dict.get("weeks")

    if not projection_name or not weeks:
        frappe.throw("Missing required fields: projection_name, weeks")

    if isinstance(weeks, str):
        weeks = frappe.parse_json(weeks)

    # Revisions live on Production Forecast now; projection_name is the
    # Production Forecast docname handed out by getProductionProjection.
    doc = frappe.get_doc("Production Forecast", projection_name)

    week_map = {}
    for w in doc.weeks:
        week_map[w.name] = w

    updated = 0
    skipped = 0
    for entry in weeks:
        row_name = entry.get("name")
        row = week_map.get(row_name)
        if not row:
            skipped = skipped + 1
            continue
        changed = 0
        if "revised_forecast" in entry:
            row.revised_forecast_stems = frappe.utils.cint(entry.get("revised_forecast"))
            changed = 1
        if "custom_comment" in entry:
            row.note = entry.get("custom_comment")
            changed = 1
        if changed:
            updated = updated + 1

    # Works on drafts and submitted forecasts alike: the revised column and
    # note are allow_on_submit, and saving recomputes every variance.
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    msg = str(updated) + " week(s) updated successfully"
    if skipped:
        msg = msg + " (" + str(skipped) + " outside the forecast window were skipped)"
    frappe.response["message"] = {"status": "success", "updated": updated, "message": msg}
