import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  subtext?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

/**
 * Reusable stat card used across dashboards/detail pages for compact,
 * visually consistent metrics.
 *
 * Two variants depending on whether `icon` is provided:
 * - No icon: compact stat (e.g. Dashboard streak/week/month row, headline
 *   weight number) — big value first, label underneath.
 * - With icon: icon-header stat (e.g. ExerciseDetail "Best set"/"Max 1RM")
 *   — icon badge + label as a header row, then the value below.
 */
export function StatCard({
  icon,
  label,
  value,
  subtext,
  align = "left",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-2xl p-5 md:p-6",
        align === "center" && "text-center",
        className
      )}
    >
      {icon ? (
        <>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              {icon}
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {label}
            </span>
          </div>
          <div className="text-3xl md:text-4xl font-bold tracking-tight leading-none">
            {value}
          </div>
          {subtext && (
            <div className="text-xs text-muted-foreground mt-1">{subtext}</div>
          )}
        </>
      ) : (
        <>
          <div className="text-3xl md:text-4xl font-bold tracking-tight leading-none mb-1.5">
            {value}
          </div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          {subtext && (
            <div className="text-xs text-muted-foreground mt-1">{subtext}</div>
          )}
        </>
      )}
    </div>
  );
}
