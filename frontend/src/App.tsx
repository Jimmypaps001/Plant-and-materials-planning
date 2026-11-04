import { Suspense, lazy } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/components/Toast";
import { PageSkeleton } from "@/components/Loading";
import { PlanningProvider } from "@/lib/planning";
import { useRoute, type View } from "@/lib/router";

const Dashboard = lazy(() => import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Budget = lazy(() => import("@/pages/GridPage").then((m) => ({ default: () => <m.GridPage grain="month" /> })));
const Forecast = lazy(() => import("@/pages/GridPage").then((m) => ({ default: () => <m.GridPage grain="week" /> })));
const Lifetime = lazy(() => import("@/pages/GridPage").then((m) => ({ default: () => <m.GridPage grain="life" /> })));
const Calibration = lazy(() => import("@/pages/Calibration").then((m) => ({ default: m.Calibration })));
const Protocols = lazy(() => import("@/pages/Protocols").then((m) => ({ default: m.Protocols })));

const PAGES: Record<View, React.ComponentType> = {
  dashboard: Dashboard,
  budget: Budget,
  forecast: Forecast,
  lifetime: Lifetime,
  calibration: Calibration,
  protocols: Protocols,
};

export function App() {
  const [view, navigate] = useRoute();
  const Page = PAGES[view];
  return (
    <TooltipProvider delayDuration={200}>
      <ToastProvider>
        <PlanningProvider>
          <SidebarProvider>
            <AppSidebar view={view} onNavigate={navigate} />
            <SidebarInset className="min-w-0">
              <Suspense fallback={<PageSkeleton />}>
                <Page key={view} />
              </Suspense>
            </SidebarInset>
          </SidebarProvider>
        </PlanningProvider>
      </ToastProvider>
    </TooltipProvider>
  );
}
