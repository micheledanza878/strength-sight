import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  className?: string;
}

/**
 * Stato "dati insufficienti" riutilizzabile per tutti i grafici della Skill
 * Dashboard. Va mostrato al posto del grafico quando non ci sono abbastanza
 * dati per renderlo in modo leggibile (es. <2 punti su una linea, <3 assi
 * su un radar, ecc.).
 */
export function EmptyState({ icon: Icon = Inbox, title, subtitle, className }: EmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center text-center gap-2 py-10 px-4",
        className ?? "",
      ].join(" ")}
    >
      <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center">
        <Icon className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground max-w-xs">{subtitle}</p>}
    </div>
  );
}

export default EmptyState;
