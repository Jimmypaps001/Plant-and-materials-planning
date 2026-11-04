import {
  CalendarRange,
  ChartColumn,
  Clock,
  Gauge,
  Home,
  Layers,
  LayoutDashboard,
  Map as MapIcon,
  NotebookPen,
  Table2,
  type LucideIcon,
} from "lucide-react";
import type { View } from "@/lib/router";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  /** An in-app view, or an href for a page that belongs to another app / the classic screen. */
  view?: View;
  href?: string;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", icon: LayoutDashboard, view: "dashboard" }],
  },
  {
    label: "Plan",
    items: [
      { label: "Budget", icon: Table2, view: "budget" },
      { label: "Forecast", icon: Clock, view: "forecast" },
      { label: "Lifetime", icon: ChartColumn, view: "lifetime" },
    ],
  },
  {
    label: "Inputs",
    items: [
      { label: "Crop Protocols", icon: NotebookPen, view: "protocols" },
      { label: "Calibration", icon: Gauge, view: "calibration" },
    ],
  },
  {
    // Owned by upande_production: link out, do not rebuild.
    label: "Production",
    items: [
      { label: "Weekly Plan", icon: CalendarRange, href: "/production_app" },
      { label: "Farm Map", icon: MapIcon, href: "/production_app" },
      { label: "Greenhouses", icon: Layers, href: "/desk/greenhouse" },
    ],
  },
  {
    label: "Classic",
    items: [{ label: "Classic planner", icon: Home, href: "/budget-forecast" }],
  },
];

/** The legacy screen that corresponds to each React view. */
export const CLASSIC: Record<View, string> = {
  dashboard: "/budget-forecast#dashboard",
  budget: "/budget-forecast#budget",
  forecast: "/budget-forecast#forecast",
  lifetime: "/budget-forecast#lifetime",
  calibration: "/budget-forecast#calibrate",
  protocols: "/desk/crop-protocol",
};
