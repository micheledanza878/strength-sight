import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** Descrizione testuale dei dati mostrati, usata come aria-label e come fallback a11y per screen reader. */
  summary: string;
  /**
   * Contenuto interattivo opzionale (es. chip di filtro) mostrato tra l'header
   * e l'area grafico. Reso FUORI dal contenitore `role="img"` di `children`:
   * un controllo interattivo non deve stare dentro un nodo marcato come immagine,
   * altrimenti risulterebbe inaccessibile/fuori contesto per gli screen reader.
   */
  toolbar?: ReactNode;
  children: ReactNode;
}

/**
 * Card wrapper condivisa da tutti i grafici della Skill Dashboard.
 *
 * Ogni grafico Recharts è visivo per natura: per non escludere chi usa uno
 * screen reader, il contenitore del grafico è marcato `role="img"` con un
 * `aria-label` che riassume i dati, e viene affiancato da un paragrafo
 * `sr-only` con lo stesso riassunto (ridondanza intenzionale: alcuni screen
 * reader leggono l'aria-label, altri navigano il contenuto testuale).
 */
export function ChartCard({ title, subtitle, summary, toolbar, children }: ChartCardProps) {
  return (
    <section className="bg-card border border-border rounded-2xl p-4 min-w-0 overflow-hidden">
      <header className="mb-3">
        <p className="font-bold text-sm">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </header>

      {toolbar}

      <div role="img" aria-label={summary} className="min-w-0">
        {children}
      </div>

      {/* Fallback testuale per screen reader: stesso contenuto informativo dell'aria-label,
          ma navigabile come testo normale invece che come singolo "immagine". */}
      <p className="sr-only">{summary}</p>
    </section>
  );
}

export default ChartCard;
