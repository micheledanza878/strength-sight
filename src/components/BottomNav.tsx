import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { tabs, isImmersiveRoute } from "@/config/navigation";

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  if (isImmersiveRoute(location.pathname)) return null;

  return (
    <div className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] z-50 pointer-events-none">
      {/* Gradient fade */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background via-background/80 to-transparent" />

      <nav className="relative mx-3 mb-3 pointer-events-auto bg-card/75 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl safe-bottom">
        <div className="flex items-center justify-around h-[60px] px-1">
          {tabs.map((tab) => {
            const active = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="relative flex flex-col items-center gap-1 flex-1 py-2 transition-all duration-200 active:scale-95"
              >
                {active && (
                  <span className="absolute inset-x-1.5 inset-y-1 rounded-xl bg-primary/12" />
                )}
                <tab.icon
                  className={cn(
                    "w-5 h-5 relative z-10 transition-all duration-200",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span
                  className={cn(
                    "text-[10px] font-semibold relative z-10 transition-colors duration-200 tracking-wide",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
