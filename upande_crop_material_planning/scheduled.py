"""Nightly planning job: read Actual Harvest, fill actual_stems on Projection Week,
refresh open Production Forecasts. Plan-task rollup stays with upande_production."""

import datetime
import frappe
from frappe.utils import getdate


def rollup_actuals() -> int:
    """Returns count of Projection Week rows updated.

    Walks every Production Projection, finds matching Actual Harvest rows
    for each week window, then writes actual_stems + variance back to the
    Projection Week child row.

    Soft-fails (returns 0) if tabActual Harvest does not exist on this site.
    """
    if not frappe.db.has_table("tabActual Harvest"):
        # Forecasts read actuals from Harvesting Stock Entries as a fallback,
        # so they refresh even on sites without the Actual Harvest doctype.
        n = _refresh_forecast_actuals()
        frappe.db.commit()
        return n

    projections = frappe.get_all(
        "Production Projection",
        fields=["name", "greenhouse", "variety", "projection_year", "planting_date"],
    )
    updated = 0
    for p in projections:
        pdate = getdate(p["planting_date"]) if p.get("planting_date") else None
        if not pdate:
            continue

        weeks = frappe.get_all(
            "Projection Week",
            filters={"parent": p["name"]},
            fields=["name", "week"],
            order_by="week asc",
        )
        for w in weeks:
            start = pdate + datetime.timedelta(weeks=int(w["week"]) - 1)
            end = start + datetime.timedelta(days=6)
            actual = frappe.db.sql(
                """
                SELECT COALESCE(SUM(quantity), 0)
                FROM `tabActual Harvest`
                WHERE greenhouse=%s AND variety=%s
                  AND harvest_date BETWEEN %s AND %s
                """,
                (p["greenhouse"], p["variety"], start, end),
            )[0][0]
            projected = frappe.db.get_value(
                "Projection Week", w["name"], "projected_stems"
            )
            variance = (actual or 0) - (projected or 0)
            frappe.db.set_value(
                "Projection Week",
                w["name"],
                {"actual_stems": actual, "variance": variance},
                update_modified=False,
            )
            updated += 1

    updated += _refresh_forecast_actuals()
    frappe.db.commit()
    return updated


def _refresh_forecast_actuals() -> int:
    """Keep every open Production Forecast's actuals and variances current,
    so the morning review reads yesterday's harvest without anyone pressing
    Refresh. Closed forecasts are history and stay as scored."""
    updated = 0
    for name in frappe.get_all("Production Forecast",
                               filters={"status": ("!=", "Closed")}, pluck="name"):
        try:
            doc = frappe.get_doc("Production Forecast", name)
            doc.pull_actuals(persist=True)
            updated += 1
        except Exception:
            frappe.log_error(title=f"Forecast actuals refresh failed for {name}")
    return updated
