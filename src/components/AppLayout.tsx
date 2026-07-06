import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import BottomNav from "@/components/BottomNav";
import { isImmersiveRoute } from "@/config/navigation";

/**
 * Layout applicativo condiviso da tutte le route protette.
 * Su desktop (md+) mostra la sidebar laterale, su mobile la bottom nav
 * (che si nasconde autonomamente su desktop via `md:hidden`).
 * Entrambe si nascondono sulle route "immersive" (sessione, editor schede/giorni).
 */
export default function AppLayout() {
  const location = useLocation();
  const showSidebar = !isImmersiveRoute(location.pathname);

  return (
    <SidebarProvider>
      {showSidebar && <AppSidebar />}
      <SidebarInset>
        <Outlet />
      </SidebarInset>
      <BottomNav />
    </SidebarProvider>
  );
}
