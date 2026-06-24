/**
 * ExerciseInsightsCard.tsx
 *
 * Card AI per la pagina ExerciseDetail: mostra tecnica, muscoli, varianti e
 * consigli per un esercizio. I dati vengono caricati via `getExerciseInsights`
 * con strategia cache-first (DB → Edge Function).
 *
 * Comportamento silently-fail: se il servizio ritorna null (errore di rete,
 * quota AI, esercizio sconosciuto) la card non viene montata — nessun
 * messaggio di errore che confonda l'utente.
 */

import React, { useEffect, useState } from "react";
import {
  Brain,
  Dumbbell,
  Layers,
  Lightbulb,
  ExternalLink,
  Loader2,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { getExerciseInsights, type ExerciseInsights } from "@/services/exerciseInsightsService";

// ── Utility: rendering testo con **bold** senza dangerouslySetInnerHTML ─────────

/**
 * Converte un segmento di testo con sintassi **grassetto** in nodi React.
 * Ogni token diventa un nodo JSX tipizzato — nessun HTML interpolato, nessun
 * rischio XSS sull'output raw dell'AI.
 *
 * Copiata/adattata dal pattern in RecipeDialog.tsx per mantenere coerenza
 * nel progetto senza creare una dipendenza circolare tra i due componenti.
 */
export function parseBoldSegments(line: string): React.ReactNode[] {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return part; // testo plain: React lo escapa automaticamente
  });
}

// ── Sub-componenti ──────────────────────────────────────────────────────────────

/** Titolo di sezione con icona coerente alle card esistenti */
function SectionHeader({
  icon,
  label,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
}: {
  icon: React.ReactNode;
  label: string;
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
        <span className={`${iconColor} [&>svg]:w-3.5 [&>svg]:h-3.5`}>{icon}</span>
      </div>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

/** Badge colorato per i muscoli primari */
function PrimaryMuscleBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/15 text-primary text-xs font-medium px-2.5 py-1">
      {label}
    </span>
  );
}

/** Badge più leggero per i muscoli secondari */
function SecondaryMuscleBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-secondary text-muted-foreground text-xs font-medium px-2.5 py-1">
      {label}
    </span>
  );
}

// ── Props ───────────────────────────────────────────────────────────────────────

interface ExerciseInsightsCardProps {
  exerciseName: string;
}

// ── Componente principale ───────────────────────────────────────────────────────

export function ExerciseInsightsCard({ exerciseName }: ExerciseInsightsCardProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ExerciseInsights | null>(null);

  useEffect(() => {
    if (!exerciseName) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setData(null);

    getExerciseInsights(exerciseName).then((result) => {
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    });

    // Cleanup: se il componente viene smontato prima che la Promise risolva,
    // non aggiorniamo uno stato su un componente non più montato.
    return () => {
      cancelled = true;
    };
  }, [exerciseName]);

  // ── Silently-fail: nessun dato → nessuna card ────────────────────────────────
  // Non mostriamo nemmeno un messaggio d'errore: la pagina funziona comunque,
  // la card AI è un arricchimento opzionale.
  if (!loading && data === null) {
    return null;
  }

  // ── Skeleton di caricamento ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-4 space-y-3" aria-busy="true" aria-label="Caricamento informazioni esercizio">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          </div>
          <div>
            <p className="text-sm font-semibold">Informazioni AI</p>
            <p className="text-xs text-muted-foreground">Analisi in corso…</p>
          </div>
        </div>
        {/* Placeholder righe testo */}
        <div className="space-y-2 pt-1">
          <div className="h-3 bg-secondary rounded-full w-full animate-pulse" />
          <div className="h-3 bg-secondary rounded-full w-4/5 animate-pulse" />
          <div className="h-3 bg-secondary rounded-full w-3/5 animate-pulse" />
        </div>
      </div>
    );
  }

  // ── Render card con dati ─────────────────────────────────────────────────────
  // A questo punto `data` è garantito non-null (l'early return sopra gestisce null).
  const insights = data!;

  return (
    <div className="bg-card rounded-2xl p-4 space-y-5">
      {/* Header card */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Brain className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Informazioni AI</p>
          <p className="text-xs text-muted-foreground">Generato da Gemini</p>
        </div>
      </div>

      {/* ── Tecnica ─────────────────────────────────────────────────────────── */}
      {insights.technique && (
        <section aria-label="Tecnica di esecuzione">
          <SectionHeader
            icon={<Dumbbell />}
            label="Tecnica"
            iconColor="text-amber-400"
            iconBg="bg-amber-400/10"
          />
          <p className="text-sm leading-relaxed text-foreground">
            {parseBoldSegments(insights.technique)}
          </p>
        </section>
      )}

      {/* ── Muscoli primari ──────────────────────────────────────────────────── */}
      {insights.primaryMuscles.length > 0 && (
        <section aria-label="Muscoli primari">
          <SectionHeader
            icon={<Layers />}
            label="Muscoli primari"
            iconColor="text-primary"
            iconBg="bg-primary/10"
          />
          <div className="flex flex-wrap gap-2">
            {insights.primaryMuscles.map((muscle) => (
              <PrimaryMuscleBadge key={muscle} label={muscle} />
            ))}
          </div>
        </section>
      )}

      {/* ── Muscoli secondari ────────────────────────────────────────────────── */}
      {insights.secondaryMuscles.length > 0 && (
        <section aria-label="Muscoli secondari">
          <SectionHeader
            icon={<Layers />}
            label="Muscoli secondari"
            iconColor="text-muted-foreground"
            iconBg="bg-secondary"
          />
          <div className="flex flex-wrap gap-2">
            {insights.secondaryMuscles.map((muscle) => (
              <SecondaryMuscleBadge key={muscle} label={muscle} />
            ))}
          </div>
        </section>
      )}

      {/* ── Varianti ─────────────────────────────────────────────────────────── */}
      {insights.variations.length > 0 && (
        <section aria-label="Varianti dell'esercizio">
          <SectionHeader
            icon={<ChevronRight />}
            label="Varianti"
            iconColor="text-blue-400"
            iconBg="bg-blue-500/10"
          />
          <ul className="space-y-1.5" role="list">
            {insights.variations.map((variant) => (
              <li
                key={variant}
                className="flex items-start gap-2 text-sm text-foreground"
              >
                <span
                  className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"
                  aria-hidden="true"
                />
                {parseBoldSegments(variant)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Consigli ─────────────────────────────────────────────────────────── */}
      {insights.tips.length > 0 && (
        <section aria-label="Consigli">
          <SectionHeader
            icon={<Lightbulb />}
            label="Consigli"
            iconColor="text-emerald-400"
            iconBg="bg-emerald-500/10"
          />
          <ul className="space-y-2" role="list">
            {insights.tips.map((tip, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-foreground"
              >
                {/* Alterna tra check e warning in base alla posizione per varietà visiva;
                    oppure usa sempre AlertTriangle se preferisci uniformità */}
                <AlertTriangle
                  className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{parseBoldSegments(tip)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Link YouTube ─────────────────────────────────────────────────────── */}
      {insights.youtubeUrl && (
        <a
          href={insights.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 transition-colors text-red-500 font-medium text-sm py-3 px-4"
          aria-label={`Guarda il tutorial di ${insights.exerciseName} su YouTube (apre in una nuova scheda)`}
        >
          <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
          Guarda tutorial su YouTube
        </a>
      )}
    </div>
  );
}
