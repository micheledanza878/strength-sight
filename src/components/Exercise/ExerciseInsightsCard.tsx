import React, { useEffect, useState } from "react";
import {
  Brain,
  Dumbbell,
  Layers,
  Lightbulb,
  ExternalLink,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getExerciseInsights, type ExerciseInsights } from "@/services/exerciseInsightsService";

export function parseBoldSegments(line: string): React.ReactNode[] {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function PrimaryMuscleBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/15 text-primary text-xs font-medium px-2.5 py-1">
      {label}
    </span>
  );
}

function SecondaryMuscleBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-secondary text-muted-foreground text-xs font-medium px-2.5 py-1">
      {label}
    </span>
  );
}

interface ExerciseInsightsCardProps {
  exerciseName: string;
}

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

    return () => { cancelled = true; };
  }, [exerciseName]);

  if (!loading && data === null) return null;

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-4 space-y-3" aria-busy="true">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          </div>
          <div>
            <p className="text-sm font-semibold">Informazioni AI</p>
            <p className="text-xs text-muted-foreground">Analisi in corso…</p>
          </div>
        </div>
        <div className="space-y-2 pt-1">
          <div className="h-3 bg-secondary rounded-full w-full animate-pulse" />
          <div className="h-3 bg-secondary rounded-full w-4/5 animate-pulse" />
          <div className="h-3 bg-secondary rounded-full w-3/5 animate-pulse" />
        </div>
      </div>
    );
  }

  const insights = data!;

  return (
    <div className="bg-card rounded-2xl p-4 space-y-4">

      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Brain className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Informazioni AI</p>
          <p className="text-xs text-muted-foreground">Generato da Claude</p>
        </div>
      </div>

      {/* Tab */}
      <Tabs defaultValue="tecnica" className="w-full">
        <TabsList className="grid grid-cols-3 w-full h-9 bg-secondary/60 rounded-xl p-1">
          <TabsTrigger
            value="tecnica"
            className="flex items-center gap-1 text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:text-amber-400 data-[state=active]:shadow-sm"
          >
            <Dumbbell className="w-3.5 h-3.5" />
            Tecnica
          </TabsTrigger>
          <TabsTrigger
            value="muscoli"
            className="flex items-center gap-1 text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <Layers className="w-3.5 h-3.5" />
            Muscoli
          </TabsTrigger>
          <TabsTrigger
            value="training"
            className="flex items-center gap-1 text-xs rounded-lg data-[state=active]:bg-card data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            Training
          </TabsTrigger>
        </TabsList>

        {/* ── Tecnica ── */}
        <TabsContent value="tecnica" className="mt-4 focus-visible:outline-none">
          {insights.technique ? (
            <div className="bg-amber-400/5 border border-amber-400/10 rounded-xl p-4">
              <p className="text-sm leading-relaxed text-foreground">
                {parseBoldSegments(insights.technique)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nessuna informazione disponibile.
            </p>
          )}
        </TabsContent>

        {/* ── Muscoli ── */}
        <TabsContent value="muscoli" className="mt-4 focus-visible:outline-none space-y-4">
          {insights.primaryMuscles.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Primari
              </p>
              <div className="flex flex-wrap gap-2">
                {insights.primaryMuscles.map((m) => (
                  <PrimaryMuscleBadge key={m} label={m} />
                ))}
              </div>
            </div>
          )}
          {insights.primaryMuscles.length > 0 && insights.secondaryMuscles.length > 0 && (
            <div className="border-t border-border/40" />
          )}
          {insights.secondaryMuscles.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Secondari
              </p>
              <div className="flex flex-wrap gap-2">
                {insights.secondaryMuscles.map((m) => (
                  <SecondaryMuscleBadge key={m} label={m} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Training (Varianti + Consigli) ── */}
        <TabsContent value="training" className="mt-4 focus-visible:outline-none space-y-4">
          {insights.variations.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-blue-400/80 uppercase tracking-wide mb-2">
                Varianti
              </p>
              <ul className="space-y-2" role="list">
                {insights.variations.map((v) => (
                  <li key={v} className="flex items-start gap-2 text-sm text-foreground">
                    <ChevronRight className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" aria-hidden="true" />
                    {parseBoldSegments(v)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {insights.variations.length > 0 && insights.tips.length > 0 && (
            <div className="border-t border-border/40" />
          )}

          {insights.tips.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-400/80 uppercase tracking-wide mb-2">
                Consigli
              </p>
              <ul className="space-y-2" role="list">
                {insights.tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-foreground bg-emerald-500/5 rounded-lg px-3 py-2">
                    <span className="text-emerald-400 font-bold text-xs mt-0.5 shrink-0 w-4">
                      {idx + 1}.
                    </span>
                    <span>{parseBoldSegments(tip)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* YouTube — sempre visibile fuori dai tab */}
      {insights.youtubeUrl && (
        <a
          href={insights.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 transition-colors text-red-500 font-medium text-sm py-3 px-4"
          aria-label={`Guarda il tutorial di ${insights.exerciseName} su YouTube`}
        >
          <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
          Guarda tutorial su YouTube
        </a>
      )}
    </div>
  );
}
