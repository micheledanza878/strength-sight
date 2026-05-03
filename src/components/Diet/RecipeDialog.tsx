import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { generateRecipe, type MealFood } from '@/services/geminiService';

interface RecipeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mealType: string;
  foods: MealFood[];
}

function renderMarkdown(text: string) {
  return text
    .split('\n')
    .map((line, i) => {
      const bold = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return <p key={i} className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: bold }} />;
    });
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ✨ Idea piatto
          </DialogTitle>
        </DialogHeader>

        <div
          className="overflow-y-auto pr-1"
          style={{ maxHeight: '65vh', WebkitOverflowScrolling: 'touch' }}
        >
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
      </DialogContent>
    </Dialog>
  );
}
