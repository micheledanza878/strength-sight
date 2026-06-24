import React, { useEffect, useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  ChefHat,
  ShoppingBasket,
  Utensils,
  Clock,
  Lightbulb,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { generateRecipe, type MealFood } from '@/services/geminiService';

interface RecipeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mealType: string;
  foods: MealFood[];
}

interface RecipeSection {
  title: string;
  lines: string[];
}

const SECTION_CONFIG: Record<string, { icon: LucideIcon; color: string; bg: string; bullet: string }> = {
  "nome del piatto":      { icon: ChefHat,         color: "text-amber-400",   bg: "bg-amber-400/10",   bullet: "bg-amber-400"   },
  "ingredienti":          { icon: ShoppingBasket,   color: "text-primary",     bg: "bg-primary/10",     bullet: "bg-primary"     },
  "preparazione":         { icon: Utensils,         color: "text-blue-400",    bg: "bg-blue-400/10",    bullet: "bg-blue-400"    },
  "tempo di preparazione":{ icon: Clock,            color: "text-emerald-400", bg: "bg-emerald-400/10", bullet: "bg-emerald-400" },
  "consiglio dello chef": { icon: Lightbulb,        color: "text-orange-400",  bg: "bg-orange-400/10",  bullet: "bg-orange-400"  },
};

function parseBoldSegments(line: string): React.ReactNode[] {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function parseRecipeSections(markdown: string): RecipeSection[] {
  const sections: RecipeSection[] = [];
  let current: RecipeSection | null = null;

  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trim();

    // Riga che inizia e finisce con ** (header di sezione) con eventuale ":" dopo
    const match = line.match(/^\*\*([^*]+)\*\*\s*:?\s*(.*)$/);
    if (match) {
      if (current) sections.push(current);
      current = { title: match[1].trim(), lines: [] };
      // Se c'è testo dopo il titolo sulla stessa riga, aggiungilo
      if (match[2].trim()) current.lines.push(match[2].trim());
      continue;
    }

    if (current) {
      if (line !== '' || current.lines.length > 0) {
        current.lines.push(line);
      }
    } else if (line !== '') {
      current = { title: 'Ricetta', lines: [line] };
    }
  }

  if (current && current.lines.length > 0) sections.push(current);

  return sections.map(s => ({
    ...s,
    lines: s.lines.filter((l, i, arr) =>
      l !== '' || arr.slice(i + 1).some(x => x !== '')
    ),
  }));
}

function RecipeSection({ section }: { section: RecipeSection }) {
  const key = section.title.toLowerCase();
  const config = SECTION_CONFIG[key] ?? {
    icon: ChefHat,
    color: "text-muted-foreground",
    bg: "bg-secondary",
    bullet: "bg-muted-foreground",
  };
  const Icon = config.icon;

  const isPreparation = key === 'preparazione';
  const isList = !isPreparation && section.lines.some(l => /^[-•·]/.test(l.trim()));

  const nonEmptyLines = section.lines.filter(l => l.trim() !== '');

  return (
    <div className="rounded-xl overflow-hidden border border-border/30">
      {/* Header colorato */}
      <div className={`flex items-center gap-2 px-4 py-3 ${config.bg}`}>
        <Icon className={`w-4 h-4 ${config.color} shrink-0`} aria-hidden="true" />
        <span className={`text-xs font-semibold uppercase tracking-wider ${config.color}`}>
          {section.title}
        </span>
      </div>

      {/* Body */}
      <div className="bg-card px-4 py-3">
        {isPreparation ? (
          <ol className="space-y-2">
            {nonEmptyLines.map((line, i) => {
              const text = line.replace(/^\d+[\.\)]\s*/, '').trim();
              return (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                  <span className={`${config.color} font-bold text-xs mt-0.5 shrink-0 w-4`}>
                    {i + 1}.
                  </span>
                  <span className="leading-relaxed">{parseBoldSegments(text)}</span>
                </li>
              );
            })}
          </ol>
        ) : isList ? (
          <ul className="space-y-1.5" role="list">
            {nonEmptyLines.map((line, i) => {
              const text = line.replace(/^[-•·]\s*/, '').trim();
              return (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span
                    className={`mt-2 w-1.5 h-1.5 rounded-full ${config.bullet} shrink-0`}
                    aria-hidden="true"
                  />
                  <span>{parseBoldSegments(text)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="space-y-1">
            {nonEmptyLines.map((line, i) => (
              <p key={i} className="text-sm leading-relaxed text-foreground">
                {parseBoldSegments(line)}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function RecipeDialog({ isOpen, onClose, mealType, foods }: RecipeDialogProps) {
  const [recipe, setRecipe] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setRecipe(null);
    setError(null);
    setLoading(true);

    generateRecipe(mealType, foods)
      .then(setRecipe)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const sections = recipe ? parseRecipeSections(recipe) : [];

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-amber-400" aria-hidden="true" />
            Idea piatto
          </DrawerTitle>
        </DrawerHeader>

        <div
          className="overflow-y-auto px-4 pb-8 space-y-3"
          style={{ maxHeight: 'calc(75vh - 80px)', WebkitOverflowScrolling: 'touch' }}
          data-vaul-no-drag
        >
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generando la ricetta...</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {sections.map((section, i) => (
            <RecipeSection key={i} section={section} />
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
