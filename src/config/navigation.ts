import { Home, Dumbbell, Activity, History, Apple, type LucideIcon } from "lucide-react";

interface NavTab {
  path: string;
  icon: LucideIcon;
  label: string;
}

/**
 * Voci di navigazione principali dell'app, condivise tra BottomNav (mobile)
 * e AppSidebar (desktop) per garantire coerenza tra le due modalità di navigazione.
 */
export const tabs: NavTab[] = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/workout", icon: Dumbbell, label: "Schede" },
  { path: "/diet", icon: Apple, label: "Dieta" },
  { path: "/history", icon: History, label: "Storico" },
  { path: "/body", icon: Activity, label: "Corpo" },
];

/**
 * Route "immersive" (sessione allenamento, editor di schede/giorni) in cui
 * la navigazione principale (bottom nav su mobile, sidebar su desktop) va
 * nascosta per lasciare spazio all'esperienza a schermo intero.
 */
export function isImmersiveRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/session") ||
    pathname.startsWith("/edit-plan") ||
    pathname.startsWith("/edit-day") ||
    pathname.startsWith("/create-plan")
  );
}
