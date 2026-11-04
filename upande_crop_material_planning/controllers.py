"""Document-event handlers owned by planning."""

from __future__ import annotations

import frappe


def _seasonal_factor_map(variety: str | None) -> dict[int, float]:
    """Monthly yield multipliers for a variety, if the tenant maintains them."""
    if not frappe.db.exists("DocType", "Seasonal Yield Factor"):
        return {}
    if not variety or not frappe.db.exists("Seasonal Yield Factor", {"variety": variety}):
        return {}
    syf = frappe.get_doc("Seasonal Yield Factor", {"variety": variety})
    return {int(f.month): float(f.factor or 1.0) for f in (syf.seasonal_factors or [])}



def stock_entry_forecast_actuals(doc, method=None):
    """A submitted harvest feeds the forecast immediately.

    The nightly rollup still runs as the safety net, but a grower checking
    the forecast minutes after scanning buckets should already see the
    stems. Cancel goes through the same path so a reversed entry pulls the
    number back down. Best-effort: forecast bookkeeping must never block a
    harvest from being recorded.
    """
    if doc.stock_entry_type != "Harvesting":
        return
    house = doc.get("custom_greenhouse") or doc.get("to_warehouse")
    if not house:
        return
    varieties = {d.item_code for d in (doc.items or []) if d.item_code}
    if not varieties:
        return
    forecasts = frappe.get_all(
        "Production Forecast",
        filters={"greenhouse": house, "variety": ("in", list(varieties)),
                 "status": ("!=", "Closed")},
        pluck="name",
    )
    for name in forecasts:
        try:
            fc = frappe.get_doc("Production Forecast", name)
            fc.pull_actuals(persist=True)
        except Exception:
            frappe.log_error(title=f"Live forecast refresh failed for {name}")

