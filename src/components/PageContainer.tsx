import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageContainerVariant = "default" | "wide" | "narrow";

interface PageContainerProps {
  /**
   * Controls the max-width applied on desktop (md+) breakpoints.
   * - "default": md:max-w-3xl — list/detail pages (WorkoutSelect, DietViewer, FoodGuide, ExerciseDetail)
   * - "wide": md:max-w-5xl — chart-heavy pages (Dashboard, History)
   * - "narrow": md:max-w-xl — single-column form flows (CreateWorkoutPlan, EditWorkoutPlan, EditWorkoutDay, BodyTracking, WorkoutSession)
   */
  variant?: PageContainerVariant;
  className?: string;
  children: ReactNode;
}

const variantClasses: Record<PageContainerVariant, string> = {
  default: "md:max-w-3xl md:mx-auto md:px-8",
  wide: "md:max-w-5xl md:mx-auto md:px-8",
  narrow: "md:max-w-xl md:mx-auto md:px-8",
};

/**
 * Reusable responsive wrapper for page content.
 *
 * On mobile it has no effect (renders a plain div); on desktop (md+) it
 * centers the content and caps its width so pages don't go full-bleed
 * edge-to-edge on large monitors. Meant to be used alongside a page's
 * existing mobile classes, e.g.:
 *
 *   <PageContainer variant="wide" className="px-4 pt-14 pb-32 min-h-screen">
 *     ...
 *   </PageContainer>
 */
export default function PageContainer({
  variant = "default",
  className,
  children,
}: PageContainerProps) {
  return (
    <div className={cn(variantClasses[variant], className)}>{children}</div>
  );
}
