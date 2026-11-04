import { Home, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarUser } from "@/components/SidebarUser";
import { PlanningMark } from "@/components/PlanningMark";
import { NAV } from "@/lib/nav";
import { routeHash, type View } from "@/lib/router";
import { cn } from "@/lib/utils";

export function AppSidebar({ crop, cropName, view, onNavigate }: { crop: string; cropName: string; view: View; onNavigate: (crop: string, v: View) => void }) {
  const { state, toggle } = useSidebar();
  const collapsed = state === "collapsed";
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
          <a
            href="/desk/crop-material-planning"
            title="Open the Crop Material Planning workspace"
            className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full group-data-[collapsible=icon]:size-[3rem]"
          >
            <PlanningMark size={48} crop={crop} />
          </a>
          <div className="h-6 w-px shrink-0 bg-border group-data-[collapsible=icon]:hidden" />
          <div
            className={cn(
              "grid min-w-0 flex-1 overflow-hidden text-left leading-tight",
              "grid-cols-[1fr] opacity-100",
              "group-data-[collapsible=icon]:grid-cols-[0fr] group-data-[collapsible=icon]:opacity-0",
            )}
          >
            <span className="text-[13px] font-semibold leading-tight tracking-[-0.01em] text-foreground">
              Crop Material Planning
            </span>
            <span className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--sd-quiet)]">
              {cropName}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent className="overflow-hidden p-0 group-data-[collapsible=icon]:p-0">
        <ScrollArea className="h-full w-full group-data-[collapsible=icon]:[&>[data-radix-scroll-area-viewport]>div]:!block">
          <div className="flex flex-col gap-1 p-2 group-data-[collapsible=icon]:p-[0.8rem]">
            {NAV.map((g) => (
              <SidebarGroup key={g.label}>
                <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {g.items.map((it) => {
                      const Icon = it.icon;
                      const active = it.view === view;
                      return (
                        <SidebarMenuItem key={it.label}>
                          <SidebarMenuButton asChild isActive={active} title={it.label}>
                            {it.view ? (
                              <a
                                href={routeHash(crop, it.view)}
                                onClick={(e) => {
                                  e.preventDefault();
                                  onNavigate(crop, it.view!);
                                }}
                              >
                                <Icon className="h-4 w-4" />
                                <span>{it.label}</span>
                              </a>
                            ) : (
                              <a href={it.href}>
                                <Icon className="h-4 w-4" />
                                <span>{it.label}</span>
                              </a>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </div>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggle} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              <span>{collapsed ? "Expand" : "Collapse"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild title="Back to Desk">
              <a href="/desk">
                <Home className="h-4 w-4" />
                <span>Back to Desk</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarUser />
      </SidebarFooter>
    </Sidebar>
  );
}
