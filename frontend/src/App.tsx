import { Suspense, lazy } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { CropCover } from "@/components/CropCover";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/components/Toast";
import { PageSkeleton } from "@/components/Loading";
import { PlanningProvider, usePlanning } from "@/lib/planning";
import { useRoute, type View } from "@/lib/router";

const Dashboard = lazy(() => import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Budget = lazy(() => import("@/pages/GridPage").then((m) => ({ default: () => <m.GridPage grain="month" /> })));
const Forecast = lazy(() => import("@/pages/GridPage").then((m) => ({ default: () => <m.GridPage grain="week" /> })));
const Lifetime = lazy(() => import("@/pages/GridPage").then((m) => ({ default: () => <m.GridPage grain="life" /> })));
const Calibration = lazy(() => import("@/pages/Calibration").then((m) => ({ default: m.Calibration })));
const Protocols = lazy(() => import("@/pages/Protocols").then((m) => ({ default: m.Protocols })));

const recordsPage = (view: View): React.ComponentType => {
  const Lazy = lazy(() => import("@/pages/RecordsPage").then((m) => ({ default: () => <m.RecordsPage cfg={m.RECORDS.find((c) => c.view === view)!} /> })));
  return Lazy;
};

const PAGES: Record<View, React.ComponentType> = {
  dashboard: Dashboard,
  budget: Budget,
  forecast: Forecast,
  lifetime: Lifetime,
  calibration: Calibration,
  protocols: Protocols,
  "market-demand": recordsPage("market-demand"),
  "production-plans": recordsPage("production-plans"),
  "season-plans": recordsPage("season-plans"),
  budgets: recordsPage("budgets"),
  procurement: recordsPage("procurement"),
  routes: recordsPage("routes"),
};

function Shell({ view, navigate }: { view: View; navigate: (crop: string, view?: View) => void }) {
  const { crop, cropMap } = usePlanning();
  const Page = PAGES[view];
  const cropName = crop === "all" ? "All crops" : cropMap.crops.find((c) => c.crop_key === crop)?.name ?? crop;
  return (
    <SidebarProvider>
      <AppSidebar crop={crop} cropName={cropName} view={view} onNavigate={navigate} />
      <SidebarInset className="min-w-0">
        <Suspense fallback={<PageSkeleton />}>
          <Page key={view} />
        </Suspense>
      </SidebarInset>
      <CropCover crop={crop} />
    </SidebarProvider>
  );
}

export function App() {
  const [route, navigate] = useRoute();
  return (
    <TooltipProvider delayDuration={200}>
      <ToastProvider>
        <PlanningProvider crop={route.crop} onCrop={(c) => navigate(c, route.view)}>
          <Shell view={route.view} navigate={navigate} />
        </PlanningProvider>
      </ToastProvider>
    </TooltipProvider>
  );
}
