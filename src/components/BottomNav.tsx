import { Home, Dumbbell, Activity, History, Apple, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/workout", icon: Dumbbell, label: "Allenamento" },
  { path: "/diet", icon: Apple, label: "Dieta" },
  { path: "/history", icon: History, label: "Storico" },
  { path: "/body", icon: Activity, label: "Corpo" },
  { path: "/profile", icon: User, label: "Profilo" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide nav during active workout session, during edit, and during creation
  if (location.pathname.startsWith("/session") ||
      location.pathname.startsWith("/edit-plan") ||
      location.pathname.startsWith("/edit-day") ||
      location.pathname.startsWith("/create-plan")) return null;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] bg-card/80 backdrop-blur-xl border-t border-borde" >
      {tabs.map((tab) => (
        <button
          key={tab.path}
          className={cn(
            "w-full py-2 flex items-center justify-center gap-2 text-sm font-medium leading-5 text-gray-600 rounded-lg",
            location.pathname === tab.path
              ? "bg-gray-100 text-gray-900"
              : "hover:bg-gray-100/70"
          )}
          onClick={() => navigate(tab.path)}
        >
          <tab.icon className="w-5 h-5" />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
