import React, { useEffect, useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Loader2 } from 'lucide-react';
import { generateRecipe, type MealFood } from '@/services/geminiService';

interface RecipeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mealType: string;
  foods: MealFood[];
}

function parseBoldSegments(line: string): React.ReactNode[] {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderMarkdown(text: string) {
  return text.split('\n').map((line, i) => (
    <p key={i} className="text-sm leading-relaxed">
      {parseBoldSegments(line)}
    </p>
  ));
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

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh] flex flex-col">
        <DrawerHeader className="shrink-0">
          <DrawerTitle className="flex items-center gap-2">
            ✨ Idea piatto
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-8" data-vaul-no-drag>
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generando la ricetta...</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {recipe && (
            <div className="space-y-1">
              {renderMarkdown(recipe)}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
